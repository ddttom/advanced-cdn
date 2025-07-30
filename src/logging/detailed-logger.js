// logging/detailed-logger.js
const fs = require('fs').promises;
const path = require('path');
const { createWriteStream } = require('fs');
const { EventEmitter } = require('events');
const zlib = require('zlib');

/**
 * Comprehensive Detailed Logger
 * Captures all page requests with extensive metadata for each cache subsystem
 */
class DetailedLogger extends EventEmitter {
  constructor(subsystem, config = {}) {
    super();
    
    this.subsystem = subsystem;
    this.config = {
      logDir: config.logDir || path.join(process.cwd(), 'logs', subsystem),
      maxFileSize: config.maxFileSize || 100 * 1024 * 1024, // 100MB
      retentionDays: config.retentionDays || 30,
      compressionEnabled: config.compressionEnabled !== false,
      realTimeStreaming: config.realTimeStreaming !== false,
      bufferSize: config.bufferSize || 1000,
      flushInterval: config.flushInterval || 5000, // 5 seconds
      ...config
    };
    
    this.logBuffer = [];
    this.currentDate = this.getCurrentDate();
    this.writeStreams = new Map();
    this.stats = {
      totalRequests: 0,
      totalErrors: 0,
      totalBytes: 0,
      startTime: Date.now()
    };
    
    this.initialize();
  }
  
  /**
   * Initialize the detailed logger
   */
  async initialize() {
    try {
      // Ensure log directory exists
      await fs.mkdir(this.config.logDir, { recursive: true });
      
      // Setup log rotation check
      this.setupLogRotation();
      
      // Setup periodic buffer flush
      this.setupBufferFlush();
      
      // Setup cleanup for old logs
      this.setupLogCleanup();
      
      this.emit('initialized', { subsystem: this.subsystem });
    } catch (error) {
      this.emit('error', { error: error.message, subsystem: this.subsystem });
    }
  }
  
  /**
   * Log a detailed request with comprehensive metadata
   */
  async logRequest(requestData) {
    const timestamp = new Date();
    const caller = this.getCallerInfo();
    
    const logEntry = {
      // Core identification
      id: this.generateRequestId(),
      timestamp: timestamp.toISOString(),
      microseconds: timestamp.getTime() * 1000 + (timestamp.getMilliseconds() % 1000),
      subsystem: this.subsystem,
      
      // Request details
      method: requestData.method || 'GET',
      url: requestData.url || '',
      path: requestData.path || '',
      query: requestData.query || {},
      
      // Client information
      clientIp: requestData.clientIp || '',
      userAgent: requestData.userAgent || '',
      userAgentParsed: this.parseUserAgent(requestData.userAgent),
      referrer: requestData.referrer || '',
      
      // Request headers
      requestHeaders: requestData.requestHeaders || {},
      
      // Response details
      statusCode: requestData.statusCode || 0,
      responseSize: requestData.responseSize || 0,
      responseHeaders: requestData.responseHeaders || {},
      
      // Performance metrics
      executionTime: requestData.executionTime || 0,
      cacheStatus: requestData.cacheStatus || 'NONE',
      
      // Function caller identification
      caller: {
        function: caller.function,
        file: caller.file,
        line: caller.line,
        column: caller.column
      },
      
      // Stack trace (for errors or debug mode)
      stackTrace: requestData.includeStack ? this.getStackTrace() : null,
      
      // Error information
      error: requestData.error ? {
        message: requestData.error.message,
        type: requestData.error.constructor.name,
        code: requestData.error.code,
        stack: requestData.error.stack
      } : null,
      
      // Additional subsystem-specific data
      subsystemData: requestData.subsystemData || {},
      
      // Response payload (if configured)
      responsePayload: this.shouldCapturePayload(requestData) ? 
        this.sanitizePayload(requestData.responsePayload) : null
    };
    
    // Add to buffer
    this.logBuffer.push(logEntry);
    
    // Update stats
    this.updateStats(logEntry);
    
    // Emit real-time event
    if (this.config.realTimeStreaming) {
      this.emit('logEntry', logEntry);
    }
    
    // Flush if buffer is full
    if (this.logBuffer.length >= this.config.bufferSize) {
      await this.flushBuffer();
    }
    
    return logEntry.id;
  }
  
  /**
   * Generate unique request ID
   */
  generateRequestId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${this.subsystem}-${timestamp}-${random}`;
  }
  
  /**
   * Parse user agent string
   */
  parseUserAgent(userAgent) {
    if (!userAgent) return null;
    
    // Simple user agent parsing (can be enhanced with a library if needed)
    const patterns = {
      browser: /(?:Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/i,
      os: /(?:Windows|Mac OS|Linux|Android|iOS)[\s\w.]*/i,
      mobile: /Mobile|Android|iPhone|iPad/i
    };
    
    return {
      raw: userAgent,
      browser: (userAgent.match(patterns.browser) || [])[0] || 'Unknown',
      os: (userAgent.match(patterns.os) || [])[0] || 'Unknown',
      isMobile: patterns.mobile.test(userAgent)
    };
  }
  
  /**
   * Get caller information from stack trace
   */
  getCallerInfo() {
    const stack = new Error().stack;
    const lines = stack.split('\n');
    
    // Find the first line that's not from this file
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('detailed-logger.js')) {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1] || 'anonymous',
            file: path.basename(match[2] || ''),
            line: parseInt(match[3] || '0'),
            column: parseInt(match[4] || '0')
          };
        }
      }
    }
    
    return {
      function: 'unknown',
      file: 'unknown',
      line: 0,
      column: 0
    };
  }
  
  /**
   * Get full stack trace
   */
  getStackTrace() {
    const stack = new Error().stack;
    return stack.split('\n').slice(2).map(line => line.trim());
  }
  
  /**
   * Determine if response payload should be captured
   */
  shouldCapturePayload(requestData) {
    // Don't capture large payloads or binary content
    if (!requestData.responsePayload) return false;
    if (requestData.responseSize > 1024 * 1024) return false; // 1MB limit
    
    const contentType = requestData.responseHeaders?.['content-type'] || '';
    const textTypes = ['text/', 'application/json', 'application/xml'];
    
    return textTypes.some(type => contentType.includes(type));
  }
  
  /**
   * Sanitize response payload for logging
   */
  sanitizePayload(payload) {
    if (!payload) return null;
    
    try {
      // Truncate if too long
      const maxLength = 10000; // 10KB
      let sanitized = payload.toString();
      
      if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength) + '... [TRUNCATED]';
      }
      
      // Remove sensitive data patterns
      const sensitivePatterns = [
        /password["\s]*[:=]["\s]*[^"'\s,}]+/gi,
        /token["\s]*[:=]["\s]*[^"'\s,}]+/gi,
        /key["\s]*[:=]["\s]*[^"'\s,}]+/gi,
        /secret["\s]*[:=]["\s]*[^"'\s,}]+/gi
      ];
      
      sensitivePatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, match => {
          const parts = match.split(/[:=]/);
          return parts[0] + (parts[1] ? ':***REDACTED***' : '');
        });
      });
      
      return sanitized;
    } catch (error) {
      return '[PAYLOAD_SANITIZATION_ERROR]';
    }
  }
  
  /**
   * Update statistics
   */
  updateStats(logEntry) {
    this.stats.totalRequests++;
    this.stats.totalBytes += logEntry.responseSize || 0;
    
    if (logEntry.error || logEntry.statusCode >= 400) {
      this.stats.totalErrors++;
    }
  }
  
  /**
   * Setup log rotation
   */
  setupLogRotation() {
    // Check for date change every minute
    setInterval(() => {
      const currentDate = this.getCurrentDate();
      if (currentDate !== this.currentDate) {
        this.rotateLog();
        this.currentDate = currentDate;
      }
    }, 60000);
  }
  
  /**
   * Setup periodic buffer flush
   */
  setupBufferFlush() {
    setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flushBuffer();
      }
    }, this.config.flushInterval);
  }
  
  /**
   * Setup log cleanup for old files
   */
  setupLogCleanup() {
    // Run cleanup daily at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.cleanupOldLogs();
      // Then run daily
      setInterval(() => this.cleanupOldLogs(), 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
  }
  
  /**
   * Get current date string for log file naming
   */
  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }
  
  /**
   * Rotate log files
   */
  async rotateLog() {
    try {
      // Close current streams
      for (const [type, stream] of this.writeStreams) {
        stream.end();
      }
      this.writeStreams.clear();
      
      // Flush any remaining buffer
      await this.flushBuffer();
      
      this.emit('logRotated', { 
        subsystem: this.subsystem, 
        date: this.currentDate 
      });
    } catch (error) {
      this.emit('error', { 
        error: error.message, 
        operation: 'logRotation',
        subsystem: this.subsystem 
      });
    }
  }
  
  /**
   * Flush buffer to log files
   */
  async flushBuffer() {
    if (this.logBuffer.length === 0) return;
    
    try {
      const entries = [...this.logBuffer];
      this.logBuffer = [];
      
      // Group entries by type
      const requestEntries = entries.filter(e => !e.error);
      const errorEntries = entries.filter(e => e.error);
      
      // Write to appropriate log files
      if (requestEntries.length > 0) {
        await this.writeToLogFile('requests', requestEntries);
      }
      
      if (errorEntries.length > 0) {
        await this.writeToLogFile('errors', errorEntries);
      }
      
      // Write all entries to combined log
      await this.writeToLogFile('combined', entries);
      
    } catch (error) {
      this.emit('error', { 
        error: error.message, 
        operation: 'bufferFlush',
        subsystem: this.subsystem 
      });
    }
  }
  
  /**
   * Write entries to specific log file
   */
  async writeToLogFile(type, entries) {
    const filename = `${type}-${this.currentDate}.log`;
    const filepath = path.join(this.config.logDir, filename);
    
    let stream = this.writeStreams.get(type);
    if (!stream) {
      stream = createWriteStream(filepath, { flags: 'a' });
      this.writeStreams.set(type, stream);
    }
    
    for (const entry of entries) {
      const logLine = JSON.stringify(entry) + '\n';
      stream.write(logLine);
    }
  }
  
  /**
   * Clean up old log files
   */
  async cleanupOldLogs() {
    try {
      const files = await fs.readdir(this.config.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
      
      for (const file of files) {
        const filePath = path.join(this.config.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          // Compress before deletion if enabled
          if (this.config.compressionEnabled && !file.endsWith('.gz')) {
            await this.compressLogFile(filePath);
          } else {
            await fs.unlink(filePath);
          }
        }
      }
      
      this.emit('cleanupCompleted', { 
        subsystem: this.subsystem,
        cutoffDate: cutoffDate.toISOString()
      });
      
    } catch (error) {
      this.emit('error', { 
        error: error.message, 
        operation: 'cleanup',
        subsystem: this.subsystem 
      });
    }
  }
  
  /**
   * Compress log file
   */
  async compressLogFile(filePath) {
    return new Promise((resolve, reject) => {
      const gzip = zlib.createGzip();
      const source = require('fs').createReadStream(filePath);
      const destination = createWriteStream(filePath + '.gz');
      
      source.pipe(gzip).pipe(destination);
      
      destination.on('close', async () => {
        try {
          await fs.unlink(filePath); // Remove original
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      destination.on('error', reject);
    });
  }
  
  /**
   * Get logger statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    return {
      ...this.stats,
      uptime,
      requestsPerSecond: this.stats.totalRequests / (uptime / 1000),
      errorRate: this.stats.totalErrors / this.stats.totalRequests,
      bufferSize: this.logBuffer.length,
      activeStreams: this.writeStreams.size
    };
  }
  
  /**
   * Shutdown logger gracefully
   */
  async shutdown() {
    try {
      // Flush remaining buffer
      await this.flushBuffer();
      
      // Close all streams
      for (const [type, stream] of this.writeStreams) {
        stream.end();
      }
      this.writeStreams.clear();
      
      this.emit('shutdown', { subsystem: this.subsystem });
    } catch (error) {
      this.emit('error', { 
        error: error.message, 
        operation: 'shutdown',
        subsystem: this.subsystem 
      });
    }
  }
}

module.exports = DetailedLogger;