// file-resolution-cache.js
const { EventEmitter } = require('events');
const config = require('../config');
const logger = require('../logger').getModuleLogger('file-resolution-cache');

/**
 * File Resolution Cache
 * 
 * This module provides specialized caching for file resolution results,
 * supporting both positive (file found) and negative (file not found) results
 * with different TTL values and intelligent cache management.
 */
class FileResolutionCache extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.config = {
            enabled: options.enabled !== false,
            ttl: options.ttl || config.fileResolution.cache.ttl * 1000, // Convert to milliseconds
            negativeTtl: options.negativeTtl || config.fileResolution.cache.negativeTtl * 1000,
            maxSize: options.maxSize || config.fileResolution.cache.maxSize,
            checkPeriod: options.checkPeriod || config.fileResolution.cache.checkPeriod * 1000
        };
        
        // Cache storage
        this.cache = new Map();
        
        // Statistics
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            cleanups: 0,
            positiveHits: 0,
            negativeHits: 0
        };
        
        // Start cleanup interval
        this.startCleanupInterval();
        
        logger.info('FileResolutionCache initialized', {
            enabled: this.config.enabled,
            ttl: this.config.ttl,
            negativeTtl: this.config.negativeTtl,
            maxSize: this.config.maxSize
        });
    }
    
    /**
     * Generate cache key from base URL and extensions
     * @param {string} baseUrl - Base URL without extension
     * @param {Array} extensions - Extensions to try
     * @returns {string} Cache key
     */
    generateKey(baseUrl, extensions = []) {
        const extensionsStr = Array.isArray(extensions) ? extensions.join(',') : '';
        return `${baseUrl}:${extensionsStr}`;
    }
    
    /**
     * Get cached result
     * @param {string} key - Cache key
     * @returns {Object|null} Cached result or null if not found/expired
     */
    get(key) {
        if (!this.config.enabled) {
            return null;
        }
        
        const cached = this.cache.get(key);
        if (!cached) {
            this.stats.misses++;
            return null;
        }
        
        const now = Date.now();
        const ttl = cached.result.success ? this.config.ttl : this.config.negativeTtl;
        
        if (now - cached.timestamp > ttl) {
            // Expired
            this.cache.delete(key);
            this.stats.deletes++;
            this.stats.misses++;
            
            this.emit('expired', { key, result: cached.result });
            
            logger.debug('Cache entry expired', { 
                key, 
                age: now - cached.timestamp,
                ttl,
                success: cached.result.success
            });
            
            return null;
        }
        
        // Cache hit
        this.stats.hits++;
        if (cached.result.success) {
            this.stats.positiveHits++;
        } else {
            this.stats.negativeHits++;
        }
        
        this.emit('hit', { key, result: cached.result });
        
        logger.debug('Cache hit', { 
            key, 
            success: cached.result.success,
            age: now - cached.timestamp
        });
        
        return {
            ...cached.result,
            cached: true,
            cacheAge: now - cached.timestamp
        };
    }
    
    /**
     * Set cache entry
     * @param {string} key - Cache key
     * @param {Object} result - Result to cache
     * @returns {boolean} True if cached successfully
     */
    set(key, result) {
        if (!this.config.enabled) {
            return false;
        }
        
        // Check if we need to evict entries
        if (this.cache.size >= this.config.maxSize) {
            this.evictOldest();
        }
        
        const entry = {
            result: { ...result },
            timestamp: Date.now(),
            key
        };
        
        this.cache.set(key, entry);
        this.stats.sets++;
        
        this.emit('set', { key, result });
        
        logger.debug('Cache entry set', { 
            key, 
            success: result.success,
            cacheSize: this.cache.size
        });
        
        return true;
    }
    
    /**
     * Delete cache entry
     * @param {string} key - Cache key
     * @returns {boolean} True if entry was deleted
     */
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.stats.deletes++;
            this.emit('delete', { key });
            logger.debug('Cache entry deleted', { key });
        }
        return deleted;
    }
    
    /**
     * Check if key exists in cache (without updating stats)
     * @param {string} key - Cache key
     * @returns {boolean} True if key exists and not expired
     */
    has(key) {
        if (!this.config.enabled) {
            return false;
        }
        
        const cached = this.cache.get(key);
        if (!cached) {
            return false;
        }
        
        const now = Date.now();
        const ttl = cached.result.success ? this.config.ttl : this.config.negativeTtl;
        
        return (now - cached.timestamp) <= ttl;
    }
    
    /**
     * Get cache entry with metadata (without updating stats)
     * @param {string} key - Cache key
     * @returns {Object|null} Cache entry with metadata
     */
    peek(key) {
        if (!this.config.enabled) {
            return null;
        }
        
        const cached = this.cache.get(key);
        if (!cached) {
            return null;
        }
        
        const now = Date.now();
        const ttl = cached.result.success ? this.config.ttl : this.config.negativeTtl;
        const age = now - cached.timestamp;
        
        return {
            result: cached.result,
            timestamp: cached.timestamp,
            age,
            ttl,
            expired: age > ttl
        };
    }
    
    /**
     * Evict oldest entries to make room
     * @param {number} count - Number of entries to evict (default: 10% of max size)
     */
    evictOldest(count = null) {
        if (count === null) {
            count = Math.max(1, Math.floor(this.config.maxSize * 0.1));
        }
        
        // Get all entries sorted by timestamp (oldest first)
        const entries = Array.from(this.cache.entries())
            .map(([key, entry]) => ({ key, ...entry }))
            .sort((a, b) => a.timestamp - b.timestamp);
        
        // Remove oldest entries
        const evicted = [];
        for (let i = 0; i < Math.min(count, entries.length); i++) {
            const entry = entries[i];
            this.cache.delete(entry.key);
            evicted.push(entry.key);
            this.stats.evictions++;
        }
        
        if (evicted.length > 0) {
            this.emit('eviction', { keys: evicted, count: evicted.length });
            logger.debug('Cache entries evicted', { 
                count: evicted.length, 
                remainingSize: this.cache.size 
            });
        }
        
        return evicted;
    }
    
    /**
     * Clear all cache entries
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        
        this.emit('clear', { previousSize: size });
        logger.info('Cache cleared', { previousSize: size });
    }
    
    /**
     * Clean up expired entries
     * @returns {number} Number of entries cleaned up
     */
    cleanup() {
        if (!this.config.enabled) {
            return 0;
        }
        
        const now = Date.now();
        const toDelete = [];
        
        for (const [key, cached] of this.cache.entries()) {
            const ttl = cached.result.success ? this.config.ttl : this.config.negativeTtl;
            if (now - cached.timestamp > ttl) {
                toDelete.push(key);
            }
        }
        
        // Delete expired entries
        toDelete.forEach(key => {
            this.cache.delete(key);
            this.stats.deletes++;
        });
        
        if (toDelete.length > 0) {
            this.stats.cleanups++;
            this.emit('cleanup', { 
                cleaned: toDelete.length, 
                remainingSize: this.cache.size 
            });
            
            logger.debug('Cache cleanup completed', { 
                cleaned: toDelete.length,
                remaining: this.cache.size
            });
        }
        
        return toDelete.length;
    }
    
    /**
     * Start automatic cleanup interval
     */
    startCleanupInterval() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, this.config.checkPeriod);
        
        logger.debug('Cache cleanup interval started', { 
            period: this.config.checkPeriod 
        });
    }
    
    /**
     * Stop automatic cleanup interval
     */
    stopCleanupInterval() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger.debug('Cache cleanup interval stopped');
        }
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 ? 
            this.stats.hits / (this.stats.hits + this.stats.misses) : 0;
        
        const positiveHitRate = this.stats.positiveHits + this.stats.negativeHits > 0 ?
            this.stats.positiveHits / (this.stats.positiveHits + this.stats.negativeHits) : 0;
        
        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.config.maxSize,
            hitRate,
            positiveHitRate,
            memoryUsage: this.getMemoryUsage()
        };
    }
    
    /**
     * Get memory usage information
     * @returns {Object} Memory usage stats
     */
    getMemoryUsage() {
        let totalSize = 0;
        let keySize = 0;
        let valueSize = 0;
        
        for (const [key, value] of this.cache.entries()) {
            keySize += key.length * 2; // Approximate UTF-16 encoding
            valueSize += JSON.stringify(value).length * 2;
        }
        
        totalSize = keySize + valueSize;
        
        return {
            totalBytes: totalSize,
            keyBytes: keySize,
            valueBytes: valueSize,
            averageEntrySize: this.cache.size > 0 ? totalSize / this.cache.size : 0
        };
    }
    
    /**
     * Get all cache keys
     * @param {string} pattern - Optional pattern to filter keys
     * @returns {Array} Array of cache keys
     */
    getKeys(pattern = null) {
        if (!this.config.enabled) {
            return [];
        }
        
        try {
            const keys = Array.from(this.cache.keys());
            
            if (!pattern) {
                return keys;
            }
            
            // Apply pattern filtering if specified
            return keys.filter(key => {
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
        } catch (err) {
            logger.error(`File resolution cache keys retrieval error: ${err.message}`);
            return [];
        }
    }

    /**
     * Get cache entries for debugging
     * @param {number} limit - Maximum number of entries to return
     * @returns {Array} Array of cache entries
     */
    getEntries(limit = 100) {
        const entries = [];
        let count = 0;
        
        for (const [key, cached] of this.cache.entries()) {
            if (count >= limit) break;
            
            const now = Date.now();
            const ttl = cached.result.success ? this.config.ttl : this.config.negativeTtl;
            const age = now - cached.timestamp;
            
            entries.push({
                key,
                success: cached.result.success,
                timestamp: cached.timestamp,
                age,
                ttl,
                expired: age > ttl,
                resolvedUrl: cached.result.resolvedUrl,
                extension: cached.result.extension
            });
            
            count++;
        }
        
        return entries.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            cleanups: 0,
            positiveHits: 0,
            negativeHits: 0
        };
        
        logger.info('Cache statistics reset');
    }
    
    /**
     * Update configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Restart cleanup interval if period changed
        if (newConfig.checkPeriod && newConfig.checkPeriod !== oldConfig.checkPeriod) {
            this.startCleanupInterval();
        }
        
        // If max size decreased, evict entries
        if (newConfig.maxSize && newConfig.maxSize < oldConfig.maxSize && this.cache.size > newConfig.maxSize) {
            const toEvict = this.cache.size - newConfig.maxSize;
            this.evictOldest(toEvict);
        }
        
        this.emit('configUpdate', { oldConfig, newConfig: this.config });
        logger.info('Cache configuration updated', { 
            oldConfig, 
            newConfig: this.config 
        });
    }
    
    /**
     * Destroy cache and cleanup resources
     */
    destroy() {
        this.stopCleanupInterval();
        this.clear();
        this.removeAllListeners();
        
        logger.info('FileResolutionCache destroyed');
    }
}

// Create singleton instance
const fileResolutionCache = new FileResolutionCache();

module.exports = fileResolutionCache;
module.exports.FileResolutionCache = FileResolutionCache;
