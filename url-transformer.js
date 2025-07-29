// url-transformer.js
const { URL } = require('url');
const logger = require('./logger').getModuleLogger('url-transformer');

/**
 * URL Transformation Engine
 * Handles comprehensive URL rewriting in HTML responses to route all URLs through the proxy
 * while maintaining full functionality and obscuring the original server details.
 */
class URLTransformer {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      preserveOriginalHost: config.preserveOriginalHost === true,
      transformJavaScript: config.transformJavaScript !== false,
      transformCSS: config.transformCSS !== false,
      transformInlineStyles: config.transformInlineStyles !== false,
      transformDataAttributes: config.transformDataAttributes !== false,
      preserveFragments: config.preserveFragments !== false,
      preserveQueryParams: config.preserveQueryParams !== false,
      maxContentSize: config.maxContentSize || 50 * 1024 * 1024, // 50MB default
      debugMode: config.debugMode === true,
      ...config
    };
    
    this.stats = {
      transformations: 0,
      urlsTransformed: 0,
      htmlTransformations: 0,
      jsTransformations: 0,
      cssTransformations: 0,
      errors: 0,
      skippedLargeContent: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // Cache for transformation patterns and results
    this.transformationCache = new Map();
    this.patternCache = new Map();
    this.maxCacheSize = config.maxCacheSize || 10000;
    
    // URL patterns for different content types
    this.urlPatterns = this.initializeURLPatterns();
    
    logger.info('URL Transformer initialized', {
      enabled: this.config.enabled,
      transformJavaScript: this.config.transformJavaScript,
      transformCSS: this.config.transformCSS,
      maxContentSize: this.config.maxContentSize
    });
  }
  
  /**
   * Initialize URL detection patterns for different contexts
   */
  initializeURLPatterns() {
    return {
      // HTML attribute patterns
      html: {
        // Standard URL attributes
        href: /(\s+href\s*=\s*["']?)([^"'\s>]+)(["']?)/gi,
        src: /(\s+src\s*=\s*["']?)([^"'\s>]+)(["']?)/gi,
        action: /(\s+action\s*=\s*["']?)([^"'\s>]+)(["']?)/gi,
        formaction: /(\s+formaction\s*=\s*["']?)([^"'\s>]+)(["']?)/gi,
        
        // Meta and link tags
        content: /(<meta[^>]+content\s*=\s*["']?)([^"']+)(["'][^>]*>)/gi,
        canonical: /(<link[^>]+rel\s*=\s*["']?canonical["'][^>]+href\s*=\s*["']?)([^"']+)(["'][^>]*>)/gi,
        
        // Data attributes that might contain URLs
        dataUrl: /(\s+data-[^=]*url[^=]*\s*=\s*["']?)([^"'\s>]+)(["']?)/gi,
        dataSrc: /(\s+data-src\s*=\s*["']?)([^"'\s>]+)(["']?)/gi,
        dataHref: /(\s+data-href\s*=\s*["']?)([^"'\s>]+)(["']?)/gi,
        
        // Style attributes
        style: /(\s+style\s*=\s*["'][^"']*url\s*\(\s*["']?)([^"')\s]+)(["']?\s*\)[^"']*["'])/gi,
        
        // Iframe and embed sources
        iframe: /(<iframe[^>]+src\s*=\s*["']?)([^"']+)(["'][^>]*>)/gi,
        embed: /(<embed[^>]+src\s*=\s*["']?)([^"']+)(["'][^>]*>)/gi,
        object: /(<object[^>]+data\s*=\s*["']?)([^"']+)(["'][^>]*>)/gi,
        
        // Form elements
        form: /(<form[^>]+action\s*=\s*["']?)([^"']+)(["'][^>]*>)/gi,
        
        // Media elements
        poster: /(\s+poster\s*=\s*["']?)([^"'\s>]+)(["']?)/gi,
        
        // Manifest and other special attributes
        manifest: /(\s+manifest\s*=\s*["']?)([^"'\s>]+)(["']?)/gi
      },
      
      // JavaScript patterns
      javascript: {
        // String literals with URLs
        stringLiterals: /(["'`])((https?:)?\/\/[^"'`\s]+)\1/gi,
        
        // Common API patterns
        fetch: /(fetch\s*\(\s*["'`])([^"'`]+)(["'`])/gi,
        xmlHttpRequest: /(\.open\s*\(\s*["'][^"']*["']\s*,\s*["'`])([^"'`]+)(["'`])/gi,
        
        // Dynamic imports
        import: /(import\s*\(\s*["'`])([^"'`]+)(["'`]\s*\))/gi,
        
        // URL constructor
        urlConstructor: /(new\s+URL\s*\(\s*["'`])([^"'`]+)(["'`])/gi,
        
        // Location assignments
        location: /(location\s*=\s*["'`])([^"'`]+)(["'`])/gi,
        locationHref: /(location\.href\s*=\s*["'`])([^"'`]+)(["'`])/gi,
        
        // Window.open
        windowOpen: /(window\.open\s*\(\s*["'`])([^"'`]+)(["'`])/gi,
        
        // AJAX libraries (jQuery, etc.)
        jqueryAjax: /(\$\.ajax\s*\(\s*{[^}]*url\s*:\s*["'`])([^"'`]+)(["'`])/gi,
        jqueryGet: /(\$\.get\s*\(\s*["'`])([^"'`]+)(["'`])/gi,
        jqueryPost: /(\$\.post\s*\(\s*["'`])([^"'`]+)(["'`])/gi,
        
        // Template literals with URLs
        templateLiterals: /(`)([^`]*(?:https?:)?\/\/[^`\s]+[^`]*)`/gi
      },
      
      // CSS patterns
      css: {
        // url() functions
        url: /(url\s*\(\s*["']?)([^"')\s]+)(["']?\s*\))/gi,
        
        // @import statements
        import: /(@import\s+(?:url\s*\(\s*)?["']?)([^"')\s]+)(["']?(?:\s*\))?)/gi,
        
        // Background images
        background: /(background(?:-image)?\s*:\s*[^;]*url\s*\(\s*["']?)([^"')\s]+)(["']?\s*\))/gi,
        
        // Font faces
        fontFace: /(@font-face\s*{[^}]*src\s*:[^}]*url\s*\(\s*["']?)([^"')\s]+)(["']?\s*\))/gi,
        
        // Cursor
        cursor: /(cursor\s*:\s*[^;]*url\s*\(\s*["']?)([^"')\s]+)(["']?\s*\))/gi
      }
    };
  }
  
  /**
   * Transform content based on content type
   * @param {String|Buffer} content - Content to transform
   * @param {String} contentType - MIME type of content
   * @param {Object} requestContext - Request context for transformation
   * @returns {Promise<Object>} Transformation result
   */
  async transformContent(content, contentType, requestContext) {
    if (!this.config.enabled) {
      return {
        content,
        transformed: false,
        reason: 'URL transformation disabled'
      };
    }
    
    // Validate request context
    if (!requestContext) {
      return {
        content,
        transformed: false,
        error: 'Invalid request context: requestContext is null or undefined'
      };
    }
    
    // Convert buffer to string if needed
    const contentString = Buffer.isBuffer(content) ? content.toString('utf8') : content;
    
    // Check content size limits
    if (contentString.length > this.config.maxContentSize) {
      this.stats.skippedLargeContent++;
      logger.debug('Skipping URL transformation for large content', {
        size: contentString.length,
        maxSize: this.config.maxContentSize,
        url: requestContext.originalUrl
      });
      return {
        content,
        transformed: false,
        reason: 'Content too large'
      };
    }
    
    try {
      this.stats.transformations++;
      
      let transformedContent = contentString;
      let urlsTransformed = 0;
      
      // Determine content type and apply appropriate transformations
      if (this.isHTMLContent(contentType)) {
        const result = await this.transformHTMLContent(transformedContent, requestContext);
        transformedContent = result.content;
        urlsTransformed += result.urlsTransformed;
        this.stats.htmlTransformations++;
      }
      
      if (this.isJavaScriptContent(contentType) && this.config.transformJavaScript) {
        const result = await this.transformJavaScriptContent(transformedContent, requestContext);
        transformedContent = result.content;
        urlsTransformed += result.urlsTransformed;
        this.stats.jsTransformations++;
      }
      
      if (this.isCSSContent(contentType) && this.config.transformCSS) {
        const result = await this.transformCSSContent(transformedContent, requestContext);
        transformedContent = result.content;
        urlsTransformed += result.urlsTransformed;
        this.stats.cssTransformations++;
      }
      
      this.stats.urlsTransformed += urlsTransformed;
      
      if (this.config.debugMode && urlsTransformed > 0) {
        logger.debug('URL transformation completed', {
          originalUrl: requestContext.originalUrl,
          contentType,
          urlsTransformed,
          contentSize: contentString.length
        });
      }
      
      return {
        content: transformedContent,
        transformed: urlsTransformed > 0,
        urlsTransformed,
        originalSize: contentString.length,
        transformedSize: transformedContent.length
      };
      
    } catch (error) {
      this.stats.errors++;
      logger.error('URL transformation error', {
        error: error.message,
        contentType,
        url: requestContext.originalUrl,
        stack: error.stack
      });
      
      // Return original content on error
      return {
        content,
        transformed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Transform HTML content
   * @param {String} content - HTML content
   * @param {Object} requestContext - Request context
   * @returns {Promise<Object>} Transformation result
   */
  async transformHTMLContent(content, requestContext) {
    let transformedContent = content;
    let urlsTransformed = 0;
    
    // Apply HTML patterns
    for (const [patternName, pattern] of Object.entries(this.urlPatterns.html)) {
      const result = await this.applyPattern(transformedContent, pattern, requestContext, 'html', patternName);
      transformedContent = result.content;
      urlsTransformed += result.urlsTransformed;
    }
    
    // Handle inline JavaScript if enabled
    if (this.config.transformJavaScript) {
      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      transformedContent = transformedContent.replace(scriptRegex, (match, scriptContent) => {
        if (scriptContent.trim()) {
          const jsResult = this.transformJavaScriptContent(scriptContent, requestContext);
          urlsTransformed += jsResult.urlsTransformed;
          return match.replace(scriptContent, jsResult.content);
        }
        return match;
      });
    }
    
    // Handle inline CSS if enabled
    if (this.config.transformCSS && this.config.transformInlineStyles) {
      const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
      transformedContent = transformedContent.replace(styleRegex, (match, styleContent) => {
        if (styleContent.trim()) {
          const cssResult = this.transformCSSContent(styleContent, requestContext);
          urlsTransformed += cssResult.urlsTransformed;
          return match.replace(styleContent, cssResult.content);
        }
        return match;
      });
    }
    
    return {
      content: transformedContent,
      urlsTransformed
    };
  }
  
  /**
   * Transform JavaScript content
   * @param {String} content - JavaScript content
   * @param {Object} requestContext - Request context
   * @returns {Object} Transformation result
   */
  transformJavaScriptContent(content, requestContext) {
    let transformedContent = content;
    let urlsTransformed = 0;
    
    // Apply JavaScript patterns
    for (const [patternName, pattern] of Object.entries(this.urlPatterns.javascript)) {
      const result = this.applyPattern(transformedContent, pattern, requestContext, 'javascript', patternName);
      transformedContent = result.content;
      urlsTransformed += result.urlsTransformed;
    }
    
    return {
      content: transformedContent,
      urlsTransformed
    };
  }
  
  /**
   * Transform CSS content
   * @param {String} content - CSS content
   * @param {Object} requestContext - Request context
   * @returns {Object} Transformation result
   */
  transformCSSContent(content, requestContext) {
    let transformedContent = content;
    let urlsTransformed = 0;
    
    // Apply CSS patterns
    for (const [patternName, pattern] of Object.entries(this.urlPatterns.css)) {
      const result = this.applyPattern(transformedContent, pattern, requestContext, 'css', patternName);
      transformedContent = result.content;
      urlsTransformed += result.urlsTransformed;
    }
    
    return {
      content: transformedContent,
      urlsTransformed
    };
  }
  
  /**
   * Apply a regex pattern to content and transform matching URLs
   * @param {String} content - Content to transform
   * @param {RegExp} pattern - Regex pattern to apply
   * @param {Object} requestContext - Request context
   * @param {String} contentType - Type of content (html, javascript, css)
   * @param {String} patternName - Name of the pattern for debugging
   * @returns {Object} Transformation result
   */
  applyPattern(content, pattern, requestContext, contentType, patternName) {
    let urlsTransformed = 0;
    
    const transformedContent = content.replace(pattern, (match, prefix, url, suffix) => {
      try {
        // Skip if URL is already transformed or invalid
        if (!url || this.isAlreadyTransformed(url, requestContext) || this.isInvalidURL(url)) {
          return match;
        }
        
        const transformedURL = this.transformURL(url, requestContext);
        if (transformedURL !== url) {
          urlsTransformed++;
          
          if (this.config.debugMode) {
            logger.debug('URL transformed', {
              contentType,
              patternName,
              original: url,
              transformed: transformedURL,
              context: requestContext.originalUrl
            });
          }
          
          return `${prefix}${transformedURL}${suffix || ''}`;
        }
        
        return match;
      } catch (error) {
        logger.warn('Pattern application error', {
          error: error.message,
          pattern: patternName,
          url,
          contentType
        });
        return match;
      }
    });
    
    return {
      content: transformedContent,
      urlsTransformed
    };
  }
  
  /**
   * Transform a single URL
   * @param {String} url - URL to transform
   * @param {Object} requestContext - Request context
   * @returns {String} Transformed URL
   */
  transformURL(url, requestContext) {
    // Check cache first
    const cacheKey = `${url}:${requestContext.proxyHost}:${requestContext.pathTransformation?.target || ''}`;
    if (this.transformationCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.transformationCache.get(cacheKey);
    }
    
    this.stats.cacheMisses++;
    
    try {
      const transformedURL = this.buildProxyURL(url, requestContext);
      
      // Cache the result
      if (this.transformationCache.size >= this.maxCacheSize) {
        // Simple LRU: remove oldest entries
        const firstKey = this.transformationCache.keys().next().value;
        this.transformationCache.delete(firstKey);
      }
      this.transformationCache.set(cacheKey, transformedURL);
      
      return transformedURL;
    } catch (error) {
      logger.warn('URL transformation error', {
        error: error.message,
        url,
        context: requestContext.originalUrl
      });
      return url; // Return original URL on error
    }
  }
  
  /**
   * Build proxy URL from original URL
   * @param {String} originalURL - Original URL to transform
   * @param {Object} requestContext - Request context
   * @returns {String} Proxy URL
   */
  buildProxyURL(originalURL, requestContext) {
    const { proxyHost, pathTransformation, protocol } = requestContext;
    
    // Handle different URL types
    if (originalURL.startsWith('//')) {
      // Protocol-relative URL
      const fullURL = `${protocol}:${originalURL}`;
      return this.buildAbsoluteProxyURL(fullURL, proxyHost, pathTransformation);
    } else if (originalURL.startsWith('http://') || originalURL.startsWith('https://')) {
      // Absolute URL
      return this.buildAbsoluteProxyURL(originalURL, proxyHost, pathTransformation);
    } else if (originalURL.startsWith('/')) {
      // Root-relative URL
      return this.buildRelativeProxyURL(originalURL, proxyHost, pathTransformation);
    } else if (originalURL.startsWith('#') || originalURL.startsWith('?')) {
      // Fragment or query-only URL - keep as is
      return originalURL;
    } else {
      // Relative URL - keep as is (browser will resolve relative to current page)
      return originalURL;
    }
  }
  
  /**
   * Build proxy URL for absolute URLs
   * @param {String} absoluteURL - Absolute URL
   * @param {String} proxyHost - Proxy host
   * @param {Object} pathTransformation - Path transformation info
   * @returns {String} Proxy URL
   */
  buildAbsoluteProxyURL(absoluteURL, proxyHost, pathTransformation) {
    try {
      const parsedURL = new URL(absoluteURL);
      const hostname = parsedURL.hostname;
      
      if (this.config.debugMode) {
        logger.debug('Building proxy URL', {
          originalURL: absoluteURL,
          hostname,
          proxyHost,
          shouldProxy: this.shouldProxyDomain(hostname, pathTransformation)
        });
      }
      
      // Check if this is a URL that should be routed through the proxy
      if (this.shouldProxyDomain(hostname, pathTransformation)) {
        // Route through proxy with appropriate path transformation
        const transformedPath = this.getTransformedPathForDomain(hostname, parsedURL.pathname, pathTransformation);
        const queryString = this.config.preserveQueryParams ? parsedURL.search : '';
        const fragment = this.config.preserveFragments ? parsedURL.hash : '';
        
        const proxyURL = `${parsedURL.protocol}//${proxyHost}${transformedPath}${queryString}${fragment}`;
        
        if (this.config.debugMode) {
          logger.debug('URL transformed', {
            original: absoluteURL,
            transformed: proxyURL,
            transformedPath,
            hostname
          });
        }
        
        return proxyURL;
      }
      
      // For external domains not in our proxy configuration, leave as-is
      if (this.config.debugMode) {
        logger.debug('URL not transformed - external domain', {
          url: absoluteURL,
          hostname
        });
      }
      
      return absoluteURL;
    } catch (error) {
      logger.warn('Error parsing absolute URL', { url: absoluteURL, error: error.message });
      return absoluteURL;
    }
  }
  
  /**
   * Check if a domain should be proxied
   * @param {String} hostname - Domain hostname
   * @param {Object} pathTransformation - Path transformation context
   * @returns {Boolean} Whether domain should be proxied
   */
  shouldProxyDomain(hostname, pathTransformation) {
    // Check if this is the origin domain that should be proxied
    if (hostname === 'allabout.network') {
      return true;
    }
    
    // If we have path transformation info, check if this domain is configured
    if (pathTransformation && pathTransformation.domainManager) {
      return pathTransformation.domainManager.hasPathRewriting(hostname);
    }
    
    // Check if this domain is in the additional domains list
    const config = require('./config');
    if (config.cdn.additionalDomains && config.cdn.additionalDomains.includes(hostname)) {
      return true;
    }
    
    // Default: don't proxy external domains
    return false;
  }
  
  /**
   * Get transformed path for a specific domain
   * @param {String} hostname - Domain hostname
   * @param {String} pathname - Original pathname
   * @param {Object} pathTransformation - Path transformation context
   * @returns {String} Transformed path
   */
  getTransformedPathForDomain(hostname, pathname, pathTransformation) {
    // Handle allabout.network domain - route directly through proxy
    if (hostname === 'allabout.network') {
      return pathname; // Keep the original path
    }
    
    // If we have domain manager access, use it for path transformation
    if (pathTransformation && pathTransformation.domainManager) {
      try {
        const transformation = pathTransformation.domainManager.getPathTransformation(hostname, pathname);
        return transformation.transformedPath || pathname;
      } catch (error) {
        logger.warn('Error getting path transformation for domain', {
          hostname,
          pathname,
          error: error.message
        });
      }
    }
    
    // Fallback to original pathname
    return pathname;
  }
  
  /**
   * Build proxy URL for root-relative URLs
   * @param {String} relativeURL - Root-relative URL
   * @param {String} proxyHost - Proxy host
   * @param {Object} pathTransformation - Path transformation info
   * @returns {String} Proxy URL
   */
  buildRelativeProxyURL(relativeURL, proxyHost, pathTransformation) {
    // For root-relative URLs, we need to ensure they go through the proxy
    // but maintain the current domain context
    
    if (pathTransformation && pathTransformation.matched) {
      // Apply path transformation if available
      const transformedPath = this.applyPathTransformation(relativeURL, pathTransformation);
      return transformedPath;
    }
    
    // If no path transformation, return as-is (will be resolved by browser)
    return relativeURL;
  }
  
  /**
   * Apply path transformation to a URL
   * @param {String} url - URL to transform
   * @param {Object} pathTransformation - Path transformation configuration
   * @returns {String} Transformed URL
   */
  applyPathTransformation(url, pathTransformation) {
    if (!pathTransformation || !pathTransformation.matched) {
      return url;
    }
    
    try {
      // Parse URL to get components
      const parsedUrl = new URL(url, 'http://dummy.com'); // Use dummy base for relative URLs
      
      // Apply path prefix if configured
      if (pathTransformation.pathPrefix && !parsedUrl.pathname.startsWith(pathTransformation.pathPrefix)) {
        parsedUrl.pathname = pathTransformation.pathPrefix + parsedUrl.pathname;
      }
      
      // Return the transformed path with query and fragment
      return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
    } catch (error) {
      logger.warn('Error applying path transformation', {
        url,
        pathTransformation,
        error: error.message
      });
      return url;
    }
  }
  
  /**
   * Check if URL is already transformed
   * @param {String} url - URL to check
   * @param {Object} requestContext - Request context
   * @returns {Boolean} Whether URL is already transformed
   */
  isAlreadyTransformed(url, requestContext) {
    // Check if URL already points to our proxy
    // Only skip if URL already contains the proxy host (not the original domain)
    return url.includes(requestContext.proxyHost) && !url.includes('allabout.network');
  }
  
  /**
   * Check if URL is invalid and should be skipped
   * @param {String} url - URL to check
   * @returns {Boolean} Whether URL is invalid
   */
  isInvalidURL(url) {
    // Skip data URLs, javascript URLs, mailto, etc.
    const invalidPrefixes = ['data:', 'javascript:', 'mailto:', 'tel:', 'sms:', 'blob:'];
    return invalidPrefixes.some(prefix => url.toLowerCase().startsWith(prefix));
  }
  
  /**
   * Check if content is HTML
   * @param {String} contentType - Content type
   * @returns {Boolean} Whether content is HTML
   */
  isHTMLContent(contentType) {
    return contentType && (
      contentType.includes('text/html') ||
      contentType.includes('application/xhtml+xml')
    );
  }
  
  /**
   * Check if content is JavaScript
   * @param {String} contentType - Content type
   * @returns {Boolean} Whether content is JavaScript
   */
  isJavaScriptContent(contentType) {
    return contentType && (
      contentType.includes('application/javascript') ||
      contentType.includes('application/x-javascript') ||
      contentType.includes('text/javascript')
    );
  }
  
  /**
   * Check if content is CSS
   * @param {String} contentType - Content type
   * @returns {Boolean} Whether content is CSS
   */
  isCSSContent(contentType) {
    return contentType && contentType.includes('text/css');
  }
  
  /**
   * Get transformation statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.transformationCache.size,
      maxCacheSize: this.maxCacheSize,
      config: {
        enabled: this.config.enabled,
        transformJavaScript: this.config.transformJavaScript,
        transformCSS: this.config.transformCSS,
        maxContentSize: this.config.maxContentSize
      }
    };
  }
  
  /**
   * Clear transformation cache
   */
  clearCache() {
    this.transformationCache.clear();
    this.patternCache.clear();
    logger.info('URL transformation cache cleared');
  }
  
  /**
   * Shutdown and cleanup
   */
  shutdown() {
    this.clearCache();
    logger.info('URL Transformer shutting down');
  }
}

module.exports = URLTransformer;
