// logging/index.js
const SubsystemIntegration = require('./subsystem-integration');
const path = require('path');

/**
 * Main Logging System Bootstrap
 * Initializes and manages the complete logging infrastructure
 */
class LoggingSystem {
  constructor(config = {}) {
    this.config = {
      // Directory configuration
      logDir: config.logDir || path.join(process.cwd(), 'logs'),
      
      // Server configuration
      apiPort: config.apiPort || 8080,
      streamPort: config.streamPort || 8081,
      
      // Feature toggles
      enableAPI: config.enableAPI !== false,
      enableRealTimeStreaming: config.enableRealTimeStreaming !== false,
      enableDashboard: config.enableDashboard !== false,
      
      // Retention and performance
      retentionDays: config.retentionDays || 30,
      compressionEnabled: config.compressionEnabled !== false,
      
      // Environment-specific settings
      environment: config.environment || process.env.NODE_ENV || 'development',
      debugMode: config.debugMode || process.env.LOG_DEBUG === 'true',
      
      ...config
    };
    
    this.integration = null;
    this.isInitialized = false;
    this.startTime = null;
  }
  
  /**
   * Initialize the complete logging system
   */
  async initialize() {
    try {
      this.startTime = Date.now();
      
      console.log('🚀 Initializing Advanced CDN Logging System...');
      console.log(`📁 Log Directory: ${this.config.logDir}`);
      console.log(`🌐 API Port: ${this.config.apiPort}`);
      console.log(`📡 Stream Port: ${this.config.streamPort}`);
      console.log(`🔧 Environment: ${this.config.environment}`);
      
      // Initialize subsystem integration
      this.integration = new SubsystemIntegration(this.config);
      const components = await this.integration.initialize();
      
      // Log successful initialization
      console.log('✅ Logging system components initialized:');
      console.log(`   📊 Log Manager: Active`);
      console.log(`   🔌 API Server: ${components.apiServer ? 'Active' : 'Disabled'}`);
      console.log(`   📡 Stream Server: ${components.streamServer ? 'Active' : 'Disabled'}`);
      
      this.isInitialized = true;
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      const initTime = Date.now() - this.startTime;
      console.log(`🎉 Logging system ready in ${initTime}ms`);
      
      return {
        success: true,
        components,
        initializationTime: initTime,
        config: this.config
      };
    } catch (error) {
      console.error('❌ Failed to initialize logging system:', error);
      throw error;
    }
  }
  
  /**
   * Get enhanced cache manager with logging
   */
  getLoggedCacheManager(originalCacheManager) {
    if (!this.isInitialized) {
      console.warn('⚠️ Logging system not initialized, returning original cache manager');
      return originalCacheManager;
    }
    
    return this.integration.createLoggedCacheManager(originalCacheManager);
  }
  
  /**
   * Get enhanced file resolution cache with logging
   */
  getLoggedFileResolutionCache(originalCache) {
    if (!this.isInitialized) {
      console.warn('⚠️ Logging system not initialized, returning original cache');
      return originalCache;
    }
    
    return this.integration.createLoggedFileResolutionCache(originalCache);
  }
  
  /**
   * Get enhanced URL transformer with logging
   */
  getLoggedUrlTransformer(originalTransformer) {
    if (!this.isInitialized) {
      console.warn('⚠️ Logging system not initialized, returning original transformer');
      return originalTransformer;
    }
    
    return this.integration.createLoggedUrlTransformer(originalTransformer);
  }
  
  /**
   * Get enhanced proxy manager with logging
   */
  getLoggedProxyManager(originalProxyManager) {
    if (!this.isInitialized) {
      console.warn('⚠️ Logging system not initialized, returning original proxy manager');
      return originalProxyManager;
    }
    
    return this.integration.createLoggedProxyManager(originalProxyManager);
  }
  
  /**
   * Get direct access to subsystem logger
   */
  getSubsystemLogger(subsystemName) {
    if (!this.isInitialized) {
      console.warn(`⚠️ Logging system not initialized, cannot get logger for ${subsystemName}`);
      return null;
    }
    
    return this.integration.getSubsystemLogger(subsystemName);
  }
  
  /**
   * Get log manager instance
   */
  getLogManager() {
    return this.integration?.logManager;
  }
  
  /**
   * Get stream server instance
   */
  getStreamServer() {
    return this.integration?.streamServer;
  }
  
  /**
   * Get API server instance
   */
  getApiServer() {
    return this.integration?.apiServer;
  }
  
  /**
   * Get comprehensive system status
   */
  async getSystemStatus() {
    if (!this.isInitialized) {
      return {
        status: 'not_initialized',
        uptime: 0,
        config: this.config
      };
    }
    
    const status = await this.integration.getSystemStatus();
    
    return {
      ...status,
      uptime: Date.now() - this.startTime,
      environment: this.config.environment,
      debugMode: this.config.debugMode,
      initializationTime: this.startTime
    };
  }
  
  /**
   * Create API key for external access
   */
  async createApiKey(name, permissions = ['read']) {
    if (!this.isInitialized) {
      throw new Error('Logging system not initialized');
    }
    
    const logManager = this.getLogManager();
    return await logManager.createApiKey(name, permissions);
  }
  
  /**
   * Search logs across all subsystems
   */
  async searchLogs(query) {
    if (!this.isInitialized) {
      throw new Error('Logging system not initialized');
    }
    
    const logManager = this.getLogManager();
    return await logManager.searchLogs(query);
  }
  
  /**
   * Get analytics data
   */
  async getAnalytics(subsystem = null, period = 'day') {
    if (!this.isInitialized) {
      throw new Error('Logging system not initialized');
    }
    
    const logManager = this.getLogManager();
    const stats = await logManager.getStats();
    
    if (subsystem) {
      // Get specific subsystem analytics
      const now = new Date();
      const periodMs = this.getPeriodMs(period);
      const startDate = new Date(now.getTime() - periodMs);
      
      const logs = await logManager.searchLogs({
        subsystems: [subsystem],
        startDate: startDate.toISOString(),
        limit: 10000
      });
      
      return this.generateAnalytics(logs.results, period);
    }
    
    return stats;
  }
  
  /**
   * Generate analytics from log entries
   */
  generateAnalytics(entries, period) {
    const analytics = {
      totalRequests: entries.length,
      errorRate: 0,
      averageResponseTime: 0,
      statusCodeDistribution: {},
      methodDistribution: {},
      timeline: {}
    };
    
    if (entries.length === 0) return analytics;
    
    let totalResponseTime = 0;
    let errorCount = 0;
    const bucketSize = this.getBucketSize(period);
    
    for (const entry of entries) {
      // Error rate calculation
      if (entry.statusCode >= 400) {
        errorCount++;
      }
      
      // Response time calculation
      if (entry.responseTime) {
        totalResponseTime += entry.responseTime;
      }
      
      // Status code distribution
      const status = entry.statusCode?.toString() || 'unknown';
      analytics.statusCodeDistribution[status] = (analytics.statusCodeDistribution[status] || 0) + 1;
      
      // Method distribution
      analytics.methodDistribution[entry.method] = (analytics.methodDistribution[entry.method] || 0) + 1;
      
      // Timeline buckets
      const bucket = this.getTimeBucket(entry.timestamp, bucketSize);
      if (!analytics.timeline[bucket]) {
        analytics.timeline[bucket] = { requests: 0, errors: 0 };
      }
      analytics.timeline[bucket].requests++;
      if (entry.statusCode >= 400) {
        analytics.timeline[bucket].errors++;
      }
    }
    
    analytics.errorRate = (errorCount / entries.length) * 100;
    analytics.averageResponseTime = totalResponseTime / entries.length;
    
    return analytics;
  }
  
  /**
   * Get period in milliseconds
   */
  getPeriodMs(period) {
    const periods = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };
    return periods[period] || periods.day;
  }
  
  /**
   * Get bucket size for timeline grouping
   */
  getBucketSize(period) {
    const buckets = {
      hour: 5 * 60 * 1000, // 5 minutes
      day: 60 * 60 * 1000, // 1 hour
      week: 24 * 60 * 60 * 1000, // 1 day
      month: 24 * 60 * 60 * 1000 // 1 day
    };
    return buckets[period] || buckets.day;
  }
  
  /**
   * Get time bucket for entry
   */
  getTimeBucket(timestamp, bucketSize) {
    const time = new Date(timestamp).getTime();
    return Math.floor(time / bucketSize) * bucketSize;
  }
  
  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down logging system gracefully...`);
      await this.shutdown();
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      await this.shutdown();
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await this.shutdown();
      process.exit(1);
    });
  }
  
  /**
   * Shutdown the logging system
   */
  async shutdown() {
    try {
      if (this.integration) {
        await this.integration.shutdown();
      }
      
      this.isInitialized = false;
      console.log('🔄 Logging system shut down successfully');
    } catch (error) {
      console.error('❌ Error during logging system shutdown:', error);
    }
  }
  
  /**
   * Health check endpoint data
   */
  async getHealthCheck() {
    const status = await this.getSystemStatus();
    
    return {
      status: this.isInitialized ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: status.uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: this.config.environment,
      components: {
        logManager: !!status.logManager,
        apiServer: !!status.apiServer?.enabled,
        streamServer: !!status.streamServer?.isRunning
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }
}

// Create singleton instance
let loggingSystemInstance = null;

/**
 * Get or create the logging system singleton
 */
function getLoggingSystem(config = {}) {
  if (!loggingSystemInstance) {
    loggingSystemInstance = new LoggingSystem(config);
  }
  return loggingSystemInstance;
}

/**
 * Initialize the logging system with configuration
 */
async function initializeLogging(config = {}) {
  const system = getLoggingSystem(config);
  return await system.initialize();
}

/**
 * Quick access functions for common operations
 */
function getLoggedCacheManager(originalCacheManager) {
  const system = getLoggingSystem();
  return system.getLoggedCacheManager(originalCacheManager);
}

function getLoggedFileResolutionCache(originalCache) {
  const system = getLoggingSystem();
  return system.getLoggedFileResolutionCache(originalCache);
}

function getLoggedUrlTransformer(originalTransformer) {
  const system = getLoggingSystem();
  return system.getLoggedUrlTransformer(originalTransformer);
}

function getLoggedProxyManager(originalProxyManager) {
  const system = getLoggingSystem();
  return system.getLoggedProxyManager(originalProxyManager);
}

function getSubsystemLogger(subsystemName) {
  const system = getLoggingSystem();
  return system.getSubsystemLogger(subsystemName);
}

module.exports = {
  LoggingSystem,
  getLoggingSystem,
  initializeLogging,
  getLoggedCacheManager,
  getLoggedFileResolutionCache,
  getLoggedUrlTransformer,
  getLoggedProxyManager,
  getSubsystemLogger
};