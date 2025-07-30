// logging/integration-example.js
/**
 * Example integration of the comprehensive logging system with existing CDN components
 * This file demonstrates how to initialize and integrate the logging infrastructure
 */

const { initializeLogging, getLoggedProxyManager } = require('./index');
const originalProxyManager = require('../proxy/proxy-manager');
const config = require('../config');

/**
 * Initialize the comprehensive logging system for the CDN
 */
async function initializeCDNLogging() {
  try {
    console.log('🚀 Initializing CDN Logging System...');
    
    // Initialize logging with CDN-specific configuration
    const loggingConfig = {
      // Directory configuration
      logDir: config.logging?.logDir || './logs',
      
      // Server ports
      apiPort: config.logging?.apiPort || 8080,
      streamPort: config.logging?.streamPort || 8081,
      
      // Feature toggles
      enableAPI: config.logging?.enableAPI !== false,
      enableRealTimeStreaming: config.logging?.enableRealTimeStreaming !== false,
      
      // Performance settings
      retentionDays: config.logging?.retentionDays || 30,
      compressionEnabled: config.logging?.compressionEnabled !== false,
      
      // Environment settings
      environment: process.env.NODE_ENV || 'development',
      debugMode: process.env.LOG_DEBUG === 'true' || config.logging?.debugMode
    };
    
    // Initialize the logging system
    const result = await initializeLogging(loggingConfig);
    
    console.log('✅ Logging system initialized successfully');
    console.log(`   📊 Components: ${Object.keys(result.components).length}`);
    console.log(`   ⏱️  Initialization time: ${result.initializationTime}ms`);
    
    // Log the default API key for initial access
    if (result.components.logManager) {
      const stats = await result.components.logManager.getStats();
      if (stats.apiKeys > 0) {
        console.log('🔑 API keys configured for log access');
        console.log(`   📡 API Server: http://localhost:${loggingConfig.apiPort}/api/health`);
        console.log(`   🔌 Stream Server: ws://localhost:${loggingConfig.streamPort}`);
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to initialize CDN logging system:', error);
    throw error;
  }
}

/**
 * Create enhanced proxy manager with comprehensive logging
 */
function createEnhancedProxyManager() {
  console.log('🔧 Creating enhanced proxy manager with logging...');
  
  // Wrap the original proxy manager with logging capabilities
  const enhancedProxyManager = getLoggedProxyManager(originalProxyManager);
  
  console.log('✅ Enhanced proxy manager created');
  console.log('   📝 All proxy operations will now be logged');
  console.log('   🔍 Request/response data captured');
  console.log('   📊 Performance metrics tracked');
  
  return enhancedProxyManager;
}

/**
 * Example Express.js integration
 */
function setupExpressIntegration(app) {
  console.log('🌐 Setting up Express.js integration...');
  
  // Initialize logging system
  initializeCDNLogging().then((loggingResult) => {
    // Create enhanced proxy manager
    const enhancedProxyManager = createEnhancedProxyManager();
    
    // Add logging middleware to capture all requests
    app.use((req, res, next) => {
      // Add request start time for performance tracking
      req.startTime = Date.now();
      
      // Add request ID for tracing
      req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Log request start
      console.log(`📥 [${req.requestId}] ${req.method} ${req.url} from ${req.ip}`);
      
      // Capture response end for logging
      const originalEnd = res.end;
      res.end = function(...args) {
        const responseTime = Date.now() - req.startTime;
        console.log(`📤 [${req.requestId}] ${res.statusCode} - ${responseTime}ms`);
        originalEnd.apply(this, args);
      };
      
      next();
    });
    
    // Use enhanced proxy manager as middleware
    app.use(enhancedProxyManager.middleware.bind(enhancedProxyManager));
    
    console.log('✅ Express.js integration complete');
    
  }).catch((error) => {
    console.error('❌ Failed to setup Express.js integration:', error);
  });
}

/**
 * Example of direct logger usage for custom operations
 */
async function exampleCustomLogging() {
  const { getSubsystemLogger } = require('./index');
  
  // Get logger for custom subsystem
  const customLogger = getSubsystemLogger('custom-operations');
  
  if (customLogger) {
    // Log a custom operation
    await customLogger.logRequest({
      method: 'CUSTOM',
      url: '/custom/operation',
      path: 'custom.performOperation',
      statusCode: 200,
      responseTime: 150,
      clientIp: '192.168.1.100',
      userAgent: 'Custom-Client/1.0',
      subsystemData: {
        operation: 'data_processing',
        recordsProcessed: 1000,
        processingTime: 145,
        success: true
      }
    });
    
    console.log('✅ Custom operation logged successfully');
  }
}

/**
 * Example of using the logging API programmatically
 */
async function exampleAPIUsage() {
  const { getLoggingSystem } = require('./index');
  
  const loggingSystem = getLoggingSystem();
  
  if (loggingSystem.isInitialized) {
    // Create a new API key
    const apiKeyResult = await loggingSystem.createApiKey('dashboard-access', ['read', 'write']);
    console.log('🔑 Created API key:', apiKeyResult.apiKey);
    
    // Search recent logs
    const searchResult = await loggingSystem.searchLogs({
      limit: 10,
      statusCodes: [200, 404, 500]
    });
    console.log(`📊 Found ${searchResult.total} log entries`);
    
    // Get system analytics
    const analytics = await loggingSystem.getAnalytics();
    console.log('📈 System analytics:', {
      totalRequests: analytics.total?.requests || 0,
      totalErrors: analytics.total?.errors || 0,
      subsystems: Object.keys(analytics.subsystems || {}).length
    });
  }
}

/**
 * Example health check integration
 */
async function setupHealthChecks(app) {
  const { getLoggingSystem } = require('./index');
  
  app.get('/health/logging', async (req, res) => {
    try {
      const loggingSystem = getLoggingSystem();
      const healthCheck = await loggingSystem.getHealthCheck();
      
      res.json(healthCheck);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  console.log('✅ Health check endpoint added: /health/logging');
}

/**
 * Example graceful shutdown handling
 */
function setupGracefulShutdown() {
  const { getLoggingSystem } = require('./index');
  
  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    try {
      const loggingSystem = getLoggingSystem();
      await loggingSystem.shutdown();
      console.log('✅ Logging system shut down successfully');
    } catch (error) {
      console.error('❌ Error during logging system shutdown:', error);
    }
    
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
}

/**
 * Complete CDN setup with logging
 */
async function setupCDNWithLogging(app) {
  try {
    console.log('🚀 Setting up Advanced CDN with Comprehensive Logging...');
    
    // 1. Initialize logging system
    await initializeCDNLogging();
    
    // 2. Setup Express integration
    setupExpressIntegration(app);
    
    // 3. Setup health checks
    setupHealthChecks(app);
    
    // 4. Setup graceful shutdown
    setupGracefulShutdown();
    
    // 5. Example custom logging
    setTimeout(() => {
      exampleCustomLogging().catch(console.error);
    }, 2000);
    
    // 6. Example API usage
    setTimeout(() => {
      exampleAPIUsage().catch(console.error);
    }, 3000);
    
    console.log('🎉 CDN with comprehensive logging setup complete!');
    console.log('');
    console.log('📊 Available endpoints:');
    console.log('   🏥 Health: /health/logging');
    console.log('   📡 API: http://localhost:8080/api/');
    console.log('   🔌 WebSocket: ws://localhost:8081');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Check health endpoint for system status');
    console.log('   2. Use API key to access log management endpoints');
    console.log('   3. Connect to WebSocket for real-time log streaming');
    console.log('   4. View logs in ./logs/ directory');
    
  } catch (error) {
    console.error('❌ Failed to setup CDN with logging:', error);
    throw error;
  }
}

// Export functions for use in main application
module.exports = {
  initializeCDNLogging,
  createEnhancedProxyManager,
  setupExpressIntegration,
  exampleCustomLogging,
  exampleAPIUsage,
  setupHealthChecks,
  setupGracefulShutdown,
  setupCDNWithLogging
};

// Example usage if run directly
if (require.main === module) {
  const express = require('express');
  const app = express();
  
  setupCDNWithLogging(app).then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🌐 CDN server running on port ${port}`);
    });
  }).catch((error) => {
    console.error('❌ Failed to start CDN server:', error);
    process.exit(1);
  });
}