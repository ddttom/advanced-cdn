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
      
      const { method, path, headers = {} } = req.body;
      
      if (!method || !path) {
        logger.warn('Missing method or path in test request', { method, path });
        return res.status(400).json({
          success: false,
          error: 'Method and path are required'
        });
      }

      logger.debug('Making test request', { method, path, headers });
      
      // Make internal request to test endpoint
      const testResult = await this.makeTestRequest(method, path, headers);
      
      logger.debug('Test request completed', { testResult });
      
      res.json({
        success: true,
        data: testResult
      });
    } catch (error) {
      logger.error('Error testing endpoint', { 
        error: error.message, 
        stack: error.stack,
        body: req.body 
      });
      res.status(500).json({
        success: false,
        error: `Failed to test endpoint: ${error.message}`
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
  async makeTestRequest(method, path, headers = {}) {
    const http = require('http');
    const startTime = Date.now();

    logger.debug('makeTestRequest called', { method, path, headers });

    return new Promise((resolve, reject) => {
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

      logger.debug('HTTP request options', options);

      const req = http.request(options, (res) => {
        logger.debug('HTTP response received', { 
          statusCode: res.statusCode, 
          headers: res.headers 
        });
        
        let data = '';
        res.on('data', chunk => {
          data += chunk;
          logger.debug('Received data chunk', { chunkLength: chunk.length });
        });
        
        res.on('end', () => {
          logger.debug('HTTP response complete', { 
            statusCode: res.statusCode,
            bodyLength: data.length,
            responseTime: Date.now() - startTime
          });
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            responseTime: Date.now() - startTime
          });
        });
      });

      req.on('error', (error) => {
        logger.error('HTTP request error', { error: error.message, stack: error.stack });
        reject(error);
      });
      
      req.setTimeout(5000, () => {
        logger.error('HTTP request timeout');
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      logger.debug('Sending HTTP request');
      req.end();
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
