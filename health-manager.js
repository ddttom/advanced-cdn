// health-manager.js
const os = require('os');
const config = require('./config');
const logger = require('./logger').getModuleLogger('health-manager');
const cacheManager = require('./cache-manager');
const domainManager = require('./domain-manager');
const fileResolver = require('./file-resolver');
const fileResolutionCache = require('./file-resolution-cache');
const transformerManager = require('./transformers');
const { version } = require('./package.json');

class HealthManager {
  constructor() {
    this.enabled = config.monitoring.healthCheck.enabled;
    this.detailed = config.monitoring.healthCheck.detailed;
    this.startTime = Date.now();
    this.pathRewritingEnabled = config.pathRewriting.enabled;
    this.fileResolutionEnabled = config.fileResolution.enabled;
    
    logger.info('Health monitoring initialized');
  }
  
  /**
   * Get system information
   * @returns {Object} System information
   */
  getSystemInfo() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      os: {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        arch: os.arch(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        cpus: os.cpus().length
      },
      process: {
        version: process.version,
        pid: process.pid,
        uptime,
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          memoryUsagePercentage: (memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(2)
        }
      }
    };
  }
  
  /**
   * Check if backend is reachable
   * @param {String} targetDomain - Optional specific target domain to check
   * @returns {Promise<Object>} Backend status
   */
  async checkBackend(targetDomain = null) {
    const domain = targetDomain || config.cdn.targetDomain;
    
    try {
      const protocol = config.cdn.targetHttps ? 'https' : 'http';
      const url = `${protocol}://${domain}`;
      
      const startTime = Date.now();
      const response = await fetch(`${url}/health-check`, {
        method: 'HEAD',
        timeout: 5000,
        headers: {
          'User-Agent': `${config.cdn.cdnName}/${version}`
        }
      });
      
      const latency = Date.now() - startTime;
      
      return {
        domain,
        reachable: true,
        status: response.status,
        latency,
        url
      };
    } catch (err) {
      logger.warn(`Backend health check failed for ${domain}: ${err.message}`);
      return {
        domain,
        reachable: false,
        error: err.message,
        url: `${config.cdn.targetHttps ? 'https' : 'http'}://${domain}`
      };
    }
  }
  
  /**
   * Check health of all configured domain backends
   * @returns {Promise<Object>} All backend statuses
   */
  async checkAllBackends() {
    const results = {
      primary: await this.checkBackend(),
      domains: {}
    };
    
    if (this.pathRewritingEnabled) {
      const domains = config.pathRewriting.domains;
      
      for (const [domain, domainConfig] of Object.entries(domains)) {
        if (domainConfig.target && domainConfig.target !== config.cdn.targetDomain) {
          results.domains[domain] = await this.checkBackend(domainConfig.target);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Get path rewriting health information
   * @returns {Object} Path rewriting health status
   */
  getPathRewritingHealth() {
    if (!this.pathRewritingEnabled) {
      return {
        enabled: false,
        status: 'disabled'
      };
    }
    
    try {
      const pathRewritingStats = domainManager.getPathRewritingStats();
      const ruleInfo = domainManager.getRuleInfo();
      
      return {
        enabled: true,
        status: 'healthy',
        stats: pathRewritingStats,
        rules: {
          total: ruleInfo.rules.length,
          domains: ruleInfo.rules.map(rule => rule.domain),
          allowedDomains: ruleInfo.allowedDomains.length
        },
        configuration: {
          strictCheck: ruleInfo.strictCheck,
          configuredDomains: Object.keys(config.pathRewriting.domains).length
        }
      };
    } catch (error) {
      logger.error(`Path rewriting health check error: ${error.message}`);
      return {
        enabled: true,
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * Get file resolution health information
   * @returns {Object} File resolution health status
   */
  getFileResolutionHealth() {
    if (!this.fileResolutionEnabled) {
      return {
        enabled: false,
        status: 'disabled'
      };
    }
    
    try {
      const resolverStats = fileResolver.getStats();
      const cacheStats = fileResolutionCache.getStats();
      const transformerStats = transformerManager.getStats();
      const domainStats = domainManager.getFileResolutionStats();
      
      // Determine health status based on error rates and performance
      let status = 'healthy';
      const issues = [];
      
      // Check error rate (if more than 50% errors, mark as degraded)
      if (resolverStats.requests > 0 && (resolverStats.errors / resolverStats.requests) > 0.5) {
        status = 'degraded';
        issues.push('High error rate in file resolution');
      }
      
      // Check circuit breaker trips
      if (resolverStats.circuitBreakerTrips > 0) {
        status = 'degraded';
        issues.push('Circuit breaker trips detected');
      }
      
      // Check cache performance (if hit rate is very low, might indicate issues)
      if (cacheStats.hitRate < 0.1 && cacheStats.hits + cacheStats.misses > 100) {
        issues.push('Low cache hit rate');
      }
      
      return {
        enabled: true,
        status,
        issues: issues.length > 0 ? issues : undefined,
        resolver: {
          requests: resolverStats.requests,
          hits: resolverStats.hits,
          misses: resolverStats.misses,
          errors: resolverStats.errors,
          hitRate: resolverStats.hitRate,
          circuitBreakerTrips: resolverStats.circuitBreakerTrips
        },
        cache: {
          size: cacheStats.size,
          maxSize: cacheStats.maxSize,
          hitRate: cacheStats.hitRate,
          positiveHitRate: cacheStats.positiveHitRate,
          memoryUsage: cacheStats.memoryUsage
        },
        transformers: {
          transformations: transformerStats.transformations,
          successes: transformerStats.successes,
          failures: transformerStats.failures,
          successRate: transformerStats.successRate,
          availableTransformers: transformerStats.transformers
        },
        configuration: {
          defaultExtensions: config.fileResolution.defaultExtensions,
          timeout: config.fileResolution.timeout,
          maxConcurrent: config.fileResolution.maxConcurrent,
          configuredDomains: Object.keys(config.fileResolution.domainConfig).length,
          transformersEnabled: config.fileResolution.transformers.enabled
        }
      };
    } catch (error) {
      logger.error(`File resolution health check error: ${error.message}`);
      return {
        enabled: true,
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * Test file resolution for a specific domain and path
   * @param {String} domain - Domain to test
   * @param {String} path - Path to test (optional, defaults to '/test')
   * @returns {Promise<Object>} File resolution test result
   */
  async testFileResolution(domain, path = '/test') {
    if (!this.fileResolutionEnabled) {
      return {
        enabled: false,
        status: 'disabled'
      };
    }
    
    try {
      const startTime = Date.now();
      const result = await domainManager.testFileResolution(domain, path);
      const duration = Date.now() - startTime;
      
      return {
        enabled: true,
        domain,
        path,
        duration,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`File resolution test error for ${domain}${path}: ${error.message}`);
      return {
        enabled: true,
        domain,
        path,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Get domain-specific health information
   * @returns {Object} Domain health status
   */
  getDomainHealth() {
    const domainHealth = {
      allowedDomains: domainManager.allowedDomains,
      strictCheck: config.cdn.strictDomainCheck,
      pathRewriting: this.getPathRewritingHealth(),
      fileResolution: this.getFileResolutionHealth()
    };
    
    if (this.pathRewritingEnabled) {
      const domains = config.pathRewriting.domains;
      domainHealth.configuredDomains = {};
      
      for (const [domain, domainConfig] of Object.entries(domains)) {
        domainHealth.configuredDomains[domain] = {
          target: domainConfig.target,
          pathPrefix: domainConfig.pathPrefix || '',
          rulesCount: domainConfig.rules ? domainConfig.rules.length : 0,
          fallback: domainConfig.fallback || 'prefix',
          hasPathRewriting: domainManager.hasPathRewriting(domain),
          hasFileResolution: this.fileResolutionEnabled ? domainManager.hasFileResolution(domain) : false
        };
      }
    }
    
    // Add file resolution domain configurations
    if (this.fileResolutionEnabled) {
      const fileResolutionDomains = config.fileResolution.domainConfig;
      if (!domainHealth.configuredDomains) {
        domainHealth.configuredDomains = {};
      }
      
      for (const [domain, domainConfig] of Object.entries(fileResolutionDomains)) {
        if (!domainHealth.configuredDomains[domain]) {
          domainHealth.configuredDomains[domain] = {};
        }
        
        domainHealth.configuredDomains[domain].fileResolution = {
          enabled: domainConfig.enabled !== false,
          extensions: domainConfig.extensions || config.fileResolution.defaultExtensions,
          transformers: domainConfig.transformers || [],
          hasFileResolution: domainManager.hasFileResolution(domain)
        };
      }
    }
    
    return domainHealth;
  }
  
  /**
   * Get cluster information
   * @returns {Object} Cluster information
   */
  getClusterInfo() {
    return {
      enabled: config.server.cluster.enabled,
      workers: config.server.cluster.workers,
      isMaster: process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === '0'
    };
  }
  
  /**
   * Get cache information with domain awareness
   * @returns {Object} Cache information
   */
  getCacheInfo() {
    const stats = cacheManager.getStats();
    const cacheInfo = {
      enabled: config.cache.enabled,
      stats,
      config: {
        defaultTtl: config.cache.defaultTtl,
        maxTtl: config.cache.maxTtl,
        maxItems: config.cache.maxItems
      }
    };
    
    // Add domain-specific cache information if path rewriting is enabled
    if (this.pathRewritingEnabled) {
      cacheInfo.domainStats = {};
      const domains = Object.keys(config.pathRewriting.domains);
      
      for (const domain of domains) {
        try {
          cacheInfo.domainStats[domain] = cacheManager.getDomainStats(domain);
        } catch (error) {
          cacheInfo.domainStats[domain] = { error: error.message };
        }
      }
    }
    
    return cacheInfo;
  }
  
  /**
   * Get basic health information
   * @returns {Object} Basic health information
   */
  getBasicHealth() {
    const basicHealth = {
      status: 'ok',
      name: config.cdn.cdnName,
      version,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      env: config.server.env
    };
    
    // Add path rewriting status to basic health
    if (this.pathRewritingEnabled) {
      basicHealth.pathRewriting = {
        enabled: true,
        domainsConfigured: Object.keys(config.pathRewriting.domains).length
      };
    }
    
    // Add file resolution status to basic health
    if (this.fileResolutionEnabled) {
      basicHealth.fileResolution = {
        enabled: true,
        domainsConfigured: Object.keys(config.fileResolution.domainConfig).length,
        transformersEnabled: config.fileResolution.transformers.enabled
      };
    }
    
    return basicHealth;
  }
  
  /**
   * Get detailed health information
   * @returns {Promise<Object>} Detailed health information
   */
  async getDetailedHealth() {
    const backendChecks = await this.checkAllBackends();
    
    const detailedHealth = {
      ...this.getBasicHealth(),
      system: this.getSystemInfo(),
      cluster: this.getClusterInfo(),
      cache: this.getCacheInfo(),
      domains: this.getDomainHealth(),
      backends: backendChecks,
      config: {
        originDomain: config.cdn.originDomain,
        targetDomain: config.cdn.targetDomain,
        port: config.server.port,
        ssl: config.server.ssl.enabled,
        pathRewriting: {
          enabled: this.pathRewritingEnabled,
          domains: this.pathRewritingEnabled ? Object.keys(config.pathRewriting.domains) : []
        },
        fileResolution: {
          enabled: this.fileResolutionEnabled,
          domains: this.fileResolutionEnabled ? Object.keys(config.fileResolution.domainConfig) : [],
          transformersEnabled: this.fileResolutionEnabled ? config.fileResolution.transformers.enabled : false
        }
      }
    };
    
    // Determine overall health status
    const backendHealthy = backendChecks.primary.reachable;
    const domainBackendsHealthy = Object.values(backendChecks.domains).every(backend => backend.reachable);
    const pathRewritingHealthy = !this.pathRewritingEnabled || this.getPathRewritingHealth().status !== 'error';
    const fileResolutionHealthy = !this.fileResolutionEnabled || 
      (this.getFileResolutionHealth().status !== 'error' && this.getFileResolutionHealth().status !== 'degraded');
    
    if (!backendHealthy || !domainBackendsHealthy || !pathRewritingHealthy || !fileResolutionHealthy) {
      detailedHealth.status = 'degraded';
      detailedHealth.issues = [];
      
      if (!backendHealthy) {
        detailedHealth.issues.push('Primary backend unreachable');
      }
      
      if (!domainBackendsHealthy) {
        detailedHealth.issues.push('Some domain backends unreachable');
      }
      
      if (!pathRewritingHealthy) {
        detailedHealth.issues.push('Path rewriting system error');
      }
      
      if (!fileResolutionHealthy) {
        const fileResolutionHealth = this.getFileResolutionHealth();
        if (fileResolutionHealth.status === 'error') {
          detailedHealth.issues.push('File resolution system error');
        } else if (fileResolutionHealth.status === 'degraded') {
          detailedHealth.issues.push('File resolution system degraded');
          if (fileResolutionHealth.issues) {
            detailedHealth.issues.push(...fileResolutionHealth.issues.map(issue => `File resolution: ${issue}`));
          }
        }
      }
    }
    
    return detailedHealth;
  }
  
  /**
   * Get domain-specific health check
   * @param {String} domain - Domain to check
   * @returns {Object} Domain health information
   */
  getDomainSpecificHealth(domain) {
    const domainHealth = {
      domain,
      timestamp: new Date().toISOString(),
      allowed: domainManager.isAllowedHost(domain),
      hasPathRewriting: this.pathRewritingEnabled ? domainManager.hasPathRewriting(domain) : false,
      hasFileResolution: this.fileResolutionEnabled ? domainManager.hasFileResolution(domain) : false
    };
    
    if (this.pathRewritingEnabled && domainHealth.hasPathRewriting) {
      const targetBackend = domainManager.getTargetBackend(domain);
      domainHealth.targetBackend = targetBackend;
      domainHealth.cacheStats = cacheManager.getDomainStats(domain);
    }
    
    if (this.fileResolutionEnabled && domainHealth.hasFileResolution) {
      const fileResolutionConfig = domainManager.getFileResolutionConfig(domain);
      domainHealth.fileResolution = {
        enabled: fileResolutionConfig.enabled,
        extensions: fileResolutionConfig.extensions,
        transformers: fileResolutionConfig.transformers,
        transformerOptions: fileResolutionConfig.transformerOptions
      };
    }
    
    return domainHealth;
  }
  
  /**
   * Health check handler
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async healthCheckHandler(req, res) {
    try {
      if (!this.enabled) {
        return res.status(404).send('Health check not enabled');
      }
      
      // Set request flag to skip proxy
      req.skipProxy = true;
      
      // Check for file resolution test
      const testFileResolution = req.query.testFileResolution;
      const testDomain = req.query.testDomain;
      const testPath = req.query.testPath;
      
      if (testFileResolution === 'true' && testDomain) {
        const fileResolutionTest = await this.testFileResolution(testDomain, testPath);
        return res.status(200).json(fileResolutionTest);
      }
      
      // Check for domain-specific health check
      const checkDomain = req.query.domain;
      if (checkDomain) {
        const domainHealth = this.getDomainSpecificHealth(checkDomain);
        
        // Add file resolution test if requested
        if (req.query.includeFileResolutionTest === 'true' && this.fileResolutionEnabled) {
          domainHealth.fileResolutionTest = await this.testFileResolution(checkDomain, req.query.testPath);
        }
        
        return res.status(200).json(domainHealth);
      }
      
      // Get detailed health info if requested
      let health;
      if (this.detailed || req.query.detailed === 'true') {
        health = await this.getDetailedHealth();
      } else {
        health = this.getBasicHealth();
      }
      
      // Set appropriate status code based on health
      const statusCode = health.status === 'ok' ? 200 : 
                        health.status === 'degraded' ? 503 : 500;
      
      res.status(statusCode).json(health);
    } catch (err) {
      logger.error(`Health check error: ${err.message}`);
      res.status(500).json({
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Get health check statistics
   * @returns {Object} Health check statistics
   */
  getHealthStats() {
    const stats = {
      enabled: this.enabled,
      detailed: this.detailed,
      pathRewritingEnabled: this.pathRewritingEnabled,
      fileResolutionEnabled: this.fileResolutionEnabled,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      lastCheck: new Date().toISOString()
    };
    
    // Add file resolution statistics if enabled
    if (this.fileResolutionEnabled) {
      try {
        const fileResolutionHealth = this.getFileResolutionHealth();
        stats.fileResolution = {
          status: fileResolutionHealth.status,
          configuredDomains: fileResolutionHealth.configuration.configuredDomains,
          transformersEnabled: fileResolutionHealth.configuration.transformersEnabled,
          resolverStats: fileResolutionHealth.resolver,
          cacheStats: {
            size: fileResolutionHealth.cache.size,
            hitRate: fileResolutionHealth.cache.hitRate
          }
        };
      } catch (error) {
        stats.fileResolution = {
          status: 'error',
          error: error.message
        };
      }
    }
    
    return stats;
  }
}

module.exports = new HealthManager();
