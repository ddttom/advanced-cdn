// dashboard/dashboard-integration.js
const DashboardAPI = require('./api/dashboard-api');
const logger = require('../logger').getModuleLogger('dashboard-integration');

/**
 * Dashboard Integration Module
 * Integrates the dashboard API with the main CDN application
 */
class DashboardIntegration {
  constructor(app) {
    this.app = app;
    this.dashboardAPI = new DashboardAPI();
    this.isInitialized = false;
  }

  /**
   * Initialize dashboard integration
   */
  async initialize() {
    try {
      logger.info('Initializing dashboard integration...');

      // Mount dashboard API routes
      logger.debug('Mounting dashboard API routes...');
      this.app.use('/dashboard', this.dashboardAPI.getRouter());
      logger.debug('Dashboard API routes mounted successfully');

      // Initialize API discovery service (non-blocking)
      logger.debug('Starting API discovery service...');
      this.dashboardAPI.discoveryService.initialize().catch(error => {
        logger.error('API discovery service initialization failed', { error: error.message });
      });
      logger.debug('API discovery service initialization started (non-blocking)');

      this.isInitialized = true;
      logger.info('Dashboard integration initialized successfully');

      // Log available dashboard endpoints
      this.logDashboardEndpoints();

      // Start background scanning after initialization
      setImmediate(() => {
        this.setupPeriodicScanning();
        logger.debug('Periodic scanning setup complete');
      });

    } catch (error) {
      logger.error('Failed to initialize dashboard integration', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Setup periodic API scanning
   */
  setupPeriodicScanning() {
    // Scan every 5 minutes
    this.scanIntervalId = setInterval(async () => {
      try {
        await this.dashboardAPI.discoveryService.scanForEndpoints();
        logger.debug('Periodic API scan completed');
      } catch (error) {
        logger.error('Periodic API scan failed', { error: error.message });
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Log available dashboard endpoints
   */
  logDashboardEndpoints() {
    const endpoints = [
      'GET /dashboard - Dashboard frontend',
      'GET /dashboard/api/discovery/endpoints - List all discovered endpoints',
      'GET /dashboard/api/discovery/categories - List endpoint categories',
      'GET /dashboard/api/discovery/stats - Discovery statistics',
      'POST /dashboard/api/discovery/scan - Trigger manual scan',
      'GET /dashboard/api/docs/openapi.json - OpenAPI specification',
      'GET /dashboard/api/test/health - Test health endpoints',
      'GET /dashboard/api/dashboard/status - Dashboard status'
    ];

    logger.info('Dashboard API endpoints available:', { endpoints });
  }

  /**
   * Get dashboard status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      discoveryService: this.dashboardAPI.discoveryService.getStats(),
      endpoints: this.dashboardAPI.discoveryService.getAllEndpoints().length
    };
  }

  /**
   * Shutdown dashboard integration
   */
  async shutdown() {
    try {
      logger.info('Shutting down dashboard integration...');
      
      // Clear periodic scanning interval
      if (this.scanIntervalId) {
        clearInterval(this.scanIntervalId);
        this.scanIntervalId = null;
      }
      
      if (this.dashboardAPI.discoveryService) {
        await this.dashboardAPI.discoveryService.shutdown();
      }

      this.isInitialized = false;
      logger.info('Dashboard integration shutdown complete');
    } catch (error) {
      logger.error('Error during dashboard shutdown', { error: error.message });
    }
  }
}

module.exports = DashboardIntegration;
