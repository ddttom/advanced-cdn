// url-transformer.js
const { URL } = require('url');
const logger = require('../logger').getModuleLogger('url-transformer');

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
        manifest: /(\s+manifest\s*=\s*["']?)([^"'\s>]+)(["']?)/gi,
        
        // Text content URLs (URLs that appear as text, not in attributes)
        textUrls: /(^|[^"'=])(https?:\/\/[^\s<>"']+)/gi
      },
      
      // JavaScript patterns
      javascript: {
        // String literals with URLs - Fixed to properly capture complete URLs
        stringLiterals: /(["'`])(https?:\/\/[^"'`\s]+)\1/gi,
        
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
      logger.warn('URL transformation is disabled', { enabled: this.config.enabled });
      return {
        content,
        transformed: false,
        reason: 'URL transformation disabled'
      };
    }
    
    // Debug logging for transformation entry point
    if (this.config.debugMode) {
      logger.info('🔍 [URL-TRANSFORM] transformContent called', {
        contentType,
        contentLength: content ? content.length : 0,
        requestContext: {
          originalUrl: requestContext?.originalUrl,
          proxyHost: requestContext?.proxyHost,
          protocol: requestContext?.protocol
        }
      });
    }
    
    // Validate request context
    if (!requestContext) {
      logger.error('Invalid request context: requestContext is null or undefined');
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
      
      if (this.config.debugMode) {
        if (urlsTransformed > 0) {
          logger.info(`🔍 [URL-TRANSFORM] Transformation completed for ${requestContext.originalUrl}`, {
            contentType,
            urlsTransformed,
            originalSize: contentString.length,
            transformedSize: transformedContent.length,
            proxyHost: requestContext.proxyHost
          });
        } else {
          logger.debug(`🔍 [URL-TRANSFORM] No URLs transformed for ${requestContext.originalUrl}`, {
            contentType,
            contentSize: contentString.length,
            reason: 'No matching URLs found'
          });
        }
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
        // Handle textUrls pattern which has different capture groups
        if (patternName === 'textUrls') {
          // For textUrls: match, prefix (non-attribute context), url
          const actualUrl = url;
          const actualPrefix = prefix;
          
          // Skip if URL is already transformed or invalid
          if (!actualUrl || this.isAlreadyTransformed(actualUrl, requestContext) || this.isInvalidURL(actualUrl)) {
            return match;
          }
          
          const transformedURL = this.transformURL(actualUrl, requestContext);
          if (transformedURL !== actualUrl) {
            urlsTransformed++;
            
            if (this.config.debugMode) {
              logger.info(`🔗 [URL-TRANSFORM] Text URL transformed in ${contentType}:${patternName}`, {
                original: actualUrl,
                transformed: transformedURL,
                context: requestContext.originalUrl,
                proxyHost: requestContext.proxyHost
              });
            }
            
            return `${actualPrefix}${transformedURL}`;
          }
          
          return match;
        } else if (patternName === 'stringLiterals') {
          // Handle JavaScript string literals: match, quote, url
          const quote = prefix; // First capture group is the quote
          const actualUrl = url; // Second capture group is the URL
          
          // Skip if URL is already transformed or invalid
          if (!actualUrl || this.isAlreadyTransformed(actualUrl, requestContext) || this.isInvalidURL(actualUrl)) {
            return match;
          }
          
          const transformedURL = this.transformURL(actualUrl, requestContext);
          if (transformedURL !== actualUrl) {
            urlsTransformed++;
            
            if (this.config.debugMode) {
              logger.info(`🔗 [URL-TRANSFORM] URL transformed in ${contentType}:${patternName}`, {
                original: actualUrl,
                transformed: transformedURL,
                context: requestContext.originalUrl,
                proxyHost: requestContext.proxyHost
              });
            }
            
            return `${quote}${transformedURL}${quote}`;
          }
          
          return match;
        } else {
          // Handle standard attribute patterns with 3 capture groups
          // Skip if URL is already transformed or invalid
          if (!url || this.isAlreadyTransformed(url, requestContext) || this.isInvalidURL(url)) {
            return match;
          }
          
          const transformedURL = this.transformURL(url, requestContext);
          if (transformedURL !== url) {
            urlsTransformed++;
            
            if (this.config.debugMode) {
              logger.info(`🔗 [URL-TRANSFORM] URL transformed in ${contentType}:${patternName}`, {
                original: url,
                transformed: transformedURL,
                context: requestContext.originalUrl,
                proxyHost: requestContext.proxyHost
              });
            }
            
            return `${prefix}${transformedURL}${suffix || ''}`;
          }
          
          return match;
        }
      } catch (error) {
        logger.warn('Pattern application error', {
          error: error.message,
          pattern: patternName,
          url: url || 'undefined',
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
    if (this.config.debugMode) {
      logger.debug('🔄 [URL-TRANSFORM] transformURL called', {
        url,
        requestContext: {
          proxyHost: requestContext?.proxyHost,
          protocol: requestContext?.protocol,
          originalUrl: requestContext?.originalUrl
        }
      });
    }

    // Validate input URL
    if (!url || typeof url !== 'string') {
      logger.warn('Invalid URL provided for transformation', { url, type: typeof url });
      return url || '';
    }
    
    // Check cache first - include protocol for protocol-aware caching
    const cacheKey = `${url}:${requestContext.proxyHost}:${requestContext.protocol || 'https'}:${requestContext.pathTransformation?.target || ''}`;
    if (this.transformationCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.transformationCache.get(cacheKey);
    }
    
    this.stats.cacheMisses++;
    
    try {
      const transformedURL = this.buildProxyURL(url, requestContext);
      
      // Validate the transformed URL before caching
      if (transformedURL && transformedURL !== url) {
        try {
          // Test if the transformed URL is valid
          new URL(transformedURL);
        } catch (validationError) {
          logger.warn('Transformed URL is invalid, returning original', {
            original: url,
            transformed: transformedURL,
            error: validationError.message
          });
          return url;
        }
      }
      
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
        context: requestContext.originalUrl,
        stack: error.stack
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
    
    if (this.config.debugMode) {
      logger.debug('🔗 [URL-TRANSFORM] buildProxyURL called', {
        originalURL,
        proxyHost,
        protocol,
        pathTransformation: pathTransformation ? 'present' : 'missing'
      });
    }
    
    // Handle different URL types
    if (originalURL.startsWith('//')) {
      // Protocol-relative URL
      const fullURL = `${protocol}:${originalURL}`;
      return this.buildAbsoluteProxyURL(fullURL, proxyHost, pathTransformation, requestContext);
    } else if (originalURL.startsWith('http://') || originalURL.startsWith('https://')) {
      // Absolute URL
      return this.buildAbsoluteProxyURL(originalURL, proxyHost, pathTransformation, requestContext);
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
  buildAbsoluteProxyURL(absoluteURL, proxyHost, pathTransformation, requestContext) {
    try {
      // Add validation for required parameters
      if (!absoluteURL || !proxyHost) {
        logger.warn('Missing required parameters for buildAbsoluteProxyURL', {
          absoluteURL,
          proxyHost,
          pathTransformation
        });
        return absoluteURL;
      }
      
      const parsedURL = new URL(absoluteURL);
      const hostname = parsedURL.hostname;
      
      if (this.config.debugMode) {
        const shouldProxy = this.shouldProxyDomain(hostname, pathTransformation);
        logger.debug(`🔗 [URL-TRANSFORM] Analyzing URL: ${absoluteURL}`, {
          hostname,
          proxyHost,
          shouldProxy,
          reason: shouldProxy ? 'Domain matches transformation rules' : 'External domain - no transformation'
        });
      }
      
      // Check if this is a URL that should be routed through the proxy
      if (this.shouldProxyDomain(hostname, pathTransformation)) {
        // Route through proxy with appropriate path transformation
        const transformedPath = this.getTransformedPathForDomain(hostname, parsedURL.pathname, pathTransformation);
        const queryString = this.config.preserveQueryParams ? parsedURL.search : '';
        const fragment = this.config.preserveFragments ? parsedURL.hash : '';
        
        // Fix: Use request protocol for consistency (HTTP/HTTPS matching)
        // If user arrives via HTTP, transform URLs to HTTP; if HTTPS, transform to HTTPS
        const requestProtocol = requestContext?.protocol || 'https'; // Default to https if not specified
        const proxyURL = `${requestProtocol}://${proxyHost}${transformedPath}${queryString}${fragment}`;
        
        if (this.config.debugMode) {
          logger.debug('Building proxy URL with protocol matching', {
            originalURL: absoluteURL,
            requestProtocol,
            proxyHost,
            transformedPath,
            proxyURL
          });
        }
        
        // Validate the constructed URL to ensure it's well-formed
        try {
          new URL(proxyURL); // This will throw if the URL is malformed
        } catch (validationError) {
          logger.warn('Constructed proxy URL is malformed, returning original', {
            original: absoluteURL,
            attempted: proxyURL,
            error: validationError.message
          });
          return absoluteURL;
        }
        
        if (this.config.debugMode) {
          logger.debug('URL transformed', {
            original: absoluteURL,
            transformed: proxyURL,
            transformedPath,
            hostname,
            protocol: parsedURL.protocol,
            proxyHost
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
      logger.warn('Error parsing absolute URL', { 
        url: absoluteURL, 
        error: error.message,
        stack: error.stack,
        proxyHost,
        pathTransformation,
        requestContext: {
          originalUrl: requestContext?.originalUrl,
          proxyHost: requestContext?.proxyHost,
          protocol: requestContext?.protocol
        }
      });
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
    const config = require('../config');
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
    // Use originDomain from context if available (for dynamic hostname mode)
    const originDomain = requestContext.originDomain || requestContext.proxyHost;
    return url.includes(requestContext.proxyHost) && !url.includes(originDomain);
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
