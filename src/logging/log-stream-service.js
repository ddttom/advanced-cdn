// logging/log-stream-service.js
const EventEmitter = require('events');
const winston = require('winston');

/**
 * Log Stream Service
 * Provides real-time log streaming capabilities by hooking into Winston logger
 */
class LogStreamService extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
    this.isInitialized = false;
    this.logBuffer = [];
    this.maxBufferSize = 1000;
  }

  /**
   * Initialize the log stream service
   */
  initialize(logger) {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create a proper writable stream for Winston
      const { Writable } = require('stream');
      
      const self = this;
      const logStream = new Writable({
        write(chunk, encoding, callback) {
          try {
            // Parse the log message
            const message = chunk.toString();
            const logEntry = self.parseLogMessage(message);
            
            // Add to buffer
            self.addToBuffer(logEntry);
            
            // Emit to all connected clients
            self.emit('log', logEntry);
            
            callback();
          } catch (error) {
            // Avoid console.error here to prevent circular logging
            callback();
          }
        }
      });

      // Create a custom transport that emits log events
      const streamTransport = new winston.transports.Stream({
        stream: logStream,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      });

      // Add the transport to the logger
      logger.add(streamTransport);
      
      this.isInitialized = true;
      console.log('Log Stream Service initialized');
    } catch (error) {
      console.error('Failed to initialize log stream service:', error.message);
      // Mark as initialized anyway to prevent hanging
      this.isInitialized = true;
    }
  }

  /**
   * Parse log message from Winston
   */
  parseLogMessage(message) {
    try {
      const parsed = JSON.parse(message.trim());
      return {
        timestamp: parsed.timestamp || new Date().toISOString(),
        level: parsed.level || 'info',
        message: parsed.message || '',
        module: parsed.module || 'system',
        meta: parsed.meta || {},
        stack: parsed.stack || null,
        id: Date.now() + Math.random()
      };
    } catch (error) {
      // Fallback for non-JSON messages
      return {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: message.trim(),
        module: 'system',
        meta: {},
        stack: null,
        id: Date.now() + Math.random()
      };
    }
  }

  /**
   * Add log entry to buffer
   */
  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count = 100) {
    return this.logBuffer.slice(-count);
  }

  /**
   * Add a client for log streaming
   */
  addClient(clientId, filters = {}) {
    const client = {
      id: clientId,
      filters: filters,
      lastSeen: Date.now()
    };
    
    this.clients.add(client);
    console.log(`Log stream client connected: ${clientId}`);
    
    return client;
  }

  /**
   * Remove a client
   */
  removeClient(clientId) {
    for (const client of this.clients) {
      if (client.id === clientId) {
        this.clients.delete(client);
        console.log(`Log stream client disconnected: ${clientId}`);
        break;
      }
    }
  }

  /**
   * Get filtered logs for a client
   */
  getFilteredLogs(filters = {}) {
    let logs = this.logBuffer;

    // Filter by level
    if (filters.level && filters.level !== 'all') {
      logs = logs.filter(log => log.level === filters.level);
    }

    // Filter by module
    if (filters.module && filters.module !== 'all') {
      logs = logs.filter(log => log.module === filters.module);
    }

    // Filter by time range
    if (filters.since) {
      const sinceTime = new Date(filters.since);
      logs = logs.filter(log => new Date(log.timestamp) >= sinceTime);
    }

    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      logs = logs.filter(log => 
        log.message.toLowerCase().includes(searchTerm) ||
        log.module.toLowerCase().includes(searchTerm)
      );
    }

    return logs;
  }

  /**
   * Get available log levels
   */
  getLogLevels() {
    return ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
  }

  /**
   * Get available modules
   */
  getModules() {
    const modules = new Set();
    this.logBuffer.forEach(log => modules.add(log.module));
    return Array.from(modules).sort();
  }

  /**
   * Get stream statistics
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      bufferSize: this.logBuffer.length,
      maxBufferSize: this.maxBufferSize,
      isInitialized: this.isInitialized,
      modules: this.getModules(),
      levels: this.getLogLevels()
    };
  }

  /**
   * Clean up inactive clients
   */
  cleanupClients() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    for (const client of this.clients) {
      if (now - client.lastSeen > timeout) {
        this.clients.delete(client);
        console.log(`Cleaned up inactive log stream client: ${client.id}`);
      }
    }
  }
}

// Create singleton instance
const logStreamService = new LogStreamService();

// Cleanup inactive clients every 5 minutes
setInterval(() => {
  logStreamService.cleanupClients();
}, 5 * 60 * 1000);

module.exports = logStreamService;