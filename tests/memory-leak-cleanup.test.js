/**
 * Unit Tests for Memory Leak Cleanup
 * Tests that all setInterval cleanup methods work correctly
 */

const PathRewriter = require('../src/domain/path-rewriter');
const APIDiscoveryService = require('../src/dashboard/api/discovery');
const DashboardIntegration = require('../src/dashboard/dashboard-integration');

// Mock express app for dashboard integration
const mockApp = {
  use: jest.fn()
};

// Mock logger to avoid logging during tests
jest.mock('../src/logger', () => ({
  getModuleLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

// Mock config to avoid loading actual configuration
jest.mock('../src/config', () => ({
  pathRewriting: {
    rewriterConfig: {
      domains: {},
      defaultTarget: 'test.example.com'
    }
  },
  server: {
    env: 'test'
  },
  cache: {
    defaultTtl: 300,
    checkPeriod: 120,
    maxItems: 1000,
    enabled: true,
    cacheableStatusCodes: [200, 301, 302],
    respectCacheControl: true,
    cacheableContentTypes: ['text/html', 'application/json'],
    cacheCookies: false,
    maxTtl: 3600
  },
  monitoring: {
    metrics: {
      enabled: true
    }
  }
}));

describe('Memory Leak Cleanup Tests', () => {
  
  describe('PathRewriter', () => {
    let pathRewriter;
    
    beforeEach(() => {
      pathRewriter = new PathRewriter({
        domains: {},
        defaultTarget: 'test.example.com'
      });
    });
    
    afterEach(() => {
      if (pathRewriter) {
        pathRewriter.shutdown();
      }
    });
    
    test('should initialize with interval', () => {
      expect(pathRewriter.cacheCleanupInterval).toBeDefined();
      expect(typeof pathRewriter.cacheCleanupInterval).toBe('object');
    });
    
    test('should clear interval on shutdown', () => {
      const intervalId = pathRewriter.cacheCleanupInterval;
      expect(intervalId).toBeDefined();
      
      pathRewriter.shutdown();
      
      expect(pathRewriter.cacheCleanupInterval).toBeNull();
    });
    
    test('should handle multiple shutdown calls gracefully', () => {
      pathRewriter.shutdown();
      expect(() => pathRewriter.shutdown()).not.toThrow();
      expect(pathRewriter.cacheCleanupInterval).toBeNull();
    });
  });
  
  describe('APIDiscoveryService', () => {
    let discoveryService;
    
    beforeEach(() => {
      discoveryService = new APIDiscoveryService();
    });
    
    afterEach(() => {
      if (discoveryService) {
        discoveryService.shutdown();
      }
    });
    
    test('should initialize with interval', () => {
      expect(discoveryService.scanIntervalId).toBeDefined();
      expect(typeof discoveryService.scanIntervalId).toBe('object');
    });
    
    test('should clear interval on shutdown', () => {
      const intervalId = discoveryService.scanIntervalId;
      expect(intervalId).toBeDefined();
      
      discoveryService.shutdown();
      
      expect(discoveryService.scanIntervalId).toBeNull();
    });
    
    test('should clear endpoints map on shutdown', () => {
      // Add some test endpoints
      discoveryService.endpoints.set('test', { method: 'GET', path: '/test' });
      expect(discoveryService.endpoints.size).toBeGreaterThan(0);
      
      discoveryService.shutdown();
      
      expect(discoveryService.endpoints.size).toBe(0);
    });
    
    test('should handle multiple shutdown calls gracefully', () => {
      discoveryService.shutdown();
      expect(() => discoveryService.shutdown()).not.toThrow();
      expect(discoveryService.scanIntervalId).toBeNull();
    });
  });
  
  describe('DashboardIntegration', () => {
    let dashboardIntegration;
    
    beforeEach(async () => {
      dashboardIntegration = new DashboardIntegration(mockApp);
      // Mock the discovery service to avoid actual initialization
      dashboardIntegration.dashboardAPI = {
        getRouter: () => ({ use: jest.fn() }),
        discoveryService: {
          initialize: jest.fn(),
          scanForEndpoints: jest.fn(),
          shutdown: jest.fn(),
          getAllEndpoints: () => [],
          getStats: () => ({ totalEndpoints: 0 })
        }
      };
      await dashboardIntegration.initialize();
    });
    
    afterEach(async () => {
      if (dashboardIntegration) {
        await dashboardIntegration.shutdown();
      }
    });
    
    test('should initialize with interval', () => {
      expect(dashboardIntegration.scanIntervalId).toBeDefined();
      expect(typeof dashboardIntegration.scanIntervalId).toBe('object');
    });
    
    test('should clear interval on shutdown', async () => {
      const intervalId = dashboardIntegration.scanIntervalId;
      expect(intervalId).toBeDefined();
      
      await dashboardIntegration.shutdown();
      
      expect(dashboardIntegration.scanIntervalId).toBeNull();
    });
    
    test('should set isInitialized to false on shutdown', async () => {
      expect(dashboardIntegration.isInitialized).toBe(true);
      
      await dashboardIntegration.shutdown();
      
      expect(dashboardIntegration.isInitialized).toBe(false);
    });
    
    test('should handle multiple shutdown calls gracefully', async () => {
      await dashboardIntegration.shutdown();
      await expect(dashboardIntegration.shutdown()).resolves.not.toThrow();
      expect(dashboardIntegration.scanIntervalId).toBeNull();
    });
  });
  
  describe('Interval Memory Leak Detection', () => {
    test('should not leave dangling intervals after shutdown', (done) => {
      // Get initial active handles count
      const initialHandles = process._getActiveHandles().length;
      
      // Create and shutdown multiple instances
      const pathRewriter1 = new PathRewriter({ domains: {}, defaultTarget: 'test1.com' });
      const pathRewriter2 = new PathRewriter({ domains: {}, defaultTarget: 'test2.com' });
      const discovery1 = new APIDiscoveryService();
      const discovery2 = new APIDiscoveryService();
      
      // Shutdown all instances
      pathRewriter1.shutdown();
      pathRewriter2.shutdown();
      discovery1.shutdown();
      discovery2.shutdown();
      
      // Check after a short delay to allow cleanup
      setTimeout(() => {
        const finalHandles = process._getActiveHandles().length;
        
        // The number of handles should not have significantly increased
        // Allow some margin for test framework overhead
        expect(finalHandles - initialHandles).toBeLessThanOrEqual(2);
        done();
      }, 100);
    });
    
    test('should clear interval references properly', () => {
      const pathRewriter = new PathRewriter({ domains: {}, defaultTarget: 'test.com' });
      const discovery = new APIDiscoveryService();
      
      // Verify intervals are set
      expect(pathRewriter.cacheCleanupInterval).not.toBeNull();
      expect(discovery.scanIntervalId).not.toBeNull();
      
      // Shutdown and verify intervals are cleared
      pathRewriter.shutdown();
      discovery.shutdown();
      
      expect(pathRewriter.cacheCleanupInterval).toBeNull();
      expect(discovery.scanIntervalId).toBeNull();
    });
  });
});