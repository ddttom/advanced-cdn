// path-rewriter.js
const logger = require('./logger').getModuleLogger('path-rewriter');

/**
 * Path Rewriter Engine
 * Handles domain-based path transformations with support for:
 * - Simple prefix mapping (ddt.com → /ddt prefix)
 * - Complex regex transformations
 * - Wildcard domain matching
 * - Fallback mechanisms
 * - Performance optimization through rule caching
 */
class PathRewriter {
  constructor(config = {}) {
    this.config = config;
    this.compiledRules = new Map();
    this.domainCache = new Map();
    this.stats = {
      transformations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      fallbacks: 0,
      slowTransformations: 0,
      circuitBreakerTrips: 0
    };
    
    // Error tracking and circuit breaker
    this.errorRates = new Map();
    this.circuitBreakers = new Map();
    this.performanceMonitor = new Map();
    
    // Configuration for error handling
    this.slowThreshold = config.slowThreshold || 0.100; // 100ms
    this.errorRateThreshold = config.errorRateThreshold || 0.1; // 10%
    this.circuitBreakerEnabled = config.circuitBreakerEnabled !== false;
    
    // Initialize with configuration
    this.initialize();
    
    logger.info('Path rewriter initialized', {
      rulesConfigured: Object.keys(config.domains || {}).length,
      cacheEnabled: true,
      circuitBreakerEnabled: this.circuitBreakerEnabled,
      slowThreshold: this.slowThreshold,
      errorRateThreshold: this.errorRateThreshold
    });
  }
  
  /**
   * Initialize the path rewriter with configuration
   */
  initialize() {
    if (this.config.domains) {
      this.loadRules(this.config.domains);
    }
    
    // Set up periodic cache cleanup
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  /**
   * Load and compile routing rules
   * @param {Object} domains - Domain configuration object
   */
  loadRules(domains) {
    this.compiledRules.clear();
    this.domainCache.clear();
    
    for (const [domain, config] of Object.entries(domains)) {
      try {
        const compiledRule = this.compileRule(domain, config);
        this.compiledRules.set(domain, compiledRule);
        logger.debug(`Compiled rule for domain: ${domain}`);
      } catch (error) {
        logger.error(`Failed to compile rule for domain ${domain}: ${error.message}`);
        this.stats.errors++;
      }
    }
    
    logger.info(`Loaded ${this.compiledRules.size} routing rules`);
  }
  
  /**
   * Compile a single routing rule for performance
   * @param {String} domain - Domain pattern
   * @param {Object} config - Domain configuration
   * @returns {Object} Compiled rule
   */
  compileRule(domain, config) {
    const rule = {
      domain,
      target: config.target || this.config.defaultTarget,
      pathPrefix: config.pathPrefix || '',
      rules: [],
      fallback: config.fallback || 'prefix',
      isWildcard: domain.includes('*'),
      domainRegex: null
    };
    
    // Compile domain regex for wildcard domains
    if (rule.isWildcard) {
      const regexPattern = domain
        .replace(/\./g, '\\.')
        .replace(/\*/g, '([^.]+)');
      rule.domainRegex = new RegExp(`^${regexPattern}$`, 'i');
    }
    
    // Compile path transformation rules
    if (config.rules && Array.isArray(config.rules)) {
      rule.rules = config.rules.map(pathRule => {
        const compiled = {
          pattern: pathRule.pattern,
          replacement: pathRule.replacement,
          methods: pathRule.method || ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
          exact: pathRule.exact || false,
          regex: null
        };
        
        // Compile regex pattern
        if (!compiled.exact) {
          compiled.regex = new RegExp(compiled.pattern);
        }
        
        return compiled;
      });
    }
    
    return rule;
  }
  
  /**
   * Transform a request path based on domain
   * @param {String} domain - Request domain
   * @param {String} originalPath - Original request path
   * @param {String} method - HTTP method
   * @param {String} requestId - Optional request ID for tracing
   * @returns {Object} Transformation result
   */
  transformPath(domain, originalPath, method = 'GET', requestId = null) {
    const startTime = process.hrtime.bigint();
    this.stats.transformations++;
    
    try {
      // Check circuit breaker
      if (this.circuitBreakerEnabled && this.isCircuitBreakerOpen(domain)) {
        this.stats.circuitBreakerTrips++;
        logger.warn('Circuit breaker open for domain', {
          domain,
          originalPath,
          method,
          requestId,
          reason: 'high_error_rate'
        });
        
        return this.createFallbackResult(domain, originalPath, method, 'circuit_breaker_open', requestId);
      }
      
      // Check cache first
      const cacheKey = `${domain}:${originalPath}:${method}`;
      if (this.domainCache.has(cacheKey)) {
        this.stats.cacheHits++;
        const cached = this.domainCache.get(cacheKey);
        
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to ms
        this.recordPerformance(domain, 'cache_hit', duration);
        
        logger.debug('Cache hit for transformation', {
          domain,
          originalPath,
          transformedPath: cached.transformedPath,
          cacheKey,
          duration,
          requestId
        });
        
        return { ...cached, requestId, fromCache: true };
      }
      
      this.stats.cacheMisses++;
      
      // Find matching rule
      const rule = this.findMatchingRule(domain);
      if (!rule) {
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
        this.recordPerformance(domain, 'no_rule_match', duration);
        
        logger.warn('No routing rule found for domain', {
          domain,
          originalPath,
          method,
          duration,
          requestId,
          availableDomains: Array.from(this.compiledRules.keys())
        });
        
        return this.handleNoRuleMatch(domain, originalPath, method, cacheKey, requestId);
      }
      
      // Apply path transformation
      const result = this.applyTransformation(rule, domain, originalPath, method, requestId);
      
      // Calculate transformation time
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      result.transformationTime = duration;
      result.requestId = requestId;
      
      // Record performance metrics
      this.recordPerformance(domain, 'transformation', duration);
      
      // Check for slow transformations
      if (duration > this.slowThreshold) {
        this.stats.slowTransformations++;
        logger.warn('Slow path transformation detected', {
          domain,
          originalPath,
          transformedPath: result.transformedPath,
          duration,
          threshold: this.slowThreshold,
          ruleComplexity: rule.rules.length,
          requestId
        });
      }
      
      // Cache the result
      this.domainCache.set(cacheKey, result);
      
      // Record successful transformation
      this.recordSuccess(domain);
      
      logger.debug('Path transformation successful', {
        domain,
        originalPath,
        transformedPath: result.transformedPath,
        target: result.target,
        method,
        matched: result.matched,
        fallbackUsed: result.fallbackUsed,
        duration,
        cacheKey,
        requestId
      });
      
      return result;
      
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      this.stats.errors++;
      
      // Record error for circuit breaker
      this.recordError(domain, error);
      
      logger.error('Path transformation error', {
        domain,
        originalPath,
        method,
        error: error.message,
        stack: error.stack,
        duration,
        requestId,
        errorType: error.constructor.name
      });
      
      return this.createFallbackResult(domain, originalPath, method, error.message, requestId);
    }
  }
  
  /**
   * Find matching rule for a domain
   * @param {String} domain - Request domain
   * @returns {Object|null} Matching rule or null
   */
  findMatchingRule(domain) {
    // Exact match first
    if (this.compiledRules.has(domain)) {
      return this.compiledRules.get(domain);
    }
    
    // Wildcard match
    for (const [pattern, rule] of this.compiledRules) {
      if (rule.isWildcard && rule.domainRegex) {
        const match = domain.match(rule.domainRegex);
        if (match) {
          // Store subdomain matches for use in path transformation
          rule.subdomainMatches = match.slice(1);
          return rule;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Apply path transformation using the matched rule
   * @param {Object} rule - Matched rule
   * @param {String} domain - Request domain
   * @param {String} originalPath - Original path
   * @param {String} method - HTTP method
   * @param {String} requestId - Request ID
   * @returns {Object} Transformation result
   */
  applyTransformation(rule, domain, originalPath, method, requestId) {
    let transformedPath = originalPath;
    let ruleMatched = false;
    let appliedRule = null;
    
    // Apply specific path rules first
    for (const pathRule of rule.rules) {
      if (!pathRule.methods.includes(method)) {
        continue;
      }
      
      if (pathRule.exact) {
        if (originalPath === pathRule.pattern) {
          transformedPath = pathRule.replacement;
          ruleMatched = true;
          appliedRule = pathRule;
          break;
        }
      } else if (pathRule.regex) {
        const match = originalPath.match(pathRule.regex);
        if (match) {
          transformedPath = pathRule.replacement.replace(/\$(\d+)/g, (_, num) => {
            return match[parseInt(num)] || '';
          });
          
          // Handle subdomain substitution for wildcard domains
          if (rule.subdomainMatches) {
            transformedPath = transformedPath.replace(/\{subdomain\}/g, rule.subdomainMatches[0] || '');
          }
          
          ruleMatched = true;
          appliedRule = pathRule;
          break;
        }
      }
    }
    
    // Apply fallback if no specific rule matched
    if (!ruleMatched) {
      transformedPath = this.applyFallback(rule, originalPath);
      this.stats.fallbacks++;
    }
    
    return {
      domain,
      originalPath,
      transformedPath,
      target: rule.target,
      method,
      matched: ruleMatched,
      appliedRule,
      fallbackUsed: !ruleMatched
    };
  }
  
  /**
   * Apply fallback transformation
   * @param {Object} rule - Domain rule
   * @param {String} originalPath - Original path
   * @returns {String} Transformed path
   */
  applyFallback(rule, originalPath) {
    switch (rule.fallback) {
      case 'prefix':
        return rule.pathPrefix + originalPath;
      
      case 'passthrough':
        return originalPath;
      
      case 'error':
        throw new Error(`No routing rule matched for path: ${originalPath}`);
      
      default:
        return rule.pathPrefix + originalPath;
    }
  }
  
  /**
   * Handle case when no rule matches the domain
   * @param {String} domain - Request domain
   * @param {String} originalPath - Original path
   * @param {String} method - HTTP method
   * @param {String} cacheKey - Cache key
   * @param {String} requestId - Request ID
   * @returns {Object} Default transformation result
   */
  handleNoRuleMatch(domain, originalPath, method, cacheKey, requestId) {
    const defaultFallback = this.config.defaultFallback || { action: 'passthrough' };
    let transformedPath = originalPath;
    
    switch (defaultFallback.action) {
      case 'prefix':
        transformedPath = (defaultFallback.value || '') + originalPath;
        break;
      
      case 'error':
        const error = new Error(`No routing configuration found for domain: ${domain}`);
        this.recordError(domain, error);
        throw error;
      
      case 'passthrough':
      default:
        transformedPath = originalPath;
        break;
    }
    
    const result = {
      domain,
      originalPath,
      transformedPath,
      target: this.config.defaultTarget,
      method,
      matched: false,
      fallbackUsed: true,
      noRuleMatch: true,
      fallbackReason: 'no_rule_match',
      requestId
    };
    
    // Cache the result
    this.domainCache.set(cacheKey, result);
    this.stats.fallbacks++;
    
    // Record this as a "soft error" for monitoring
    this.recordError(domain, new Error('No rule match'));
    
    logger.warn('No rule match, using fallback', {
      domain,
      originalPath,
      transformedPath,
      fallbackAction: defaultFallback.action,
      availableDomains: Array.from(this.compiledRules.keys()),
      requestId
    });
    
    return result;
  }
  
  /**
   * Get target backend for a domain
   * @param {String} domain - Request domain
   * @returns {String} Target backend
   */
  getTargetBackend(domain) {
    const rule = this.findMatchingRule(domain);
    return rule ? rule.target : this.config.defaultTarget;
  }
  
  /**
   * Validate routing rules
   * @param {Object} rules - Rules to validate
   * @returns {Object} Validation result
   */
  validateRules(rules) {
    const errors = [];
    const warnings = [];
    
    for (const [domain, config] of Object.entries(rules)) {
      // Validate domain format
      if (!domain || typeof domain !== 'string') {
        errors.push(`Invalid domain: ${domain}`);
        continue;
      }
      
      // Validate target
      if (!config.target && !this.config.defaultTarget) {
        errors.push(`No target specified for domain: ${domain}`);
      }
      
      // Validate path rules
      if (config.rules && Array.isArray(config.rules)) {
        for (let i = 0; i < config.rules.length; i++) {
          const rule = config.rules[i];
          
          if (!rule.pattern) {
            errors.push(`Missing pattern in rule ${i} for domain: ${domain}`);
          }
          
          if (!rule.replacement) {
            errors.push(`Missing replacement in rule ${i} for domain: ${domain}`);
          }
          
          // Test regex compilation
          if (rule.pattern && !rule.exact) {
            try {
              new RegExp(rule.pattern);
            } catch (error) {
              errors.push(`Invalid regex pattern in rule ${i} for domain ${domain}: ${error.message}`);
            }
          }
        }
      }
      
      // Validate fallback
      if (config.fallback && !['prefix', 'passthrough', 'error'].includes(config.fallback)) {
        warnings.push(`Unknown fallback type '${config.fallback}' for domain: ${domain}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Reload rules at runtime
   * @param {Object} newRules - New routing rules
   * @returns {Boolean} Success status
   */
  reloadRules(newRules) {
    try {
      // Validate new rules first
      const validation = this.validateRules(newRules);
      if (!validation.valid) {
        logger.error('Rule validation failed:', validation.errors);
        return false;
      }
      
      // Log warnings
      validation.warnings.forEach(warning => {
        logger.warn(warning);
      });
      
      // Backup current rules
      const backup = new Map(this.compiledRules);
      
      try {
        // Load new rules
        this.loadRules(newRules);
        logger.info('Successfully reloaded routing rules');
        return true;
      } catch (error) {
        // Restore backup on failure
        this.compiledRules = backup;
        logger.error(`Failed to reload rules, restored backup: ${error.message}`);
        return false;
      }
    } catch (error) {
      logger.error(`Rule reload error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get transformation statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      rulesLoaded: this.compiledRules.size,
      cacheSize: this.domainCache.size,
      cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0
        ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)).toFixed(3)
        : 0
    };
  }
  
  /**
   * Clear transformation cache
   */
  clearCache() {
    this.domainCache.clear();
    logger.info('Path rewriter cache cleared');
  }
  
  /**
   * Clean up old cache entries
   */
  cleanupCache() {
    // Simple LRU-style cleanup - remove oldest entries if cache is too large
    const maxCacheSize = this.config.maxCacheSize || 10000;
    
    if (this.domainCache.size > maxCacheSize) {
      const entries = Array.from(this.domainCache.entries());
      const toRemove = entries.slice(0, Math.floor(maxCacheSize * 0.2)); // Remove 20%
      
      toRemove.forEach(([key]) => {
        this.domainCache.delete(key);
      });
      
      logger.debug(`Cleaned up ${toRemove.length} cache entries`);
    }
  }
  
  /**
   * Get detailed rule information for debugging
   * @returns {Array} Rule information
   */
  getRuleInfo() {
    return Array.from(this.compiledRules.entries()).map(([domain, rule]) => ({
      domain,
      target: rule.target,
      pathPrefix: rule.pathPrefix,
      rulesCount: rule.rules.length,
      fallback: rule.fallback,
      isWildcard: rule.isWildcard
    }));
  }
  
  /**
   * Record error for circuit breaker and monitoring
   * @param {String} domain - Domain that had an error
   * @param {Error} error - The error that occurred
   */
  recordError(domain, error) {
    if (!this.errorRates.has(domain)) {
      this.errorRates.set(domain, { errors: 0, total: 0, lastReset: Date.now() });
    }
    
    const stats = this.errorRates.get(domain);
    stats.errors++;
    stats.total++;
    
    // Reset stats every hour
    if (Date.now() - stats.lastReset > 3600000) {
      stats.errors = 1;
      stats.total = 1;
      stats.lastReset = Date.now();
    }
    
    // Check if we should trip the circuit breaker
    const errorRate = stats.errors / stats.total;
    if (errorRate > this.errorRateThreshold && stats.total > 10) {
      this.tripCircuitBreaker(domain, errorRate);
    }
  }
  
  /**
   * Record successful transformation
   * @param {String} domain - Domain that had a successful transformation
   */
  recordSuccess(domain) {
    if (!this.errorRates.has(domain)) {
      this.errorRates.set(domain, { errors: 0, total: 0, lastReset: Date.now() });
    }
    
    const stats = this.errorRates.get(domain);
    stats.total++;
    
    // Reset circuit breaker if error rate is low
    const errorRate = stats.errors / stats.total;
    if (errorRate < this.errorRateThreshold / 2 && this.circuitBreakers.has(domain)) {
      this.resetCircuitBreaker(domain);
    }
  }
  
  /**
   * Record performance metrics
   * @param {String} domain - Domain
   * @param {String} operation - Operation type
   * @param {Number} duration - Duration in milliseconds
   */
  recordPerformance(domain, operation, duration) {
    if (!this.performanceMonitor.has(domain)) {
      this.performanceMonitor.set(domain, {
        operations: [],
        averageDuration: 0,
        maxDuration: 0,
        minDuration: Infinity
      });
    }
    
    const perf = this.performanceMonitor.get(domain);
    perf.operations.push({ operation, duration, timestamp: Date.now() });
    
    // Keep only last 1000 operations
    if (perf.operations.length > 1000) {
      perf.operations = perf.operations.slice(-1000);
    }
    
    // Update statistics
    const durations = perf.operations.map(op => op.duration);
    perf.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    perf.maxDuration = Math.max(...durations);
    perf.minDuration = Math.min(...durations);
    
    // Alert on performance degradation
    if (perf.averageDuration > this.slowThreshold * 2) {
      logger.warn('Performance degradation detected', {
        domain,
        averageDuration: perf.averageDuration,
        threshold: this.slowThreshold * 2,
        sampleSize: perf.operations.length
      });
    }
  }
  
  /**
   * Trip circuit breaker for a domain
   * @param {String} domain - Domain to trip circuit breaker for
   * @param {Number} errorRate - Current error rate
   */
  tripCircuitBreaker(domain, errorRate) {
    this.circuitBreakers.set(domain, {
      state: 'OPEN',
      tripTime: Date.now(),
      errorRate,
      halfOpenTime: Date.now() + 60000 // Try half-open after 1 minute
    });
    
    logger.error('Circuit breaker tripped for domain', {
      domain,
      errorRate,
      threshold: this.errorRateThreshold,
      state: 'OPEN'
    });
  }
  
  /**
   * Reset circuit breaker for a domain
   * @param {String} domain - Domain to reset circuit breaker for
   */
  resetCircuitBreaker(domain) {
    if (this.circuitBreakers.has(domain)) {
      this.circuitBreakers.delete(domain);
      
      logger.info('Circuit breaker reset for domain', {
        domain,
        state: 'CLOSED'
      });
    }
  }
  
  /**
   * Check if circuit breaker is open for a domain
   * @param {String} domain - Domain to check
   * @returns {Boolean} True if circuit breaker is open
   */
  isCircuitBreakerOpen(domain) {
    if (!this.circuitBreakers.has(domain)) {
      return false;
    }
    
    const breaker = this.circuitBreakers.get(domain);
    const now = Date.now();
    
    if (breaker.state === 'OPEN') {
      // Check if we should try half-open
      if (now > breaker.halfOpenTime) {
        breaker.state = 'HALF_OPEN';
        logger.info('Circuit breaker entering half-open state', {
          domain,
          state: 'HALF_OPEN'
        });
      }
      return breaker.state === 'OPEN';
    }
    
    return false;
  }
  
  /**
   * Create fallback result for failed transformations
   * @param {String} domain - Domain
   * @param {String} originalPath - Original path
   * @param {String} method - HTTP method
   * @param {String} reason - Reason for fallback
   * @param {String} requestId - Request ID
   * @returns {Object} Fallback result
   */
  createFallbackResult(domain, originalPath, method, reason, requestId) {
    const defaultFallback = this.config.defaultFallback || { action: 'passthrough' };
    let transformedPath = originalPath;
    
    switch (defaultFallback.action) {
      case 'prefix':
        transformedPath = (defaultFallback.value || '') + originalPath;
        break;
      case 'passthrough':
      default:
        transformedPath = originalPath;
        break;
    }
    
    return {
      domain,
      originalPath,
      transformedPath,
      target: this.config.defaultTarget,
      method,
      matched: false,
      fallbackUsed: true,
      fallbackReason: reason,
      requestId,
      error: reason
    };
  }
  
  /**
   * Get error statistics for all domains
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {};
    
    for (const [domain, errorData] of this.errorRates) {
      stats[domain] = {
        errorRate: errorData.total > 0 ? errorData.errors / errorData.total : 0,
        totalRequests: errorData.total,
        errorCount: errorData.errors,
        circuitBreakerState: this.circuitBreakers.has(domain) 
          ? this.circuitBreakers.get(domain).state 
          : 'CLOSED'
      };
    }
    
    return stats;
  }
  
  /**
   * Get performance statistics for all domains
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    const stats = {};
    
    for (const [domain, perfData] of this.performanceMonitor) {
      stats[domain] = {
        averageDuration: perfData.averageDuration,
        maxDuration: perfData.maxDuration,
        minDuration: perfData.minDuration === Infinity ? 0 : perfData.minDuration,
        operationCount: perfData.operations.length,
        slowOperations: perfData.operations.filter(op => op.duration > this.slowThreshold).length
      };
    }
    
    return stats;
  }
  
  /**
   * Enhanced statistics including error and performance data
   * @returns {Object} Complete statistics
   */
  getStats() {
    return {
      ...this.stats,
      rulesLoaded: this.compiledRules.size,
      cacheSize: this.domainCache.size,
      cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0
        ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)).toFixed(3)
        : 0,
      errorStats: this.getErrorStats(),
      performanceStats: this.getPerformanceStats(),
      circuitBreakers: Array.from(this.circuitBreakers.keys()),
      slowThreshold: this.slowThreshold,
      errorRateThreshold: this.errorRateThreshold
    };
  }
  
  /**
   * Clean up resources
   */
  shutdown() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    
    this.compiledRules.clear();
    this.domainCache.clear();
    this.errorRates.clear();
    this.circuitBreakers.clear();
    this.performanceMonitor.clear();
    
    logger.info('Path rewriter shutting down', {
      finalStats: this.getStats()
    });
  }
}

module.exports = PathRewriter;