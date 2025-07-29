/**
 * Integration Tests for Memory Leak Detection
 * Tests that memory usage remains stable over time with proper cleanup
 */

// Mock modules to avoid actual network calls and reduce test complexity
jest.mock('../src/logger', () => ({
  getModuleLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }),
  httpLogger: (req, res, next) => next()
}));

jest.mock('../src/config', () => ({
  server: {
    cluster: { enabled: false },
    port: 3001,
    host: '127.0.0.1',
    trustProxy: false,
    env: 'test'
  },
  security: {
    headers: false,
    cors: false
  },
  performance: {
    compression: false
  },
  monitoring: {
    healthCheck: { enabled: false },
    metrics: { enabled: false }
  },
  pathRewriting: {
    enabled: false
  },
  fileResolution: {
    enabled: false
  },
  cdn: {
    strictDomainCheck: false,
    originDomain: 'test.com',
    additionalDomains: [],
    targetDomain: 'target.com'
  },
  cache: {
    enabled: false
  }
}));

// Mock all the major components
jest.mock('../src/cache/cache-manager', () => ({
  shouldCache: () => false,
  get: () => null,
  set: () => true,
  shutdown: jest.fn()
}));

jest.mock('../src/proxy/proxy-manager', () => ({
  middleware: jest.fn((req, res, next) => {
    res.status(200).json({ test: true });
  }),
  shutdown: jest.fn()
}));

jest.mock('../src/monitoring/metrics-manager', () => ({
  httpMetricsMiddleware: jest.fn((req, res, next) => next()),
  shutdown: jest.fn()
}));

jest.mock('../src/monitoring/health-manager', () => ({
  healthCheckHandler: jest.fn((req, res) => res.status(200).json({ status: 'ok' })),
  shutdown: jest.fn()
}));

jest.mock('../src/middleware/rate-limiter', () => ({
  getMiddleware: () => (req, res, next) => next()
}));

jest.mock('../src/domain/domain-manager', () => ({
  checkDomainMiddleware: jest.fn((req, res, next) => next()),
  shutdown: jest.fn()
}));

describe('Memory Leak Integration Tests', () => {
  let server;
  
  beforeEach(() => {
    // Clear any global state
    if (global.dashboardIntegration) {
      delete global.dashboardIntegration;
    }
  });
  
  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      server = null;
    }
  });
  
  test('should start and stop server without memory leaks', async () => {
    const app = require('../src/app');
    
    // Get initial memory usage
    const initialMemory = process.memoryUsage();
    
    // Start server
    server = app.startServer();
    
    // Wait for server to be ready
    await new Promise((resolve) => {
      server.on('listening', resolve);
    });
    
    // Simulate some activity (this would normally trigger intervals)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Close server
    await new Promise((resolve) => {
      server.close(resolve);
    });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check memory usage
    const finalMemory = process.memoryUsage();
    
    // Memory should not have increased significantly
    // Allow for some overhead (1MB = 1024 * 1024 bytes)
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
  }, 10000);
  
  test('should handle multiple start/stop cycles without accumulating memory', async () => {
    const app = require('../src/app');
    const initialMemory = process.memoryUsage();
    
    // Run multiple start/stop cycles
    for (let i = 0; i < 3; i++) {
      server = app.startServer();
      
      // Wait for server to be ready
      await new Promise((resolve) => {
        server.on('listening', resolve);
      });
      
      // Simulate some activity
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Close server
      await new Promise((resolve) => {
        server.close(resolve);
      });
      
      server = null;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Check final memory usage
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // Memory should not have increased significantly even after multiple cycles
    expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024); // Less than 2MB increase
  }, 20000);
  
  test('should not have dangling intervals after graceful shutdown', async () => {
    const app = require('../src/app');
    
    // Get initial timer count
    const getActiveTimers = () => {
      // Count active timers (intervals/timeouts)
      return process._getActiveHandles().filter(handle => 
        handle.constructor.name === 'Timeout' || 
        handle.constructor.name === 'Immediate'
      ).length;
    };
    
    const initialTimers = getActiveTimers();
    
    // Start server
    server = app.startServer();
    
    // Wait for server to be ready
    await new Promise((resolve) => {
      server.on('listening', resolve);
    });
    
    // Simulate graceful shutdown
    process.emit('SIGTERM');
    
    // Wait for shutdown to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const finalTimers = getActiveTimers();
    
    // Should not have significantly more timers than initially
    // Allow for some test framework overhead
    expect(finalTimers - initialTimers).toBeLessThanOrEqual(2);
  }, 15000);
  
  test('should properly cleanup dashboard integration intervals', async () => {
    // Mock dashboard integration
    const DashboardIntegration = require('../src/dashboard/dashboard-integration');
    
    const mockApp = {
      use: jest.fn()
    };
    
    const dashboard = new DashboardIntegration(mockApp);
    
    // Mock the discovery service
    dashboard.dashboardAPI = {
      getRouter: () => ({ use: jest.fn() }),
      discoveryService: {
        initialize: jest.fn(),
        scanForEndpoints: jest.fn(),
        shutdown: jest.fn(),
        getAllEndpoints: () => [],
        getStats: () => ({ totalEndpoints: 0 })
      }
    };
    
    // Initialize dashboard
    await dashboard.initialize();
    
    // Verify interval was created
    expect(dashboard.scanIntervalId).toBeDefined();
    
    // Get active handles count
    const beforeShutdown = process._getActiveHandles().length;
    
    // Shutdown dashboard
    await dashboard.shutdown();
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify interval was cleaned up
    expect(dashboard.scanIntervalId).toBeNull();
    
    const afterShutdown = process._getActiveHandles().length;
    
    // Should have fewer or equal handles after shutdown
    expect(afterShutdown).toBeLessThanOrEqual(beforeShutdown);
  });
});