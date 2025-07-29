// domain-manager.js
const config = require('./config');
const logger = require('./logger').getModuleLogger('domain-manager');
const PathRewriter = require('./path-rewriter');
const fileResolver = require('./file-resolver');
const fileResolutionCache = require('./file-resolution-cache');

class DomainManager {
  constructor() {
    this.strictCheck = config.cdn.strictDomainCheck;
    this.originDomain = config.cdn.originDomain;
    this.additionalDomains = config.cdn.additionalDomains;
    
    // Compile a list of allowed domains
    this.allowedDomains = [this.originDomain, ...this.additionalDomains];
    
    // Initialize path rewriter if enabled
    this.pathRewritingEnabled = config.pathRewriting.enabled;
    this.pathRewriter = null;
    
    if (this.pathRewritingEnabled) {
      this.pathRewriter = new PathRewriter(config.pathRewriting.rewriterConfig);
      logger.info('Path rewriting enabled');
      
      // Add domains from path rewriting configuration to allowed domains
      const rewritingDomains = Object.keys(config.pathRewriting.domains);
      this.allowedDomains = [...new Set([...this.allowedDomains, ...rewritingDomains])];
    }
    
    // Initialize file resolution if enabled
    this.fileResolutionEnabled = config.fileResolution.enabled;
    
    if (this.fileResolutionEnabled) {
      logger.info('File resolution enabled');
      
      // Add domains from file resolution configuration to allowed domains
      const fileResolutionDomains = Object.keys(config.fileResolution.domainConfig);
      this.allowedDomains = [...new Set([...this.allowedDomains, ...fileResolutionDomains])];
    }
    
    logger.info(`Domain manager initialized: Primary domain: ${this.originDomain}`);
    if (this.additionalDomains.length > 0) {
      logger.info(`Additional domains: ${this.additionalDomains.join(', ')}`);
    }
    if (this.pathRewritingEnabled) {
      logger.info(`Path rewriting domains: ${Object.keys(config.pathRewriting.domains).join(', ')}`);
    }
    if (this.fileResolutionEnabled) {
      logger.info(`File resolution domains: ${Object.keys(config.fileResolution.domainConfig).join(', ')}`);
    }
  }
  
  /**
   * Check if a host is allowed
   * @param {String} host - Host to check
   * @returns {Boolean} Whether the host is allowed
   */
  isAllowedHost(host) {
    if (!host) return false;
    
    // If strict checking is disabled, allow all hosts
    if (!this.strictCheck) return true;
    
    // Check if host matches any allowed domain
    return this.allowedDomains.some(domain => {
      // Exact match
      if (host === domain) return true;
      
      // Check for subdomain match 
      // (e.g. sub.example.com matches example.com)
      if (host.endsWith(`.${domain}`)) return true;
      
      // Check for port variations 
      // (e.g. example.com:8080 matches example.com)
      const hostWithoutPort = host.split(':')[0];
      if (hostWithoutPort === domain) return true;
      
      return false;
    });
  }
  
  /**
   * Get path transformation for a domain and path
   * @param {String} domain - Request domain
   * @param {String} originalPath - Original request path
   * @param {String} method - HTTP method
   * @returns {Object} Path transformation result
   */
  getPathTransformation(domain, originalPath, method = 'GET') {
    if (!this.pathRewritingEnabled || !this.pathRewriter) {
      return {
        domain,
        originalPath,
        transformedPath: originalPath,
        target: config.cdn.targetDomain,
        method,
        matched: false,
        rewritingEnabled: false
      };
    }
    
    try {
      const result = this.pathRewriter.transformPath(domain, originalPath, method);
      logger.debug(`Path transformation: ${domain}${originalPath} → ${result.target}${result.transformedPath}`);
      return result;
    } catch (error) {
      logger.error(`Path transformation error for ${domain}${originalPath}: ${error.message}`);
      return {
        domain,
        originalPath,
        transformedPath: originalPath,
        target: config.cdn.targetDomain,
        method,
        matched: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get target backend for a domain
   * @param {String} domain - Request domain
   * @returns {String} Target backend
   */
  getTargetBackend(domain) {
    if (this.pathRewritingEnabled && this.pathRewriter) {
      return this.pathRewriter.getTargetBackend(domain);
    }
    return config.cdn.targetDomain;
  }
  
  /**
   * Check if path rewriting is enabled for a domain
   * @param {String} domain - Request domain
   * @returns {Boolean} Whether path rewriting is enabled
   */
  hasPathRewriting(domain) {
    if (!this.pathRewritingEnabled || !this.pathRewriter) {
      return false;
    }
    
    const domains = config.pathRewriting.domains;
    return domains.hasOwnProperty(domain) || 
           Object.keys(domains).some(pattern => {
             if (pattern.includes('*')) {
               const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+') + '$');
               return regex.test(domain);
             }
             return false;
           });
  }
  
  /**
   * Domain check middleware
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next function
   */
  checkDomainMiddleware(req, res, next) {
    // Skip domain check for health and metrics endpoints
    if (req.path === config.monitoring.healthCheck.path || 
        req.path === config.monitoring.metrics.path) {
      req.skipProxy = true;
      return next();
    }
    
    const host = req.headers.host;
    
    if (this.isAllowedHost(host)) {
      // Add path transformation information to request
      if (this.pathRewritingEnabled) {
        const transformation = this.getPathTransformation(host, req.url, req.method);
        req.pathTransformation = transformation;
        
        // Log path rewriting activity
        if (transformation.matched) {
          logger.debug(`Path rewriting applied for ${host}: ${req.url} → ${transformation.transformedPath}`);
        }
      }
      
      return next();
    } else {
      logger.warn(`Blocked request to unauthorized domain: ${host}`);
      res.status(404).send('Domain not configured');
    }
  }
  
  /**
   * Get path rewriting statistics
   * @returns {Object} Statistics
   */
  getPathRewritingStats() {
    if (!this.pathRewritingEnabled || !this.pathRewriter) {
      return {
        enabled: false,
        message: 'Path rewriting is disabled'
      };
    }
    
    return {
      enabled: true,
      ...this.pathRewriter.getStats(),
      configuredDomains: Object.keys(config.pathRewriting.domains),
      allowedDomains: this.allowedDomains
    };
  }
  
  /**
   * Reload path rewriting rules
   * @param {Object} newRules - New routing rules
   * @returns {Boolean} Success status
   */
  reloadPathRewritingRules(newRules) {
    if (!this.pathRewritingEnabled || !this.pathRewriter) {
      logger.warn('Cannot reload rules: path rewriting is disabled');
      return false;
    }
    
    const success = this.pathRewriter.reloadRules(newRules);
    if (success) {
      // Update allowed domains list
      const rewritingDomains = Object.keys(newRules);
      this.allowedDomains = [...new Set([
        this.originDomain, 
        ...this.additionalDomains, 
        ...rewritingDomains
      ])];
      
      logger.info('Path rewriting rules reloaded successfully');
    }
    
    return success;
  }
  
  /**
   * Get detailed rule information for debugging
   * @returns {Object} Rule information
   */
  getRuleInfo() {
    if (!this.pathRewritingEnabled || !this.pathRewriter) {
      return {
        enabled: false,
        rules: []
      };
    }
    
    return {
      enabled: true,
      rules: this.pathRewriter.getRuleInfo(),
      allowedDomains: this.allowedDomains,
      strictCheck: this.strictCheck
    };
  }
  
  /**
   * Check if file resolution is enabled for a domain
   * @param {String} domain - Request domain
   * @returns {Boolean} Whether file resolution is enabled
   */
  hasFileResolution(domain) {
    if (!this.fileResolutionEnabled) {
      return false;
    }
    
    const domainConfig = config.fileResolution.getDomainConfig(domain);
    return domainConfig.enabled;
  }
  
  /**
   * Get file resolution configuration for a domain
   * @param {String} domain - Request domain
   * @returns {Object} File resolution configuration
   */
  getFileResolutionConfig(domain) {
    if (!this.fileResolutionEnabled) {
      return {
        enabled: false,
        message: 'File resolution is disabled globally'
      };
    }
    
    return config.fileResolution.getDomainConfig(domain);
  }
  
  /**
   * Get file resolution statistics
   * @returns {Object} Statistics
   */
  getFileResolutionStats() {
    if (!this.fileResolutionEnabled) {
      return {
        enabled: false,
        message: 'File resolution is disabled'
      };
    }
    
    const resolverStats = fileResolver.getStats();
    const cacheStats = fileResolutionCache.getStats();
    
    return {
      enabled: true,
      resolver: resolverStats,
      cache: cacheStats,
      configuredDomains: Object.keys(config.fileResolution.domainConfig),
      globalConfig: {
        defaultExtensions: config.fileResolution.defaultExtensions,
        timeout: config.fileResolution.timeout,
        maxConcurrent: config.fileResolution.maxConcurrent,
        transformersEnabled: config.fileResolution.transformers.enabled
      }
    };
  }
  
  /**
   * Update file resolution configuration for a domain
   * @param {String} domain - Domain to update
   * @param {Object} newConfig - New configuration
   * @returns {Boolean} Success status
   */
  updateFileResolutionConfig(domain, newConfig) {
    if (!this.fileResolutionEnabled) {
      logger.warn('Cannot update file resolution config: file resolution is disabled');
      return false;
    }
    
    try {
      // Validate configuration
      if (newConfig.extensions && !Array.isArray(newConfig.extensions)) {
        throw new Error('Extensions must be an array');
      }
      
      if (newConfig.transformers && !Array.isArray(newConfig.transformers)) {
        throw new Error('Transformers must be an array');
      }
      
      // Update the configuration
      const currentConfig = config.fileResolution.domainConfig[domain] || {};
      config.fileResolution.domainConfig[domain] = {
        ...currentConfig,
        ...newConfig
      };
      
      // Update allowed domains if this is a new domain
      if (!this.allowedDomains.includes(domain)) {
        this.allowedDomains.push(domain);
      }
      
      logger.info(`File resolution configuration updated for domain: ${domain}`, newConfig);
      return true;
      
    } catch (error) {
      logger.error(`Failed to update file resolution config for ${domain}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Remove file resolution configuration for a domain
   * @param {String} domain - Domain to remove
   * @returns {Boolean} Success status
   */
  removeFileResolutionConfig(domain) {
    if (!this.fileResolutionEnabled) {
      logger.warn('Cannot remove file resolution config: file resolution is disabled');
      return false;
    }
    
    if (config.fileResolution.domainConfig[domain]) {
      delete config.fileResolution.domainConfig[domain];
      
      // Clear cache entries for this domain
      fileResolutionCache.clear();
      
      logger.info(`File resolution configuration removed for domain: ${domain}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Clear file resolution cache
   * @param {String} domain - Optional domain to clear cache for specific domain
   * @returns {Boolean} Success status
   */
  clearFileResolutionCache(domain = null) {
    if (!this.fileResolutionEnabled) {
      return false;
    }
    
    if (domain) {
      // Clear cache entries for specific domain (would need domain-specific cache keys)
      logger.info(`File resolution cache cleared for domain: ${domain}`);
    } else {
      // Clear entire cache
      fileResolutionCache.clear();
      logger.info('File resolution cache cleared');
    }
    
    return true;
  }
  
  /**
   * Test file resolution for a domain and path
   * @param {String} domain - Domain to test
   * @param {String} path - Path to test
   * @returns {Promise<Object>} Test result
   */
  async testFileResolution(domain, path) {
    if (!this.fileResolutionEnabled) {
      return {
        success: false,
        error: 'File resolution is disabled'
      };
    }
    
    try {
      const targetDomain = this.getTargetBackend(domain);
      const protocol = config.cdn.targetHttps ? 'https' : 'http';
      const baseUrl = `${protocol}://${targetDomain}${path}`;
      
      logger.debug(`Testing file resolution for ${domain}${path} -> ${baseUrl}`);
      
      const result = await fileResolver.resolveFile(baseUrl, domain);
      
      return {
        success: true,
        domain,
        path,
        targetDomain,
        baseUrl,
        result,
        domainConfig: this.getFileResolutionConfig(domain)
      };
      
    } catch (error) {
      logger.error(`File resolution test failed for ${domain}${path}: ${error.message}`);
      return {
        success: false,
        domain,
        path,
        error: error.message
      };
    }
  }
  
  /**
   * Clean up resources
   */
  shutdown() {
    if (this.pathRewriter) {
      this.pathRewriter.shutdown();
    }
    logger.info('Domain manager shutting down');
  }
}

module.exports = new DomainManager();
