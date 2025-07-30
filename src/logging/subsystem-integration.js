// logging/subsystem-integration.js
const LogManager = require('./log-manager');
const LogStreamServer = require('./log-stream-server');
const LogAPI = require('./log-api');

/**
 * Subsystem Integration Layer
 * Integrates logging infrastructure with existing cache subsystems
 */
class SubsystemIntegration {
  constructor(config = {}) {
    this.config = {
      logDir: config.logDir || 'logs',
      apiPort: config.apiPort || 8080,
      streamPort: config.streamPort || 8081,
      retentionDays: config.retentionDays || 30,
      enableRealTimeStreaming: config.enableRealTimeStreaming !== false,
      enableAPI: config.enableAPI !== false,
      ...config
    };
    
    this.logManager = null;
    this.streamServer = null;
    this.apiServer = null;
    this.subsystemLoggers = new Map();
    this.isInitialized = false;
  }
  
  /**
   * Initialize the complete logging infrastructure
   */
  async initialize() {
    try {
      console.log('Initializing comprehensive logging infrastructure...');
      
      // Initialize log manager
      this.logManager = new LogManager({
        logDir: this.config.logDir,
        retentionDays: this.config.retentionDays,
        realTimeStreaming: this.config.enableRealTimeStreaming
      });
      await this.logManager.initialize();
      
      // Initialize streaming server if enabled
      if (this.config.enableRealTimeStreaming) {
        this.streamServer = new LogStreamServer({
          port: this.config.streamPort
        });
        await this.streamServer.initialize(this.logManager);
      }
      
      // Initialize API server if enabled
      if (this.config.enableAPI) {
        this.apiServer = new LogAPI({
          port: this.config.apiPort
        });
        await this.apiServer.initialize(this.logManager);
      }
      
      // Register core subsystems
      await this.registerCoreSubsystems();
      
      this.isInitialized = true;
      console.log('Logging infrastructure initialized successfully');
      
      return {
        logManager: this.logManager,
        streamServer: this.streamServer,
        apiServer: this.apiServer
      };
    } catch (error) {
      console.error('Failed to initialize logging infrastructure:', error);
      throw error;
    }
  }
  
  /**
   * Register core cache subsystems
   */
  async registerCoreSubsystems() {
    const subsystems = [
      {
        name: 'cache-manager',
        description: 'Main cache management system',
        config: { bufferSize: 1000 }
      },
      {
        name: 'file-resolution-cache',
        description: 'File resolution and path mapping cache',
        config: { bufferSize: 500 }
      },
      {
        name: 'url-transformer',
        description: 'URL transformation and rewriting system',
        config: { bufferSize: 800 }
      },
      {
        name: 'proxy-manager',
        description: 'Proxy request management and routing',
        config: { bufferSize: 1200 }
      }
    ];
    
    for (const subsystem of subsystems) {
      const logger = await this.logManager.registerSubsystem(
        subsystem.name, 
        subsystem.config
      );
      this.subsystemLoggers.set(subsystem.name, logger);
      console.log(`Registered subsystem logger: ${subsystem.name}`);
    }
  }
  
  /**
   * Get logger for specific subsystem
   */
  getSubsystemLogger(subsystemName) {
    return this.subsystemLoggers.get(subsystemName);
  }
  
  /**
   * Create enhanced cache manager wrapper with logging
   */
  createLoggedCacheManager(originalCacheManager) {
    const logger = this.getSubsystemLogger('cache-manager');
    if (!logger) {
      console.warn('Cache manager logger not available');
      return originalCacheManager;
    }
    
    return new Proxy(originalCacheManager, {
      get(target, prop, receiver) {
        const originalMethod = target[prop];
        
        if (typeof originalMethod !== 'function') {
          return originalMethod;
        }
        
        return async function(...args) {
          const startTime = Date.now();
          const requestId = `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          try {
            // Log cache operation start
            await logger.logRequest({
              id: requestId,
              method: 'CACHE',
              url: `/${prop}`,
              path: `cache-manager.${prop}`,
              statusCode: 200,
              subsystemData: {
                operation: prop,
                args: args.length,
                cacheKey: args[0] || null,
                operationType: 'start'
              }
            });
            
            const result = await originalMethod.apply(target, args);
            const responseTime = Date.now() - startTime;
            
            // Log successful operation
            await logger.logRequest({
              id: requestId,
              method: 'CACHE',
              url: `/${prop}`,
              path: `cache-manager.${prop}`,
              statusCode: 200,
              responseTime,
              subsystemData: {
                operation: prop,
                success: true,
                resultType: typeof result,
                hasResult: result !== null && result !== undefined,
                operationType: 'complete'
              }
            });
            
            return result;
          } catch (error) {
            const responseTime = Date.now() - startTime;
            
            // Log error
            await logger.logRequest({
              id: requestId,
              method: 'CACHE',
              url: `/${prop}`,
              path: `cache-manager.${prop}`,
              statusCode: 500,
              responseTime,
              error: {
                message: error.message,
                stack: error.stack
              },
              subsystemData: {
                operation: prop,
                success: false,
                operationType: 'error'
              }
            });
            
            throw error;
          }
        };
      }
    });
  }
  
  /**
   * Create enhanced file resolution cache wrapper with logging
   */
  createLoggedFileResolutionCache(originalCache) {
    const logger = this.getSubsystemLogger('file-resolution-cache');
    if (!logger) {
      console.warn('File resolution cache logger not available');
      return originalCache;
    }
    
    return new Proxy(originalCache, {
      get(target, prop, receiver) {
        const originalMethod = target[prop];
        
        if (typeof originalMethod !== 'function') {
          return originalMethod;
        }
        
        return async function(...args) {
          const startTime = Date.now();
          const requestId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          try {
            const filePath = args[0] || 'unknown';
            
            await logger.logRequest({
              id: requestId,
              method: 'FILE',
              url: filePath,
              path: `file-resolution.${prop}`,
              statusCode: 200,
              subsystemData: {
                operation: prop,
                filePath,
                operationType: 'start'
              }
            });
            
            const result = await originalMethod.apply(target, args);
            const responseTime = Date.now() - startTime;
            
            await logger.logRequest({
              id: requestId,
              method: 'FILE',
              url: filePath,
              path: `file-resolution.${prop}`,
              statusCode: result ? 200 : 404,
              responseTime,
              subsystemData: {
                operation: prop,
                filePath,
                resolved: !!result,
                resultPath: result || null,
                operationType: 'complete'
              }
            });
            
            return result;
          } catch (error) {
            const responseTime = Date.now() - startTime;
            
            await logger.logRequest({
              id: requestId,
              method: 'FILE',
              url: args[0] || 'unknown',
              path: `file-resolution.${prop}`,
              statusCode: 500,
              responseTime,
              error: {
                message: error.message,
                stack: error.stack
              },
              subsystemData: {
                operation: prop,
                operationType: 'error'
              }
            });
            
            throw error;
          }
        };
      }
    });
  }
  
  /**
   * Create enhanced URL transformer wrapper with logging
   */
  createLoggedUrlTransformer(originalTransformer) {
    const logger = this.getSubsystemLogger('url-transformer');
    if (!logger) {
      console.warn('URL transformer logger not available');
      return originalTransformer;
    }
    
    return new Proxy(originalTransformer, {
      get(target, prop, receiver) {
        const originalMethod = target[prop];
        
        if (typeof originalMethod !== 'function') {
          return originalMethod;
        }
        
        return async function(...args) {
          const startTime = Date.now();
          const requestId = `url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          try {
            const content = args[0] || '';
            const contentType = args[1] || 'unknown';
            
            await logger.logRequest({
              id: requestId,
              method: 'TRANSFORM',
              url: `/transform/${contentType}`,
              path: `url-transformer.${prop}`,
              statusCode: 200,
              subsystemData: {
                operation: prop,
                contentType,
                contentLength: content.length,
                operationType: 'start'
              }
            });
            
            const result = await originalMethod.apply(target, args);
            const responseTime = Date.now() - startTime;
            
            // Count transformations
            const originalUrls = (content.match(/https?:\/\/[^\s"'<>]+/g) || []).length;
            const transformedContent = result || content;
            const transformedUrls = (transformedContent.match(/https?:\/\/[^\s"'<>]+/g) || []).length;
            const transformationCount = Math.max(0, originalUrls - transformedUrls);
            
            await logger.logRequest({
              id: requestId,
              method: 'TRANSFORM',
              url: `/transform/${contentType}`,
              path: `url-transformer.${prop}`,
              statusCode: 200,
              responseTime,
              subsystemData: {
                operation: prop,
                contentType,
                originalLength: content.length,
                transformedLength: transformedContent.length,
                originalUrls,
                transformedUrls,
                transformationCount,
                operationType: 'complete'
              }
            });
            
            return result;
          } catch (error) {
            const responseTime = Date.now() - startTime;
            
            await logger.logRequest({
              id: requestId,
              method: 'TRANSFORM',
              url: `/transform/${args[1] || 'unknown'}`,
              path: `url-transformer.${prop}`,
              statusCode: 500,
              responseTime,
              error: {
                message: error.message,
                stack: error.stack
              },
              subsystemData: {
                operation: prop,
                operationType: 'error'
              }
            });
            
            throw error;
          }
        };
      }
    });
  }
  
  /**
   * Create enhanced proxy manager wrapper with logging
   */
  createLoggedProxyManager(originalProxyManager) {
    const logger = this.getSubsystemLogger('proxy-manager');
    if (!logger) {
      console.warn('Proxy manager logger not available');
      return originalProxyManager;
    }
    
    return new Proxy(originalProxyManager, {
      get(target, prop, receiver) {
        const originalMethod = target[prop];
        
        if (typeof originalMethod !== 'function') {
          return originalMethod;
        }
        
        return async function(...args) {
          const startTime = Date.now();
          const requestId = `proxy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          try {
            // Extract request details
            const req = args[0];
            const res = args[1];
            const url = req?.url || 'unknown';
            const method = req?.method || 'GET';
            const clientIp = req?.ip || req?.connection?.remoteAddress || 'unknown';
            const userAgent = req?.headers?.['user-agent'] || 'unknown';
            
            await logger.logRequest({
              id: requestId,
              method,
              url,
              path: `proxy-manager.${prop}`,
              clientIp,
              userAgent,
              statusCode: 200,
              subsystemData: {
                operation: prop,
                headers: req?.headers || {},
                operationType: 'start'
              }
            });
            
            const result = await originalMethod.apply(target, args);
            const responseTime = Date.now() - startTime;
            
            await logger.logRequest({
              id: requestId,
              method,
              url,
              path: `proxy-manager.${prop}`,
              clientIp,
              userAgent,
              statusCode: res?.statusCode || 200,
              responseTime,
              subsystemData: {
                operation: prop,
                success: true,
                responseHeaders: res?.getHeaders?.() || {},
                operationType: 'complete'
              }
            });
            
            return result;
          } catch (error) {
            const responseTime = Date.now() - startTime;
            const req = args[0];
            
            await logger.logRequest({
              id: requestId,
              method: req?.method || 'GET',
              url: req?.url || 'unknown',
              path: `proxy-manager.${prop}`,
              clientIp: req?.ip || req?.connection?.remoteAddress || 'unknown',
              userAgent: req?.headers?.['user-agent'] || 'unknown',
              statusCode: 500,
              responseTime,
              error: {
                message: error.message,
                stack: error.stack
              },
              subsystemData: {
                operation: prop,
                operationType: 'error'
              }
            });
            
            throw error;
          }
        };
      }
    });
  }
  
  /**
   * Get comprehensive system status
   */
  async getSystemStatus() {
    if (!this.isInitialized) {
      return { status: 'not_initialized' };
    }
    
    try {
      const logManagerStats = await this.logManager.getStats();
      const streamServerStats = this.streamServer ? this.streamServer.getStats() : null;
      
      return {
        status: 'running',
        initialized: this.isInitialized,
        logManager: {
          subsystems: logManagerStats.subsystems,
          totalRequests: logManagerStats.total.requests,
          totalErrors: logManagerStats.total.errors,
          apiKeys: logManagerStats.apiKeys
        },
        streamServer: streamServerStats,
        apiServer: {
          enabled: !!this.apiServer,
          port: this.config.apiPort
        },
        config: {
          logDir: this.config.logDir,
          retentionDays: this.config.retentionDays,
          realTimeStreaming: this.config.enableRealTimeStreaming,
          apiEnabled: this.config.enableAPI
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * Shutdown all logging infrastructure
   */
  async shutdown() {
    try {
      console.log('Shutting down logging infrastructure...');
      
      if (this.streamServer) {
        await this.streamServer.shutdown();
      }
      
      if (this.apiServer) {
        await this.apiServer.shutdown();
      }
      
      if (this.logManager) {
        await this.logManager.shutdown();
      }
      
      this.isInitialized = false;
      console.log('Logging infrastructure shut down successfully');
    } catch (error) {
      console.error('Error shutting down logging infrastructure:', error);
    }
  }
}

module.exports = SubsystemIntegration;