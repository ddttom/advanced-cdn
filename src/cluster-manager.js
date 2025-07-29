// cluster-manager.js
const cluster = require('cluster');
const os = require('os');
const config = require('./config');
const logger = require('./logger').getModuleLogger('cluster-manager');

// Import app only in worker mode to avoid initialization conflicts
const app = cluster.isPrimary ? null : require('./app');

/**
 * Start a worker process
 * @param {Number} id - Worker ID
 */
function startWorker(id) {
  const worker = cluster.fork({ NODE_APP_INSTANCE: id });
  
  logger.info(`Started worker ${id} (pid: ${worker.process.pid})`);
  
  worker.on('message', (message) => {
    if (message.type === 'log') {
      // Handle forwarded logs from workers
      const { level, msg, meta } = message;
      logger[level](msg, meta);
    }
  });
}

/**
 * Start the cluster
 */
function startCluster() {
  if (!config.server.cluster.enabled) {
    logger.info('Cluster mode disabled, starting in single process mode');
    return require('./app').startServer();
  }
  
  if (cluster.isPrimary) {
    // Master process
    const numWorkers = config.server.cluster.workers;
    
    logger.info(`Starting cluster with ${numWorkers} workers`);
    
    // Start initial workers
    for (let i = 0; i < numWorkers; i++) {
      startWorker(i);
    }
    
    // Handle worker death
    cluster.on('exit', (worker, code, signal) => {
      const workerId = worker.process.env.NODE_APP_INSTANCE;
      
      if (code !== 0) {
        logger.warn(`Worker ${workerId} (pid: ${worker.process.pid}) died with code ${code} and signal ${signal}`);
        logger.info(`Restarting worker ${workerId}`);
        
        // Restart the worker
        startWorker(workerId);
      } else {
        logger.info(`Worker ${workerId} (pid: ${worker.process.pid}) exited gracefully`);
      }
    });
    
    // Handle master signals
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received in master, shutting down workers');
      
      // Set a timeout for forceful shutdown
      const forceKillTimeout = setTimeout(() => {
        logger.error('Workers did not exit gracefully, killing forcefully');
        
        for (const id in cluster.workers) {
          cluster.workers[id].kill('SIGKILL');
        }
        
        process.exit(1);
      }, 30000);
      
      // Set a listener to clear the timeout if all workers exit
      let remainingWorkers = Object.keys(cluster.workers).length;
      cluster.on('exit', () => {
        remainingWorkers--;
        
        if (remainingWorkers === 0) {
          clearTimeout(forceKillTimeout);
          logger.info('All workers exited, shutting down master');
          process.exit(0);
        }
      });
      
      // Signal all workers to shut down
      for (const id in cluster.workers) {
        cluster.workers[id].send('shutdown');
        cluster.workers[id].disconnect();
      }
    });
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received in master, shutting down workers');
      
      // Set a short timeout for forceful shutdown
      setTimeout(() => {
        logger.error('Forceful shutdown after SIGINT');
        process.exit(1);
      }, 5000);
      
      // Signal all workers to shut down
      for (const id in cluster.workers) {
        cluster.workers[id].kill('SIGTERM');
      }
    });
    
    // Log memory usage periodically
    if (config.server.env === 'production') {
      const memoryLogInterval = setInterval(() => {
        const memUsage = process.memoryUsage();
        logger.info(`Master memory usage: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
      }, 5 * 60 * 1000); // Every 5 minutes
      
      // Clean up memory logging interval on shutdown
      process.on('exit', () => {
        if (memoryLogInterval) {
          clearInterval(memoryLogInterval);
        }
      });
    }
  } else {
    // Worker process
    logger.info(`Worker ${process.env.NODE_APP_INSTANCE} started`);
    
    // Start the server
    const server = app.startServer();
    
    // Handle worker shutdown
    process.on('message', (msg) => {
      if (msg === 'shutdown') {
        logger.info(`Worker ${process.env.NODE_APP_INSTANCE} received shutdown message`);
        
        // Gracefully close the server
        server.close(async () => {
          logger.info(`Worker ${process.env.NODE_APP_INSTANCE} closed all connections`);
          
          // Cleanup resources before exiting
          try {
            // Import required modules for cleanup
            const cacheManager = require('./cache/cache-manager');
            const metricsManager = require('./monitoring/metrics-manager');
            const domainManager = require('./domain/domain-manager');
            
            // Shutdown dashboard integration if it exists
            if (global.dashboardIntegration) {
              await global.dashboardIntegration.shutdown();
            }
            
            // Shutdown domain manager (includes path rewriter)
            if (domainManager.shutdown) {
              domainManager.shutdown();
            }
            
            // Shutdown other managers
            cacheManager.shutdown();
            metricsManager.shutdown();
            
            logger.info(`Worker ${process.env.NODE_APP_INSTANCE} cleanup completed`);
          } catch (error) {
            logger.error(`Worker ${process.env.NODE_APP_INSTANCE} cleanup error`, { error: error.message });
          }
          
          process.exit(0);
        });
        
        // Force exit after timeout
        setTimeout(() => {
          logger.error(`Worker ${process.env.NODE_APP_INSTANCE} could not close connections in time, forcefully exiting`);
          process.exit(1);
        }, 10000);
      }
    });
  }
}

// Start the cluster if this file is executed directly
if (require.main === module) {
  startCluster();
}

module.exports = { startCluster };
