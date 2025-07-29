// file-resolver.js
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { EventEmitter } = require('events');
const config = require('./config');
const logger = require('./logger').getModuleLogger('file-resolver');

/**
 * File Resolver - Cascading file resolution with HTTP HEAD requests
 * 
 * This module implements a cascading file resolution system that:
 * - Tries multiple file extensions in priority order
 * - Uses HTTP HEAD requests to check file existence
 * - Implements circuit breaker pattern for failing domains
 * - Caches both positive and negative results
 * - Supports per-domain configuration
 */
class FileResolver extends EventEmitter {
    constructor() {
        super();
        this.cache = new Map();
        this.circuitBreakers = new Map();
        this.stats = {
            requests: 0,
            hits: 0,
            misses: 0,
            errors: 0,
            circuitBreakerTrips: 0
        };
        
        // HTTP agents for connection pooling
        this.httpAgent = new http.Agent({
            keepAlive: config.fileResolution.keepAlive,
            maxSockets: config.fileResolution.connectionPoolSize,
            timeout: config.fileResolution.connectionTimeout
        });
        
        this.httpsAgent = new https.Agent({
            keepAlive: config.fileResolution.keepAlive,
            maxSockets: config.fileResolution.connectionPoolSize,
            timeout: config.fileResolution.connectionTimeout
        });
        
        // Start cache cleanup interval
        this.startCacheCleanup();
        
        logger.info('FileResolver initialized', {
            cacheEnabled: config.fileResolution.cache.enabled,
            circuitBreakerEnabled: config.fileResolution.circuitBreaker.enabled,
            defaultExtensions: config.fileResolution.defaultExtensions
        });
    }
    
    /**
     * Resolve a file by trying multiple extensions in priority order
     * @param {string} baseUrl - Base URL without extension
     * @param {string} domain - Domain for per-domain configuration
     * @param {Object} options - Resolution options
     * @returns {Promise<Object>} Resolution result
     */
    async resolveFile(baseUrl, domain, options = {}) {
        const startTime = Date.now();
        this.stats.requests++;
        
        try {
            // Check if circuit breaker is open for this domain
            if (this.isCircuitBreakerOpen(domain)) {
                logger.warn('Circuit breaker open for domain', { domain });
                this.stats.circuitBreakerTrips++;
                return {
                    success: false,
                    error: 'Circuit breaker open',
                    domain,
                    duration: Date.now() - startTime
                };
            }
            
            // Get domain-specific configuration
            const domainConfig = this.getDomainConfig(domain);
            if (!domainConfig.enabled) {
                logger.debug('File resolution disabled for domain', { domain });
                return {
                    success: false,
                    error: 'File resolution disabled for domain',
                    domain,
                    duration: Date.now() - startTime
                };
            }
            
            const extensions = options.extensions || domainConfig.extensions;
            const cacheKey = this.getCacheKey(baseUrl, extensions);
            
            // Check cache first
            if (config.fileResolution.cache.enabled) {
                const cached = this.getFromCache(cacheKey);
                if (cached) {
                    logger.debug('File resolution cache hit', { baseUrl, domain, result: cached.result });
                    this.stats.hits++;
                    return {
                        ...cached.result,
                        cached: true,
                        duration: Date.now() - startTime
                    };
                }
            }
            
            // Try each extension in priority order
            const result = await this.tryExtensions(baseUrl, extensions, domain, options);
            
            // Cache the result
            if (config.fileResolution.cache.enabled) {
                this.cacheResult(cacheKey, result);
            }
            
            // Update circuit breaker
            this.updateCircuitBreaker(domain, result.success);
            
            // Update stats
            if (result.success) {
                this.stats.hits++;
            } else {
                this.stats.misses++;
            }
            
            result.duration = Date.now() - startTime;
            
            // Emit events for monitoring
            this.emit('resolution', {
                baseUrl,
                domain,
                result,
                duration: result.duration
            });
            
            logger.debug('File resolution completed', {
                baseUrl,
                domain,
                success: result.success,
                resolvedUrl: result.resolvedUrl,
                duration: result.duration
            });
            
            return result;
            
        } catch (error) {
            this.stats.errors++;
            this.updateCircuitBreaker(domain, false);
            
            logger.error('File resolution error', {
                baseUrl,
                domain,
                error: error.message,
                duration: Date.now() - startTime
            });
            
            return {
                success: false,
                error: error.message,
                domain,
                duration: Date.now() - startTime
            };
        }
    }
    
    /**
     * Try multiple extensions for a base URL
     * @param {string} baseUrl - Base URL without extension
     * @param {Array} extensions - Extensions to try
     * @param {string} domain - Domain name
     * @param {Object} options - Options
     * @returns {Promise<Object>} Result
     */
    async tryExtensions(baseUrl, extensions, domain, options = {}) {
        const maxConcurrent = options.maxConcurrent || config.fileResolution.maxConcurrent;
        const timeout = options.timeout || config.fileResolution.timeout;
        
        // Create promises for each extension
        const promises = extensions.map(ext => 
            this.checkFileExists(`${baseUrl}.${ext}`, timeout)
                .then(result => ({ ...result, extension: ext }))
        );
        
        // Process requests with concurrency limit
        const results = await this.processConcurrent(promises, maxConcurrent);
        
        // Find first successful result
        const successResult = results.find(r => r.success);
        if (successResult) {
            return {
                success: true,
                resolvedUrl: successResult.url,
                extension: successResult.extension,
                contentType: successResult.contentType,
                contentLength: successResult.contentLength,
                lastModified: successResult.lastModified,
                domain
            };
        }
        
        // No file found
        return {
            success: false,
            error: 'No file found with any extension',
            triedExtensions: extensions,
            domain
        };
    }
    
    /**
     * Check if a file exists using HTTP HEAD request
     * @param {string} url - Full URL to check
     * @param {number} timeout - Request timeout
     * @returns {Promise<Object>} Check result
     */
    async checkFileExists(url, timeout) {
        return new Promise((resolve) => {
            try {
                const urlObj = new URL(url);
                const isHttps = urlObj.protocol === 'https:';
                const client = isHttps ? https : http;
                const agent = isHttps ? this.httpsAgent : this.httpAgent;
                
                const options = {
                    method: 'HEAD',
                    hostname: urlObj.hostname,
                    port: urlObj.port,
                    path: urlObj.pathname + urlObj.search,
                    headers: {
                        'User-Agent': config.fileResolution.userAgent || 'Advanced-CDN-FileResolver/1.0'
                    },
                    agent,
                    timeout
                };
                
                const req = client.request(options, (res) => {
                    const success = res.statusCode >= 200 && res.statusCode < 300;
                    
                    resolve({
                        success,
                        url,
                        statusCode: res.statusCode,
                        contentType: res.headers['content-type'],
                        contentLength: res.headers['content-length'],
                        lastModified: res.headers['last-modified']
                    });
                });
                
                req.on('error', (error) => {
                    resolve({
                        success: false,
                        url,
                        error: error.message
                    });
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    resolve({
                        success: false,
                        url,
                        error: 'Request timeout'
                    });
                });
                
                req.end();
                
            } catch (error) {
                resolve({
                    success: false,
                    url,
                    error: error.message
                });
            }
        });
    }
    
    /**
     * Process promises with concurrency limit
     * @param {Array} promises - Array of promises
     * @param {number} maxConcurrent - Maximum concurrent requests
     * @returns {Promise<Array>} Results
     */
    async processConcurrent(promises, maxConcurrent) {
        const results = [];
        
        for (let i = 0; i < promises.length; i += maxConcurrent) {
            const batch = promises.slice(i, i + maxConcurrent);
            const batchResults = await Promise.all(batch);
            results.push(...batchResults);
            
            // If we found a successful result, we can stop
            if (batchResults.some(r => r.success)) {
                break;
            }
        }
        
        return results;
    }
    
    /**
     * Get domain-specific configuration
     * @param {string} domain - Domain name
     * @returns {Object} Domain configuration
     */
    getDomainConfig(domain) {
        const domainConfigs = config.fileResolution.domainConfig || {};
        const domainConfig = domainConfigs[domain];
        
        if (domainConfig) {
            return {
                enabled: domainConfig.enabled !== false,
                extensions: domainConfig.extensions || config.fileResolution.defaultExtensions,
                transformers: domainConfig.transformers || []
            };
        }
        
        return {
            enabled: config.fileResolution.enabled,
            extensions: config.fileResolution.defaultExtensions,
            transformers: []
        };
    }
    
    /**
     * Generate cache key
     * @param {string} baseUrl - Base URL
     * @param {Array} extensions - Extensions
     * @returns {string} Cache key
     */
    getCacheKey(baseUrl, extensions) {
        return `${baseUrl}:${extensions.join(',')}`;
    }
    
    /**
     * Get result from cache
     * @param {string} key - Cache key
     * @returns {Object|null} Cached result
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        const now = Date.now();
        const ttl = cached.result.success ? 
            config.fileResolution.cache.ttl * 1000 : 
            config.fileResolution.cache.negativeTtl * 1000;
            
        if (now - cached.timestamp > ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return cached;
    }
    
    /**
     * Cache a result
     * @param {string} key - Cache key
     * @param {Object} result - Result to cache
     */
    cacheResult(key, result) {
        if (this.cache.size >= config.fileResolution.cache.maxSize) {
            // Remove oldest entries
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toRemove = Math.floor(config.fileResolution.cache.maxSize * 0.1);
            for (let i = 0; i < toRemove; i++) {
                this.cache.delete(entries[i][0]);
            }
        }
        
        this.cache.set(key, {
            result,
            timestamp: Date.now()
        });
    }
    
    /**
     * Check if circuit breaker is open for domain
     * @param {string} domain - Domain name
     * @returns {boolean} True if open
     */
    isCircuitBreakerOpen(domain) {
        if (!config.fileResolution.circuitBreaker.enabled) return false;
        
        const breaker = this.circuitBreakers.get(domain);
        if (!breaker) return false;
        
        const now = Date.now();
        
        // Check if reset timeout has passed
        if (breaker.state === 'open' && 
            now - breaker.lastFailure > config.fileResolution.circuitBreaker.resetTimeout) {
            breaker.state = 'half-open';
            breaker.failures = 0;
        }
        
        return breaker.state === 'open';
    }
    
    /**
     * Update circuit breaker state
     * @param {string} domain - Domain name
     * @param {boolean} success - Whether request was successful
     */
    updateCircuitBreaker(domain, success) {
        if (!config.fileResolution.circuitBreaker.enabled) return;
        
        let breaker = this.circuitBreakers.get(domain);
        if (!breaker) {
            breaker = {
                state: 'closed',
                failures: 0,
                lastFailure: 0
            };
            this.circuitBreakers.set(domain, breaker);
        }
        
        const now = Date.now();
        
        if (success) {
            if (breaker.state === 'half-open') {
                breaker.state = 'closed';
                breaker.failures = 0;
            }
        } else {
            breaker.failures++;
            breaker.lastFailure = now;
            
            if (breaker.failures >= config.fileResolution.circuitBreaker.failureThreshold) {
                breaker.state = 'open';
                logger.warn('Circuit breaker opened for domain', { 
                    domain, 
                    failures: breaker.failures 
                });
            }
        }
    }
    
    /**
     * Start cache cleanup interval
     */
    startCacheCleanup() {
        const interval = config.fileResolution.cache.checkPeriod * 1000;
        
        setInterval(() => {
            const now = Date.now();
            const toDelete = [];
            
            for (const [key, cached] of this.cache.entries()) {
                const ttl = cached.result.success ? 
                    config.fileResolution.cache.ttl * 1000 : 
                    config.fileResolution.cache.negativeTtl * 1000;
                    
                if (now - cached.timestamp > ttl) {
                    toDelete.push(key);
                }
            }
            
            toDelete.forEach(key => this.cache.delete(key));
            
            if (toDelete.length > 0) {
                logger.debug('Cache cleanup completed', { 
                    removed: toDelete.length,
                    remaining: this.cache.size
                });
            }
        }, interval);
    }
    
    /**
     * Get resolver statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            circuitBreakers: this.circuitBreakers.size,
            hitRate: this.stats.requests > 0 ? (this.stats.hits / this.stats.requests) : 0
        };
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        logger.info('File resolution cache cleared');
    }
    
    /**
     * Reset circuit breakers
     */
    resetCircuitBreakers() {
        this.circuitBreakers.clear();
        logger.info('File resolution circuit breakers reset');
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            requests: 0,
            hits: 0,
            misses: 0,
            errors: 0,
            circuitBreakerTrips: 0
        };
        logger.info('File resolution statistics reset');
    }
}

// Create singleton instance
const fileResolver = new FileResolver();

module.exports = fileResolver;
