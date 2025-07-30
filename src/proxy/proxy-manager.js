// proxy-manager.js
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');
const logger = require('../logger').getModuleLogger('proxy-manager');
const cacheManager = require('../cache/cache-manager');
const domainManager = require('../domain/domain-manager');
const fileResolver = require('../domain/file-resolver');
const transformerManager = require('../transform/transformers');
const fileResolutionCache = require('../cache/file-resolution-cache');
const URLTransformer = require('../transform/url-transformer');
const ComputeFunctionManager = require('../transform/compute/compute-function-manager');
const https = require('https');
const zlib = require('zlib');

class ProxyManager {
  constructor() {
    this.targetProtocol = config.cdn.targetHttps ? 'https' : 'http';
    this.targetUrl = `${this.targetProtocol}://${config.cdn.targetDomain}`;
    this.pathRewritingEnabled = config.pathRewriting.enabled;
    
    logger.info(`Proxy target configured as: ${this.targetUrl}`);
    if (this.pathRewritingEnabled) {
      logger.info('Domain-aware path rewriting enabled');
    }
    
    // Create HTTPS agent with keep-alive and connection pooling
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      timeout: config.performance.timeout,
      rejectUnauthorized: true // Validate SSL certs
    });
    
    // Initialize URL transformer
    this.urlTransformer = new URLTransformer(config.urlTransformation || {});
    this.logURLTransformationStatus();
    
    // Initialize compute function manager
    this.computeFunctionManager = null;
    if (config.computeFunctions?.enabled) {
      this.computeFunctionManager = new ComputeFunctionManager(config.computeFunctions);
      logger.info('Compute function manager initialized');
    }
    
    // Create proxy middleware
    this.proxy = this.createProxyMiddleware();
  }
  
  /**
   * Check if a request is for a JavaScript file
   * @param {Object} req - Express request
   * @returns {Boolean} True if requesting JavaScript
   */
  isJavaScriptRequest(req) {
    const url = req.url || req.path || '';
    const acceptHeader = req.headers.accept || '';
    
    // Check file extension
    if (url.endsWith('.js') || url.endsWith('.mjs') || url.endsWith('.jsx')) {
      return true;
    }
    
    // Check Accept header for JavaScript MIME types
    if (acceptHeader.includes('application/javascript') || 
        acceptHeader.includes('text/javascript') || 
        acceptHeader.includes('application/x-javascript')) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a request is for a CSS file
   * @param {Object} req - Express request
   * @returns {Boolean} True if requesting CSS
   */
  isCSSRequest(req) {
    const url = req.url || req.path || '';
    const acceptHeader = req.headers.accept || '';
    
    // Check file extension
    if (url.endsWith('.css')) {
      return true;
    }
    
    // Check Accept header for CSS MIME types
    if (acceptHeader.includes('text/css')) {
      return true;
    }
    
    return false;
  }

  /**
   * Get target URL for a request based on domain routing
   * @param {Object} req - Express request
   * @returns {String} Target URL
   */
  getTargetForRequest(req) {
    if (!this.pathRewritingEnabled) {
      return this.targetUrl;
    }
    
    const host = req.headers.host;
    const targetBackend = domainManager.getTargetBackend(host);
    const targetProtocol = config.cdn.targetHttps ? 'https' : 'http';
    
    return `${targetProtocol}://${targetBackend}`;
  }
  
  /**
   * Rewrite path for a request based on domain routing rules
   * @param {String} path - Original path
   * @param {Object} req - Express request
   * @returns {String} Rewritten path
   */
  rewritePathForRequest(path, req) {
    if (!this.pathRewritingEnabled) {
      return path;
    }
    
    // Use path transformation from domain manager if available
    if (req.pathTransformation) {
      const transformedPath = req.pathTransformation.transformedPath;
      logger.debug(`Path rewritten: ${path} → ${transformedPath} for ${req.headers.host}`);
      return transformedPath;
    }
    
    // Fallback to original path
    return path;
  }
  
  /**
   * Create the proxy middleware with all options
   * @returns {Function} Configured proxy middleware
   */
  createProxyMiddleware() {
    const proxyOptions = {
      target: this.targetUrl, // Default target, will be overridden dynamically
      changeOrigin: true,
      agent: this.targetProtocol === 'https' ? this.httpsAgent : undefined,
      xfwd: true, // Add x-forwarded-* headers
      hostRewrite: config.cdn.targetDomain, // Default host rewrite
      autoRewrite: true,
      followRedirects: false, // Let the client handle redirects
      selfHandleResponse: true, // We'll handle the response for caching
      timeout: config.performance.timeout,
      proxyTimeout: config.performance.timeout,
      
      // Dynamic router function for path rewriting
      router: (req) => {
        return this.getTargetForRequest(req);
      },
      
      // Path rewrite function
      pathRewrite: (path, req) => {
        return this.rewritePathForRequest(path, req);
      },
      
      // Handle proxy errors
      onError: (err, req, res) => {
        logger.error(`Proxy error: ${err.message}`, { 
          url: req.url, 
          method: req.method,
          host: req.headers.host,
          error: err.message,
          pathTransformation: req.pathTransformation
        });
        
        // Handle timeouts specifically
        if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
          res.status(504).send('Gateway Timeout');
        } else {
          res.status(502).send('Bad Gateway');
        }
      },
      
      // Manipulate request before sending to target
      onProxyReq: (proxyReq, req, res) => {
        // Add custom request headers
        proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
        proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
        proxyReq.setHeader('X-Proxy-Name', config.cdn.cdnName);
        
        // Add path rewriting information to headers
        if (req.pathTransformation) {
          proxyReq.setHeader('X-Original-Path', req.pathTransformation.originalPath);
          proxyReq.setHeader('X-Transformed-Path', req.pathTransformation.transformedPath);
          proxyReq.setHeader('X-Path-Rewrite-Matched', req.pathTransformation.matched.toString());
        }
        
        // Set Via header (per HTTP spec)
        const existingVia = proxyReq.getHeader('Via');
        const viaValue = existingVia
          ? `${existingVia}, 1.1 ${config.cdn.cdnName}`
          : `1.1 ${config.cdn.cdnName}`;
        proxyReq.setHeader('Via', viaValue);
        
        // Log proxy request with path transformation info
        const targetUrl = this.getTargetForRequest(req);
        const finalPath = this.rewritePathForRequest(req.url, req);
        logger.debug(`Proxying: ${req.method} ${req.headers.host}${req.url} -> ${targetUrl}${finalPath}`);
      },
      
      // Handle response from target
      onProxyRes: (proxyRes, req, res) => {
        // Handle 404 responses for JavaScript and CSS files to prevent browser syntax errors
        if (proxyRes.statusCode === 404) {
          if (this.isJavaScriptRequest(req)) {
            logger.debug(`Handling 404 for JavaScript file: ${req.url}`);
            res.status(404);
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('X-Served-By', config.cdn.cdnName);
            res.setHeader('X-Cache', 'MISS');
            res.end('/* File not found: ' + req.url + ' */');
            return;
          } else if (this.isCSSRequest(req)) {
            logger.debug(`Handling 404 for CSS file: ${req.url}`);
            res.status(404);
            res.setHeader('Content-Type', 'text/css');
            res.setHeader('X-Served-By', config.cdn.cdnName);
            res.setHeader('X-Cache', 'MISS');
            res.end('/* File not found: ' + req.url + ' */');
            return;
          }
        }
        
        // Set up response headers
        this.setupResponseHeaders(proxyRes, req, res);
        
        // Handle the response data
        this.handleProxyResponse(proxyRes, req, res);
      }
    };
    
    return createProxyMiddleware(proxyOptions);
  }
  
  /**
   * Set up response headers
   * @param {Object} proxyRes - Proxy response
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  setupResponseHeaders(proxyRes, req, res) {
    // Detect if we'll decompress this response
    const contentEncoding = proxyRes.headers['content-encoding'];
    const willDecompress = contentEncoding && (
      contentEncoding.includes('gzip') || 
      contentEncoding.includes('deflate') || 
      contentEncoding.includes('br')
    );
    
    logger.debug('setupResponseHeaders: analyzing response for decompression', {
      url: req.url,
      contentEncoding: contentEncoding,
      willDecompress: willDecompress,
      originalContentLength: proxyRes.headers['content-length']
    });
    
    // Copy all headers from proxy response, excluding problematic ones
    Object.keys(proxyRes.headers).forEach(key => {
      const value = proxyRes.headers[key];
      // Skip server, connection, and conditionally skip content-length
      if (key === 'server' || key === 'connection') {
        return; // Always skip these
      }
      
      // Skip content-length if we'll decompress (we'll set it correctly later)
      if (key === 'content-length' && willDecompress) {
        logger.debug('Skipping content-length header for compressed response that will be decompressed', {
          url: req.url,
          originalContentLength: value,
          contentEncoding: contentEncoding
        });
        return;
      }
      
      res.setHeader(key, value);
    });
    
    // Add CDN headers
    res.setHeader('X-Served-By', config.cdn.cdnName);
    
    // Set backend information based on path transformation
    if (req.pathTransformation) {
      res.setHeader('X-Cache-Backend', req.pathTransformation.target);
      res.setHeader('X-Path-Rewrite-Applied', req.pathTransformation.matched.toString());
      if (req.pathTransformation.fallbackUsed) {
        res.setHeader('X-Path-Rewrite-Fallback', 'true');
      }
    } else {
      res.setHeader('X-Cache-Backend', config.cdn.targetDomain);
    }
    
    // Set Via header (per HTTP spec)
    const existingVia = res.getHeader('Via');
    const viaValue = existingVia
      ? `${existingVia}, 1.1 ${config.cdn.cdnName}`
      : `1.1 ${config.cdn.cdnName}`;
    res.setHeader('Via', viaValue);
    
    // Cache status header (will be updated later if we're serving from cache)
    res.setHeader('X-Cache', 'MISS');
    
    // Add security headers if enabled
    if (config.security.headers) {
      // Standard security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      
      // Origin-Agent-Cluster header to prevent browser warnings
      res.setHeader('Origin-Agent-Cluster', '?1');
      
      // Content Security Policy if configured
      if (config.security.contentSecurityPolicy) {
        res.setHeader('Content-Security-Policy', config.security.contentSecurityPolicy);
      }
    }
    
    // Set status code
    res.status(proxyRes.statusCode);
  }
  
  /**
   * Handle proxy response data
   * @param {Object} proxyRes - Proxy response
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async handleProxyResponse(proxyRes, req, res) {
    const cacheKey = cacheManager.generateKey(req);
    const statusCode = proxyRes.statusCode;
    const shouldCache = cacheManager.shouldCache(req, res);
    const contentEncoding = proxyRes.headers['content-encoding'];
    const contentType = proxyRes.headers['content-type'] || '';
    let chunks = [];
    let responseHandled = false; // Track if response has been sent
    
    proxyRes.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    proxyRes.on('end', async () => {
      // Early exit if response has already been handled
      if (responseHandled) {
        logger.debug('Response already handled, skipping duplicate processing', {
          url: req.url,
          method: req.method
        });
        return;
      }
      
      // Combine chunks
      let body = Buffer.concat(chunks);
      
      // Handle compressed responses
      let decompressionSuccessful = false;
      let originalBody = body;
      
      if (contentEncoding) {
        try {
          logger.debug(`Attempting decompression for content-encoding: ${contentEncoding}`, {
            url: req.url,
            contentType: contentType,
            bodySize: body.length,
            encoding: contentEncoding
          });
          
          // Decompress for caching (we'll recompress when serving)
          if (contentEncoding.includes('gzip')) {
            body = zlib.gunzipSync(body);
            decompressionSuccessful = true;
            logger.debug(`Gzip decompression successful`, {
              url: req.url,
              originalSize: originalBody.length,
              decompressedSize: body.length
            });
          } else if (contentEncoding.includes('deflate')) {
            body = zlib.inflateSync(body);
            decompressionSuccessful = true;
            logger.debug(`Deflate decompression successful`, {
              url: req.url,
              originalSize: originalBody.length,
              decompressedSize: body.length
            });
          } else if (contentEncoding.includes('br')) {
            body = zlib.brotliDecompressSync(body);
            decompressionSuccessful = true;
            logger.debug(`Brotli decompression successful`, {
              url: req.url,
              originalSize: originalBody.length,
              decompressedSize: body.length
            });
          }
          
          // Remove content-encoding header since we've decompressed
          if (decompressionSuccessful) {
            res.removeHeader('content-encoding');
          }
        } catch (err) {
          logger.error(`Decompression error for ${contentEncoding}: ${err.message}`, {
            url: req.url,
            contentType: contentType,
            bodySize: originalBody.length,
            encoding: contentEncoding,
            error: err.stack
          });
          
          // Critical: Reset body to original compressed data
          body = originalBody;
          decompressionSuccessful = false;
          
          // For JavaScript files, this is a critical error that will break the browser
          if (contentType.includes('javascript') || contentType.includes('js') || req.url.endsWith('.js')) {
            logger.error(`Critical: JavaScript file decompression failed - this will cause browser syntax errors`, {
              url: req.url,
              contentType: contentType,
              encoding: contentEncoding
            });
            
            // Return 502 Bad Gateway for JavaScript files that can't be decompressed
            // This prevents serving corrupted JS that breaks the browser
            if (!res.headersSent && !responseHandled) {
              responseHandled = true; // Mark response as handled
              res.status(502);
              res.setHeader('Content-Type', 'text/plain');
              res.end('Bad Gateway: Unable to decompress JavaScript content');
            }
            return;
          }
          
          // For other content types, serve compressed data with original headers
          logger.warn(`Serving compressed content as-is due to decompression failure`, {
            url: req.url,
            contentType: contentType,
            encoding: contentEncoding
          });
        }
      }
      
      // Convert buffer to string for certain content types
      let responseData = body;
      if (contentType.includes('json') || 
          contentType.includes('text') || 
          contentType.includes('xml') || 
          contentType.includes('html')) {
        try {
          responseData = body.toString('utf8');
        } catch (err) {
          logger.error(`Error converting buffer to string: ${err.message}`);
          // Keep as buffer if conversion fails
        }
      }
      
      // Apply compute functions if enabled and content is processable
      if (typeof responseData === 'string' && this.computeFunctionManager) {
        try {
          const requestContext = {
            originalUrl: req.url,
            proxyHost: req.headers.host,
            pathTransformation: req.pathTransformation,
            protocol: req.protocol || 'https',
            domainManager: domainManager
          };
          
          const computeResult = await this.computeFunctionManager.processContent(
            responseData,
            contentType,
            requestContext
          );
          
          if (computeResult.modified) {
            responseData = computeResult.content;
            body = Buffer.from(responseData, 'utf8');
            
            logger.info('Compute functions applied', {
              url: req.url,
              contentType,
              totalModifications: computeResult.totalModifications,
              functionsExecuted: computeResult.functionsExecuted,
              processingTime: computeResult.totalProcessingTime,
              functions: computeResult.results.map(r => ({
                name: r.computeFunction,
                success: r.success,
                modified: r.modified
              }))
            });
          }
        } catch (computeError) {
          logger.error('Compute function processing error', {
            url: req.url,
            error: computeError.message,
            contentType,
            stack: computeError.stack
          });
          // Continue with original content on compute error
        }
      }
      
      // Apply URL transformation if content is transformable
      if (typeof responseData === 'string' && this.urlTransformer) {
        try {
          const requestContext = {
            originalUrl: req.url,
            proxyHost: req.headers.host,
            pathTransformation: req.pathTransformation,
            protocol: req.protocol || 'https',
            domainManager: domainManager
          };
          
          // Log request-level transformation attempt
          if (config.urlTransformation?.debugMode) {
            logger.info(`🔍 [URL-TRANSFORM] Processing request: ${req.method} ${req.url}`, {
              contentType,
              contentSize: responseData.length,
              proxyHost: req.headers.host,
              pathTransformation: req.pathTransformation ? 'enabled' : 'disabled'
            });
          }
          
          const transformResult = await this.urlTransformer.transformContent(
            responseData,
            contentType,
            requestContext
          );
          
          if (transformResult.transformed) {
            responseData = transformResult.content;
            body = Buffer.from(responseData, 'utf8');
            
            logger.info(`✅ [URL-TRANSFORM] Applied to ${req.url}`, {
              urlsTransformed: transformResult.urlsTransformed,
              originalSize: transformResult.originalSize,
              transformedSize: transformResult.transformedSize,
              contentType
            });
          } else if (config.urlTransformation?.debugMode) {
            logger.debug(`⏭️  [URL-TRANSFORM] Skipped ${req.url}`, {
              reason: transformResult.reason || transformResult.error || 'No URLs to transform',
              contentType,
              contentSize: responseData.length
            });
          }
        } catch (transformError) {
          logger.error(`❌ [URL-TRANSFORM] Error processing ${req.url}`, {
            error: transformError.message,
            contentType,
            stack: transformError.stack
          });
          // Continue with original content on transformation error
        }
      }
      
      // Cache the response if needed
      if (shouldCache) {
        const ttl = cacheManager.getTtl(res);
        const cacheData = {
          status: statusCode,
          headers: res.getHeaders(),
          body: responseData,
          originalEncoding: contentEncoding,
          pathTransformation: req.pathTransformation // Include path transformation info in cache
        };
        
        cacheManager.set(cacheKey, cacheData, ttl);
      }
      
      // Send the response only if not already handled
      if (!responseHandled && !res.headersSent) {
        responseHandled = true; // Mark response as handled
        
        // Always set proper Content-Length header based on actual body size
        res.setHeader('Content-Length', body.length);
        
        logger.debug('Setting final response headers and body', {
          url: req.url,
          bodySize: body.length,
          contentEncoding: contentEncoding,
          decompressionSuccessful: decompressionSuccessful,
          originalBodySize: originalBody.length
        });
        
        if (req.method !== 'HEAD') {
          res.end(body);
        } else {
          res.end();
        }
      }
    });
  }
  
  /**
   * Handle a request from cache
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {String} cacheKey - Cache key
   * @returns {Boolean} Whether the request was served from cache
   */
  handleCachedRequest(req, res, cacheKey) {
    if (!config.cache.enabled) return false;
    
    const cached = cacheManager.get(cacheKey);
    if (!cached) return false;
    
    // Set status code
    res.status(cached.status);
    
    // Set headers
    Object.keys(cached.headers).forEach(key => {
      if (key !== 'content-length') { // We'll set this based on the actual content
        res.setHeader(key, cached.headers[key]);
      }
    });
    
    // Update cache headers
    res.setHeader('X-Cache', 'HIT');
    
    // Add path transformation headers if available
    if (cached.pathTransformation) {
      res.setHeader('X-Cache-Path-Rewrite-Applied', cached.pathTransformation.matched.toString());
      res.setHeader('X-Cache-Backend', cached.pathTransformation.target);
    }
    
    // If original response was compressed, we need to re-compress
    let responseBody = cached.body;
    if (cached.originalEncoding && typeof cached.body !== 'string') {
      try {
        if (cached.originalEncoding.includes('gzip')) {
          responseBody = zlib.gzipSync(responseBody);
          res.setHeader('content-encoding', 'gzip');
        } else if (cached.originalEncoding.includes('deflate')) {
          responseBody = zlib.deflateSync(responseBody);
          res.setHeader('content-encoding', 'deflate');
        } else if (cached.originalEncoding.includes('br')) {
          responseBody = zlib.brotliCompressSync(responseBody);
          res.setHeader('content-encoding', 'br');
        }
      } catch (err) {
        logger.error(`Compression error: ${err.message}`);
        // If compression fails, we'll serve uncompressed
        res.removeHeader('content-encoding');
      }
    }
    
    // Send the response
    if (req.method !== 'HEAD') {
      res.end(responseBody);
    } else {
      res.end();
    }
    
    return true;
  }
  
  /**
   * Handle file resolution for extensionless requests
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @returns {Boolean} True if file was resolved and served
   */
  async handleFileResolution(req, res) {
    try {
      // Check if file resolution is enabled
      if (!config.fileResolution.enabled) {
        return false;
      }
      
      // Only attempt file resolution for GET and HEAD requests
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return false;
      }
      
      const domain = req.headers.host;
      const originalPath = req.url.split('?')[0]; // Remove query parameters
      
      // Skip if path already has an extension
      if (originalPath.includes('.') && !originalPath.endsWith('/')) {
        return false;
      }
      
      // Get the transformed path from path rewriter
      const transformedPath = req.pathTransformation ? 
        req.pathTransformation.transformedPath : originalPath;
      
      // Get target domain
      const targetDomain = this.getTargetForRequest(req).replace(/^https?:\/\//, '');
      
      // Create base URL for file resolution
      const protocol = config.cdn.targetHttps ? 'https' : 'http';
      const baseUrl = `${protocol}://${targetDomain}${transformedPath}`;
      
      logger.debug('Attempting file resolution', {
        domain,
        originalPath,
        transformedPath,
        targetDomain,
        baseUrl,
        method: req.method
      });
      
      // Check file resolution cache first
      const cacheKey = fileResolutionCache.generateKey(baseUrl, config.fileResolution.getDomainConfig(domain).extensions);
      const cachedResult = fileResolutionCache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('File resolution cache hit', {
          domain,
          baseUrl,
          success: cachedResult.success,
          cacheAge: cachedResult.cacheAge
        });
        
        if (!cachedResult.success) {
          return false; // Cached negative result
        }
        
        // Serve cached positive result
        return await this.serveResolvedFile(req, res, cachedResult, true);
      }
      
      // Attempt to resolve the file using our file resolver
      const resolution = await fileResolver.resolveFile(baseUrl, domain);
      
      // Cache the resolution result
      fileResolutionCache.set(cacheKey, resolution);
      
      if (!resolution.success) {
        logger.debug('File resolution failed - no file found', {
          domain,
          originalPath,
          transformedPath,
          baseUrl,
          error: resolution.error
        });
        return false;
      }
      
      logger.info('File resolution successful', {
        domain,
        originalPath,
        transformedPath,
        resolvedUrl: resolution.resolvedUrl,
        extension: resolution.extension,
        contentType: resolution.contentType
      });
      
      // Serve the resolved file
      return await this.serveResolvedFile(req, res, resolution, false);
      
    } catch (error) {
      logger.error('File resolution error', {
        domain: req.headers.host,
        path: req.url,
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  
  /**
   * Serve a resolved file with optional transformation
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Object} resolution - File resolution result
   * @param {Boolean} fromCache - Whether this is from cache
   * @returns {Boolean} True if served successfully
   */
  async serveResolvedFile(req, res, resolution, fromCache = false) {
    try {
      const domain = req.headers.host;
      const domainConfig = config.fileResolution.getDomainConfig(domain);
      
      // Fetch content if not cached or if we need to transform
      let content = resolution.content;
      if (!content) {
        content = await this.fetchContentFromUrl(resolution.resolvedUrl);
        if (!content) {
          logger.warn('Failed to fetch resolved file content', {
            resolvedUrl: resolution.resolvedUrl
          });
          return false;
        }
      }
      
      // Determine if transformation is needed
      const needsTransformation = domainConfig.transformers && 
                                 domainConfig.transformers.length > 0 &&
                                 config.fileResolution.transformers.enabled;
      
      let finalContent = content;
      let finalContentType = resolution.contentType || 'text/plain';
      let transformationResult = null;
      
      // Apply transformations if needed
      if (needsTransformation) {
        try {
          transformationResult = await transformerManager.transform(
            content,
            finalContentType,
            resolution.extension,
            domainConfig.transformers,
            {
              url: resolution.resolvedUrl,
              domain,
              originalPath: req.url.split('?')[0]
            }
          );
          
          if (transformationResult.success) {
            finalContent = transformationResult.content;
            finalContentType = transformationResult.contentType;
            
            logger.debug('Content transformation successful', {
              domain,
              transformer: transformationResult.transformer,
              originalSize: content.length,
              transformedSize: finalContent.length,
              duration: transformationResult.duration
            });
          } else {
            logger.warn('Content transformation failed, serving original', {
              domain,
              error: transformationResult.error
            });
          }
        } catch (transformError) {
          logger.error('Content transformation error, serving original', {
            domain,
            error: transformError.message
          });
        }
      }
      
      // Set response headers
      res.setHeader('Content-Type', finalContentType);
      res.setHeader('Content-Length', Buffer.byteLength(finalContent));
      res.setHeader('X-File-Resolution', 'true');
      res.setHeader('X-Resolved-URL', resolution.resolvedUrl);
      res.setHeader('X-Original-Path', req.url.split('?')[0]);
      res.setHeader('X-File-Extension', resolution.extension);
      res.setHeader('X-Cache', fromCache ? 'HIT' : 'MISS');
      
      if (transformationResult && transformationResult.success) {
        res.setHeader('X-Content-Transformed', 'true');
        res.setHeader('X-Transformer', transformationResult.transformer);
      }
      
      // Add standard CDN headers
      res.setHeader('X-Served-By', config.cdn.cdnName);
      
      // Add path transformation headers if available
      if (req.pathTransformation) {
        res.setHeader('X-Path-Rewrite-Applied', req.pathTransformation.matched.toString());
        res.setHeader('X-Cache-Backend', req.pathTransformation.target);
      }
      
      // Add file resolution cache headers
      if (fromCache && resolution.cacheAge) {
        res.setHeader('X-File-Resolution-Cache-Age', Math.floor(resolution.cacheAge / 1000));
      }
      
      // Send response
      res.status(200);
      if (req.method !== 'HEAD') {
        res.end(finalContent);
      } else {
        res.end();
      }
      
      return true;
      
    } catch (error) {
      logger.error('Error serving resolved file', {
        domain: req.headers.host,
        resolvedUrl: resolution.resolvedUrl,
        error: error.message
      });
      return false;
    }
  }
  
  /**
   * Fetch content from a URL
   * @param {String} url - URL to fetch
   * @returns {String|null} Content or null if failed
   */
  async fetchContentFromUrl(url) {
    return new Promise((resolve) => {
      try {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const requestModule = isHttps ? require('https') : require('http');
        const agent = isHttps ? this.httpsAgent : undefined;
        
        const requestOptions = {
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          agent: agent,
          timeout: config.fileResolution.timeout,
          headers: {
            'User-Agent': config.fileResolution.userAgent,
            'Accept': '*/*'
          }
        };
        
        const req = requestModule.request(requestOptions, (res) => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            logger.debug('Failed to fetch content from URL', {
              url,
              statusCode: res.statusCode
            });
            resolve(null);
            return;
          }
          
          let chunks = [];
          
          res.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          res.on('end', () => {
            const content = Buffer.concat(chunks).toString('utf8');
            resolve(content);
          });
        });
        
        req.on('error', (error) => {
          logger.debug('Error fetching content from URL', {
            url,
            error: error.message
          });
          resolve(null);
        });
        
        req.on('timeout', () => {
          req.destroy();
          logger.debug('Timeout fetching content from URL', { url });
          resolve(null);
        });
        
        req.end();
        
      } catch (error) {
        logger.debug('Error creating request for URL', {
          url,
          error: error.message
        });
        resolve(null);
      }
    });
  }
  

  /**
   * Middleware for handling the request
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next function
   */
  async middleware(req, res, next) {
    // Skip non-proxied routes (like health checks)
    if (req.skipProxy) {
      return next();
    }
    
    // Generate cache key (this will use domain-aware key generation)
    const cacheKey = cacheManager.generateKey(req);
    
    // Check cache first
    if (this.handleCachedRequest(req, res, cacheKey)) {
      const pathInfo = req.pathTransformation ? 
        ` (${req.pathTransformation.originalPath} → ${req.pathTransformation.transformedPath})` : '';
      logger.debug(`Served from cache: ${req.method} ${req.headers.host}${req.url}${pathInfo}`);
      return;
    }
    
    // Try file resolution for extensionless requests
    try {
      const fileResolved = await this.handleFileResolution(req, res);
      if (fileResolved) {
        const pathInfo = req.pathTransformation ? 
          ` (${req.pathTransformation.originalPath} → ${req.pathTransformation.transformedPath})` : '';
        logger.debug(`Served from file resolution: ${req.method} ${req.headers.host}${req.url}${pathInfo}`);
        return;
      }
    } catch (error) {
      logger.error('File resolution middleware error', {
        url: req.url,
        method: req.method,
        host: req.headers.host,
        error: error.message
      });
      // Continue with normal proxy flow on file resolution error
    }
    
    // Not in cache and not resolved via file resolution, proxy the request
    this.proxy(req, res, next);
  }
  
  /**
   * Get proxy statistics including path rewriting info
   * @returns {Object} Statistics
   */
  getStats() {
    const stats = {
      pathRewritingEnabled: this.pathRewritingEnabled,
      targetUrl: this.targetUrl
    };
    
    if (this.pathRewritingEnabled) {
      stats.pathRewritingStats = domainManager.getPathRewritingStats();
    }
    
    return stats;
  }
  
  /**
   * Log URL transformation configuration status
   */
  logURLTransformationStatus() {
    const urlConfig = config.urlTransformation;
    const stats = this.urlTransformer.getStats();
    
    logger.info('🔧 URL Transformation Configuration:');
    logger.info(`   - Status: ${urlConfig.enabled ? '✅ ENABLED' : '❌ DISABLED'} (URL_TRANSFORM_ENABLED=${urlConfig.enabled})`);
    
    if (urlConfig.enabled) {
      logger.info(`   - HTML transformation: ${urlConfig.transformHTML ? '✅ ENABLED' : '❌ DISABLED'}`);
      logger.info(`   - JavaScript transformation: ${urlConfig.transformJavaScript ? '✅ ENABLED' : '❌ DISABLED'}`);
      logger.info(`   - CSS transformation: ${urlConfig.transformCSS ? '✅ ENABLED' : '❌ DISABLED'}`);
      logger.info(`   - Inline styles transformation: ${urlConfig.transformInlineStyles ? '✅ ENABLED' : '❌ DISABLED'}`);
      logger.info(`   - Data attributes transformation: ${urlConfig.transformDataAttributes ? '✅ ENABLED' : '❌ DISABLED'}`);
      logger.info(`   - Debug mode: ${urlConfig.debugMode ? '✅ ENABLED' : '❌ DISABLED'}`);
      logger.info(`   - Origin domain: ${config.cdn.originDomain}`);
      logger.info(`   - Target domain: ${config.cdn.targetDomain}`);
      logger.info(`   - Max content size: ${(urlConfig.maxContentSize / 1024 / 1024).toFixed(1)}MB`);
      logger.info(`   - Cache size: ${urlConfig.maxCacheSize.toLocaleString()} entries`);
      logger.info(`   - Preserve fragments: ${urlConfig.preserveFragments ? '✅ YES' : '❌ NO'}`);
      logger.info(`   - Preserve query params: ${urlConfig.preserveQueryParams ? '✅ YES' : '❌ NO'}`);
      
      if (urlConfig.transformableContentTypes && urlConfig.transformableContentTypes.length > 0) {
        logger.info(`   - Transformable content types: ${urlConfig.transformableContentTypes.join(', ')}`);
      }
      
      if (urlConfig.debugMode) {
        logger.info('🔍 URL Transformation Debug Mode: Detailed logging enabled for all transformation operations');
      }
    } else {
      logger.warn('⚠️  URL Transformation is DISABLED - URLs will not be transformed to route through proxy');
      logger.info('   To enable: Set URL_TRANSFORM_ENABLED=true in your .env file');
    }
  }

  /**
   * Clean up resources
   */
  shutdown() {
    if (this.httpsAgent) {
      this.httpsAgent.destroy();
    }
    
    // Shutdown URL transformer
    if (this.urlTransformer) {
      this.urlTransformer.shutdown();
    }
    
    logger.info('Proxy manager shutting down');
  }
}

module.exports = new ProxyManager();
