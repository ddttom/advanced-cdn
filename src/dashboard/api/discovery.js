// dashboard/api/discovery.js
const fs = require('fs');
const path = require('path');
const logger = require('../../logger').getModuleLogger('dashboard-discovery');

/**
 * API Discovery Service
 * Automatically discovers and documents all API endpoints in the CDN application
 */
class APIDiscoveryService {
  constructor() {
    this.endpoints = new Map();
    this.lastScan = null;
    this.scanInterval = 5 * 60 * 1000; // 5 minutes
    this.rootPath = path.join(__dirname, '../..');
    this.isInitialized = false;
    
    // Initialize with known endpoints
    this.initializeKnownEndpoints();
  }

  /**
   * Initialize the discovery service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing API Discovery Service...');
      
      // Start periodic scanning
      this.startPeriodicScan();
      
      this.isInitialized = true;
      logger.info('API Discovery Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize API Discovery Service', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize with known CDN endpoints
   */
  initializeKnownEndpoints() {
    const knownEndpoints = [
      {
        method: 'GET',
        path: '/health',
        description: 'Health check endpoint',
        category: 'monitoring',
        handler: 'healthManager.healthCheckHandler',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        responses: {
          200: { description: 'Service is healthy' },
          503: { description: 'Service is unhealthy' }
        }
      },
      {
        method: 'GET',
        path: '/metrics',
        description: 'Prometheus metrics endpoint',
        category: 'monitoring',
        handler: 'metricsManager.getMetricsHandler',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        responses: {
          200: { description: 'Metrics data in Prometheus format' }
        }
      },
      {
        method: 'DELETE',
        path: '/api/cache',
        description: 'Purge cache with optional pattern',
        category: 'cache',
        handler: 'cacheManager.purge',
        executable: true,
        safeToExecute: false,
        requiresAuth: true,
        confirmationRequired: true,
        parameters: {
          query: {
            pattern: { type: 'string', description: 'Cache key pattern to purge' }
          }
        },
        responses: {
          200: { description: 'Cache purged successfully' },
          500: { description: 'Cache purge failed' }
        }
      },
      {
        method: 'GET',
        path: '/api/cache/stats',
        description: 'Get cache statistics',
        category: 'cache',
        handler: 'cacheManager.getStats',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        responses: {
          200: { description: 'Cache statistics' },
          500: { description: 'Failed to retrieve cache stats' }
        }
      },
      {
        method: 'DELETE',
        path: '/api/cache/url-transform',
        description: 'Clear URL transformation cache',
        category: 'url-transformation',
        handler: 'urlTransformer.clearCache',
        executable: true,
        safeToExecute: false,
        requiresAuth: true,
        confirmationRequired: true,
        responses: {
          200: { description: 'URL transformation cache cleared' },
          500: { description: 'Failed to clear cache' }
        }
      },
      {
        method: 'GET',
        path: '/api/cache/url-transform/stats',
        description: 'Get URL transformation statistics',
        category: 'url-transformation',
        handler: 'urlTransformer.getStats',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        responses: {
          200: { description: 'URL transformation statistics' },
          500: { description: 'Failed to retrieve stats' }
        }
      },
      {
        method: 'DELETE',
        path: '/api/cache/file-resolution',
        description: 'Clear file resolution cache',
        category: 'file-resolution',
        handler: 'fileResolutionCache.clear',
        executable: true,
        safeToExecute: false,
        requiresAuth: true,
        confirmationRequired: true,
        responses: {
          200: { description: 'File resolution cache cleared successfully' },
          404: { description: 'File resolution cache not available' },
          500: { description: 'Failed to clear file resolution cache' }
        }
      },
      {
        method: 'GET',
        path: '/api/cache/file-resolution/stats',
        description: 'Get file resolution cache statistics',
        category: 'file-resolution',
        handler: 'fileResolutionCache.getStats',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        responses: {
          200: { description: 'File resolution cache statistics' },
          404: { description: 'File resolution cache not available' },
          500: { description: 'Failed to retrieve file resolution cache stats' }
        }
      },
      {
        method: 'DELETE',
        path: '/api/cache/nuke',
        description: 'Nuclear cache clear - clears ALL caches system-wide',
        category: 'cache',
        handler: 'cacheManager.nukeAllCaches',
        executable: true,
        safeToExecute: false,
        requiresAuth: true,
        confirmationRequired: true,
        responses: {
          200: { description: 'All caches cleared successfully' },
          500: { description: 'Failed to clear all caches' }
        }
      },
      {
        method: 'GET',
        path: '/api/cache/keys',
        description: 'List cache keys from all cache systems with optional pattern filtering',
        category: 'cache',
        handler: 'cacheManager.getCacheKeys',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        parameters: {
          query: {
            pattern: { 
              type: 'string', 
              description: 'Optional pattern to filter cache keys (supports wildcards)',
              required: false
            }
          }
        },
        responses: {
          200: { description: 'Cache keys retrieved successfully' },
          500: { description: 'Failed to retrieve cache keys' }
        }
      },
      {
        method: 'GET',
        path: '/api/logs/stream',
        description: 'Real-time log streaming via Server-Sent Events',
        category: 'logging',
        handler: 'logStreamService.streamLogs',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        parameters: {
          query: {
            level: { 
              type: 'string', 
              description: 'Filter by log level (error, warn, info, debug, etc.)',
              required: false
            },
            module: { 
              type: 'string', 
              description: 'Filter by module name',
              required: false
            },
            search: { 
              type: 'string', 
              description: 'Search term to filter log messages',
              required: false
            }
          }
        },
        responses: {
          200: { description: 'Server-Sent Events stream of log entries' }
        }
      },
      {
        method: 'GET',
        path: '/api/logs/files',
        description: 'List available log files with metadata',
        category: 'logging',
        handler: 'logFilesService.getLogFiles',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        responses: {
          200: { description: 'List of available log files' },
          500: { description: 'Failed to retrieve log files' }
        }
      },
      {
        method: 'GET',
        path: '/api/logs/files/:filename',
        description: 'Read specific log file with pagination and filtering',
        category: 'logging',
        handler: 'logFilesService.readLogFile',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        parameters: {
          path: {
            filename: { 
              type: 'string', 
              description: 'Name of the log file to read',
              required: true
            }
          },
          query: {
            page: { 
              type: 'number', 
              description: 'Page number for pagination (default: 1)',
              required: false
            },
            limit: { 
              type: 'number', 
              description: 'Number of log entries per page (default: 100)',
              required: false
            },
            search: { 
              type: 'string', 
              description: 'Search term to filter log entries',
              required: false
            },
            level: { 
              type: 'string', 
              description: 'Filter by log level',
              required: false
            },
            startDate: { 
              type: 'string', 
              description: 'Start date for filtering (ISO format)',
              required: false
            },
            endDate: { 
              type: 'string', 
              description: 'End date for filtering (ISO format)',
              required: false
            }
          }
        },
        responses: {
          200: { description: 'Log file contents with pagination' },
          404: { description: 'Log file not found' },
          500: { description: 'Failed to read log file' }
        }
      },
      {
        method: 'POST',
        path: '/api/logs/search',
        description: 'Search across multiple log files',
        category: 'logging',
        handler: 'logFilesService.searchLogs',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        parameters: {
          body: {
            searchTerm: { 
              type: 'string', 
              description: 'Term to search for in log entries',
              required: true
            },
            files: { 
              type: 'array', 
              description: 'Array of log file names to search in',
              required: false
            },
            level: { 
              type: 'string', 
              description: 'Filter by log level',
              required: false
            },
            startDate: { 
              type: 'string', 
              description: 'Start date for filtering',
              required: false
            },
            endDate: { 
              type: 'string', 
              description: 'End date for filtering',
              required: false
            },
            limit: { 
              type: 'number', 
              description: 'Maximum number of results (default: 500)',
              required: false
            }
          }
        },
        responses: {
          200: { description: 'Search results from log files' },
          400: { description: 'Invalid search parameters' },
          500: { description: 'Search failed' }
        }
      },
      {
        method: 'GET',
        path: '/api/logs/download/:filename',
        description: 'Download complete log file',
        category: 'logging',
        handler: 'logFilesService.downloadLogFile',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        parameters: {
          path: {
            filename: { 
              type: 'string', 
              description: 'Name of the log file to download',
              required: true
            }
          }
        },
        responses: {
          200: { description: 'Log file download' },
          404: { description: 'Log file not found' },
          500: { description: 'Download failed' }
        }
      },
      {
        method: 'GET',
        path: '/api/logs/stream/stats',
        description: 'Get log streaming service statistics',
        category: 'logging',
        handler: 'logStreamService.getStats',
        executable: true,
        safeToExecute: true,
        requiresAuth: false,
        responses: {
          200: { description: 'Log streaming statistics' },
          500: { description: 'Failed to retrieve statistics' }
        }
      }
    ];

    knownEndpoints.forEach(endpoint => {
      const key = `${endpoint.method}:${endpoint.path}`;
      this.endpoints.set(key, {
        ...endpoint,
        discovered: new Date().toISOString(),
        source: 'manual'
      });
    });

    logger.info(`Initialized ${knownEndpoints.length} known API endpoints`);
  }

  /**
   * Scan application files for additional API endpoints
   */
  async scanForEndpoints() {
    try {
      logger.debug('Starting API endpoint scan');
      
      const appFiles = [
        path.join(this.rootPath, 'app.js'),
        path.join(this.rootPath, 'cluster-manager.js')
      ];

      for (const filePath of appFiles) {
        if (fs.existsSync(filePath)) {
          await this.scanFile(filePath);
        }
      }

      this.lastScan = new Date().toISOString();
      logger.info(`API scan completed. Found ${this.endpoints.size} total endpoints`);
      
    } catch (error) {
      logger.error('Error during API endpoint scan', { error: error.message });
    }
  }

  /**
   * Scan a specific file for API endpoints
   */
  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Regex patterns for different endpoint definitions
      const patterns = [
        /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
      ];

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const method = match[1].toUpperCase();
          const path = match[2];
          const key = `${method}:${path}`;
          
          if (!this.endpoints.has(key)) {
            this.endpoints.set(key, {
              method,
              path,
              description: `Auto-discovered ${method} endpoint`,
              category: this.categorizeEndpoint(path),
              source: 'auto-discovered',
              file: path.relative(this.rootPath, filePath),
              discovered: new Date().toISOString(),
              executable: this.isExecutable(method, path),
              safeToExecute: this.isSafeToExecute(method, path),
              requiresAuth: this.requiresAuth(path),
              confirmationRequired: this.requiresConfirmation(method)
            });
          }
        }
      });
      
    } catch (error) {
      logger.warn(`Error scanning file ${filePath}`, { error: error.message });
    }
  }

  /**
   * Categorize endpoint based on path
   */
  categorizeEndpoint(path) {
    if (path.includes('/health')) return 'monitoring';
    if (path.includes('/metrics')) return 'monitoring';
    if (path.includes('/cache/file-resolution')) return 'file-resolution';
    if (path.includes('/cache')) return 'cache';
    if (path.includes('/api')) return 'api';
    if (path.includes('/dashboard')) return 'dashboard';
    return 'general';
  }

  /**
   * Determine if endpoint is executable
   */
  isExecutable(method, path) {
    // Most endpoints are executable, but exclude some patterns
    const nonExecutablePatterns = [
      '/dashboard/static',
      '/favicon.ico',
      '*.css',
      '*.js',
      '*.png',
      '*.jpg',
      '*.gif'
    ];
    
    return !nonExecutablePatterns.some(pattern => 
      path.includes(pattern.replace('*', ''))
    );
  }

  /**
   * Determine if endpoint is safe to execute without confirmation
   */
  isSafeToExecute(method, path) {
    // GET and HEAD requests are generally safe
    if (method === 'GET' || method === 'HEAD') {
      return true;
    }
    
    // POST, PUT, DELETE are potentially unsafe
    return false;
  }

  /**
   * Determine if endpoint requires authentication
   */
  requiresAuth(path) {
    // Admin and management endpoints typically require auth
    const authRequiredPatterns = [
      '/api/cache',
      '/api/admin',
      '/api/config'
    ];
    
    return authRequiredPatterns.some(pattern => path.startsWith(pattern));
  }

  /**
   * Determine if endpoint requires confirmation before execution
   */
  requiresConfirmation(method) {
    // DELETE operations should require confirmation
    return method === 'DELETE';
  }

  /**
   * Get all discovered endpoints
   */
  getAllEndpoints() {
    // Define method order for sorting
    const methodOrder = { 'GET': 1, 'POST': 2, 'PUT': 3, 'PATCH': 4, 'DELETE': 5 };
    
    return Array.from(this.endpoints.values()).sort((a, b) => {
      // First sort by HTTP method
      const methodA = methodOrder[a.method] || 999;
      const methodB = methodOrder[b.method] || 999;
      if (methodA !== methodB) {
        return methodA - methodB;
      }
      
      // Then by category
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      
      // Finally by path
      return a.path.localeCompare(b.path);
    });
  }

  /**
   * Get endpoints by category
   */
  getEndpointsByCategory(category) {
    return this.getAllEndpoints().filter(endpoint => endpoint.category === category);
  }

  /**
   * Get endpoint categories
   */
  getCategories() {
    const categories = new Set();
    this.endpoints.forEach(endpoint => categories.add(endpoint.category));
    return Array.from(categories).sort();
  }

  /**
   * Generate OpenAPI 3.0 specification
   */
  generateOpenAPISpec() {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'CDN API',
        version: '1.0.0',
        description: 'Comprehensive API documentation for the CDN application',
        contact: {
          name: 'CDN API Support'
        }
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        }
      }
    };

    // Convert endpoints to OpenAPI paths
    this.endpoints.forEach(endpoint => {
      if (!spec.paths[endpoint.path]) {
        spec.paths[endpoint.path] = {};
      }

      spec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.description,
        tags: [endpoint.category],
        responses: endpoint.responses || {
          200: { description: 'Success' },
          500: { description: 'Internal Server Error' }
        }
      };

      // Add parameters if defined
      if (endpoint.parameters) {
        spec.paths[endpoint.path][endpoint.method.toLowerCase()].parameters = 
          this.convertParametersToOpenAPI(endpoint.parameters);
      }
    });

    return spec;
  }

  /**
   * Convert parameters to OpenAPI format
   */
  convertParametersToOpenAPI(parameters) {
    const openAPIParams = [];
    
    if (parameters.query) {
      Object.entries(parameters.query).forEach(([name, param]) => {
        openAPIParams.push({
          name,
          in: 'query',
          description: param.description,
          schema: { type: param.type }
        });
      });
    }

    return openAPIParams;
  }

  /**
   * Start periodic scanning
   */
  startPeriodicScan() {
    // Initial scan (run asynchronously to avoid blocking)
    setImmediate(() => {
      this.scanForEndpoints().catch(error => {
        logger.error('Initial endpoint scan failed', { error: error.message });
      });
    });
    
    // Periodic scans
    this.scanIntervalId = setInterval(() => {
      this.scanForEndpoints().catch(error => {
        logger.error('Periodic endpoint scan failed', { error: error.message });
      });
    }, this.scanInterval);
  }

  /**
   * Get discovery statistics
   */
  getStats() {
    const categories = this.getCategories();
    const stats = {
      totalEndpoints: this.endpoints.size,
      lastScan: this.lastScan,
      categories: {}
    };

    categories.forEach(category => {
      stats.categories[category] = this.getEndpointsByCategory(category).length;
    });

    return stats;
  }

  /**
   * Shutdown and cleanup resources
   */
  shutdown() {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    this.endpoints.clear();
    this.isInitialized = false;
    logger.info('API Discovery Service shutdown complete');
  }
}

module.exports = APIDiscoveryService;
