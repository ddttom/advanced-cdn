// base-compute-function.js
const logger = require('../../logger').getModuleLogger('compute-functions');

/**
 * Base Compute Function class
 * 
 * Provides the foundation for all compute functions that process content
 * after transformation but before URL transformation in the pipeline.
 */
class BaseComputeFunction {
    constructor(name, config = {}) {
        this.name = name;
        this.config = config;
        this.enabled = config.enabled !== false;
        
        // Initialize statistics
        this.stats = {
            processed: 0,
            modified: 0,
            errors: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0
        };
        
        logger.debug(`Compute function initialized: ${name}`, {
            enabled: this.enabled,
            config: this.config
        });
    }
    
    /**
     * Check if this compute function should process the content
     * @param {string|Buffer} content - Content to potentially process
     * @param {string} contentType - MIME type of content
     * @param {Object} context - Request context
     * @returns {boolean} Whether this function can process the content
     */
    canProcess(content, contentType, context) {
        // Default implementation - override in subclasses
        return this.enabled && typeof content === 'string';
    }
    
    /**
     * Main compute function - processes content and returns modified version
     * @param {string|Buffer} content - Content to process
     * @param {string} contentType - MIME type of content
     * @param {Object} context - Request context
     * @returns {Promise<Object>} Processing result
     */
    async compute(content, contentType, context) {
        throw new Error(`Compute method not implemented for ${this.name}`);
    }
    
    /**
     * Update processing statistics
     * @param {number} processingTime - Time taken to process in milliseconds
     * @param {boolean} wasModified - Whether content was modified
     * @param {boolean} hadError - Whether an error occurred
     */
    updateStats(processingTime, wasModified = false, hadError = false) {
        this.stats.processed++;
        this.stats.totalProcessingTime += processingTime;
        this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.processed;
        
        if (wasModified) {
            this.stats.modified++;
        }
        
        if (hadError) {
            this.stats.errors++;
        }
    }
    
    /**
     * Get processing statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            name: this.name,
            enabled: this.enabled,
            ...this.stats,
            modificationRate: this.stats.processed > 0 ? (this.stats.modified / this.stats.processed) : 0,
            errorRate: this.stats.processed > 0 ? (this.stats.errors / this.stats.processed) : 0
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            processed: 0,
            modified: 0,
            errors: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0
        };
    }
    
    /**
     * Shutdown the compute function and cleanup resources
     */
    shutdown() {
        logger.debug(`Shutting down compute function: ${this.name}`);
        // Override in subclasses if cleanup is needed
    }
}

module.exports = BaseComputeFunction;