# Performance Optimization Guide for Domain-to-Path Prefix Routing Engine

This document provides comprehensive guidance on optimizing the performance of the domain-to-path prefix routing engine, including benchmarking examples, optimization techniques, and monitoring strategies.

## Overview

The domain-to-path prefix routing engine is designed for high-performance operation with several optimization layers:

1. **Rule Compilation and Caching**: Pre-compiled regex patterns and cached transformations
2. **Memory Management**: Efficient data structures and garbage collection optimization
3. **CPU Optimization**: Minimized regex operations and fast path matching
4. **I/O Optimization**: Reduced disk access and optimized logging
5. **Concurrency**: Thread-safe operations and parallel processing support

## Performance Metrics and Benchmarks

### Baseline Performance Targets

```javascript
// Performance targets for different scenarios
const PERFORMANCE_TARGETS = {
  simplePrefix: {
    transformationTime: 0.001, // 1ms for simple prefix mapping
    throughput: 10000, // 10k transformations per second
    memoryUsage: 50 // MB for 1000 rules
  },
  complexRegex: {
    transformationTime: 0.005, // 5ms for complex regex
    throughput: 2000, // 2k transformations per second
    memoryUsage: 100 // MB for 1000 complex rules
  },
  cacheHit: {
    transformationTime: 0.0001, // 0.1ms for cache hits
    throughput: 50000, // 50k cache hits per second
    memoryUsage: 10 // MB for 10k cached entries
  }
};
```

### Benchmarking Framework

```javascript
// performance-benchmark.js
class PerformanceBenchmark {
  constructor(pathRewriter) {
    this.pathRewriter = pathRewriter;
    this.results = [];
  }
  
  async runBenchmark(testName, iterations = 10000) {
    console.log(`Running benchmark: ${testName}`);
    
    const testCases = this.generateTestCases(testName, iterations);
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    let successCount = 0;
    let errorCount = 0;
    const durations = [];
    
    for (const testCase of testCases) {
      const caseStart = process.hrtime.bigint();
      
      try {
        const result = this.pathRewriter.transformPath(
          testCase.domain,
          testCase.path,
          testCase.method
        );
        
        const caseDuration = Number(process.hrtime.bigint() - caseStart) / 1000000;
        durations.push(caseDuration);
        successCount++;
        
      } catch (error) {
        errorCount++;
      }
    }
    
    const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;
    const endMemory = process.memoryUsage();
    
    const result = {
      testName,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      throughput: iterations / (totalTime / 1000),
      successCount,
      errorCount,
      errorRate: errorCount / iterations,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal
      },
      percentiles: this.calculatePercentiles(durations)
    };
    
    this.results.push(result);
    this.printResults(result);
    
    return result;
  }
  
  generateTestCases(testName, count) {
    const cases = [];
    
    switch (testName) {
      case 'simple_prefix':
        for (let i = 0; i < count; i++) {
          cases.push({
            domain: 'ddt.com',
            path: `/page-${i}`,
            method: 'GET'
          });
        }
        break;
        
      case 'complex_regex':
        for (let i = 0; i < count; i++) {
          cases.push({
            domain: 'api.example.com',
            path: `/v${i % 3 + 1}/users/${i}/profile`,
            method: 'GET'
          });
        }
        break;
        
      case 'cache_performance':
        // Generate repeated requests to test cache performance
        const paths = ['/home', '/about', '/contact', '/products', '/services'];
        for (let i = 0; i < count; i++) {
          cases.push({
            domain: 'ddt.com',
            path: paths[i % paths.length],
            method: 'GET'
          });
        }
        break;
        
      case 'mixed_workload':
        const domains = ['ddt.com', 'blog.allabout.network', 'api.example.com'];
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        for (let i = 0; i < count; i++) {
          cases.push({
            domain: domains[i % domains.length],
            path: `/resource-${i}`,
            method: methods[i % methods.length]
          });
        }
        break;
    }
    
    return cases;
  }
  
  calculatePercentiles(durations) {
    const sorted = durations.sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }
  
  printResults(result) {
    console.log(`\n=== ${result.testName} Results ===`);
    console.log(`Iterations: ${result.iterations}`);
    console.log(`Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`Average Time: ${result.averageTime.toFixed(4)}ms`);
    console.log(`Throughput: ${result.throughput.toFixed(0)} ops/sec`);
    console.log(`Success Rate: ${((result.successCount / result.iterations) * 100).toFixed(2)}%`);
    console.log(`Memory Delta: RSS ${(result.memoryDelta.rss / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Percentiles (ms):`);
    console.log(`  P50: ${result.percentiles.p50.toFixed(4)}`);
    console.log(`  P90: ${result.percentiles.p90.toFixed(4)}`);
    console.log(`  P95: ${result.percentiles.p95.toFixed(4)}`);
    console.log(`  P99: ${result.percentiles.p99.toFixed(4)}`);
    console.log(`  Min: ${result.percentiles.min.toFixed(4)}`);
    console.log(`  Max: ${result.percentiles.max.toFixed(4)}`);
  }
  
  generateReport() {
    console.log('\n=== Performance Benchmark Report ===');
    
    const report = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: require('os').cpus().length,
      totalMemory: require('os').totalmem(),
      results: this.results
    };
    
    // Save report to file
    require('fs').writeFileSync(
      `benchmark-report-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );
    
    return report;
  }
}

// Usage example
async function runPerformanceTests() {
  const PathRewriter = require('./path-rewriter');
  const config = {
    domains: {
      'ddt.com': {
        target: 'main--allaboutv2--ddttom.hlx.live',
        pathPrefix: '/ddt',
        fallback: 'prefix'
      },
      'blog.allabout.network': {
        target: 'main--allaboutv2--ddttom.hlx.live',
        pathPrefix: '/blog',
        fallback: 'prefix'
      },
      'api.example.com': {
        target: 'api-backend.example.com',
        rules: [
          {
            pattern: '^/v1/(.*)',
            replacement: '/api/v1/$1'
          },
          {
            pattern: '^/v2/(.*)',
            replacement: '/api/v2/$1'
          }
        ],
        fallback: 'prefix'
      }
    },
    defaultTarget: 'default-backend.com',
    maxCacheSize: 10000
  };
  
  const pathRewriter = new PathRewriter(config);
  const benchmark = new PerformanceBenchmark(pathRewriter);
  
  // Run different benchmark scenarios
  await benchmark.runBenchmark('simple_prefix', 10000);
  await benchmark.runBenchmark('complex_regex', 5000);
  await benchmark.runBenchmark('cache_performance', 20000);
  await benchmark.runBenchmark('mixed_workload', 15000);
  
  // Generate comprehensive report
  const report = benchmark.generateReport();
  console.log('\nBenchmark completed. Report saved to:', `benchmark-report-${Date.now()}.json`);
  
  return report;
}

module.exports = { PerformanceBenchmark, runPerformanceTests };
```

## Optimization Techniques

### 1. Rule Compilation Optimization

```javascript
// Optimized rule compilation with pre-computed patterns
class OptimizedRuleCompiler {
  constructor() {
    this.compiledPatterns = new Map();
    this.fastLookup = new Map();
  }
  
  compileRule(domain, config) {
    // Use fast string matching for simple prefix rules
    if (this.isSimplePrefix(config)) {
      return this.compileSimplePrefix(domain, config);
    }
    
    // Use optimized regex for complex patterns
    return this.compileComplexRule(domain, config);
  }
  
  isSimplePrefix(config) {
    return config.pathPrefix && 
           (!config.rules || config.rules.length === 0) &&
           config.fallback === 'prefix';
  }
  
  compileSimplePrefix(domain, config) {
    // Fast path for simple prefix mapping
    const rule = {
      domain,
      type: 'simple_prefix',
      target: config.target,
      pathPrefix: config.pathPrefix,
      transform: (path) => config.pathPrefix + path
    };
    
    this.fastLookup.set(domain, rule);
    return rule;
  }
  
  compileComplexRule(domain, config) {
    const rule = {
      domain,
      type: 'complex',
      target: config.target,
      pathPrefix: config.pathPrefix || '',
      rules: [],
      fallback: config.fallback || 'prefix'
    };
    
    // Pre-compile all regex patterns
    if (config.rules && Array.isArray(config.rules)) {
      rule.rules = config.rules.map(pathRule => {
        const compiled = {
          pattern: pathRule.pattern,
          replacement: pathRule.replacement,
          regex: new RegExp(pathRule.pattern),
          // Pre-compute replacement function for better performance
          replaceFn: this.createReplacementFunction(pathRule.replacement)
        };
        
        return compiled;
      });
    }
    
    return rule;
  }
  
  createReplacementFunction(replacement) {
    // Pre-analyze replacement string for optimization
    const hasSubstitutions = replacement.includes('$');
    
    if (!hasSubstitutions) {
      // Static replacement - return constant function
      return () => replacement;
    }
    
    // Dynamic replacement - optimize substitution
    return (match) => {
      return replacement.replace(/\$(\d+)/g, (_, num) => {
        return match[parseInt(num)] || '';
      });
    };
  }
}
```

### 2. Cache Optimization

```javascript
// High-performance LRU cache implementation
class OptimizedCache {
  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.accessOrder = new Map(); // Track access order for LRU
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }
  
  get(key) {
    if (this.cache.has(key)) {
      // Update access order
      this.accessOrder.delete(key);
      this.accessOrder.set(key, Date.now());
      this.stats.hits++;
      return this.cache.get(key);
    }
    
    this.stats.misses++;
    return null;
  }
  
  set(key, value) {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    this.cache.set(key, value);
    this.accessOrder.set(key, Date.now());
  }
  
  evictLRU() {
    // Find least recently used item
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.stats.evictions++;
    }
  }
  
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}
```

### 3. Memory Pool for Frequent Objects

```javascript
// Object pool to reduce garbage collection pressure
class TransformationResultPool {
  constructor(initialSize = 100) {
    this.pool = [];
    this.inUse = new Set();
    
    // Pre-allocate objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createResult());
    }
  }
  
  createResult() {
    return {
      domain: '',
      originalPath: '',
      transformedPath: '',
      target: '',
      method: '',
      matched: false,
      fallbackUsed: false,
      transformationTime: 0,
      requestId: null,
      reset() {
        this.domain = '';
        this.originalPath = '';
        this.transformedPath = '';
        this.target = '';
        this.method = '';
        this.matched = false;
        this.fallbackUsed = false;
        this.transformationTime = 0;
        this.requestId = null;
      }
    };
  }
  
  acquire() {
    let result;
    
    if (this.pool.length > 0) {
      result = this.pool.pop();
    } else {
      result = this.createResult();
    }
    
    result.reset();
    this.inUse.add(result);
    return result;
  }
  
  release(result) {
    if (this.inUse.has(result)) {
      this.inUse.delete(result);
      this.pool.push(result);
    }
  }
  
  getStats() {
    return {
      poolSize: this.pool.length,
      inUse: this.inUse.size,
      totalAllocated: this.pool.length + this.inUse.size
    };
  }
}
```

### 4. Batch Processing Optimization

```javascript
// Batch processing for multiple transformations
class BatchProcessor {
  constructor(pathRewriter, batchSize = 100) {
    this.pathRewriter = pathRewriter;
    this.batchSize = batchSize;
    this.queue = [];
    this.processing = false;
  }
  
  async transformBatch(requests) {
    const results = [];
    const startTime = process.hrtime.bigint();
    
    // Group requests by domain for better cache locality
    const domainGroups = this.groupByDomain(requests);
    
    for (const [domain, domainRequests] of domainGroups) {
      // Process requests for the same domain together
      for (const request of domainRequests) {
        const result = this.pathRewriter.transformPath(
          request.domain,
          request.path,
          request.method,
          request.requestId
        );
        results.push(result);
      }
    }
    
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
    
    return {
      results,
      batchSize: requests.length,
      processingTime: duration,
      throughput: requests.length / (duration / 1000)
    };
  }
  
  groupByDomain(requests) {
    const groups = new Map();
    
    for (const request of requests) {
      if (!groups.has(request.domain)) {
        groups.set(request.domain, []);
      }
      groups.get(request.domain).push(request);
    }
    
    return groups;
  }
}
```

## Performance Monitoring

### 1. Real-time Performance Metrics

```javascript
// Real-time performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      transformations: {
        count: 0,
        totalTime: 0,
        slowCount: 0,
        errorCount: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        size: 0
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        rss: 0
      }
    };
    
    this.thresholds = {
      slowTransformation: 10, // ms
      highMemoryUsage: 100 * 1024 * 1024, // 100MB
      lowCacheHitRate: 0.8 // 80%
    };
    
    // Start monitoring
    this.startMonitoring();
  }
  
  recordTransformation(duration, success = true) {
    this.metrics.transformations.count++;
    this.metrics.transformations.totalTime += duration;
    
    if (duration > this.thresholds.slowTransformation) {
      this.metrics.transformations.slowCount++;
    }
    
    if (!success) {
      this.metrics.transformations.errorCount++;
    }
  }
  
  recordCacheOperation(hit = true, cacheSize = 0) {
    if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }
    this.metrics.cache.size = cacheSize;
  }
  
  updateMemoryMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.memory = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss
    };
  }
  
  getMetrics() {
    const totalTransformations = this.metrics.transformations.count;
    const totalCacheOps = this.metrics.cache.hits + this.metrics.cache.misses;
    
    return {
      transformations: {
        ...this.metrics.transformations,
        averageTime: totalTransformations > 0 
          ? this.metrics.transformations.totalTime / totalTransformations 
          : 0,
        errorRate: totalTransformations > 0 
          ? this.metrics.transformations.errorCount / totalTransformations 
          : 0,
        slowRate: totalTransformations > 0 
          ? this.metrics.transformations.slowCount / totalTransformations 
          : 0
      },
      cache: {
        ...this.metrics.cache,
        hitRate: totalCacheOps > 0 
          ? this.metrics.cache.hits / totalCacheOps 
          : 0
      },
      memory: this.metrics.memory
    };
  }
  
  checkThresholds() {
    const metrics = this.getMetrics();
    const alerts = [];
    
    if (metrics.transformations.averageTime > this.thresholds.slowTransformation) {
      alerts.push({
        type: 'SLOW_TRANSFORMATIONS',
        value: metrics.transformations.averageTime,
        threshold: this.thresholds.slowTransformation
      });
    }
    
    if (metrics.memory.heapUsed > this.thresholds.highMemoryUsage) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        value: metrics.memory.heapUsed,
        threshold: this.thresholds.highMemoryUsage
      });
    }
    
    if (metrics.cache.hitRate < this.thresholds.lowCacheHitRate) {
      alerts.push({
        type: 'LOW_CACHE_HIT_RATE',
        value: metrics.cache.hitRate,
        threshold: this.thresholds.lowCacheHitRate
      });
    }
    
    return alerts;
  }
  
  startMonitoring() {
    setInterval(() => {
      this.updateMemoryMetrics();
      const alerts = this.checkThresholds();
      
      if (alerts.length > 0) {
        console.warn('Performance alerts:', alerts);
      }
    }, 5000); // Check every 5 seconds
  }
}
```

## Optimization Configuration

### Environment Variables for Performance Tuning

```bash
# Performance optimization settings
PATH_REWRITE_CACHE_SIZE=10000
PATH_REWRITE_CACHE_TTL=3600
PATH_REWRITE_BATCH_SIZE=100
PATH_REWRITE_POOL_SIZE=1000

# Memory management
PATH_REWRITE_GC_INTERVAL=60000
PATH_REWRITE_MEMORY_THRESHOLD=100

# Performance monitoring
PATH_REWRITE_PERF_MONITORING=true
PATH_REWRITE_SLOW_THRESHOLD=10
PATH_REWRITE_BENCHMARK_MODE=false

# Concurrency settings
PATH_REWRITE_WORKER_THREADS=4
PATH_REWRITE_QUEUE_SIZE=1000
```

## Load Testing Scenarios

### 1. High Throughput Test

```javascript
// Load test for high throughput scenarios
async function highThroughputTest() {
  const PathRewriter = require('./path-rewriter');
  const config = {
    domains: {
      'ddt.com': { target: 'backend.com', pathPrefix: '/ddt' },
      'api.example.com': { target: 'api.backend.com', pathPrefix: '/api' }
    },
    maxCacheSize: 50000
  };
  
  const pathRewriter = new PathRewriter(config);
  const concurrency = 100;
  const requestsPerWorker = 1000;
  
  const workers = [];
  const startTime = Date.now();
  
  for (let i = 0; i < concurrency; i++) {
    workers.push(
      runWorker(pathRewriter, requestsPerWorker, i)
    );
  }
  
  const results = await Promise.all(workers);
  const endTime = Date.now();
  
  const totalRequests = concurrency * requestsPerWorker;
  const totalTime = endTime - startTime;
  const throughput = totalRequests / (totalTime / 1000);
  
  console.log(`High Throughput Test Results:`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Throughput: ${throughput.toFixed(0)} req/sec`);
  console.log(`Average per worker: ${throughput / concurrency} req/sec`);
}

async function runWorker(pathRewriter, requests, workerId) {
  const domains = ['ddt.com', 'api.example.com'];
  const paths = ['/home', '/about', '/api/users', '/api/products'];
  
  for (let i = 0; i < requests; i++) {
    const domain = domains[i % domains.length];
    const path = paths[i % paths.length];
    
    pathRewriter.transformPath(domain, path, 'GET', `worker-${workerId}-${i}`);
  }
}
```

### 2. Memory Stress Test

```javascript
// Memory stress test
async function memoryStressTest() {
  const PathRewriter = require('./path-rewriter');
  const config = {
    domains: {},
    maxCacheSize: 100000
  };
  
  // Generate many domains to test memory usage
  for (let i = 0; i < 1000; i++) {
    config.domains[`domain-${i}.com`] = {
      target: `backend-${i}.com`,
      pathPrefix: `/prefix-${i}`,
      rules: [
        { pattern: `^/v1/(.*)`, replacement: `/api/v1/$1` },
        { pattern: `^/v2/(.*)`, replacement: `/api/v2/$1` }
      ]
    };
  }
  
  const pathRewriter = new PathRewriter(config);
  const initialMemory = process.memoryUsage();
  
  // Generate many unique requests to fill cache
  for (let i = 0; i < 50000; i++) {
    const domain = `domain-${i % 1000}.com`;
    const path = `/unique-path-${i}`;
    
    pathRewriter.transformPath(domain, path, 'GET');
    
    if (i % 10000 === 0) {
      const currentMemory = process.memoryUsage();
      console.log(`Iteration ${i}: Memory usage ${(currentMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
  }
  
  const finalMemory = process.memoryUsage();
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  
  console.log(`Memory Stress Test Results:`);
  console.log(`Initial Memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Final Memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Cache Stats:`, pathRewriter.getStats());
}
```

## Graceful Shutdown and Resource Cleanup

Proper resource cleanup is critical for maintaining performance in production environments and preventing memory leaks that can degrade performance over time.

### 1. Interval and Timer Cleanup

The CDN application uses several intervals for periodic tasks that must be properly cleaned up to prevent memory leaks:

```javascript
// Example of proper interval cleanup in PathRewriter
class PathRewriter {
  constructor(config) {
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  shutdown() {
    // Critical: Clear interval and null the reference
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
    
    // Clear other resources
    this.compiledRules.clear();
    this.domainCache.clear();
    this.errorRates.clear();
    this.circuitBreakers.clear();
    this.performanceMonitor.clear();
  }
}
```

### 2. Memory Leak Prevention Strategies

#### Identify Common Memory Leak Sources

```javascript
// Common memory leak patterns to avoid:

// ❌ Bad: Interval not cleared
setInterval(() => {
  // Periodic task
}, 1000);

// ✅ Good: Interval properly managed
this.intervalId = setInterval(() => {
  // Periodic task
}, 1000);

shutdown() {
  if (this.intervalId) {
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}

// ❌ Bad: Event listeners not removed
process.on('SIGTERM', handler);

// ✅ Good: Event listeners properly managed
this.handlers = new Map();
const handler = () => { /* cleanup */ };
this.handlers.set('SIGTERM', handler);
process.on('SIGTERM', handler);

shutdown() {
  for (const [event, handler] of this.handlers) {
    process.removeListener(event, handler);
  }
  this.handlers.clear();
}
```

#### Memory Monitoring and Alerting

```javascript
// Memory monitoring utility
class MemoryMonitor {
  constructor(options = {}) {
    this.threshold = options.threshold || 1024 * 1024 * 1024; // 1GB
    this.checkInterval = options.checkInterval || 60000; // 1 minute
    this.alerts = [];
    
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.checkInterval);
  }
  
  checkMemoryUsage() {
    const usage = process.memoryUsage();
    
    if (usage.heapUsed > this.threshold) {
      const alert = {
        timestamp: new Date(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss,
        external: usage.external
      };
      
      this.alerts.push(alert);
      console.warn('Memory usage exceeds threshold:', alert);
      
      // Trigger garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }
  
  getStats() {
    return {
      currentUsage: process.memoryUsage(),
      threshold: this.threshold,
      alertCount: this.alerts.length,
      recentAlerts: this.alerts.slice(-5)
    };
  }
  
  shutdown() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.alerts = [];
  }
}
```

### 3. Graceful Shutdown Implementation

#### Application-Level Shutdown

```javascript
// Enhanced graceful shutdown implementation
class GracefulShutdown {
  constructor(app, server) {
    this.app = app;
    this.server = server;
    this.shutdownTimeout = 30000; // 30 seconds
    this.isShuttingDown = false;
    this.resources = new Set();
    
    this.setupSignalHandlers();
  }
  
  registerResource(resource) {
    if (resource && typeof resource.shutdown === 'function') {
      this.resources.add(resource);
    }
  }
  
  setupSignalHandlers() {
    const signals = ['SIGTERM', 'SIGINT'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        if (!this.isShuttingDown) {
          this.gracefulShutdown(signal);
        }
      });
    });
  }
  
  async gracefulShutdown(signal) {
    console.log(`${signal} received, starting graceful shutdown...`);
    this.isShuttingDown = true;
    
    // Set a timeout for forced shutdown
    const forceShutdownTimer = setTimeout(() => {
      console.error('Graceful shutdown timeout, forcing exit...');
      process.exit(1);
    }, this.shutdownTimeout);
    
    try {
      // Stop accepting new connections
      this.server.close();
      
      // Shutdown all registered resources
      const shutdownPromises = Array.from(this.resources).map(async (resource) => {
        try {
          await resource.shutdown();
        } catch (error) {
          console.error('Error shutting down resource:', error);
        }
      });
      
      await Promise.all(shutdownPromises);
      
      console.log('All resources shut down successfully');
      clearTimeout(forceShutdownTimer);
      process.exit(0);
      
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  }
}

// Usage in main application
const gracefulShutdown = new GracefulShutdown(app, server);
gracefulShutdown.registerResource(pathRewriter);
gracefulShutdown.registerResource(cacheManager);
gracefulShutdown.registerResource(metricsManager);
gracefulShutdown.registerResource(dashboardIntegration);
```

#### Cluster Worker Cleanup

```javascript
// Worker process cleanup in cluster mode
if (cluster.isWorker) {
  process.on('message', async (msg) => {
    if (msg === 'shutdown') {
      console.log(`Worker ${process.env.NODE_APP_INSTANCE} received shutdown message`);
      
      try {
        // Close server
        await new Promise((resolve) => {
          server.close(resolve);
        });
        
        // Cleanup resources in order
        const cleanupTasks = [
          () => dashboardIntegration?.shutdown(),
          () => domainManager?.shutdown(),
          () => cacheManager?.shutdown(),
          () => metricsManager?.shutdown(),
          () => pathRewriter?.shutdown()
        ];
        
        for (const task of cleanupTasks) {
          try {
            await task();
          } catch (error) {
            console.error('Cleanup task failed:', error);
          }
        }
        
        console.log(`Worker ${process.env.NODE_APP_INSTANCE} cleanup completed`);
        process.exit(0);
        
      } catch (error) {
        console.error('Worker cleanup error:', error);
        process.exit(1);
      }
    }
  });
}
```

### 4. Resource Monitoring and Health Checks

#### Health Check Enhancement

```javascript
// Enhanced health check with resource monitoring
class HealthManager {
  constructor() {
    this.resources = new Map();
    this.healthCheckInterval = 30000; // 30 seconds
    
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);
  }
  
  registerResource(name, resource) {
    this.resources.set(name, resource);
  }
  
  async performHealthChecks() {
    const results = {};
    
    for (const [name, resource] of this.resources) {
      try {
        if (typeof resource.getHealthStatus === 'function') {
          results[name] = await resource.getHealthStatus();
        } else if (typeof resource.getStats === 'function') {
          results[name] = { status: 'healthy', stats: resource.getStats() };
        } else {
          results[name] = { status: 'unknown' };
        }
      } catch (error) {
        results[name] = { status: 'error', error: error.message };
      }
    }
    
    return results;
  }
  
  async getSystemHealth() {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    const resourceHealth = await this.performHealthChecks();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memory.external / 1024 / 1024) + 'MB'
      },
      resources: resourceHealth
    };
  }
  
  shutdown() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.resources.clear();
  }
}
```

### 5. Performance Impact of Proper Cleanup

#### Cleanup Performance Metrics

```javascript
// Measure cleanup performance
class CleanupPerformanceTracker {
  constructor() {
    this.cleanupTimes = new Map();
    this.cleanupCounts = new Map();
  }
  
  trackCleanup(resourceName, cleanupFunction) {
    return async (...args) => {
      const startTime = process.hrtime.bigint();
      
      try {
        const result = await cleanupFunction.apply(this, args);
        
        const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // ms
        
        if (!this.cleanupTimes.has(resourceName)) {
          this.cleanupTimes.set(resourceName, []);
          this.cleanupCounts.set(resourceName, 0);
        }
        
        this.cleanupTimes.get(resourceName).push(duration);
        this.cleanupCounts.set(resourceName, this.cleanupCounts.get(resourceName) + 1);
        
        return result;
      } catch (error) {
        console.error(`Cleanup failed for ${resourceName}:`, error);
        throw error;
      }
    };
  }
  
  getCleanupStats() {
    const stats = {};
    
    for (const [resource, times] of this.cleanupTimes) {
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const count = this.cleanupCounts.get(resource);
      
      stats[resource] = {
        averageTime: avgTime.toFixed(2) + 'ms',
        maxTime: maxTime.toFixed(2) + 'ms',
        minTime: minTime.toFixed(2) + 'ms',
        cleanupCount: count,
        totalTime: times.reduce((sum, time) => sum + time, 0).toFixed(2) + 'ms'
      };
    }
    
    return stats;
  }
}
```

### 6. Testing Resource Cleanup

#### Unit Tests for Cleanup

```javascript
// Test cleanup functionality
describe('Resource Cleanup Tests', () => {
  test('PathRewriter cleanup clears intervals', () => {
    const pathRewriter = new PathRewriter();
    expect(pathRewriter.cacheCleanupInterval).toBeDefined();
    
    pathRewriter.shutdown();
    
    expect(pathRewriter.cacheCleanupInterval).toBeNull();
  });
  
  test('CacheManager cleanup clears intervals', () => {
    const cacheManager = new CacheManager();
    expect(cacheManager.statsInterval).toBeDefined();
    
    cacheManager.shutdown();
    
    expect(cacheManager.statsInterval).toBeNull();
  });
  
  test('No memory leaks after multiple create/destroy cycles', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Create and destroy multiple instances
    for (let i = 0; i < 100; i++) {
      const pathRewriter = new PathRewriter();
      pathRewriter.shutdown();
    }
    
    // Force garbage collection
    if (global.gc) global.gc();
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be minimal (< 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
```

## Best Practices for Performance

### 1. Rule Design

- Use simple prefix mapping when possible instead of complex regex
- Minimize the number of regex patterns per domain
- Order rules from most specific to least specific
- Use exact string matching for known paths

### 2. Caching Strategy

- Set appropriate cache sizes based on expected traffic
- Use cache warming for frequently accessed paths
- Implement cache partitioning for different domains
- Monitor cache hit rates and adjust accordingly

### 3. Memory Management

- Use object pools for frequently created objects
- **Implement proper cleanup for long-running processes** ⭐ **Critical for preventing memory leaks**
- **Always clear intervals and timers in shutdown methods** ⭐ **Essential for production stability**
- Monitor memory usage and implement alerts
- Use streaming for large datasets
- **Test memory usage with load testing and monitor for leaks over time**
- **Implement graceful shutdown procedures for all components**

### 4. Monitoring and Alerting

- Set up performance dashboards
- Implement automated alerts for degradation
- Use distributed tracing for complex scenarios
- Regular performance regression testing

This comprehensive performance optimization guide ensures the domain-to-path prefix routing engine operates at peak efficiency while maintaining reliability and scalability.
