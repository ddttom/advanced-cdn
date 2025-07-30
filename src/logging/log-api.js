// logging/log-api.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, query, param, validationResult } = require('express-validator');

/**
 * RESTful Log Management API
 * Provides authenticated endpoints for log management, search, and analytics
 */
class LogAPI {
  constructor(config = {}) {
    this.config = {
      port: config.port || 8080,
      corsEnabled: config.corsEnabled !== false,
      rateLimitEnabled: config.rateLimitEnabled !== false,
      maxRequestsPerMinute: config.maxRequestsPerMinute || 100,
      maxSearchResults: config.maxSearchResults || 10000,
      maxDownloadSize: config.maxDownloadSize || 100 * 1024 * 1024, // 100MB
      ...config
    };
    
    this.app = express();
    this.server = null;
    this.logManager = null;
    this.isRunning = false;
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // CORS
    if (this.config.corsEnabled) {
      this.app.use(cors({
        origin: this.config.corsOrigin || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
      }));
    }
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Rate limiting
    if (this.config.rateLimitEnabled) {
      const limiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: this.config.maxRequestsPerMinute,
        message: {
          error: 'Too many requests',
          retryAfter: 60
        },
        standardHeaders: true,
        legacyHeaders: false
      });
      this.app.use('/api/', limiter);
    }
    
    // Authentication middleware
    this.app.use('/api/', this.authenticateRequest.bind(this));
    
    // Error handling middleware
    this.app.use(this.handleErrors.bind(this));
  }
  
  /**
   * Authentication middleware
   */
  authenticateRequest(req, res, next) {
    // Skip authentication for health check
    if (req.path === '/api/health') {
      return next();
    }
    
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Provide API key in X-API-Key header or Authorization header'
      });
    }
    
    const requiredPermission = this.getRequiredPermission(req.method, req.path);
    const authResult = this.logManager.authenticateRequest(apiKey, requiredPermission);
    
    if (!authResult.valid) {
      return res.status(403).json({
        error: 'Authentication failed',
        message: authResult.error
      });
    }
    
    req.auth = {
      apiKey,
      permissions: authResult.keyData.permissions,
      keyName: authResult.keyData.name
    };
    
    next();
  }
  
  /**
   * Get required permission for endpoint
   */
  getRequiredPermission(method, path) {
    if (method === 'GET') return 'read';
    if (method === 'POST' && path.includes('/search')) return 'read';
    if (method === 'DELETE') return 'delete';
    return 'write';
  }
  
  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });
    
    // Subsystem management
    this.app.get('/api/subsystems', this.getSubsystems.bind(this));
    this.app.get('/api/subsystems/:subsystem/stats', 
      param('subsystem').isString().notEmpty(),
      this.getSubsystemStats.bind(this)
    );
    
    // Log search and retrieval
    this.app.post('/api/logs/search',
      body('subsystems').optional().isArray(),
      body('searchText').optional().isString(),
      body('startDate').optional().isISO8601(),
      body('endDate').optional().isISO8601(),
      body('statusCodes').optional().isArray(),
      body('methods').optional().isArray(),
      body('clientIps').optional().isArray(),
      body('limit').optional().isInt({ min: 1, max: this.config.maxSearchResults }),
      body('offset').optional().isInt({ min: 0 }),
      this.searchLogs.bind(this)
    );
    
    this.app.get('/api/logs/:subsystem',
      param('subsystem').isString().notEmpty(),
      query('limit').optional().isInt({ min: 1, max: 1000 }),
      query('offset').optional().isInt({ min: 0 }),
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601(),
      this.getSubsystemLogs.bind(this)
    );
    
    // Log analytics
    this.app.get('/api/analytics/overview', this.getAnalyticsOverview.bind(this));
    this.app.get('/api/analytics/:subsystem',
      param('subsystem').isString().notEmpty(),
      query('period').optional().isIn(['hour', 'day', 'week', 'month']),
      this.getSubsystemAnalytics.bind(this)
    );
    
    // Log downloads
    this.app.post('/api/logs/download',
      body('subsystems').optional().isArray(),
      body('format').isIn(['json', 'csv', 'txt']),
      body('startDate').optional().isISO8601(),
      body('endDate').optional().isISO8601(),
      body('filters').optional().isObject(),
      this.downloadLogs.bind(this)
    );
    
    // Log management
    this.app.delete('/api/logs/:subsystem',
      param('subsystem').isString().notEmpty(),
      body('startDate').optional().isISO8601(),
      body('endDate').optional().isISO8601(),
      body('statusCodes').optional().isArray(),
      body('force').optional().isBoolean(),
      this.clearSubsystemLogs.bind(this)
    );
    
    this.app.delete('/api/logs',
      body('confirm').equals('MASTER_RESET'),
      this.masterReset.bind(this)
    );
    
    // API key management
    this.app.get('/api/keys', this.getApiKeys.bind(this));
    this.app.post('/api/keys',
      body('name').isString().notEmpty(),
      body('permissions').isArray().custom(perms => 
        perms.every(p => ['read', 'write', 'delete'].includes(p))
      ),
      this.createApiKey.bind(this)
    );
    this.app.delete('/api/keys/:keyId',
      param('keyId').isString().notEmpty(),
      this.revokeApiKey.bind(this)
    );
    
    // System statistics
    this.app.get('/api/stats', this.getSystemStats.bind(this));
    this.app.get('/api/stats/performance', this.getPerformanceStats.bind(this));
  }
  
  /**
   * Get all subsystems
   */
  async getSubsystems(req, res) {
    try {
      const subsystems = this.logManager.getSubsystems();
      const subsystemData = [];
      
      for (const subsystem of subsystems) {
        const logger = this.logManager.getSubsystemLogger(subsystem);
        const stats = logger ? logger.getStats() : {};
        
        subsystemData.push({
          name: subsystem,
          ...stats
        });
      }
      
      res.json({
        subsystems: subsystemData,
        total: subsystems.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get subsystem statistics
   */
  async getSubsystemStats(req, res) {
    try {
      const { subsystem } = req.params;
      const logger = this.logManager.getSubsystemLogger(subsystem);
      
      if (!logger) {
        return res.status(404).json({ error: 'Subsystem not found' });
      }
      
      const stats = logger.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Search logs across subsystems
   */
  async searchLogs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const searchQuery = {
        subsystems: req.body.subsystems,
        searchText: req.body.searchText,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        statusCodes: req.body.statusCodes,
        methods: req.body.methods,
        clientIps: req.body.clientIps,
        limit: req.body.limit || 100,
        offset: req.body.offset || 0
      };
      
      const result = await this.logManager.searchLogs(searchQuery);
      
      res.json({
        ...result,
        searchQuery,
        executedAt: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get logs for specific subsystem
   */
  async getSubsystemLogs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { subsystem } = req.params;
      const { limit = 100, offset = 0, startDate, endDate } = req.query;
      
      const searchQuery = {
        subsystems: [subsystem],
        startDate,
        endDate,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
      const result = await this.logManager.searchLogs(searchQuery);
      
      res.json({
        subsystem,
        ...result
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get analytics overview
   */
  async getAnalyticsOverview(req, res) {
    try {
      const stats = await this.logManager.getStats();
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Get recent activity
      const recentActivity = await this.logManager.searchLogs({
        startDate: hourAgo.toISOString(),
        limit: 1000
      });
      
      // Calculate metrics
      const metrics = this.calculateMetrics(recentActivity.results);
      
      res.json({
        overview: stats,
        recentActivity: {
          totalRequests: recentActivity.total,
          period: 'last_hour',
          ...metrics
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get subsystem analytics
   */
  async getSubsystemAnalytics(req, res) {
    try {
      const { subsystem } = req.params;
      const { period = 'day' } = req.query;
      
      const logger = this.logManager.getSubsystemLogger(subsystem);
      if (!logger) {
        return res.status(404).json({ error: 'Subsystem not found' });
      }
      
      const periodMs = this.getPeriodMs(period);
      const startDate = new Date(Date.now() - periodMs);
      
      const logs = await this.logManager.searchLogs({
        subsystems: [subsystem],
        startDate: startDate.toISOString(),
        limit: 10000
      });
      
      const analytics = this.generateAnalytics(logs.results, period);
      
      res.json({
        subsystem,
        period,
        analytics,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Download logs in various formats
   */
  async downloadLogs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { format, subsystems, startDate, endDate, filters = {} } = req.body;
      
      const searchQuery = {
        subsystems,
        startDate,
        endDate,
        ...filters,
        limit: this.config.maxSearchResults
      };
      
      const result = await this.logManager.searchLogs(searchQuery);
      
      // Check size limit
      const estimatedSize = JSON.stringify(result.results).length;
      if (estimatedSize > this.config.maxDownloadSize) {
        return res.status(413).json({
          error: 'Download too large',
          estimatedSize,
          maxSize: this.config.maxDownloadSize,
          suggestion: 'Use more specific filters or smaller date range'
        });
      }
      
      const filename = `logs-${Date.now()}.${format}`;
      const content = this.formatLogsForDownload(result.results, format);
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', this.getContentType(format));
      res.send(content);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Clear logs for specific subsystem
   */
  async clearSubsystemLogs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { subsystem } = req.params;
      const criteria = {
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        statusCodes: req.body.statusCodes,
        force: req.body.force || false
      };
      
      const result = await this.logManager.clearSubsystemLogs(subsystem, criteria);
      
      res.json({
        subsystem,
        ...result,
        clearedAt: new Date().toISOString(),
        clearedBy: req.auth.keyName
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Master reset - clear all logs
   */
  async masterReset(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const results = await this.logManager.masterReset();
      
      res.json({
        message: 'Master reset completed',
        results,
        resetAt: new Date().toISOString(),
        resetBy: req.auth.keyName
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get API keys (without revealing actual keys)
   */
  async getApiKeys(req, res) {
    try {
      const keys = [];
      
      for (const [key, data] of this.logManager.config.apiKeys) {
        keys.push({
          id: key.substring(0, 8) + '...',
          name: data.name,
          permissions: data.permissions,
          createdAt: data.createdAt
        });
      }
      
      res.json({ keys });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Create new API key
   */
  async createApiKey(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { name, permissions } = req.body;
      const keyData = await this.logManager.createApiKey(name, permissions);
      
      res.status(201).json({
        message: 'API key created successfully',
        ...keyData,
        warning: 'Store this key securely. It will not be shown again.'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Revoke API key
   */
  async revokeApiKey(req, res) {
    try {
      const { keyId } = req.params;
      
      // Find full key by partial ID
      let fullKey = null;
      for (const key of this.logManager.config.apiKeys.keys()) {
        if (key.startsWith(keyId)) {
          fullKey = key;
          break;
        }
      }
      
      if (!fullKey) {
        return res.status(404).json({ error: 'API key not found' });
      }
      
      const keyData = await this.logManager.revokeApiKey(fullKey);
      
      res.json({
        message: 'API key revoked successfully',
        revokedKey: {
          name: keyData.name,
          permissions: keyData.permissions
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get system statistics
   */
  async getSystemStats(req, res) {
    try {
      const stats = await this.logManager.getStats();
      
      res.json({
        ...stats,
        api: {
          port: this.config.port,
          uptime: this.isRunning ? Date.now() - this.startTime : 0,
          rateLimitEnabled: this.config.rateLimitEnabled,
          maxRequestsPerMinute: this.config.maxRequestsPerMinute
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get performance statistics
   */
  async getPerformanceStats(req, res) {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      res.json({
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Calculate metrics from log entries
   */
  calculateMetrics(entries) {
    const metrics = {
      errorRate: 0,
      averageResponseTime: 0,
      statusCodeDistribution: {},
      methodDistribution: {},
      topClientIps: {},
      topUserAgents: {}
    };
    
    if (entries.length === 0) return metrics;
    
    let totalResponseTime = 0;
    let errorCount = 0;
    
    for (const entry of entries) {
      // Error rate
      if (entry.statusCode >= 400) {
        errorCount++;
      }
      
      // Response time
      if (entry.responseTime) {
        totalResponseTime += entry.responseTime;
      }
      
      // Status codes
      const status = entry.statusCode?.toString() || 'unknown';
      metrics.statusCodeDistribution[status] = (metrics.statusCodeDistribution[status] || 0) + 1;
      
      // Methods
      metrics.methodDistribution[entry.method] = (metrics.methodDistribution[entry.method] || 0) + 1;
      
      // Client IPs
      if (entry.clientIp) {
        metrics.topClientIps[entry.clientIp] = (metrics.topClientIps[entry.clientIp] || 0) + 1;
      }
      
      // User agents
      if (entry.userAgent) {
        const ua = entry.userAgent.substring(0, 50); // Truncate for grouping
        metrics.topUserAgents[ua] = (metrics.topUserAgents[ua] || 0) + 1;
      }
    }
    
    metrics.errorRate = (errorCount / entries.length) * 100;
    metrics.averageResponseTime = totalResponseTime / entries.length;
    
    return metrics;
  }
  
  /**
   * Generate analytics for a period
   */
  generateAnalytics(entries, period) {
    const analytics = {
      totalRequests: entries.length,
      timeline: {},
      metrics: this.calculateMetrics(entries)
    };
    
    // Group by time buckets
    const bucketSize = this.getBucketSize(period);
    
    for (const entry of entries) {
      const bucket = this.getTimeBucket(entry.timestamp, bucketSize);
      if (!analytics.timeline[bucket]) {
        analytics.timeline[bucket] = { requests: 0, errors: 0 };
      }
      
      analytics.timeline[bucket].requests++;
      if (entry.statusCode >= 400) {
        analytics.timeline[bucket].errors++;
      }
    }
    
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
   * Format logs for download
   */
  formatLogsForDownload(entries, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(entries, null, 2);
        
      case 'csv':
        if (entries.length === 0) return '';
        
        const headers = Object.keys(entries[0]).join(',');
        const rows = entries.map(entry => 
          Object.values(entry).map(val => 
            typeof val === 'object' ? JSON.stringify(val) : val
          ).join(',')
        );
        return [headers, ...rows].join('\n');
        
      case 'txt':
        return entries.map(entry => 
          `[${entry.timestamp}] ${entry.method} ${entry.url} - ${entry.statusCode} - ${entry.clientIp}`
        ).join('\n');
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
  
  /**
   * Get content type for format
   */
  getContentType(format) {
    const types = {
      json: 'application/json',
      csv: 'text/csv',
      txt: 'text/plain'
    };
    return types[format] || 'application/octet-stream';
  }
  
  /**
   * Error handling middleware
   */
  handleErrors(error, req, res, next) {
    console.error('API Error:', error);
    
    if (res.headersSent) {
      return next(error);
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Initialize the API server
   */
  async initialize(logManager) {
    try {
      this.logManager = logManager;
      this.startTime = Date.now();
      
      this.server = this.app.listen(this.config.port, () => {
        this.isRunning = true;
        console.log(`Log API server started on port ${this.config.port}`);
      });
      
      return this.server;
    } catch (error) {
      console.error('Failed to start Log API server:', error);
      throw error;
    }
  }
  
  /**
   * Shutdown the API server
   */
  async shutdown() {
    try {
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        this.isRunning = false;
        console.log('Log API server shut down');
      }
    } catch (error) {
      console.error('Error shutting down Log API server:', error);
    }
  }
}

module.exports = LogAPI;