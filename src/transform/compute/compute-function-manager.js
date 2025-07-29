// compute-function-manager.js
const logger = require('../../logger').getModuleLogger('compute-function-manager');
const URLRelativizationCompute = require('./url-relativization-compute');

/**
 * Compute Function Manager
 * 
 * Orchestrates multiple compute functions that process content after transformation
 * but before URL transformation in the pipeline. Provides a centralized way to
 * manage, configure, and execute compute functions.
 */
class ComputeFunctionManager {
    constructor(config = {}) {
        this.config = config;
        this.computeFunctions = new Map();
        this.enabled = config.enabled !== false;
        
        // Global statistics
        this.stats = {
            totalProcessed: 0,
            totalModified: 0,
            totalErrors: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0
        };
        
        // Performance settings
        this.maxContentSize = config.maxContentSize || 10 * 1024 * 1024; // 10MB default
        this.timeout = config.timeout || 5000; // 5 seconds default
        this.debugMode = config.debugMode === true;
        
        // Initialize built-in compute functions
        this.registerBuiltInFunctions();
        
        logger.info('Compute Function Manager initialized', {
            enabled: this.enabled,
            functionsRegistered: this.computeFunctions.size,
            maxContentSize: this.maxContentSize,
            timeout: this.timeout,
            debugMode: this.debugMode
        });
    }
    
    /**
     * Register built-in compute functions based on configuration
     */
    registerBuiltInFunctions() {
        // Register URL Relativization compute function
        if (this.config.urlRelativization?.enabled) {
            const urlRelativizationConfig = {
                ...this.config.urlRelativization,
                cdn: this.config.cdn,
                pathRewriting: this.config.pathRewriting
            };
            
            const urlRelativizationCompute = new URLRelativizationCompute(urlRelativizationConfig);
            this.register(urlRelativizationCompute);
            
            logger.info('URL Relativization compute function registered');
        }
        
        // Future compute functions can be registered here
        // Example:
        // if (this.config.imageOptimization?.enabled) {
        //     this.register(new ImageOptimizationCompute(this.config.imageOptimization));
        // }
    }
    
    /**
     * Register a compute function
     * @param {BaseComputeFunction} computeFunction - Compute function to register
     */
    register(computeFunction) {
        if (!computeFunction || typeof computeFunction.compute !== 'function') {
            throw new Error('Invalid compute function: must have a compute method');
        }
        
        this.computeFunctions.set(computeFunction.name, computeFunction);
        
        logger.debug('Compute function registered', {
            name: computeFunction.name,
            enabled: computeFunction.enabled,
            totalRegistered: this.computeFunctions.size
        });
    }
    
    /**
     * Unregister a compute function
     * @param {string} name - Name of compute function to unregister
     */
    unregister(name) {
        const computeFunction = this.computeFunctions.get(name);
        if (computeFunction) {
            // Shutdown the compute function
            if (typeof computeFunction.shutdown === 'function') {
                computeFunction.shutdown();
            }
            
            this.computeFunctions.delete(name);
            
            logger.debug('Compute function unregistered', {
                name,
                totalRegistered: this.computeFunctions.size
            });
        }
    }
    
    /**
     * Process content through all applicable compute functions
     * @param {string|Buffer} content - Content to process
     * @param {string} contentType - MIME type of content
     * @param {Object} context - Request context
     * @returns {Promise<Object>} Processing result
     */
    async processContent(content, contentType, context) {
        if (!this.enabled) {
            return {
                content,
                modified: false,
                reason: 'Compute function manager disabled'
            };
        }
        
        // Check content size limits
        const contentSize = typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.length;
        if (contentSize > this.maxContentSize) {
            logger.debug('Skipping compute functions for large content', {
                size: contentSize,
                maxSize: this.maxContentSize,
                url: context.originalUrl
            });
            
            return {
                content,
                modified: false,
                reason: 'Content too large',
                contentSize
            };
        }
        
        const startTime = Date.now();
        let processedContent = content;
        let totalModifications = 0;
        let totalErrors = 0;
        const results = [];
        
        // Process through each enabled compute function
        for (const [name, computeFunction] of this.computeFunctions) {
            if (!computeFunction.enabled) {
                continue;
            }
            
            // Check if this function can process the content
            if (!computeFunction.canProcess(processedContent, contentType, context)) {
                continue;
            }
            
            try {
                // Apply timeout to compute function execution
                const computePromise = computeFunction.compute(processedContent, contentType, context);
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Compute function timeout: ${name}`)), this.timeout);
                });
                
                const result = await Promise.race([computePromise, timeoutPromise]);
                
                if (result.modified) {
                    processedContent = result.content;
                    totalModifications += result.urlsConverted || 1;
                }
                
                results.push({
                    computeFunction: name,
                    success: true,
                    modified: result.modified,
                    processingTime: result.processingTime || 0,
                    details: result
                });
                
                if (this.debugMode) {
                    logger.debug('Compute function executed', {
                        name,
                        modified: result.modified,
                        processingTime: result.processingTime,
                        url: context.originalUrl
                    });
                }
                
            } catch (error) {
                totalErrors++;
                
                logger.error(`Compute function error: ${name}`, {
                    error: error.message,
                    contentType,
                    url: context.originalUrl,
                    stack: error.stack
                });
                
                results.push({
                    computeFunction: name,
                    success: false,
                    error: error.message,
                    processingTime: 0
                });
            }
        }
        
        // Update global statistics
        const totalProcessingTime = Date.now() - startTime;
        this.updateStats(totalProcessingTime, totalModifications > 0, totalErrors > 0);
        
        const wasModified = totalModifications > 0;
        
        if (wasModified || this.debugMode) {
            logger.info('Compute functions processing completed', {
                url: context.originalUrl,
                contentType,
                modified: wasModified,
                totalModifications,
                functionsExecuted: results.filter(r => r.success).length,
                errors: totalErrors,
                totalProcessingTime,
                results: results.map(r => ({
                    function: r.computeFunction,
                    success: r.success,
                    modified: r.modified
                }))
            });
        }
        
        return {
            content: processedContent,
            modified: wasModified,
            totalModifications,
            functionsExecuted: results.length,
            errors: totalErrors,
            totalProcessingTime,
            results,
            contentSize
        };
    }
    
    /**
     * Update global statistics
     * @param {number} processingTime - Total processing time in milliseconds
     * @param {boolean} wasModified - Whether content was modified
     * @param {boolean} hadErrors - Whether errors occurred
     */
    updateStats(processingTime, wasModified = false, hadErrors = false) {
        this.stats.totalProcessed++;
        this.stats.totalProcessingTime += processingTime;
        this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.totalProcessed;
        
        if (wasModified) {
            this.stats.totalModified++;
        }
        
        if (hadErrors) {
            this.stats.totalErrors++;
        }
    }
    
    /**
     * Get comprehensive statistics from all compute functions
     * @returns {Object} Statistics object
     */
    getStats() {
        const functionStats = {};
        
        for (const [name, computeFunction] of this.computeFunctions) {
            functionStats[name] = computeFunction.getStats();
        }
        
        return {
            manager: {
                enabled: this.enabled,
                functionsRegistered: this.computeFunctions.size,
                ...this.stats,
                modificationRate: this.stats.totalProcessed > 0 ? (this.stats.totalModified / this.stats.totalProcessed) : 0,
                errorRate: this.stats.totalProcessed > 0 ? (this.stats.totalErrors / this.stats.totalProcessed) : 0
            },
            functions: functionStats
        };
    }
    
    /**
     * Reset all statistics
     */
    resetStats() {
        this.stats = {
            totalProcessed: 0,
            totalModified: 0,
            totalErrors: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0
        };
        
        // Reset individual function statistics
        for (const computeFunction of this.computeFunctions.values()) {
            if (typeof computeFunction.resetStats === 'function') {
                computeFunction.resetStats();
            }
        }
        
        logger.info('All compute function statistics reset');
    }
    
    /**
     * Update configuration for all compute functions
     * @param {Object} newConfig - New configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.enabled = newConfig.enabled !== false;
        this.maxContentSize = newConfig.maxContentSize || this.maxContentSize;
        this.timeout = newConfig.timeout || this.timeout;
        this.debugMode = newConfig.debugMode === true;
        
        // Update configuration for individual compute functions
        for (const computeFunction of this.computeFunctions.values()) {
            if (typeof computeFunction.updateConfig === 'function') {
                const functionConfig = {
                    ...newConfig[computeFunction.name],
                    cdn: newConfig.cdn,
                    pathRewriting: newConfig.pathRewriting
                };
                computeFunction.updateConfig(functionConfig);
            }
        }
        
        logger.info('Compute function manager configuration updated', {
            enabled: this.enabled,
            maxContentSize: this.maxContentSize,
            timeout: this.timeout,
            debugMode: this.debugMode
        });
    }
    
    /**
     * Shutdown all compute functions and cleanup resources
     */
    shutdown() {
        logger.info('Shutting down compute function manager');
        
        for (const [name, computeFunction] of this.computeFunctions) {
            try {
                if (typeof computeFunction.shutdown === 'function') {
                    computeFunction.shutdown();
                }
            } catch (error) {
                logger.error(`Error shutting down compute function ${name}`, {
                    error: error.message
                });
            }
        }
        
        this.computeFunctions.clear();
        logger.info('Compute function manager shutdown complete');
    }
}

module.exports = ComputeFunctionManager;