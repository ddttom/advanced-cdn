// logging/log-manager.js
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const DetailedLogger = require('./detailed-logger');

/**
 * Centralized Log Management System
 * Manages all subsystem loggers with authentication and aggregation
 */
class LogManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      logDir: config.logDir || path.join(process.cwd(), 'logs'),
      apiKeys: config.apiKeys || new Map(),
      retentionDays: config.retentionDays || 30,
      compressionEnabled: config.compressionEnabled !== false,
      realTimeStreaming: config.realTimeStreaming !== false,
      maxSearchResults: config.maxSearchResults || 10000,
      auditLogEnabled: config.auditLogEnabled !== false,
      ...config
    };
    
    this.subsystemLoggers = new Map();
    this.activeStreams = new Map();
    this.searchIndexes = new Map();
    this.auditLogger = null;
    
    this.initialize();
  }
  
  /**
   * Initialize the log management system
   */
  async initialize() {
    try {
      // Ensure main log directory exists
      await fs.mkdir(this.config.logDir, { recursive: true });
      
      // Initialize audit logger if enabled
      if (this.config.auditLogEnabled) {
        this.auditLogger = new DetailedLogger('audit', {
          logDir: path.join(this.config.logDir, 'audit'),
          realTimeStreaming: false
        });
        await this.auditLogger.initialize();
      }
      
      // Generate default API key if none exist
      if (this.config.apiKeys.size === 0) {
        const defaultKey = this.generateApiKey();
        this.config.apiKeys.set(defaultKey, {
          name: 'default',
          permissions: ['read', 'write', 'delete'],
          createdAt: new Date().toISOString()
        });
        console.log(`Generated default API key: ${defaultKey}`);
      }
      
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { error: error.message, operation: 'initialization' });
    }
  }
  
  /**
   * Register a subsystem logger
   */
  async registerSubsystem(subsystemName, config = {}) {
    try {
      const loggerConfig = {
        logDir: path.join(this.config.logDir, subsystemName),
        retentionDays: this.config.retentionDays,
        compressionEnabled: this.config.compressionEnabled,
        realTimeStreaming: this.config.realTimeStreaming,
        ...config
      };
      
      const logger = new DetailedLogger(subsystemName, loggerConfig);
      await logger.initialize();
      
      // Forward events
      logger.on('logEntry', (entry) => {
        this.emit('logEntry', { subsystem: subsystemName, entry });
        this.updateSearchIndex(subsystemName, entry);
      });
      
      logger.on('error', (error) => {
        this.emit('error', { ...error, subsystem: subsystemName });
      });
      
      this.subsystemLoggers.set(subsystemName, logger);
      
      // Log registration in audit log
      if (this.auditLogger) {
        await this.auditLogger.logRequest({
          method: 'REGISTER',
          url: `/subsystem/${subsystemName}`,
          statusCode: 200,
          subsystemData: { operation: 'subsystem_registration', config: loggerConfig }
        });
      }
      
      this.emit('subsystemRegistered', { subsystem: subsystemName });
      return logger;
    } catch (error) {
      this.emit('error', { error: error.message, operation: 'registerSubsystem', subsystem: subsystemName });
      throw error;
    }
  }
  
  /**
   * Get subsystem logger
   */
  getSubsystemLogger(subsystemName) {
    return this.subsystemLoggers.get(subsystemName);
  }
  
  /**
   * Get all registered subsystems
   */
  getSubsystems() {
    return Array.from(this.subsystemLoggers.keys());
  }
  
  /**
   * Authenticate API request
   */
  authenticateRequest(apiKey, requiredPermission = 'read') {
    const keyData = this.config.apiKeys.get(apiKey);
    if (!keyData) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    if (!keyData.permissions.includes(requiredPermission)) {
      return { valid: false, error: `Insufficient permissions. Required: ${requiredPermission}` };
    }
    
    return { valid: true, keyData };
  }
  
  /**
   * Generate new API key
   */
  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Create new API key
   */
  async createApiKey(name, permissions = ['read']) {
    const apiKey = this.generateApiKey();
    const keyData = {
      name,
      permissions,
      createdAt: new Date().toISOString()
    };
    
    this.config.apiKeys.set(apiKey, keyData);
    
    // Log in audit
    if (this.auditLogger) {
      await this.auditLogger.logRequest({
        method: 'CREATE',
        url: '/api-key',
        statusCode: 201,
        subsystemData: { operation: 'api_key_creation', name, permissions }
      });
    }
    
    return { apiKey, ...keyData };
  }
  
  /**
   * Revoke API key
   */
  async revokeApiKey(apiKey) {
    const keyData = this.config.apiKeys.get(apiKey);
    if (!keyData) {
      throw new Error('API key not found');
    }
    
    this.config.apiKeys.delete(apiKey);
    
    // Log in audit
    if (this.auditLogger) {
      await this.auditLogger.logRequest({
        method: 'DELETE',
        url: '/api-key',
        statusCode: 200,
        subsystemData: { operation: 'api_key_revocation', name: keyData.name }
      });
    }
    
    return keyData;
  }
  
  /**
   * Update search index for fast searching
   */
  updateSearchIndex(subsystem, entry) {
    if (!this.searchIndexes.has(subsystem)) {
      this.searchIndexes.set(subsystem, []);
    }
    
    const index = this.searchIndexes.get(subsystem);
    
    // Create searchable text
    const searchableText = [
      entry.method,
      entry.url,
      entry.path,
      entry.clientIp,
      entry.userAgent,
      entry.statusCode?.toString(),
      entry.error?.message,
      JSON.stringify(entry.subsystemData)
    ].filter(Boolean).join(' ').toLowerCase();
    
    index.push({
      id: entry.id,
      timestamp: entry.timestamp,
      searchText: searchableText,
      entry: entry
    });
    
    // Keep index size manageable
    if (index.length > this.config.maxSearchResults) {
      index.shift();
    }
  }
  
  /**
   * Search logs across subsystems
   */
  async searchLogs(query = {}) {
    const {
      subsystems = this.getSubsystems(),
      searchText = '',
      startDate,
      endDate,
      statusCodes = [],
      clientIps = [],
      methods = [],
      limit = 1000,
      offset = 0
    } = query;
    
    let results = [];
    
    // Search in memory indexes first (recent entries)
    for (const subsystem of subsystems) {
      const index = this.searchIndexes.get(subsystem) || [];
      
      for (const item of index) {
        if (this.matchesSearchCriteria(item, {
          searchText,
          startDate,
          endDate,
          statusCodes,
          clientIps,
          methods
        })) {
          results.push({
            subsystem,
            ...item.entry
          });
        }
      }
    }
    
    // Search in log files for older entries if needed
    if (results.length < limit && (startDate || endDate)) {
      const fileResults = await this.searchLogFiles(query);
      results = results.concat(fileResults);
    }
    
    // Sort by timestamp (newest first)
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);
    
    return {
      results: paginatedResults,
      total: results.length,
      limit,
      offset,
      hasMore: results.length > offset + limit
    };
  }
  
  /**
   * Check if log entry matches search criteria
   */
  matchesSearchCriteria(item, criteria) {
    const { searchText, startDate, endDate, statusCodes, clientIps, methods } = criteria;
    const entry = item.entry;
    
    // Text search
    if (searchText && !item.searchText.includes(searchText.toLowerCase())) {
      return false;
    }
    
    // Date range
    const entryDate = new Date(entry.timestamp);
    if (startDate && entryDate < new Date(startDate)) {
      return false;
    }
    if (endDate && entryDate > new Date(endDate)) {
      return false;
    }
    
    // Status codes
    if (statusCodes.length > 0 && !statusCodes.includes(entry.statusCode)) {
      return false;
    }
    
    // Client IPs
    if (clientIps.length > 0 && !clientIps.includes(entry.clientIp)) {
      return false;
    }
    
    // Methods
    if (methods.length > 0 && !methods.includes(entry.method)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Search in log files
   */
  async searchLogFiles(query) {
    const results = [];
    const { subsystems = this.getSubsystems(), startDate, endDate } = query;
    
    for (const subsystem of subsystems) {
      const subsystemDir = path.join(this.config.logDir, subsystem);
      
      try {
        const files = await fs.readdir(subsystemDir);
        const logFiles = files.filter(f => f.endsWith('.log') && !f.startsWith('audit'));
        
        for (const file of logFiles) {
          // Check if file date is in range
          const fileDate = this.extractDateFromFilename(file);
          if (fileDate && this.isDateInRange(fileDate, startDate, endDate)) {
            const filePath = path.join(subsystemDir, file);
            const fileResults = await this.searchInLogFile(filePath, query);
            results.push(...fileResults.map(r => ({ ...r, subsystem })));
          }
        }
      } catch (error) {
        // Skip if subsystem directory doesn't exist
        continue;
      }
    }
    
    return results;
  }
  
  /**
   * Search in a specific log file
   */
  async searchInLogFile(filePath, query) {
    const results = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const item = { entry, searchText: this.createSearchText(entry) };
          
          if (this.matchesSearchCriteria(item, query)) {
            results.push(entry);
          }
        } catch (parseError) {
          // Skip invalid JSON lines
          continue;
        }
      }
    } catch (error) {
      // Skip if file can't be read
    }
    
    return results;
  }
  
  /**
   * Create searchable text from entry
   */
  createSearchText(entry) {
    return [
      entry.method,
      entry.url,
      entry.path,
      entry.clientIp,
      entry.userAgent,
      entry.statusCode?.toString(),
      entry.error?.message,
      JSON.stringify(entry.subsystemData)
    ].filter(Boolean).join(' ').toLowerCase();
  }
  
  /**
   * Extract date from log filename
   */
  extractDateFromFilename(filename) {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  
  /**
   * Check if date is in range
   */
  isDateInRange(dateStr, startDate, endDate) {
    const date = new Date(dateStr);
    if (startDate && date < new Date(startDate)) return false;
    if (endDate && date > new Date(endDate)) return false;
    return true;
  }
  
  /**
   * Clear logs for specific subsystem
   */
  async clearSubsystemLogs(subsystem, criteria = {}) {
    const logger = this.subsystemLoggers.get(subsystem);
    if (!logger) {
      throw new Error(`Subsystem '${subsystem}' not found`);
    }
    
    const { startDate, endDate, statusCodes = [], force = false } = criteria;
    
    // Clear in-memory index
    if (this.searchIndexes.has(subsystem)) {
      const index = this.searchIndexes.get(subsystem);
      const originalLength = index.length;
      
      if (force) {
        this.searchIndexes.set(subsystem, []);
      } else {
        const filtered = index.filter(item => {
          return !this.matchesSearchCriteria(item, { startDate, endDate, statusCodes });
        });
        this.searchIndexes.set(subsystem, filtered);
      }
      
      const clearedCount = originalLength - (this.searchIndexes.get(subsystem)?.length || 0);
      
      // Log in audit
      if (this.auditLogger) {
        await this.auditLogger.logRequest({
          method: 'DELETE',
          url: `/logs/${subsystem}`,
          statusCode: 200,
          subsystemData: { 
            operation: 'log_clearing', 
            criteria, 
            clearedCount,
            type: 'memory_index'
          }
        });
      }
      
      return { clearedCount, type: 'memory' };
    }
    
    return { clearedCount: 0, type: 'memory' };
  }
  
  /**
   * Master reset - clear all logs
   */
  async masterReset() {
    const results = [];
    
    // Clear all subsystem logs
    for (const subsystem of this.getSubsystems()) {
      try {
        const result = await this.clearSubsystemLogs(subsystem, { force: true });
        results.push({ subsystem, ...result });
      } catch (error) {
        results.push({ subsystem, error: error.message });
      }
    }
    
    // Clear search indexes
    this.searchIndexes.clear();
    
    // Log master reset in audit
    if (this.auditLogger) {
      await this.auditLogger.logRequest({
        method: 'DELETE',
        url: '/logs/master-reset',
        statusCode: 200,
        subsystemData: { 
          operation: 'master_reset', 
          subsystemsCleared: results.length,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    this.emit('masterReset', { results });
    return results;
  }
  
  /**
   * Get comprehensive statistics
   */
  async getStats() {
    const stats = {
      subsystems: {},
      total: {
        requests: 0,
        errors: 0,
        bytes: 0
      },
      apiKeys: this.config.apiKeys.size,
      searchIndexSize: 0
    };
    
    // Collect stats from each subsystem
    for (const [name, logger] of this.subsystemLoggers) {
      const loggerStats = logger.getStats();
      stats.subsystems[name] = loggerStats;
      
      stats.total.requests += loggerStats.totalRequests;
      stats.total.errors += loggerStats.totalErrors;
      stats.total.bytes += loggerStats.totalBytes;
    }
    
    // Search index stats
    for (const [subsystem, index] of this.searchIndexes) {
      stats.searchIndexSize += index.length;
    }
    
    return stats;
  }
  
  /**
   * Shutdown all loggers
   */
  async shutdown() {
    try {
      // Shutdown all subsystem loggers
      for (const [name, logger] of this.subsystemLoggers) {
        await logger.shutdown();
      }
      
      // Shutdown audit logger
      if (this.auditLogger) {
        await this.auditLogger.shutdown();
      }
      
      this.emit('shutdown');
    } catch (error) {
      this.emit('error', { error: error.message, operation: 'shutdown' });
    }
  }
}

module.exports = LogManager;