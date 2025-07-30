// app.js
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

// Load configuration and modules
console.log('Loading configuration...');
const config = require('./config');
console.log('Configuration loaded successfully');
// Restart trigger 2
const logger = require('./logger');
const cacheManager = require('./cache/cache-manager');
const proxyManager = require('./proxy/proxy-manager');
const metricsManager = require('./monitoring/metrics-manager');
const healthManager = require('./monitoring/health-manager');
const rateLimiter = require('./middleware/rate-limiter');
const domainManager = require('./domain/domain-manager');
const DashboardIntegration = require('./dashboard/dashboard-integration');

// Create Express app
const app = express();

// Trust proxy if configured
if (config.server.trustProxy) {
  app.set('trust proxy', true);
}

// Add security headers
if (config.security.headers) {
  app.use(helmet({
    contentSecurityPolicy: config.security.contentSecurityPolicy ? {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        ...JSON.parse(config.security.contentSecurityPolicy)
      }
    } : false
  }));
}

// Add CORS if enabled
if (config.security.cors) {
  app.use(cors({
    origin: config.security.corsOrigins,
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'User-Agent'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));
}

// Add compression
if (config.performance.compression) {
  app.use(compression({
    level: config.performance.compressionLevel,
    threshold: config.performance.compressionMinSize,
    filter: (req, res) => {
      // Don't compress already compressed responses
      if (req.headers['content-encoding']) {
        return false;
      }
      // Use standard compression filter
      return compression.filter(req, res);
    }
  }));
}

// Add request logging
app.use(logger.httpLogger);

// Add metrics collection middleware
app.use(metricsManager.httpMetricsMiddleware.bind(metricsManager));

// Add rate limiting
app.use(rateLimiter.getMiddleware());

// Add domain checking middleware
app.use(domainManager.checkDomainMiddleware.bind(domainManager));

// Health check endpoint
if (config.monitoring.healthCheck.enabled) {
  app.get(config.monitoring.healthCheck.path, healthManager.healthCheckHandler.bind(healthManager));
}

// Metrics endpoint
if (config.monitoring.metrics.enabled) {
  app.get(config.monitoring.metrics.path, metricsManager.getMetricsHandler.bind(metricsManager));
}

// API for cache management (restricted to local access)
app.use('/api/cache', (req, res, next) => {
  // Only allow local access to cache API
  const clientIp = req.ip || req.connection.remoteAddress;
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    req.skipProxy = true;
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
});

// Cache purge endpoint
app.delete('/api/cache', (req, res) => {
  try {
    const pattern = req.query.pattern || '*';
    const result = cacheManager.purge(pattern);
    res.status(200).json(result);
  } catch (err) {
    logger.error(`Cache purge error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Cache stats endpoint
app.get('/api/cache/stats', (req, res) => {
  try {
    const stats = cacheManager.getStats();
    res.status(200).json(stats);
  } catch (err) {
    logger.error(`Cache stats error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// URL transformation cache management endpoints
app.delete('/api/cache/url-transform', (req, res) => {
  try {
    proxyManager.urlTransformer.clearCache();
    res.status(200).json({ 
      message: 'URL transformation cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error(`URL transformation cache clear error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// URL transformation stats endpoint
app.get('/api/cache/url-transform/stats', (req, res) => {
  try {
    const stats = proxyManager.urlTransformer.getStats();
    res.status(200).json(stats);
  } catch (err) {
    logger.error(`URL transformation stats error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// File resolution cache management endpoints
app.delete('/api/cache/file-resolution', (req, res) => {
  try {
    const fileResolutionCache = require('./cache/file-resolution-cache');
    if (fileResolutionCache && typeof fileResolutionCache.clear === 'function') {
      fileResolutionCache.clear();
      res.status(200).json({ 
        message: 'File resolution cache cleared successfully',
        timestamp: new Date().toISOString()
      });
      logger.info('File resolution cache cleared via API');
    } else {
      res.status(404).json({ 
        error: 'File resolution cache not available',
        message: 'The file resolution cache module is not loaded or does not support clearing'
      });
    }
  } catch (err) {
    logger.error(`File resolution cache clear error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// File resolution cache stats endpoint
app.get('/api/cache/file-resolution/stats', (req, res) => {
  try {
    const fileResolutionCache = require('./cache/file-resolution-cache');
    if (fileResolutionCache && typeof fileResolutionCache.getStats === 'function') {
      const stats = fileResolutionCache.getStats();
      res.status(200).json(stats);
    } else {
      res.status(404).json({ 
        error: 'File resolution cache not available',
        message: 'The file resolution cache module is not loaded or does not support stats'
      });
    }
  } catch (err) {
    logger.error(`File resolution cache stats error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Cache keys listing endpoint - lists keys in all caches
app.get('/api/cache/keys', (req, res) => {
  try {
    const cacheKeys = {
      main: [],
      urlTransform: [],
      fileResolution: []
    };
    const errors = [];

    // Get main cache keys
    try {
      cacheKeys.main = cacheManager.getKeys(req.query.pattern) || [];
    } catch (error) {
      errors.push({
        cache: 'main',
        error: error.message
      });
      logger.error('Failed to get main cache keys', { error: error.message });
    }

    // Get URL transformation cache keys
    try {
      if (proxyManager.urlTransformer && typeof proxyManager.urlTransformer.getKeys === 'function') {
        cacheKeys.urlTransform = proxyManager.urlTransformer.getKeys(req.query.pattern);
      } else if (proxyManager.urlTransformer && proxyManager.urlTransformer.cache) {
        // Fallback: try to access cache directly if getKeys method doesn't exist
        let keys = Array.from(proxyManager.urlTransformer.cache.keys() || []);
        // Apply pattern filtering if specified
        if (req.query.pattern && req.query.pattern !== '*') {
          const pattern = req.query.pattern;
          keys = keys.filter(key => {
            if (pattern.includes('*')) {
              const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
              return regexPattern.test(key);
            } else {
              return key.includes(pattern);
            }
          });
        }
        cacheKeys.urlTransform = keys;
      }
    } catch (error) {
      errors.push({
        cache: 'urlTransform',
        error: error.message
      });
      logger.error('Failed to get URL transformation cache keys', { error: error.message });
    }

    // Get file resolution cache keys
    try {
      const fileResolutionCache = require('./cache/file-resolution-cache');
      if (fileResolutionCache && typeof fileResolutionCache.getKeys === 'function') {
        cacheKeys.fileResolution = fileResolutionCache.getKeys(req.query.pattern) || [];
      } else if (fileResolutionCache && fileResolutionCache.cache) {
        // Fallback for older versions
        let keys = Array.from(fileResolutionCache.cache.keys() || []);
        // Apply pattern filtering if specified
        if (req.query.pattern && req.query.pattern !== '*') {
          const pattern = req.query.pattern;
          keys = keys.filter(key => {
            if (pattern.includes('*')) {
              const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
              return regexPattern.test(key);
            } else {
              return key.includes(pattern);
            }
          });
        }
        cacheKeys.fileResolution = keys;
      }
    } catch (error) {
      errors.push({
        cache: 'fileResolution',
        error: error.message
      });
      logger.error('Failed to get file resolution cache keys', { error: error.message });
    }

    const response = {
      success: errors.length === 0,
      message: errors.length === 0 ? 'Cache keys retrieved successfully' : 'Some cache keys failed to retrieve',
      data: {
        caches: cacheKeys,
        summary: {
          main: cacheKeys.main.length,
          urlTransform: cacheKeys.urlTransform.length,
          fileResolution: cacheKeys.fileResolution.length,
          total: cacheKeys.main.length + cacheKeys.urlTransform.length + cacheKeys.fileResolution.length
        },
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Cache keys retrieved', {
      mainKeys: cacheKeys.main.length,
      urlTransformKeys: cacheKeys.urlTransform.length,
      fileResolutionKeys: cacheKeys.fileResolution.length,
      errors: errors.length
    });

    res.status(errors.length === 0 ? 200 : 207).json(response); // 207 = Multi-Status for partial success
  } catch (err) {
    logger.error(`Cache keys retrieval error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Nuclear cache clear endpoint - clears ALL caches system-wide
app.delete('/api/cache/nuke', (req, res) => {
  try {
    logger.info('Nuclear cache clear initiated');
    const clearedCaches = [];
    const errors = [];

    // Clear main cache
    try {
      const result = cacheManager.purge('*');
      clearedCaches.push({
        cache: 'main',
        type: 'response-cache',
        itemsCleared: result.purged || 0,
        status: 'success'
      });
      logger.info('Main cache cleared');
    } catch (error) {
      errors.push({
        cache: 'main',
        error: error.message
      });
      logger.error('Failed to clear main cache', { error: error.message });
    }

    // Clear URL transformation cache
    try {
      proxyManager.urlTransformer.clearCache();
      clearedCaches.push({
        cache: 'url-transform',
        type: 'transformation-cache',
        status: 'success'
      });
      logger.info('URL transformation cache cleared');
    } catch (error) {
      errors.push({
        cache: 'url-transform',
        error: error.message
      });
      logger.error('Failed to clear URL transformation cache', { error: error.message });
    }

    // Clear file resolution cache if available
    try {
      const fileResolutionCache = require('./cache/file-resolution-cache');
      if (fileResolutionCache && typeof fileResolutionCache.clear === 'function') {
        fileResolutionCache.clear();
        clearedCaches.push({
          cache: 'file-resolution',
          type: 'file-cache',
          status: 'success'
        });
        logger.info('File resolution cache cleared');
      }
    } catch (error) {
      // File resolution cache might not exist, that's okay
      logger.debug('File resolution cache not available or failed to clear', { error: error.message });
    }

    const response = {
      success: errors.length === 0,
      message: errors.length === 0 ? 'All caches cleared successfully' : 'Some caches failed to clear',
      data: {
        clearedCaches,
        totalCachesCleared: clearedCaches.length,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Nuclear cache clear completed', {
      success: response.success,
      cachesCleared: clearedCaches.length,
      errors: errors.length
    });

    res.status(errors.length === 0 ? 200 : 207).json(response); // 207 = Multi-Status
  } catch (err) {
    logger.error(`Nuclear cache clear error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Initialize dashboard integration BEFORE proxy middleware
const dashboardIntegration = new DashboardIntegration(app);
// Store globally for cleanup during shutdown
global.dashboardIntegration = dashboardIntegration;

// Mount dashboard routes immediately (synchronously)
app.use('/dashboard', dashboardIntegration.dashboardAPI.getRouter());

// Add proxy middleware - this handles all other routes
app.use(proxyManager.middleware.bind(proxyManager));

// Error handling
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { error: err.stack });
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: config.server.env === 'development' ? err.message : 'An unexpected error occurred'
    });
  }
});

/**
 * Start the server
 */
function startServer() {
  let server;
  
  // Start HTTP server
  if (!config.server.ssl.enabled) {
    server = http.createServer(app);
    server.listen(config.server.port, config.server.host, () => {
      logger.info(`HTTP server running on ${config.server.host}:${config.server.port}`);
      logger.info(`Proxying requests from ${config.cdn.originDomain} to ${config.cdn.targetDomain}`);
    });
  } else {
    // Start HTTPS server
    try {
      const sslOptions = {
        key: fs.readFileSync(config.server.ssl.key),
        cert: fs.readFileSync(config.server.ssl.cert)
      };
      
      if (config.server.ssl.passphrase) {
        sslOptions.passphrase = config.server.ssl.passphrase;
      }
      
      server = https.createServer(sslOptions, app);
      server.listen(config.server.port, config.server.host, () => {
        logger.info(`HTTPS server running on ${config.server.host}:${config.server.port}`);
        logger.info(`Proxying requests from ${config.cdn.originDomain} to ${config.cdn.targetDomain}`);
      });
      
      // Redirect HTTP to HTTPS if configured
      if (config.server.ssl.httpRedirect) {
        const httpPort = config.server.port === 443 ? 80 : parseInt(config.server.port, 10) - 1;
        const redirectApp = express();
        
        redirectApp.use((req, res) => {
          const host = req.headers.host.split(':')[0];
          const httpsPort = config.server.port !== 443 ? `:${config.server.port}` : '';
          res.redirect(301, `https://${host}${httpsPort}${req.url}`);
        });
        
        const httpServer = http.createServer(redirectApp);
        httpServer.listen(httpPort, config.server.host, () => {
          logger.info(`HTTP redirect server running on ${config.server.host}:${httpPort}`);
        });
      }
    } catch (err) {
      logger.error(`Failed to start HTTPS server: ${err.message}`);
      process.exit(1);
    }
  }
  
  // Handle server errors
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${config.server.port} is already in use`);
    } else {
      logger.error(`Server error: ${err.message}`);
    }
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
  
  return server;
}

/**
 * Graceful shutdown
 * @param {Object} server - HTTP/HTTPS server
 * @param {String} signal - Signal received
 */
function gracefulShutdown(server, signal) {
  logger.info(`${signal} signal received: shutting down gracefully`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    // Cleanup resources in proper order
    try {
      // Shutdown dashboard integration if it exists
      if (global.dashboardIntegration) {
        await global.dashboardIntegration.shutdown();
      }
      
      // Shutdown domain manager (which includes path rewriter)
      if (domainManager.shutdown) {
        domainManager.shutdown();
      }
      
      // Shutdown other managers
      cacheManager.shutdown();
      proxyManager.shutdown();
      metricsManager.shutdown();
      
      if (healthManager.shutdown) {
        healthManager.shutdown();
      }
      
      logger.info('All resources cleaned up successfully');
    } catch (error) {
      logger.error('Error during resource cleanup', { error: error.message });
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Start the server (if not in a cluster)
console.log('Checking cluster configuration:', config.server.cluster.enabled);
if (!config.server.cluster.enabled) {
  console.log('Starting server in non-cluster mode...');
  logger.info('Starting server...');
  
  // Initialize dashboard integration before starting server
  dashboardIntegration.initialize()
    .then(() => {
      logger.info('Dashboard integration initialized successfully');
      startServer();
    })
    .catch(err => {
      logger.error('Failed to initialize dashboard integration', { error: err.message });
      // Start server anyway, just without dashboard
      startServer();
    });
} else {
  console.log('Cluster mode enabled, exporting app and startServer');
  // In cluster mode, the cluster-manager.js handles starting
  // This just exports the app and start function
  module.exports = { app, startServer };
}
