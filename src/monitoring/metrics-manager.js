// metrics-manager.js
const promClient = require('prom-client');
const os = require('os');
const config = require('../config');
const logger = require('../logger').getModuleLogger('metrics-manager');
const cacheManager = require('../cache/cache-manager');
const fileResolver = require('../domain/file-resolver');
const fileResolutionCache = require('../cache/file-resolution-cache');
const domainManager = require('../domain/domain-manager');

class MetricsManager {
  constructor() {
    this.enabled = config.monitoring.metrics.enabled;
    
    if (!this.enabled) {
      logger.info('Metrics collection disabled');
      return;
    }
    
    // Initialize the registry
    this.register = new promClient.Registry();
    
    // Add default metrics
    promClient.collectDefaultMetrics({ register: this.register });
    
    // Create custom metrics
    this.initializeMetrics();
    
    logger.info('Metrics collection initialized');
  }
  
  /**
   * Initialize custom metrics
   */
  initializeMetrics() {
    // HTTP request counter with domain and path rewriting labels
    this.httpRequestsCounter = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'status', 'path', 'cache', 'domain', 'path_rewritten', 'target_backend'],
      registers: [this.register]
    });
    
    // HTTP request duration histogram with domain labels
    this.httpRequestDurationHistogram = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'status', 'path', 'cache', 'domain', 'path_rewritten'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10],
      registers: [this.register]
    });
    
    // Path rewriting specific metrics
    this.pathRewriteCounter = new promClient.Counter({
      name: 'path_rewrites_total',
      help: 'Total number of path rewrites performed',
      labelNames: ['domain', 'rule_matched', 'fallback_used', 'target_backend'],
      registers: [this.register]
    });
    
    this.pathRewriteDurationHistogram = new promClient.Histogram({
      name: 'path_rewrite_duration_seconds',
      help: 'Time taken to perform path rewriting',
      labelNames: ['domain', 'rule_matched'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
      registers: [this.register]
    });
    
    this.domainRequestsCounter = new promClient.Counter({
      name: 'domain_requests_total',
      help: 'Total requests per domain',
      labelNames: ['domain', 'target_backend'],
      registers: [this.register]
    });
    
    this.pathTransformationErrorsCounter = new promClient.Counter({
      name: 'path_transformation_errors_total',
      help: 'Total path transformation errors',
      labelNames: ['domain', 'error_type'],
      registers: [this.register]
    });
    
    // Cache metrics with domain awareness
    this.cacheHitCounter = new promClient.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['domain', 'path_rewritten'],
      registers: [this.register]
    });
    
    this.cacheMissCounter = new promClient.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['domain', 'path_rewritten'],
      registers: [this.register]
    });
    
    this.cacheKeysGauge = new promClient.Gauge({
      name: 'cache_keys_total',
      help: 'Total number of keys in cache',
      registers: [this.register]
    });
    
    this.domainCacheKeysGauge = new promClient.Gauge({
      name: 'domain_cache_keys_total',
      help: 'Total number of cache keys per domain',
      labelNames: ['domain', 'key_type'],
      registers: [this.register]
    });
    
    // File resolution metrics
    this.fileResolutionCounter = new promClient.Counter({
      name: 'file_resolution_requests_total',
      help: 'Total number of file resolution requests',
      labelNames: ['domain', 'success', 'extension', 'cached'],
      registers: [this.register]
    });
    
    this.fileResolutionDurationHistogram = new promClient.Histogram({
      name: 'file_resolution_duration_seconds',
      help: 'Time taken to resolve files',
      labelNames: ['domain', 'success', 'cached'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.register]
    });
    
    this.fileResolutionCacheHitsCounter = new promClient.Counter({
      name: 'file_resolution_cache_hits_total',
      help: 'Total number of file resolution cache hits',
      labelNames: ['domain', 'result_type'],
      registers: [this.register]
    });
    
    this.fileResolutionCacheMissesCounter = new promClient.Counter({
      name: 'file_resolution_cache_misses_total',
      help: 'Total number of file resolution cache misses',
      labelNames: ['domain'],
      registers: [this.register]
    });
    
    this.fileResolutionErrorsCounter = new promClient.Counter({
      name: 'file_resolution_errors_total',
      help: 'Total number of file resolution errors',
      labelNames: ['domain', 'error_type'],
      registers: [this.register]
    });
    
    this.fileTransformationCounter = new promClient.Counter({
      name: 'file_transformations_total',
      help: 'Total number of file transformations',
      labelNames: ['domain', 'transformer', 'success'],
      registers: [this.register]
    });
    
    this.fileTransformationDurationHistogram = new promClient.Histogram({
      name: 'file_transformation_duration_seconds',
      help: 'Time taken to transform files',
      labelNames: ['domain', 'transformer'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
      registers: [this.register]
    });
    
    this.circuitBreakerStateGauge = new promClient.Gauge({
      name: 'file_resolution_circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
      labelNames: ['domain'],
      registers: [this.register]
    });
    
    this.fileResolutionCacheSizeGauge = new promClient.Gauge({
      name: 'file_resolution_cache_size',
      help: 'Number of entries in file resolution cache',
      registers: [this.register]
    });
    
    // System metrics
    this.memoryUsageGauge = new promClient.Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.register]
    });
    
    this.cpuLoadGauge = new promClient.Gauge({
      name: 'cpu_load',
      help: 'CPU load averages',
      labelNames: ['interval'],
      registers: [this.register]
    });
    
    // Start collecting metrics periodically
    this.startCollecting();
  }
  
  /**
   * Start collecting metrics periodically
   */
  startCollecting() {
    // Collect system metrics every 15 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.collectCacheMetrics();
      this.collectDomainCacheMetrics();
      this.collectFileResolutionMetrics();
    }, 15000);
  }
  
  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    // Memory metrics
    const memUsage = process.memoryUsage();
    this.memoryUsageGauge.set({ type: 'rss' }, memUsage.rss);
    this.memoryUsageGauge.set({ type: 'heapTotal' }, memUsage.heapTotal);
    this.memoryUsageGauge.set({ type: 'heapUsed' }, memUsage.heapUsed);
    this.memoryUsageGauge.set({ type: 'external' }, memUsage.external);
    
    // CPU load metrics
    const loadAvg = os.loadavg();
    this.cpuLoadGauge.set({ interval: '1m' }, loadAvg[0]);
    this.cpuLoadGauge.set({ interval: '5m' }, loadAvg[1]);
    this.cpuLoadGauge.set({ interval: '15m' }, loadAvg[2]);
  }
  
  /**
   * Collect cache metrics
   */
  collectCacheMetrics() {
    const stats = cacheManager.getStats();
    this.cacheKeysGauge.set(stats.keys);
  }
  
  /**
   * Collect domain-specific cache metrics
   */
  collectDomainCacheMetrics() {
    try {
      // Get domain-specific cache statistics
      const domains = config.pathRewriting.enabled ? Object.keys(config.pathRewriting.domains) : [];
      
      for (const domain of domains) {
        const domainStats = cacheManager.getDomainStats(domain);
        if (domainStats) {
          this.domainCacheKeysGauge.set({ domain, key_type: 'total' }, domainStats.totalKeys);
          this.domainCacheKeysGauge.set({ domain, key_type: 'transformed' }, domainStats.transformedKeys);
          this.domainCacheKeysGauge.set({ domain, key_type: 'regular' }, domainStats.regularKeys);
        }
      }
    } catch (error) {
      logger.error(`Error collecting domain cache metrics: ${error.message}`);
    }
  }
  
  /**
   * Collect file resolution metrics
   */
  collectFileResolutionMetrics() {
    if (!config.fileResolution.enabled) {
      return;
    }
    
    try {
      // Get file resolver statistics
      const resolverStats = fileResolver.getStats();
      
      // Get file resolution cache statistics
      const cacheStats = fileResolutionCache.getStats();
      this.fileResolutionCacheSizeGauge.set(cacheStats.size);
      
      // Get circuit breaker states for configured domains
      const fileResolutionDomains = Object.keys(config.fileResolution.domainConfig);
      for (const domain of fileResolutionDomains) {
        // Circuit breaker state: 0=closed, 1=open, 2=half-open
        // This would need to be implemented in the file resolver
        // For now, we'll set it to 0 (closed) as a placeholder
        this.circuitBreakerStateGauge.set({ domain }, 0);
      }
      
    } catch (error) {
      logger.error(`Error collecting file resolution metrics: ${error.message}`);
    }
  }
  
  /**
   * Record path rewriting metrics
   * @param {Object} transformation - Path transformation result
   * @param {Number} duration - Duration in seconds
   */
  recordPathRewriteMetrics(transformation, duration = 0) {
    if (!this.enabled || !transformation) return;
    
    try {
      // Record path rewrite counter
      this.pathRewriteCounter.inc({
        domain: transformation.domain,
        rule_matched: transformation.matched.toString(),
        fallback_used: (transformation.fallbackUsed || false).toString(),
        target_backend: transformation.target
      });
      
      // Record path rewrite duration
      if (duration > 0) {
        this.pathRewriteDurationHistogram.observe({
          domain: transformation.domain,
          rule_matched: transformation.matched.toString()
        }, duration);
      }
      
      // Record domain requests
      this.domainRequestsCounter.inc({
        domain: transformation.domain,
        target_backend: transformation.target
      });
      
      // Record errors if present
      if (transformation.error) {
        this.pathTransformationErrorsCounter.inc({
          domain: transformation.domain,
          error_type: 'transformation_error'
        });
      }
    } catch (error) {
      logger.error(`Error recording path rewrite metrics: ${error.message}`);
    }
  }
  
  /**
   * Record file resolution metrics
   * @param {Object} resolution - File resolution result
   * @param {String} domain - Domain name
   * @param {Number} duration - Duration in seconds
   * @param {Boolean} cached - Whether result was from cache
   */
  recordFileResolutionMetrics(resolution, domain, duration = 0, cached = false) {
    if (!this.enabled || !config.fileResolution.enabled) return;
    
    try {
      const success = resolution && resolution.success ? 'true' : 'false';
      const extension = resolution && resolution.extension ? resolution.extension : 'none';
      
      // Record file resolution counter
      this.fileResolutionCounter.inc({
        domain: domain || 'unknown',
        success,
        extension,
        cached: cached.toString()
      });
      
      // Record file resolution duration
      if (duration > 0) {
        this.fileResolutionDurationHistogram.observe({
          domain: domain || 'unknown',
          success,
          cached: cached.toString()
        }, duration);
      }
      
      // Record cache hits/misses
      if (cached) {
        const resultType = success === 'true' ? 'positive' : 'negative';
        this.fileResolutionCacheHitsCounter.inc({
          domain: domain || 'unknown',
          result_type: resultType
        });
      } else {
        this.fileResolutionCacheMissesCounter.inc({
          domain: domain || 'unknown'
        });
      }
      
      // Record errors if present
      if (resolution && resolution.error) {
        this.fileResolutionErrorsCounter.inc({
          domain: domain || 'unknown',
          error_type: 'resolution_error'
        });
      }
      
    } catch (error) {
      logger.error(`Error recording file resolution metrics: ${error.message}`);
    }
  }
  
  /**
   * Record file transformation metrics
   * @param {Object} transformation - Transformation result
   * @param {String} domain - Domain name
   * @param {Number} duration - Duration in seconds
   */
  recordFileTransformationMetrics(transformation, domain, duration = 0) {
    if (!this.enabled || !config.fileResolution.enabled) return;
    
    try {
      const success = transformation && transformation.success ? 'true' : 'false';
      const transformer = transformation && transformation.transformer ? transformation.transformer : 'unknown';
      
      // Record transformation counter
      this.fileTransformationCounter.inc({
        domain: domain || 'unknown',
        transformer,
        success
      });
      
      // Record transformation duration
      if (duration > 0) {
        this.fileTransformationDurationHistogram.observe({
          domain: domain || 'unknown',
          transformer
        }, duration);
      }
      
    } catch (error) {
      logger.error(`Error recording file transformation metrics: ${error.message}`);
    }
  }
  
  /**
   * Record HTTP metrics middleware
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next function
   */
  httpMetricsMiddleware(req, res, next) {
    if (!this.enabled) {
      return next();
    }
    
    const startTime = process.hrtime();
    const domain = req.headers.host || 'unknown';
    
    // Get original end method
    const originalEnd = res.end;
    
    // Override end method
    res.end = (...args) => {
      // Calculate duration
      const duration = process.hrtime(startTime);
      const durationSeconds = duration[0] + duration[1] / 1e9;
      
      // Get path for grouping similar routes
      // Replace IDs with placeholders for better grouping
      let path = req.route ? req.route.path : req.path;
      
      // Try to normalize paths with IDs
      path = path.replace(/\/[0-9a-f]{24}\b/g, '/:id'); // MongoDB IDs
      path = path.replace(/\/\d+\b/g, '/:id'); // Numeric IDs
      
      // Get cache status
      const cacheStatus = res.getHeader('x-cache') || 'NONE';
      
      // Get path rewriting information
      const pathRewritten = req.pathTransformation ? req.pathTransformation.matched.toString() : 'false';
      const targetBackend = req.pathTransformation ? req.pathTransformation.target : config.cdn.targetDomain;
      
      // Record HTTP metrics with domain and path rewriting labels
      this.httpRequestsCounter.inc({
        method: req.method,
        status: res.statusCode,
        path,
        cache: cacheStatus,
        domain,
        path_rewritten: pathRewritten,
        target_backend: targetBackend
      });
      
      this.httpRequestDurationHistogram.observe({
        method: req.method,
        status: res.statusCode,
        path,
        cache: cacheStatus,
        domain,
        path_rewritten: pathRewritten
      }, durationSeconds);
      
      // Update cache counters with domain labels
      if (cacheStatus === 'HIT') {
        this.cacheHitCounter.inc({
          domain,
          path_rewritten: pathRewritten
        });
      } else if (cacheStatus === 'MISS') {
        this.cacheMissCounter.inc({
          domain,
          path_rewritten: pathRewritten
        });
      }
      
      // Record domain requests
      this.domainRequestsCounter.inc({
        domain,
        target_backend: targetBackend
      });
      
      // Record path rewriting metrics if transformation occurred
      if (req.pathTransformation) {
        this.recordPathRewriteMetrics(req.pathTransformation, 0);
      }
      
      // Call the original end method
      return originalEnd.apply(res, args);
    };
    
    next();
  }
  
  /**
   * Get domain-specific metrics
   * @param {String} domain - Domain to get metrics for
   * @returns {Object} Domain metrics
   */
  getDomainMetrics(domain) {
    if (!this.enabled) {
      return { error: 'Metrics not enabled' };
    }
    
    try {
      // This would require implementing metric querying functionality
      // For now, return basic information
      return {
        domain,
        message: 'Domain-specific metrics available in Prometheus format',
        metricsEndpoint: config.monitoring.metrics.path
      };
    } catch (error) {
      logger.error(`Error getting domain metrics: ${error.message}`);
      return { error: error.message };
    }
  }
  
  /**
   * Get path rewriting statistics
   * @returns {Object} Path rewriting stats
   */
  getPathRewritingStats() {
    if (!this.enabled) {
      return { error: 'Metrics not enabled' };
    }
    
    return {
      pathRewritingEnabled: config.pathRewriting.enabled,
      configuredDomains: config.pathRewriting.enabled ? Object.keys(config.pathRewriting.domains) : [],
      metricsAvailable: [
        'path_rewrites_total',
        'path_rewrite_duration_seconds',
        'domain_requests_total',
        'path_transformation_errors_total'
      ]
    };
  }
  
  /**
   * Get file resolution statistics
   * @returns {Object} File resolution stats
   */
  getFileResolutionStats() {
    if (!this.enabled) {
      return { error: 'Metrics not enabled' };
    }
    
    try {
      const resolverStats = fileResolver.getStats();
      const cacheStats = fileResolutionCache.getStats();
      const domainStats = domainManager.getFileResolutionStats();
      
      return {
        fileResolutionEnabled: config.fileResolution.enabled,
        configuredDomains: Object.keys(config.fileResolution.domainConfig),
        resolver: resolverStats,
        cache: cacheStats,
        domains: domainStats,
        metricsAvailable: [
          'file_resolution_requests_total',
          'file_resolution_duration_seconds',
          'file_resolution_cache_hits_total',
          'file_resolution_cache_misses_total',
          'file_resolution_errors_total',
          'file_transformations_total',
          'file_transformation_duration_seconds',
          'file_resolution_cache_size',
          'file_resolution_circuit_breaker_state'
        ]
      };
    } catch (error) {
      logger.error(`Error getting file resolution stats: ${error.message}`);
      return { error: error.message };
    }
  }
  
  /**
   * Get metrics endpoint handler
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getMetricsHandler(req, res) {
    if (!this.enabled) {
      return res.status(404).send('Metrics not enabled');
    }
    
    try {
      res.set('Content-Type', this.register.contentType);
      res.end(await this.register.metrics());
    } catch (err) {
      logger.error(`Error generating metrics: ${err.message}`);
      res.status(500).send('Error generating metrics');
    }
  }
  
  /**
   * Clean up resources
   */
  shutdown() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    if (this.register) {
      this.register.clear();
    }
    logger.info('Metrics manager shutting down');
  }
}

module.exports = new MetricsManager();
