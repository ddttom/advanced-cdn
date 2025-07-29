// cache-manager.js
const NodeCache = require('node-cache');
const logger = require('./logger').getModuleLogger('cache-manager');
const config = require('./config');

class CacheManager {
  constructor() {
    this.enabled = config.cache.enabled;
    
    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: config.cache.defaultTtl,
      checkperiod: config.cache.checkPeriod,
      maxKeys: config.cache.maxItems,
      useClones: false // For better performance with large responses
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0
    };
    
    logger.info(`Cache initialized with TTL: ${config.cache.defaultTtl}s, max items: ${config.cache.maxItems}`);
    
    // Set up event handlers
    this.cache.on('set', (key) => {
      this.stats.sets++;
    });
    
    this.cache.on('expired', (key) => {
      logger.debug(`Cache key expired: ${key}`);
    });
    
    this.cache.on('flush', () => {
      logger.info('Cache flushed');
      this.resetStats();
    });
    
    // Periodically log cache stats
    this.statsInterval = setInterval(() => {
      if (config.server.env === 'production') {
        this.logStats();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  /**
   * Generate a cache key from a request
   * @param {Object} req - Express request object
   * @returns {String} Cache key
   */
  generateKey(req) {
    const host = req.headers.host || 'unknown';
    const method = req.method;
    const originalPath = req.originalUrl || req.url;
    
    // Start with basic key components
    let key = `${method}:${host}:${originalPath}`;
    
    // Add path transformation information if available
    if (req.pathTransformation) {
      const transformation = req.pathTransformation;
      // Include both original and transformed paths to ensure uniqueness
      key += `:transformed=${transformation.transformedPath}`;
      key += `:target=${transformation.target}`;
      key += `:matched=${transformation.matched}`;
      
      // Add rule information if a specific rule was applied
      if (transformation.appliedRule) {
        key += `:rule=${transformation.appliedRule.pattern}`;
      }
    }
    
    // Add vary headers if present
    const varyHeader = req.headers.vary;
    if (varyHeader) {
      const varyFields = varyHeader.split(',').map(field => field.trim());
      for (const field of varyFields) {
        const fieldValue = req.headers[field.toLowerCase()];
        if (fieldValue) {
          key += `:${field}=${fieldValue}`;
        }
      }
    }
    
    // Add common headers that affect caching
    const acceptEncoding = req.headers['accept-encoding'];
    if (acceptEncoding) {
      key += `:encoding=${acceptEncoding}`;
    }
    
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage) {
      key += `:lang=${acceptLanguage.split(',')[0].trim()}`;
    }
    
    return key;
  }
  
  /**
   * Check if a request should be cached
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Boolean} Whether the response should be cached
   */
  shouldCache(req, res) {
    if (!this.enabled) return false;
    
    // Only cache GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return false;
    }
    
    // Don't cache if status code shouldn't be cached
    if (!config.cache.cacheableStatusCodes.includes(res.statusCode)) {
      return false;
    }
    
    // Don't cache private responses or no-store if respecting cache control
    if (config.cache.respectCacheControl && res.get('Cache-Control')) {
      const cacheControl = res.get('Cache-Control').toLowerCase();
      if (cacheControl.includes('no-store') || 
          (cacheControl.includes('private') && !config.cache.cacheCookies)) {
        return false;
      }
    }
    
    // Check content type
    const contentType = res.get('Content-Type');
    if (contentType) {
      const mainType = contentType.split(';')[0].trim().toLowerCase();
      if (!config.cache.cacheableContentTypes.some(type => mainType.includes(type))) {
        return false;
      }
    }
    
    // Don't cache if the response has cookies and we're not configured to cache them
    if (!config.cache.cacheCookies && res.get('Set-Cookie')) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get TTL from Cache-Control header or use default
   * @param {Object} res - Express response object
   * @returns {Number} TTL in seconds
   */
  getTtl(res) {
    if (!config.cache.respectCacheControl) {
      return config.cache.defaultTtl;
    }
    
    const cacheControl = res.get('Cache-Control');
    if (!cacheControl) {
      return config.cache.defaultTtl;
    }
    
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    if (maxAgeMatch) {
      const maxAge = parseInt(maxAgeMatch[1], 10);
      return Math.min(maxAge, config.cache.maxTtl);
    }
    
    return config.cache.defaultTtl;
  }
  
  /**
   * Get a cached response
   * @param {String} key - Cache key
   * @returns {Object|null} Cached response or null if not found
   */
  get(key) {
    if (!this.enabled) return null;
    
    try {
      const cached = this.cache.get(key);
      if (cached) {
        this.stats.hits++;
        logger.debug(`Cache hit: ${key}`);
        return cached;
      } else {
        this.stats.misses++;
        logger.debug(`Cache miss: ${key}`);
        return null;
      }
    } catch (err) {
      this.stats.errors++;
      logger.error(`Cache get error: ${err.message}`);
      return null;
    }
  }
  
  /**
   * Store a response in cache
   * @param {String} key - Cache key
   * @param {Object} data - Response data to cache
   * @param {Number} ttl - TTL in seconds
   * @returns {Boolean} Success status
   */
  set(key, data, ttl = config.cache.defaultTtl) {
    if (!this.enabled) return false;
    
    try {
      // Apply configured max TTL
      const finalTtl = Math.min(ttl, config.cache.maxTtl);
      
      // Store in cache
      const success = this.cache.set(key, data, finalTtl);
      if (success) {
        logger.debug(`Cached: ${key} (TTL: ${finalTtl}s)`);
      } else {
        logger.warn(`Failed to cache: ${key}`);
      }
      
      return success;
    } catch (err) {
      this.stats.errors++;
      logger.error(`Cache set error: ${err.message}`);
      return false;
    }
  }
  
  /**
   * Purge cache by key or pattern
   * @param {String} pattern - Key or pattern to purge (* for all)
   * @param {String} domain - Optional domain filter
   * @returns {Object} Result with count of purged items
   */
  purge(pattern = '*', domain = null) {
    if (!this.enabled) return { purged: 0 };
    
    try {
      if (pattern === '*' && !domain) {
        const count = this.cache.keys().length;
        this.cache.flushAll();
        logger.info(`Purged entire cache (${count} items)`);
        return { purged: count };
      } else {
        const keys = this.cache.keys().filter(key => {
          // Domain filtering
          if (domain) {
            const keyParts = key.split(':');
            if (keyParts.length < 2 || keyParts[1] !== domain) {
              return false;
            }
          }
          
          // Pattern matching
          if (pattern === '*') {
            return true;
          } else if (pattern.includes('*')) {
            // Convert glob pattern to regex
            const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return regexPattern.test(key);
          } else {
            return key.includes(pattern);
          }
        });
        
        keys.forEach(key => this.cache.del(key));
        const domainInfo = domain ? ` for domain ${domain}` : '';
        logger.info(`Purged ${keys.length} items matching pattern: ${pattern}${domainInfo}`);
        return { purged: keys.length, keys, domain, pattern };
      }
    } catch (err) {
      this.stats.errors++;
      logger.error(`Cache purge error: ${err.message}`);
      return { purged: 0, error: err.message };
    }
  }
  
  /**
   * Purge cache for a specific domain
   * @param {String} domain - Domain to purge cache for
   * @returns {Object} Result with count of purged items
   */
  purgeDomain(domain) {
    return this.purge('*', domain);
  }
  
  /**
   * Purge cache for path transformations
   * @param {String} domain - Domain to purge
   * @param {String} pathPattern - Path pattern to match
   * @returns {Object} Result with count of purged items
   */
  purgePathTransformation(domain, pathPattern = '*') {
    if (!this.enabled) return { purged: 0 };
    
    try {
      const keys = this.cache.keys().filter(key => {
        const keyParts = key.split(':');
        
        // Check domain match
        if (keyParts.length < 2 || keyParts[1] !== domain) {
          return false;
        }
        
        // Check if this is a transformed path (contains 'transformed=' in key)
        if (!key.includes('transformed=')) {
          return false;
        }
        
        // Check path pattern if specified
        if (pathPattern !== '*') {
          const pathMatch = key.match(/transformed=([^:]+)/);
          if (pathMatch) {
            const transformedPath = pathMatch[1];
            if (pathPattern.includes('*')) {
              const regexPattern = new RegExp('^' + pathPattern.replace(/\*/g, '.*') + '$');
              return regexPattern.test(transformedPath);
            } else {
              return transformedPath.includes(pathPattern);
            }
          }
        }
        
        return true;
      });
      
      keys.forEach(key => this.cache.del(key));
      logger.info(`Purged ${keys.length} path transformation cache items for domain ${domain}, pattern: ${pathPattern}`);
      return { purged: keys.length, keys, domain, pathPattern, type: 'path-transformation' };
    } catch (err) {
      this.stats.errors++;
      logger.error(`Path transformation cache purge error: ${err.message}`);
      return { purged: 0, error: err.message };
    }
  }
  
  /**
   * Get domain-specific cache statistics
   * @param {String} domain - Optional domain filter
   * @returns {Object} Cache statistics
   */
  getDomainStats(domain = null) {
    const allKeys = this.cache.keys();
    
    if (!domain) {
      return this.getStats();
    }
    
    const domainKeys = allKeys.filter(key => {
      const keyParts = key.split(':');
      return keyParts.length >= 2 && keyParts[1] === domain;
    });
    
    const transformedKeys = domainKeys.filter(key => key.includes('transformed='));
    
    return {
      domain,
      totalKeys: domainKeys.length,
      transformedKeys: transformedKeys.length,
      regularKeys: domainKeys.length - transformedKeys.length,
      sampleKeys: domainKeys.slice(0, 5) // Show first 5 keys as examples
    };
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.stats,
      keys: this.cache.keys().length,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)).toFixed(2)
        : 0,
      ...cacheStats
    };
  }
  
  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0
    };
  }
  
  /**
   * Log cache statistics
   */
  logStats() {
    const stats = this.getStats();
    logger.info('Cache stats', stats);
  }
  
  /**
   * Clean up resources
   */
  shutdown() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    logger.info('Cache manager shutting down');
  }
}

module.exports = new CacheManager();
