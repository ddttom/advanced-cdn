// url-relativization-compute.js
const BaseComputeFunction = require('./base-compute-function');
const logger = require('../../logger').getModuleLogger('url-relativization-compute');
const { URL } = require('url');

/**
 * URL Relativization Compute Function
 * 
 * Converts absolute URLs to relative paths using the existing domain configuration.
 * This function understands the relationship between origin domains (final) and 
 * target domains (staging) to intelligently convert URLs.
 * 
 * Example:
 * - https://allabout.network/blogs/ddt/ai/ → /ai/
 * - https://main--allaboutv2--ddttom.hlx.live/ddt/edge-services → /edge-services
 */
class URLRelativizationCompute extends BaseComputeFunction {
    constructor(config = {}) {
        super('url-relativization', config);
        
        // Extract domain mappings from existing config
        this.originDomain = config.cdn?.originDomain || 'allabout.network';
        this.targetDomain = config.cdn?.targetDomain || 'main--allaboutv2--ddttom.hlx.live';
        this.pathRewritingConfig = config.pathRewriting || {};
        
        // Build URL transformation rules from existing domain configuration
        this.transformationRules = this.buildTransformationRules();
        
        // Additional statistics for URL processing
        this.stats.urlsFound = 0;
        this.stats.urlsConverted = 0;
        this.stats.rulesMatched = 0;
        
        logger.info('URL Relativization Compute Function initialized', {
            originDomain: this.originDomain,
            targetDomain: this.targetDomain,
            rulesCount: this.transformationRules.length,
            enabled: this.enabled
        });
    }
    
    /**
     * Build transformation rules from existing domain configuration
     * @returns {Array} Array of transformation rules
     */
    buildTransformationRules() {
        const rules = [];
        
        // Rule 1: Convert origin domain URLs with path prefixes to relative paths
        // Example: https://allabout.network/blogs/ddt/ai/ → /ai/
        if (this.pathRewritingConfig.domainPathMapping) {
            for (const [domain, pathPrefix] of Object.entries(this.pathRewritingConfig.domainPathMapping)) {
                // Create rule to convert origin domain URLs with this path prefix
                const originUrlPattern = `https://${this.originDomain}${pathPrefix}`;
                rules.push({
                    type: 'origin-path-prefix',
                    domain: domain,
                    pathPrefix: pathPrefix,
                    pattern: new RegExp(`https?://${this.escapeRegex(this.originDomain)}${this.escapeRegex(pathPrefix)}([^\\s"'\\)\\]}>]*?)`, 'g'),
                    replacement: '/$1',
                    description: `Convert ${originUrlPattern} URLs to relative paths for domain ${domain}`
                });
            }
        }
        
        // Rule 2: Convert target domain URLs with path prefixes to relative paths
        // Example: https://main--allaboutv2--ddttom.hlx.live/ddt/edge-services → /edge-services
        if (this.pathRewritingConfig.domainPathMapping) {
            for (const [domain, pathPrefix] of Object.entries(this.pathRewritingConfig.domainPathMapping)) {
                const targetUrlPattern = `https://${this.targetDomain}${pathPrefix}`;
                rules.push({
                    type: 'target-path-prefix',
                    domain: domain,
                    pathPrefix: pathPrefix,
                    pattern: new RegExp(`https?://${this.escapeRegex(this.targetDomain)}${this.escapeRegex(pathPrefix)}([^\\s"'\\)\\]}>]*?)`, 'g'),
                    replacement: '/$1',
                    description: `Convert ${targetUrlPattern} URLs to relative paths for domain ${domain}`
                });
            }
        }
        
        // Rule 3: Convert domain-specific target URLs to relative paths
        // Example: https://custom-backend.com/content/page → /page (if custom-backend maps to current domain)
        if (this.pathRewritingConfig.domainTargets) {
            for (const [domain, targetBackend] of Object.entries(this.pathRewritingConfig.domainTargets)) {
                rules.push({
                    type: 'domain-target',
                    domain: domain,
                    targetBackend: targetBackend,
                    pattern: new RegExp(`https?://${this.escapeRegex(targetBackend)}([^\\s"'\\)\\]}>]*?)`, 'g'),
                    replacement: '$1',
                    description: `Convert ${targetBackend} URLs to relative paths for domain ${domain}`
                });
            }
        }
        
        // Rule 4: Generic origin domain conversion
        // Example: https://allabout.network/any/path → /any/path
        rules.push({
            type: 'origin-generic',
            pattern: new RegExp(`https?://${this.escapeRegex(this.originDomain)}([^\\s"'\\)\\]}>]*?)`, 'g'),
            replacement: '$1',
            description: `Convert any ${this.originDomain} URLs to relative paths`
        });
        
        logger.debug('Built transformation rules', {
            rulesCount: rules.length,
            rules: rules.map(r => ({ type: r.type, description: r.description }))
        });
        
        return rules;
    }
    
    /**
     * Escape special regex characters
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Check if this compute function should process the content
     * @param {string|Buffer} content - Content to potentially process
     * @param {string} contentType - MIME type of content
     * @param {Object} context - Request context
     * @returns {boolean} Whether this function can process the content
     */
    canProcess(content, contentType, context) {
        if (!this.enabled || typeof content !== 'string') {
            return false;
        }
        
        // Process text-based content that might contain URLs
        const processableTypes = [
            'text/html',
            'application/xhtml+xml',
            'text/javascript',
            'application/javascript',
            'application/x-javascript',
            'text/css',
            'application/json',
            'text/plain',
            'text/xml',
            'application/xml'
        ];
        
        return processableTypes.some(type => contentType.includes(type));
    }
    
    /**
     * Main compute function - processes content and converts URLs to relative paths
     * @param {string} content - Content to process
     * @param {string} contentType - MIME type of content
     * @param {Object} context - Request context
     * @returns {Promise<Object>} Processing result
     */
    async compute(content, contentType, context) {
        const startTime = Date.now();
        
        try {
            let modifiedContent = content;
            let urlsConverted = 0;
            let rulesMatched = 0;
            const appliedRules = [];
            
            // Apply each transformation rule
            for (const rule of this.transformationRules) {
                const beforeLength = modifiedContent.length;
                const matches = modifiedContent.match(rule.pattern);
                
                if (matches && matches.length > 0) {
                    this.stats.urlsFound += matches.length;
                    rulesMatched++;
                    
                    // Apply the transformation
                    modifiedContent = modifiedContent.replace(rule.pattern, rule.replacement);
                    
                    const conversions = matches.length;
                    urlsConverted += conversions;
                    
                    appliedRules.push({
                        type: rule.type,
                        description: rule.description,
                        matches: conversions,
                        examples: matches.slice(0, 3) // First 3 examples for logging
                    });
                    
                    logger.debug('Applied URL transformation rule', {
                        ruleType: rule.type,
                        matches: conversions,
                        examples: matches.slice(0, 3),
                        url: context.originalUrl
                    });
                }
            }
            
            // Update statistics
            this.stats.urlsConverted += urlsConverted;
            this.stats.rulesMatched += rulesMatched;
            
            const processingTime = Date.now() - startTime;
            const wasModified = urlsConverted > 0;
            
            this.updateStats(processingTime, wasModified, false);
            
            if (wasModified) {
                logger.info('URL relativization completed', {
                    url: context.originalUrl,
                    contentType,
                    urlsConverted,
                    rulesMatched,
                    processingTime,
                    appliedRules: appliedRules.map(r => ({ type: r.type, matches: r.matches }))
                });
            }
            
            return {
                content: modifiedContent,
                modified: wasModified,
                urlsConverted,
                rulesMatched,
                appliedRules,
                computeFunction: this.name,
                processingTime
            };
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            this.updateStats(processingTime, false, true);
            
            logger.error('URL relativization error', {
                error: error.message,
                url: context.originalUrl,
                contentType,
                stack: error.stack
            });
            
            // Return original content on error
            return {
                content,
                modified: false,
                error: error.message,
                computeFunction: this.name,
                processingTime
            };
        }
    }
    
    /**
     * Get enhanced statistics including URL-specific metrics
     * @returns {Object} Enhanced statistics object
     */
    getStats() {
        const baseStats = super.getStats();
        return {
            ...baseStats,
            urlsFound: this.stats.urlsFound,
            urlsConverted: this.stats.urlsConverted,
            rulesMatched: this.stats.rulesMatched,
            conversionRate: this.stats.urlsFound > 0 ? (this.stats.urlsConverted / this.stats.urlsFound) : 0,
            rulesCount: this.transformationRules.length,
            transformationRules: this.transformationRules.map(r => ({
                type: r.type,
                description: r.description
            }))
        };
    }
    
    /**
     * Reset statistics including URL-specific metrics
     */
    resetStats() {
        super.resetStats();
        this.stats.urlsFound = 0;
        this.stats.urlsConverted = 0;
        this.stats.rulesMatched = 0;
    }
    
    /**
     * Update configuration and rebuild transformation rules
     * @param {Object} newConfig - New configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.originDomain = newConfig.cdn?.originDomain || this.originDomain;
        this.targetDomain = newConfig.cdn?.targetDomain || this.targetDomain;
        this.pathRewritingConfig = newConfig.pathRewriting || this.pathRewritingConfig;
        
        // Rebuild transformation rules with new config
        this.transformationRules = this.buildTransformationRules();
        
        logger.info('URL Relativization configuration updated', {
            originDomain: this.originDomain,
            targetDomain: this.targetDomain,
            rulesCount: this.transformationRules.length
        });
    }
}

module.exports = URLRelativizationCompute;