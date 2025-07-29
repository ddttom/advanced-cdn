// config.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Application configuration
 * Values are set from environment variables with sensible defaults
 */
const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'production',
    trustProxy: process.env.TRUST_PROXY === 'true',
    cluster: {
      enabled: process.env.ENABLE_CLUSTER === 'true',
      workers: process.env.CLUSTER_WORKERS 
        ? parseInt(process.env.CLUSTER_WORKERS, 10) 
        : Math.max(1, require('os').cpus().length - 1)
    },
    // SSL configuration (if using HTTPS directly)
    ssl: {
      enabled: process.env.ENABLE_SSL === 'true',
      cert: process.env.SSL_CERT_PATH || path.join(__dirname, '..', 'ssl', 'cert.pem'),
      key: process.env.SSL_KEY_PATH || path.join(__dirname, '..', 'ssl', 'key.pem'),
      passphrase: process.env.SSL_PASSPHRASE || '',
      httpRedirect: process.env.HTTP_TO_HTTPS_REDIRECT === 'true'
    }
  },

  // CDN configuration
  cdn: {
    // The domain this CDN will accept requests for
    originDomain: process.env.ORIGIN_DOMAIN || 'allabout.network',
    // The target/backend domain to fetch content from
    targetDomain: process.env.TARGET_DOMAIN,
    // Whether to use HTTPS for backend connections
    targetHttps: process.env.TARGET_HTTPS !== 'false',
    // Custom CDN name for headers
    cdnName: process.env.CDN_NAME || 'advanced-cdn-proxy',
    // Whether to allow requests to other domains
    strictDomainCheck: process.env.STRICT_DOMAIN_CHECK !== 'false',
    // Additional allowed domains (comma-separated in .env)
    additionalDomains: process.env.ADDITIONAL_DOMAINS 
      ? process.env.ADDITIONAL_DOMAINS.split(',').map(d => d.trim())
      : []
  },

  // Domain-based path rewriting configuration
  pathRewriting: {
    // Enable path rewriting functionality
    enabled: process.env.PATH_REWRITE_ENABLED === 'true',
    
    // Simple domain-to-path prefix mapping
    // Format: domain1:/prefix1,domain2:/prefix2
    // Example: ddt.com:/ddt,api.example.com:/api
    domainPathMapping: process.env.DOMAIN_PATH_MAPPING
      ? process.env.DOMAIN_PATH_MAPPING.split(',').reduce((acc, mapping) => {
          const [domain, pathPrefix] = mapping.split(':');
          if (domain && pathPrefix) {
            acc[domain.trim()] = pathPrefix.trim();
          }
          return acc;
        }, {})
      : {},
    
    // Complex domain routing rules (JSON format)
    // Example: {"ddt.com": {"target": "allabout.network", "pathPrefix": "/ddt"}}
    domainRoutingRules: process.env.DOMAIN_ROUTING_RULES
      ? (() => {
          try {
            return JSON.parse(process.env.DOMAIN_ROUTING_RULES);
          } catch (err) {
            console.warn('Invalid DOMAIN_ROUTING_RULES JSON format, using empty object');
            return {};
          }
        })()
      : {},
    
    // Domain-specific backend targets
    // Format: {"domain1": "backend1.com", "domain2": "backend2.com"}
    domainTargets: process.env.DOMAIN_TARGETS
      ? (() => {
          try {
            return JSON.parse(process.env.DOMAIN_TARGETS);
          } catch (err) {
            console.warn('Invalid DOMAIN_TARGETS JSON format, using empty object');
            return {};
          }
        })()
      : {},
    
    // Default fallback behavior when no rules match
    defaultFallback: {
      action: process.env.PATH_REWRITE_DEFAULT_FALLBACK || 'passthrough', // passthrough, prefix, error
      value: process.env.PATH_REWRITE_DEFAULT_FALLBACK_VALUE || ''
    },
    
    // Performance settings
    maxCacheSize: parseInt(process.env.PATH_REWRITE_CACHE_SIZE || '10000', 10),
    enableCache: process.env.PATH_REWRITE_CACHE_ENABLED !== 'false',
    
    // Build unified domain configuration for PathRewriter
    get domains() {
      const domains = {};
      
      // Add simple domain-to-path mappings
      for (const [domain, pathPrefix] of Object.entries(this.domainPathMapping)) {
        domains[domain] = {
          target: this.domainTargets[domain] || config.cdn.targetDomain,
          pathPrefix,
          fallback: 'prefix'
        };
      }
      
      // Add complex routing rules (these override simple mappings)
      for (const [domain, rules] of Object.entries(this.domainRoutingRules)) {
        domains[domain] = {
          target: rules.target || this.domainTargets[domain] || config.cdn.targetDomain,
          pathPrefix: rules.pathPrefix || '',
          rules: rules.rules || [],
          fallback: rules.fallback || 'prefix'
        };
      }
      
      // Add domain-specific targets without path rules
      for (const [domain, target] of Object.entries(this.domainTargets)) {
        if (!domains[domain]) {
          domains[domain] = {
            target,
            pathPrefix: '',
            fallback: 'passthrough'
          };
        }
      }
      
      return domains;
    },
    
    // Get configuration for PathRewriter initialization
    get rewriterConfig() {
      return {
        domains: this.domains,
        defaultTarget: config.cdn.targetDomain,
        defaultFallback: this.defaultFallback,
        maxCacheSize: this.maxCacheSize,
        enableCache: this.enableCache
      };
    }
  },

  // Cache configuration
  cache: {
    // Whether caching is enabled
    enabled: process.env.CACHE_ENABLED !== 'false',
    // Default TTL in seconds
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10),
    // Max TTL in seconds
    maxTtl: parseInt(process.env.CACHE_MAX_TTL || '3600', 10),
    // Cache check period in seconds
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '120', 10),
    // Maximum number of items in cache
    maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
    // Whether to respect Cache-Control headers
    respectCacheControl: process.env.RESPECT_CACHE_CONTROL !== 'false',
    // Whether to cache responses with cookies
    cacheCookies: process.env.CACHE_COOKIES === 'true',
    // Content types to cache (comma-separated in .env)
    cacheableContentTypes: process.env.CACHEABLE_CONTENT_TYPES 
      ? process.env.CACHEABLE_CONTENT_TYPES.split(',').map(t => t.trim())
      : [
          'text/html', 
          'text/css', 
          'text/javascript', 
          'application/javascript',
          'application/json', 
          'image/jpeg', 
          'image/png', 
          'image/gif', 
          'image/webp', 
          'image/svg+xml',
          'application/font-woff', 
          'application/font-woff2', 
          'application/vnd.ms-fontobject',
          'font/ttf', 
          'font/otf'
        ],
    // Status codes to cache
    cacheableStatusCodes: process.env.CACHEABLE_STATUS_CODES
      ? process.env.CACHEABLE_STATUS_CODES.split(',').map(c => parseInt(c.trim(), 10))
      : [200, 301, 302, 304]
  },

  // Security configuration
  security: {
    // Enable security headers
    headers: process.env.SECURITY_HEADERS !== 'false',
    // Content Security Policy
    contentSecurityPolicy: process.env.CONTENT_SECURITY_POLICY || '',
    // Enable CORS
    cors: process.env.ENABLE_CORS === 'true',
    // CORS allowed origins (empty means all)
    corsOrigins: process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : ['*'],
    // Rate limiting
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED === 'true',
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    accessLog: process.env.ACCESS_LOG_ENABLED !== 'false',
    errorLog: process.env.ERROR_LOG_ENABLED !== 'false',
    logDir: process.env.LOG_DIR || path.join(__dirname, 'logs'),
    logToConsole: process.env.LOG_TO_CONSOLE !== 'false',
    logToFile: process.env.LOG_TO_FILE === 'true'
  },

  // Performance configuration
  performance: {
    // Enable compression
    compression: process.env.ENABLE_COMPRESSION !== 'false',
    // Compression level (1-9)
    compressionLevel: parseInt(process.env.COMPRESSION_LEVEL || '6', 10),
    // Minimum size in bytes to compress
    compressionMinSize: parseInt(process.env.COMPRESSION_MIN_SIZE || '1024', 10),
    // Maximum request body size
    maxBodySize: process.env.MAX_BODY_SIZE || '1mb',
    // Request timeout in milliseconds
    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10)
  },

  // URL Transformation configuration
  urlTransformation: {
    // Enable URL transformation system
    enabled: process.env.URL_TRANSFORM_ENABLED === 'true',
    
    // Transform HTML content (href, src, action attributes, etc.)
    transformHTML: process.env.URL_TRANSFORM_HTML !== 'false',
    
    // Transform JavaScript content (fetch calls, imports, etc.)
    transformJavaScript: process.env.URL_TRANSFORM_JS !== 'false',
    
    // Transform CSS content (url() functions, @import statements)
    transformCSS: process.env.URL_TRANSFORM_CSS !== 'false',
    
    // Transform inline styles in HTML
    transformInlineStyles: process.env.URL_TRANSFORM_INLINE_STYLES !== 'false',
    
    // Transform data-* attributes that contain URLs
    transformDataAttributes: process.env.URL_TRANSFORM_DATA_ATTRS !== 'false',
    
    // Preserve URL fragments (#section)
    preserveFragments: process.env.URL_PRESERVE_FRAGMENTS !== 'false',
    
    // Preserve query parameters (?param=value)
    preserveQueryParams: process.env.URL_PRESERVE_QUERY !== 'false',
    
    // Maximum content size to transform (bytes)
    maxContentSize: parseInt(process.env.URL_TRANSFORM_MAX_SIZE || '52428800', 10), // 50MB
    
    // Maximum cache size for transformation results
    maxCacheSize: parseInt(process.env.URL_TRANSFORM_CACHE_SIZE || '10000', 10),
    
    // Enable debug mode for detailed logging
    debugMode: process.env.URL_TRANSFORM_DEBUG === 'true',
    
    // Content types that should be transformed
    transformableContentTypes: process.env.URL_TRANSFORM_CONTENT_TYPES
      ? process.env.URL_TRANSFORM_CONTENT_TYPES.split(',').map(t => t.trim())
      : [
          'text/html',
          'application/xhtml+xml',
          'text/javascript',
          'application/javascript',
          'application/x-javascript',
          'text/css'
        ]
  },

  // File Resolution configuration
  fileResolution: {
    // Enable file resolution system
    enabled: process.env.FILE_RESOLUTION_ENABLED === 'true',
    
    // Default extensions to try (in priority order)
    defaultExtensions: process.env.FILE_RESOLUTION_DEFAULT_EXTENSIONS
      ? process.env.FILE_RESOLUTION_DEFAULT_EXTENSIONS.split(',').map(ext => ext.trim())
      : ['html', 'md', 'json', 'csv', 'txt'],
    
    // Request timeout for HEAD requests (milliseconds)
    timeout: parseInt(process.env.FILE_RESOLUTION_TIMEOUT || '5000', 10),
    
    // Maximum concurrent HEAD requests
    maxConcurrent: parseInt(process.env.FILE_RESOLUTION_MAX_CONCURRENT || '10', 10),
    
    // Retry configuration
    retryAttempts: parseInt(process.env.FILE_RESOLUTION_RETRY_ATTEMPTS || '2', 10),
    retryDelay: parseInt(process.env.FILE_RESOLUTION_RETRY_DELAY || '1000', 10),
    
    // Cache configuration
    cache: {
      enabled: process.env.FILE_RESOLUTION_CACHE_ENABLED !== 'false',
      ttl: parseInt(process.env.FILE_RESOLUTION_CACHE_TTL || '300', 10),
      negativeTtl: parseInt(process.env.FILE_RESOLUTION_CACHE_NEGATIVE_TTL || '60', 10),
      maxSize: parseInt(process.env.FILE_RESOLUTION_CACHE_MAX_SIZE || '10000', 10),
      checkPeriod: parseInt(process.env.FILE_RESOLUTION_CACHE_CHECK_PERIOD || '120', 10)
    },
    
    // Circuit breaker configuration
    circuitBreaker: {
      enabled: process.env.FILE_RESOLUTION_CIRCUIT_BREAKER_ENABLED !== 'false',
      failureThreshold: parseInt(process.env.FILE_RESOLUTION_CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
      resetTimeout: parseInt(process.env.FILE_RESOLUTION_CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),
      monitorWindow: parseInt(process.env.FILE_RESOLUTION_CIRCUIT_BREAKER_MONITOR_WINDOW || '60000', 10)
    },
    
    // Per-domain configuration
    // Format: {"domain": {"extensions": ["html", "md"], "transformers": ["markdown", "json-formatter"], "enabled": true}}
    domainConfig: process.env.FILE_RESOLUTION_DOMAIN_CONFIG
      ? (() => {
          try {
            return JSON.parse(process.env.FILE_RESOLUTION_DOMAIN_CONFIG);
          } catch (err) {
            console.warn('Invalid FILE_RESOLUTION_DOMAIN_CONFIG JSON format, using empty object');
            return {};
          }
        })()
      : {},
    
    // Transformer configuration
    transformers: {
      // Enable transformers
      enabled: process.env.FILE_RESOLUTION_TRANSFORMERS_ENABLED !== 'false',
      
      // Markdown transformer options
      markdownOptions: process.env.FILE_RESOLUTION_MARKDOWN_OPTIONS
        ? (() => {
            try {
              return JSON.parse(process.env.FILE_RESOLUTION_MARKDOWN_OPTIONS);
            } catch (err) {
              console.warn('Invalid FILE_RESOLUTION_MARKDOWN_OPTIONS JSON format, using defaults');
              return { breaks: true, linkify: true, typographer: true };
            }
          })()
        : { breaks: true, linkify: true, typographer: true },
      
      // JSON formatter options
      jsonFormatterIndent: parseInt(process.env.FILE_RESOLUTION_JSON_FORMATTER_INDENT || '2', 10),
      
      // CSV table options
      csvTableHeaders: process.env.FILE_RESOLUTION_CSV_TABLE_HEADERS !== 'false',
      
      // HTML minification
      htmlMinify: process.env.FILE_RESOLUTION_HTML_MINIFY === 'true',
      
      // XML pretty print
      xmlPrettyPrint: process.env.FILE_RESOLUTION_XML_PRETTY_PRINT !== 'false'
    },
    
    // Performance settings
    connectionPoolSize: parseInt(process.env.FILE_RESOLUTION_CONNECTION_POOL_SIZE || '50', 10),
    connectionTimeout: parseInt(process.env.FILE_RESOLUTION_CONNECTION_TIMEOUT || '3000', 10),
    keepAlive: process.env.FILE_RESOLUTION_KEEP_ALIVE !== 'false',
    maxRedirects: parseInt(process.env.FILE_RESOLUTION_MAX_REDIRECTS || '3', 10),
    
    // Logging configuration
    logging: {
      level: process.env.FILE_RESOLUTION_LOG_LEVEL || 'info',
      logHits: process.env.FILE_RESOLUTION_LOG_HITS !== 'false',
      logMisses: process.env.FILE_RESOLUTION_LOG_MISSES === 'true',
      logErrors: process.env.FILE_RESOLUTION_LOG_ERRORS !== 'false',
      logPerformance: process.env.FILE_RESOLUTION_LOG_PERFORMANCE !== 'false'
    },
    
    // Security settings
    maxFileSize: parseInt(process.env.FILE_RESOLUTION_MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedContentTypes: process.env.FILE_RESOLUTION_ALLOWED_CONTENT_TYPES
      ? process.env.FILE_RESOLUTION_ALLOWED_CONTENT_TYPES.split(',').map(t => t.trim())
      : ['text/html', 'text/markdown', 'application/json', 'text/csv', 'text/plain', 'application/xml'],
    blockPrivateIPs: process.env.FILE_RESOLUTION_BLOCK_PRIVATE_IPS !== 'false',
    userAgent: process.env.FILE_RESOLUTION_USER_AGENT || 'Advanced-CDN-FileResolver/1.0',
    
    // Monitoring settings
    metrics: {
      enabled: process.env.FILE_RESOLUTION_METRICS_ENABLED !== 'false',
      healthCheckEnabled: process.env.FILE_RESOLUTION_HEALTH_CHECK_ENABLED !== 'false',
      healthCheckInterval: parseInt(process.env.FILE_RESOLUTION_HEALTH_CHECK_INTERVAL || '30000', 10),
      performanceMonitoring: process.env.FILE_RESOLUTION_PERFORMANCE_MONITORING !== 'false'
    },
    
    // Get unified domain configuration for file resolution
    get domainConfigs() {
      const configs = {};
      
      // Start with default configuration for all domains
      const defaultConfig = {
        enabled: this.enabled,
        extensions: this.defaultExtensions,
        transformers: [],
        cache: this.cache,
        circuitBreaker: this.circuitBreaker,
        transformerOptions: this.transformers
      };
      
      // Add domain-specific configurations
      for (const [domain, domainConfig] of Object.entries(this.domainConfig)) {
        configs[domain] = {
          ...defaultConfig,
          ...domainConfig,
          // Ensure extensions are properly formatted
          extensions: domainConfig.extensions || defaultConfig.extensions,
          // Ensure transformers are properly formatted
          transformers: domainConfig.transformers || defaultConfig.transformers,
          // Merge cache settings
          cache: { ...defaultConfig.cache, ...(domainConfig.cache || {}) },
          // Merge circuit breaker settings
          circuitBreaker: { ...defaultConfig.circuitBreaker, ...(domainConfig.circuitBreaker || {}) }
        };
      }
      
      return configs;
    },
    
    // Get configuration for a specific domain
    getDomainConfig(domain) {
      const configs = this.domainConfigs;
      return configs[domain] || {
        enabled: this.enabled,
        extensions: this.defaultExtensions,
        transformers: [],
        cache: this.cache,
        circuitBreaker: this.circuitBreaker,
        transformerOptions: this.transformers
      };
    },
    
    // Get file resolver configuration
    get resolverConfig() {
      return {
        enabled: this.enabled,
        defaultExtensions: this.defaultExtensions,
        timeout: this.timeout,
        maxConcurrent: this.maxConcurrent,
        retryAttempts: this.retryAttempts,
        retryDelay: this.retryDelay,
        cache: this.cache,
        circuitBreaker: this.circuitBreaker,
        domainConfig: this.domainConfig,
        connectionPoolSize: this.connectionPoolSize,
        connectionTimeout: this.connectionTimeout,
        keepAlive: this.keepAlive,
        maxRedirects: this.maxRedirects,
        maxFileSize: this.maxFileSize,
        allowedContentTypes: this.allowedContentTypes,
        blockPrivateIPs: this.blockPrivateIPs,
        userAgent: this.userAgent,
        logging: this.logging,
        metrics: this.metrics
      };
    },
    
    // Get transformer configuration
    get transformerConfig() {
      return {
        enabled: this.transformers.enabled,
        markdownOptions: this.transformers.markdownOptions,
        jsonFormatterIndent: this.transformers.jsonFormatterIndent,
        csvTableHeaders: this.transformers.csvTableHeaders,
        htmlMinify: this.transformers.htmlMinify,
        xmlPrettyPrint: this.transformers.xmlPrettyPrint
      };
    }
  },

  // Compute Functions configuration
  computeFunctions: {
    // Enable compute function system
    enabled: process.env.COMPUTE_FUNCTIONS_ENABLED === 'true',
    
    // Maximum content size to process (bytes)
    maxContentSize: parseInt(process.env.COMPUTE_MAX_CONTENT_SIZE || '10485760', 10), // 10MB default
    
    // Timeout for compute function execution (milliseconds)
    timeout: parseInt(process.env.COMPUTE_TIMEOUT || '5000', 10), // 5 seconds default
    
    // Enable debug mode for detailed logging
    debugMode: process.env.COMPUTE_DEBUG === 'true',
    
    // URL Relativization compute function
    urlRelativization: {
      enabled: process.env.URL_RELATIVIZATION_ENABLED === 'true',
      
      // Additional URL patterns to relativize (JSON format)
      // Example: [{"pattern": "https://example.com/path/", "replacement": "/", "description": "Convert example URLs"}]
      additionalPatterns: process.env.URL_RELATIVIZATION_PATTERNS
        ? (() => {
            try {
              return JSON.parse(process.env.URL_RELATIVIZATION_PATTERNS);
            } catch (err) {
              console.warn('Invalid URL_RELATIVIZATION_PATTERNS JSON format, using empty array');
              return [];
            }
          })()
        : [],
      
      // Content types to process
      processableContentTypes: process.env.URL_RELATIVIZATION_CONTENT_TYPES
        ? process.env.URL_RELATIVIZATION_CONTENT_TYPES.split(',').map(t => t.trim())
        : [
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
          ],
      
      // Enable detailed logging for URL transformations
      debugTransformations: process.env.URL_RELATIVIZATION_DEBUG === 'true'
    }
  },

  // Monitoring configuration
  monitoring: {
    // Health check endpoint
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      path: process.env.HEALTH_CHECK_PATH || '/health',
      detailed: process.env.HEALTH_CHECK_DETAILED === 'true'
    },
    // Metrics endpoint
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      path: process.env.METRICS_PATH || '/metrics'
    }
  }
};

// Validate critical configuration
function validateConfig() {
  if (!config.cdn.originDomain) {
    throw new Error('Origin domain must be configured');
  }
  
  if (!config.cdn.targetDomain) {
    throw new Error('Target domain must be configured');
  }
  
  if (config.server.ssl.enabled) {
    try {
      const fs = require('fs');
      if (!fs.existsSync(config.server.ssl.cert)) {
        throw new Error(`SSL certificate not found at ${config.server.ssl.cert}`);
      }
      if (!fs.existsSync(config.server.ssl.key)) {
        throw new Error(`SSL key not found at ${config.server.ssl.key}`);
      }
    } catch (err) {
      throw new Error(`SSL validation error: ${err.message}`);
    }
  }
}

// Run validation (will throw errors for critical issues)
validateConfig();

module.exports = config;
