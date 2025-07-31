// dashboard/api/dashboard-api.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const APIDiscoveryService = require('./discovery');
const logger = require('../../logger').getModuleLogger('dashboard-api');

/**
 * Dashboard API Router
 * Provides RESTful endpoints for API discovery, management, and documentation
 */
class DashboardAPI {
  constructor() {
    this.router = express.Router();
    this.discoveryService = new APIDiscoveryService();
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeDiscoveryService();
  }

  /**
   * Initialize the discovery service
   */
  async initializeDiscoveryService() {
    try {
      await this.discoveryService.initialize();
    } catch (error) {
      logger.error('Failed to initialize discovery service', { error: error.message });
    }
  }

  /**
   * Setup middleware for dashboard API
   */
  setupMiddleware() {
    // JSON parsing
    this.router.use(express.json());
    
    // Request logging
    this.router.use((req, res, next) => {
      logger.debug(`Dashboard API: ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });

    // CORS headers for dashboard
    this.router.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // API Discovery endpoints
    this.router.get('/api/discovery/endpoints', this.getEndpoints.bind(this));
    this.router.get('/api/discovery/endpoints/:category', this.getEndpointsByCategory.bind(this));
    this.router.get('/api/discovery/categories', this.getCategories.bind(this));
    this.router.get('/api/discovery/stats', this.getDiscoveryStats.bind(this));
    this.router.post('/api/discovery/scan', this.triggerScan.bind(this));

    // OpenAPI documentation
    this.router.get('/api/docs/openapi.json', this.getOpenAPISpec.bind(this));
    this.router.get('/api/docs/openapi.yaml', this.getOpenAPISpecYAML.bind(this));

    // API testing endpoints
    this.router.post('/api/test/endpoint', this.testEndpoint.bind(this));
    this.router.get('/api/test/health', this.testAllHealthEndpoints.bind(this));

    // Dashboard management
    this.router.get('/api/dashboard/status', this.getDashboardStatus.bind(this));
    this.router.get('/api/dashboard/config', this.getDashboardConfig.bind(this));

    // Cache management
    this.router.get('/api/cache/keys', this.getCacheKeys.bind(this));

    // Log management
    this.router.get('/api/logs/files', this.getLogFiles.bind(this));
    this.router.get('/api/logs/files/:filename', this.getLogFile.bind(this));
    this.router.get('/api/logs/download/:filename', this.downloadLogFile.bind(this));
    this.router.get('/api/logs/stream', this.getLogStream.bind(this));
    this.router.post('/api/logs/search', this.searchLogs.bind(this));
    this.router.get('/api/logs/stream/stats', this.getLogStreamStats.bind(this));

    // Serve dashboard frontend
    this.router.get('/', this.serveDashboard.bind(this));
    this.router.use('/static', express.static(path.join(__dirname, '../public')));
  }

  /**
   * Get all discovered endpoints
   */
  async getEndpoints(req, res) {
    try {
      const endpoints = this.discoveryService.getAllEndpoints();
      res.json({
        success: true,
        data: endpoints,
        meta: {
          total: endpoints.length,
          lastScan: this.discoveryService.lastScan
        }
      });
    } catch (error) {
      logger.error('Error getting endpoints', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve endpoints'
      });
    }
  }

  /**
   * Get endpoints by category
   */
  async getEndpointsByCategory(req, res) {
    try {
      const { category } = req.params;
      const endpoints = this.discoveryService.getEndpointsByCategory(category);
      
      res.json({
        success: true,
        data: endpoints,
        meta: {
          category,
          total: endpoints.length
        }
      });
    } catch (error) {
      logger.error('Error getting endpoints by category', { 
        category: req.params.category,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve endpoints by category'
      });
    }
  }

  /**
   * Get all categories
   */
  async getCategories(req, res) {
    try {
      const categories = this.discoveryService.getCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Error getting categories', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve categories'
      });
    }
  }

  /**
   * Get discovery statistics
   */
  async getDiscoveryStats(req, res) {
    try {
      const stats = this.discoveryService.getStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting discovery stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve discovery statistics'
      });
    }
  }

  /**
   * Trigger manual endpoint scan
   */
  async triggerScan(req, res) {
    try {
      await this.discoveryService.scanForEndpoints();
      const stats = this.discoveryService.getStats();
      
      res.json({
        success: true,
        message: 'Endpoint scan completed',
        data: stats
      });
    } catch (error) {
      logger.error('Error triggering scan', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to trigger endpoint scan'
      });
    }
  }

  /**
   * Get OpenAPI specification in JSON format
   */
  async getOpenAPISpec(req, res) {
    try {
      const spec = this.discoveryService.generateOpenAPISpec();
      res.json(spec);
    } catch (error) {
      logger.error('Error generating OpenAPI spec', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to generate OpenAPI specification'
      });
    }
  }

  /**
   * Get OpenAPI specification in YAML format
   */
  async getOpenAPISpecYAML(req, res) {
    try {
      const spec = this.discoveryService.generateOpenAPISpec();
      const yaml = this.convertToYAML(spec);
      
      res.setHeader('Content-Type', 'application/x-yaml');
      res.send(yaml);
    } catch (error) {
      logger.error('Error generating OpenAPI YAML', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to generate OpenAPI YAML'
      });
    }
  }

  /**
   * Test a specific endpoint
   */
  async testEndpoint(req, res) {
    try {
      logger.debug('Test endpoint request received', { body: req.body });
      
      const { method, path, headers = {}, parameters = {} } = req.body;
      
      if (!method || !path) {
        logger.warn('Missing method or path in test request', { method, path });
        return res.status(400).json({
          success: false,
          error: 'Method and path are required'
        });
      }

      // Process parameters to build the actual request
      let finalPath = path;
      let requestHeaders = { ...headers };
      let requestBody = null;

      logger.debug('Processing parameters', { parameters });

      // Handle path parameters
      if (parameters.path) {
        logger.debug('Processing path parameters', { pathParams: parameters.path });
        Object.entries(parameters.path).forEach(([key, value]) => {
          const oldPath = finalPath;
          finalPath = finalPath.replace(`:${key}`, encodeURIComponent(value));
          logger.debug('Path parameter replacement', { key, value, oldPath, newPath: finalPath });
        });
      }

      // Handle query parameters
      if (parameters.query && Object.keys(parameters.query).length > 0) {
        logger.debug('Processing query parameters', { queryParams: parameters.query });
        const queryParams = new URLSearchParams();
        Object.entries(parameters.query).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            queryParams.append(key, value);
            logger.debug('Added query parameter', { key, value });
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          finalPath += (finalPath.includes('?') ? '&' : '?') + queryString;
          logger.debug('Final path with query string', { finalPath });
        }
      }

      // Handle body parameters
      if (parameters._body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        logger.debug('Processing body parameters', { bodyParams: parameters._body });
        requestHeaders['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(parameters._body);
        logger.debug('Request body prepared', { bodyLength: requestBody.length });
      }

      logger.info('Making test request', { 
        method, 
        originalPath: path, 
        finalPath, 
        headers: requestHeaders, 
        hasBody: !!requestBody,
        bodyLength: requestBody ? requestBody.length : 0
      });
      
      // Make internal request to test endpoint
      const testResult = await this.makeTestRequest(method, finalPath, requestHeaders, requestBody);
      
      logger.info('Test request completed successfully', { 
        statusCode: testResult.statusCode,
        responseTime: testResult.responseTime,
        bodyLength: testResult.body ? testResult.body.length : 0
      });
      
      res.json({
        success: true,
        data: testResult
      });
    } catch (error) {
      logger.error('Error testing endpoint', { 
        error: error.message, 
        stack: error.stack,
        body: req.body,
        url: req.url,
        method: req.method
      });
      res.status(500).json({
        success: false,
        error: `Failed to test endpoint: ${error.message}`,
        details: error.stack
      });
    }
  }

  /**
   * Test all health endpoints
   */
  async testAllHealthEndpoints(req, res) {
    try {
      const healthEndpoints = this.discoveryService.getEndpointsByCategory('monitoring');
      const results = [];

      for (const endpoint of healthEndpoints) {
        try {
          const result = await this.makeTestRequest(endpoint.method, endpoint.path);
          results.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            status: 'success',
            responseTime: result.responseTime,
            statusCode: result.statusCode
          });
        } catch (error) {
          results.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            status: 'error',
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Error testing health endpoints', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to test health endpoints'
      });
    }
  }

  /**
   * Get dashboard status
   */
  async getDashboardStatus(req, res) {
    try {
      const status = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        discovery: this.discoveryService.getStats()
      };

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Error getting dashboard status', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard status'
      });
    }
  }

  /**
   * Get dashboard configuration
   */
  async getDashboardConfig(req, res) {
    try {
      const config = {
        apiDiscovery: {
          scanInterval: this.discoveryService.scanInterval,
          lastScan: this.discoveryService.lastScan
        },
        features: {
          realTimeMonitoring: true,
          apiTesting: true,
          documentation: true
        }
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Error getting dashboard config', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard configuration'
      });
    }
  }

  /**
   * Get cache keys from all cache systems
   */
  async getCacheKeys(req, res) {
    try {
      const { pattern } = req.query;
      
      // Make internal request to the main cache keys API
      const result = await this.makeTestRequest('GET', `/api/cache/keys${pattern ? `?pattern=${encodeURIComponent(pattern)}` : ''}`);
      
      if (result.statusCode === 200) {
        const data = JSON.parse(result.body);
        res.json(data);
      } else {
        res.status(result.statusCode).json({
          success: false,
          error: 'Failed to retrieve cache keys'
        });
      }
    } catch (error) {
      logger.error('Error getting cache keys', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cache keys'
      });
    }
  }

  /**
   * Get log files
   */
  async getLogFiles(req, res) {
    try {
      const result = await this.makeTestRequest('GET', '/api/logs/files');
      
      if (result.statusCode === 200) {
        const data = JSON.parse(result.body);
        res.json(data);
      } else {
        res.status(result.statusCode).json({
          success: false,
          error: 'Failed to retrieve log files'
        });
      }
    } catch (error) {
      logger.error('Error getting log files', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve log files'
      });
    }
  }

  /**
   * Get specific log file
   */
  async getLogFile(req, res) {
    try {
      const { filename } = req.params;
      const queryParams = new URLSearchParams(req.query);
      const result = await this.makeTestRequest('GET', `/api/logs/files/${filename}?${queryParams}`);
      
      if (result.statusCode === 200) {
        const data = JSON.parse(result.body);
        res.json(data);
      } else {
        res.status(result.statusCode).json({
          success: false,
          error: 'Failed to retrieve log file'
        });
      }
    } catch (error) {
      logger.error('Error getting log file', { 
        filename: req.params.filename,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve log file'
      });
    }
  }

  /**
   * Search logs
   */
  async searchLogs(req, res) {
    try {
      const result = await this.makeTestRequest('POST', '/api/logs/search', {
        'Content-Type': 'application/json'
      }, JSON.stringify(req.body));
      
      if (result.statusCode === 200) {
        const data = JSON.parse(result.body);
        res.json(data);
      } else {
        res.status(result.statusCode).json({
          success: false,
          error: 'Failed to search logs'
        });
      }
    } catch (error) {
      logger.error('Error searching logs', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to search logs'
      });
    }
  }

  /**
   * Get log stream statistics
   */
  async getLogStreamStats(req, res) {
    try {
      const result = await this.makeTestRequest('GET', '/api/logs/stream/stats');
      
      if (result.statusCode === 200) {
        const data = JSON.parse(result.body);
        res.json(data);
      } else {
        res.status(result.statusCode).json({
          success: false,
          error: 'Failed to retrieve log stream statistics'
        });
      }
    } catch (error) {
      logger.error('Error getting log stream stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve log stream statistics'
      });
    }
  }

  /**
   * Download log file
   */
  async downloadLogFile(req, res) {
    try {
      const { filename } = req.params;
      const result = await this.makeTestRequest('GET', `/api/logs/download/${filename}`);
      
      if (result.statusCode === 200) {
        // Forward the file download response
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', result.headers['content-type'] || 'application/octet-stream');
        res.send(result.body);
      } else {
        res.status(result.statusCode).json({
          success: false,
          error: 'Failed to download log file'
        });
      }
    } catch (error) {
      logger.error('Error downloading log file', { 
        filename: req.params.filename,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to download log file'
      });
    }
  }

  /**
   * Get log stream (Server-Sent Events)
   */
  async getLogStream(req, res) {
    try {
      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Forward query parameters for filtering
      const queryParams = new URLSearchParams(req.query);
      
      // Make request to the main log stream endpoint
      const http = require('http');
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/logs/stream?${queryParams}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Dashboard-API-Stream/1.0'
        }
      };

      const proxyReq = http.request(options, (proxyRes) => {
        logger.debug('Proxy response received', { statusCode: proxyRes.statusCode });
        
        // Forward the stream response
        proxyRes.on('data', (chunk) => {
          logger.debug('Forwarding chunk', { size: chunk.length });
          res.write(chunk);
          // Flush the response to ensure immediate delivery
          if (res.flush) {
            res.flush();
          }
        });

        proxyRes.on('end', () => {
          logger.debug('Proxy stream ended');
          res.end();
        });

        proxyRes.on('error', (error) => {
          logger.error('Proxy response error', { error: error.message });
          res.end();
        });
      });

      proxyReq.on('error', (error) => {
        logger.error('Error proxying log stream', { error: error.message });
        res.write(`data: ${JSON.stringify({ error: 'Stream connection failed' })}\n\n`);
        res.end();
      });

      // Handle client disconnect
      req.on('close', () => {
        logger.debug('Client disconnected, destroying proxy request');
        proxyReq.destroy();
      });

      // Start the proxy request but keep it open for streaming
      logger.debug('Starting proxy request for log stream');
      proxyReq.end();
    } catch (error) {
      logger.error('Error setting up log stream', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to setup log stream'
      });
    }
  }

  /**
   * Serve dashboard frontend
   */
  async serveDashboard(req, res) {
    try {
      const dashboardPath = path.join(__dirname, '../public/index.html');
      
      if (fs.existsSync(dashboardPath)) {
        res.sendFile(dashboardPath);
      } else {
        res.status(404).json({
          success: false,
          error: 'Dashboard frontend not found'
        });
      }
    } catch (error) {
      logger.error('Error serving dashboard', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to serve dashboard'
      });
    }
  }

  /**
   * Make internal test request
   */
  async makeTestRequest(method, path, headers = {}, body = null) {
    const http = require('http');
    const startTime = Date.now();

    logger.info('makeTestRequest called', { method, path, headers, hasBody: !!body });

    return new Promise((resolve, reject) => {
      try {
        const options = {
          hostname: 'localhost',
          port: 3000,
          path,
          method: method.toUpperCase(),
          headers: {
            'User-Agent': 'Dashboard-API-Tester/1.0',
            ...headers
          }
        };

        // Add Content-Length header if body is provided
        if (body) {
          options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        logger.info('HTTP request options', { 
          hostname: options.hostname,
          port: options.port,
          path: options.path,
          method: options.method,
          headers: options.headers
        });

        const req = http.request(options, (res) => {
          logger.info('HTTP response received', { 
            statusCode: res.statusCode, 
            headers: res.headers 
          });
          
          let data = '';
          res.on('data', chunk => {
            data += chunk;
            logger.debug('Received data chunk', { chunkLength: chunk.length });
          });
          
          res.on('end', () => {
            const responseTime = Date.now() - startTime;
            logger.info('HTTP response complete', { 
              statusCode: res.statusCode,
              bodyLength: data.length,
              responseTime
            });
            
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data,
              responseTime
            });
          });

          res.on('error', (error) => {
            logger.error('HTTP response stream error', { error: error.message, stack: error.stack });
            reject(error);
          });
        });

        req.on('error', (error) => {
          logger.error('HTTP request error', { 
            error: error.message, 
            stack: error.stack,
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            address: error.address,
            port: error.port
          });
          reject(error);
        });
        
        req.setTimeout(10000, () => {
          logger.error('HTTP request timeout after 10 seconds', { method, path });
          req.destroy();
          reject(new Error(`Request timeout after 10 seconds for ${method} ${path}`));
        });
        
        logger.info('Sending HTTP request', { method, path, hasBody: !!body });
        
        // Write body if provided
        if (body) {
          logger.debug('Writing request body', { bodyLength: body.length });
          req.write(body);
        }
        
        req.end();
        logger.debug('HTTP request sent');
      } catch (error) {
        logger.error('Error setting up HTTP request', { error: error.message, stack: error.stack });
        reject(error);
      }
    });
  }

  /**
   * Convert JSON to YAML (simple implementation)
   */
  convertToYAML(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n${this.convertToYAML(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n${this.convertToYAML(item, indent + 2)}`;
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        });
      } else {
        yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
      }
    }

    return yaml;
  }

  /**
   * Get Express router
   */
  getRouter() {
    return this.router;
  }
}

module.exports = DashboardAPI;
