// benchmark.js - Performance benchmarking script for domain-to-path prefix routing engine
const PathRewriter = require('./path-rewriter');
const fs = require('fs');
const os = require('os');

/**
 * Performance Benchmark Suite
 * Tests various aspects of the path rewriting engine performance
 */
class PerformanceBenchmark {
  constructor() {
    this.results = [];
    this.pathRewriter = null;
  }

  /**
   * Initialize path rewriter with test configuration
   */
  initializePathRewriter() {
    const config = {
      domains: {
        // Simple prefix mapping - fastest performance
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
        'static.example.com': {
          target: 'cdn.example.com',
          pathPrefix: '/static',
          fallback: 'prefix'
        },
        
        // Complex regex patterns - moderate performance
        'api.example.com': {
          target: 'api-backend.example.com',
          rules: [
            {
              pattern: '^/v1/users/([0-9]+)$',
              replacement: '/api/v1/users/$1'
            },
            {
              pattern: '^/v1/products/([a-zA-Z0-9-]+)$',
              replacement: '/api/v1/products/$1'
            },
            {
              pattern: '^/v2/(.*)$',
              replacement: '/api/v2/$1'
            }
          ],
          fallback: 'prefix'
        },
        
        // Very complex regex patterns - slower performance
        'complex.example.com': {
          target: 'complex-backend.example.com',
          rules: [
            {
              pattern: '^/api/v([1-9])/users/([0-9]+)/profile/([a-zA-Z0-9-_]+)$',
              replacement: '/backend/api/v$1/user-profiles/$2/$3'
            },
            {
              pattern: '^/api/v([1-9])/products/([a-zA-Z0-9-]+)/reviews/([0-9]+)$',
              replacement: '/backend/api/v$1/product-reviews/$2/$3'
            },
            {
              pattern: '^/legacy/([a-zA-Z0-9-_/]+)$',
              replacement: '/backend/legacy-api/$1'
            }
          ],
          fallback: 'prefix'
        }
      },
      defaultTarget: 'default-backend.example.com',
      maxCacheSize: 10000,
      slowThreshold: 0.010, // 10ms
      errorRateThreshold: 0.05, // 5%
      circuitBreakerEnabled: true
    };

    this.pathRewriter = new PathRewriter(config);
  }

  /**
   * Generate test cases for different scenarios
   */
  generateTestCases(scenario, count) {
    const cases = [];

    switch (scenario) {
      case 'simple_prefix':
        for (let i = 0; i < count; i++) {
          cases.push({
            domain: 'ddt.com',
            path: `/page-${i % 100}`,
            method: 'GET',
            expected: `/ddt/page-${i % 100}`
          });
        }
        break;

      case 'complex_regex':
        for (let i = 0; i < count; i++) {
          const userId = 1000 + (i % 9999);
          const version = (i % 2) + 1;
          cases.push({
            domain: 'api.example.com',
            path: `/v${version}/users/${userId}`,
            method: 'GET',
            expected: `/api/v${version}/users/${userId}`
          });
        }
        break;

      case 'very_complex_regex':
        for (let i = 0; i < count; i++) {
          const userId = 1000 + (i % 999);
          const productId = `product-${i % 50}`;
          const reviewId = i % 100;
          cases.push({
            domain: 'complex.example.com',
            path: `/api/v1/products/${productId}/reviews/${reviewId}`,
            method: 'GET',
            expected: `/backend/api/v1/product-reviews/${productId}/${reviewId}`
          });
        }
        break;

      case 'cache_performance':
        // Generate repeated requests to test cache performance
        const cachedPaths = ['/home', '/about', '/contact', '/products', '/services'];
        for (let i = 0; i < count; i++) {
          const path = cachedPaths[i % cachedPaths.length];
          cases.push({
            domain: 'ddt.com',
            path: path,
            method: 'GET',
            expected: `/ddt${path}`
          });
        }
        break;

      case 'mixed_workload':
        const domains = ['ddt.com', 'blog.allabout.network', 'api.example.com', 'static.example.com'];
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        for (let i = 0; i < count; i++) {
          const domain = domains[i % domains.length];
          let path, expected;
          
          if (domain === 'api.example.com') {
            path = `/v1/users/${1000 + (i % 999)}`;
            expected = `/api/v1/users/${1000 + (i % 999)}`;
          } else if (domain === 'ddt.com') {
            path = `/resource-${i % 50}`;
            expected = `/ddt/resource-${i % 50}`;
          } else if (domain === 'blog.allabout.network') {
            path = `/post-${i % 30}`;
            expected = `/blog/post-${i % 30}`;
          } else {
            path = `/asset-${i % 20}.css`;
            expected = `/static/asset-${i % 20}.css`;
          }
          
          cases.push({
            domain: domain,
            path: path,
            method: methods[i % methods.length],
            expected: expected
          });
        }
        break;

      case 'error_scenarios':
        for (let i = 0; i < count; i++) {
          cases.push({
            domain: `unknown-domain-${i % 10}.com`,
            path: `/test-${i}`,
            method: 'GET',
            expected: `/test-${i}` // Should fallback to original path
          });
        }
        break;
    }

    return cases;
  }

  /**
   * Run a single benchmark scenario
   */
  async runBenchmark(testName, iterations = 10000) {
    console.log(`\n🚀 Running benchmark: ${testName} (${iterations} iterations)`);
    
    const testCases = this.generateTestCases(testName, iterations);
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    let successCount = 0;
    let errorCount = 0;
    let correctTransformations = 0;
    const durations = [];
    const errors = [];

    // Warm up the cache with a few requests
    if (testName === 'cache_performance') {
      for (let i = 0; i < 100; i++) {
        const testCase = testCases[i % testCases.length];
        this.pathRewriter.transformPath(testCase.domain, testCase.path, testCase.method);
      }
    }

    // Run the actual benchmark
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const caseStart = process.hrtime.bigint();
      
      try {
        const result = this.pathRewriter.transformPath(
          testCase.domain,
          testCase.path,
          testCase.method,
          `bench-${testName}-${i}`
        );
        
        const caseDuration = Number(process.hrtime.bigint() - caseStart) / 1000000; // Convert to ms
        durations.push(caseDuration);
        successCount++;
        
        // Verify transformation correctness
        if (result.transformedPath === testCase.expected) {
          correctTransformations++;
        }
        
      } catch (error) {
        errorCount++;
        errors.push({
          testCase,
          error: error.message
        });
      }
    }

    const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to ms
    const endMemory = process.memoryUsage();
    
    const result = {
      testName,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      throughput: iterations / (totalTime / 1000), // ops per second
      successCount,
      errorCount,
      correctTransformations,
      errorRate: errorCount / iterations,
      accuracyRate: correctTransformations / successCount,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal
      },
      percentiles: this.calculatePercentiles(durations),
      pathRewriterStats: this.pathRewriter.getStats(),
      errors: errors.slice(0, 5) // Keep first 5 errors for analysis
    };

    this.results.push(result);
    this.printResults(result);
    
    return result;
  }

  /**
   * Calculate performance percentiles
   */
  calculatePercentiles(durations) {
    if (durations.length === 0) return {};
    
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

  /**
   * Print benchmark results
   */
  printResults(result) {
    console.log(`\n📊 ${result.testName} Results:`);
    console.log(`   Iterations: ${result.iterations.toLocaleString()}`);
    console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`   Average Time: ${result.averageTime.toFixed(4)}ms`);
    console.log(`   Throughput: ${result.throughput.toFixed(0)} ops/sec`);
    console.log(`   Success Rate: ${((result.successCount / result.iterations) * 100).toFixed(2)}%`);
    console.log(`   Accuracy Rate: ${(result.accuracyRate * 100).toFixed(2)}%`);
    console.log(`   Memory Delta: RSS ${(result.memoryDelta.rss / 1024 / 1024).toFixed(2)}MB`);
    
    if (result.percentiles.p50) {
      console.log(`   Percentiles (ms):`);
      console.log(`     P50: ${result.percentiles.p50.toFixed(4)}`);
      console.log(`     P90: ${result.percentiles.p90.toFixed(4)}`);
      console.log(`     P95: ${result.percentiles.p95.toFixed(4)}`);
      console.log(`     P99: ${result.percentiles.p99.toFixed(4)}`);
      console.log(`     Min: ${result.percentiles.min.toFixed(4)}`);
      console.log(`     Max: ${result.percentiles.max.toFixed(4)}`);
    }
    
    if (result.pathRewriterStats.cacheHitRate) {
      console.log(`   Cache Hit Rate: ${(result.pathRewriterStats.cacheHitRate * 100).toFixed(2)}%`);
    }
    
    if (result.errors.length > 0) {
      console.log(`   Sample Errors:`);
      result.errors.forEach((error, i) => {
        console.log(`     ${i + 1}. ${error.error}`);
      });
    }
  }

  /**
   * Run concurrent benchmark to test under load
   */
  async runConcurrentBenchmark(testName, concurrency = 10, requestsPerWorker = 1000) {
    console.log(`\n🔥 Running concurrent benchmark: ${testName}`);
    console.log(`   Concurrency: ${concurrency} workers`);
    console.log(`   Requests per worker: ${requestsPerWorker}`);
    
    const workers = [];
    const startTime = Date.now();
    
    for (let i = 0; i < concurrency; i++) {
      workers.push(this.runWorker(testName, requestsPerWorker, i));
    }
    
    const workerResults = await Promise.all(workers);
    const endTime = Date.now();
    
    const totalRequests = concurrency * requestsPerWorker;
    const totalTime = endTime - startTime;
    const throughput = totalRequests / (totalTime / 1000);
    
    const aggregatedResult = {
      testName: `${testName}_concurrent`,
      concurrency,
      requestsPerWorker,
      totalRequests,
      totalTime,
      throughput,
      workerResults,
      pathRewriterStats: this.pathRewriter.getStats()
    };
    
    console.log(`\n📈 Concurrent Benchmark Results:`);
    console.log(`   Total Requests: ${totalRequests.toLocaleString()}`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Throughput: ${throughput.toFixed(0)} req/sec`);
    console.log(`   Average per worker: ${(throughput / concurrency).toFixed(0)} req/sec`);
    
    return aggregatedResult;
  }

  /**
   * Worker function for concurrent testing
   */
  async runWorker(testName, requests, workerId) {
    const testCases = this.generateTestCases(testName, requests);
    const startTime = Date.now();
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const testCase of testCases) {
      try {
        this.pathRewriter.transformPath(
          testCase.domain,
          testCase.path,
          testCase.method,
          `worker-${workerId}-${successCount + errorCount}`
        );
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    const endTime = Date.now();
    
    return {
      workerId,
      requests,
      successCount,
      errorCount,
      duration: endTime - startTime,
      throughput: requests / ((endTime - startTime) / 1000)
    };
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport() {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      },
      configuration: {
        maxCacheSize: this.pathRewriter?.config?.maxCacheSize || 'N/A',
        slowThreshold: this.pathRewriter?.slowThreshold || 'N/A',
        errorRateThreshold: this.pathRewriter?.errorRateThreshold || 'N/A',
        circuitBreakerEnabled: this.pathRewriter?.circuitBreakerEnabled || 'N/A'
      },
      results: this.results,
      summary: this.generateSummary()
    };

    const filename = `benchmark-report-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Performance report saved to: ${filename}`);
    return report;
  }

  /**
   * Generate performance summary
   */
  generateSummary() {
    if (this.results.length === 0) return {};

    const summary = {
      totalTests: this.results.length,
      totalIterations: this.results.reduce((sum, r) => sum + r.iterations, 0),
      averageThroughput: this.results.reduce((sum, r) => sum + r.throughput, 0) / this.results.length,
      fastestTest: this.results.reduce((fastest, r) => 
        r.averageTime < fastest.averageTime ? r : fastest
      ),
      slowestTest: this.results.reduce((slowest, r) => 
        r.averageTime > slowest.averageTime ? r : slowest
      ),
      overallAccuracy: this.results.reduce((sum, r) => sum + r.accuracyRate, 0) / this.results.length
    };

    return summary;
  }
}

/**
 * Main benchmark execution function
 */
async function runPerformanceTests() {
  console.log('🎯 Starting Performance Benchmark Suite');
  console.log('==========================================');
  
  const benchmark = new PerformanceBenchmark();
  benchmark.initializePathRewriter();
  
  try {
    // Run individual benchmarks
    await benchmark.runBenchmark('simple_prefix', 50000);
    await benchmark.runBenchmark('complex_regex', 20000);
    await benchmark.runBenchmark('very_complex_regex', 10000);
    await benchmark.runBenchmark('cache_performance', 100000);
    await benchmark.runBenchmark('mixed_workload', 30000);
    await benchmark.runBenchmark('error_scenarios', 5000);
    
    // Run concurrent benchmarks
    await benchmark.runConcurrentBenchmark('simple_prefix', 10, 5000);
    await benchmark.runConcurrentBenchmark('mixed_workload', 20, 2000);
    
    // Generate final report
    const report = benchmark.generateReport();
    
    console.log('\n🎉 Benchmark suite completed successfully!');
    console.log('\nSummary:');
    console.log(`  Total Tests: ${report.summary.totalTests}`);
    console.log(`  Total Iterations: ${report.summary.totalIterations.toLocaleString()}`);
    console.log(`  Average Throughput: ${report.summary.averageThroughput.toFixed(0)} ops/sec`);
    console.log(`  Fastest Test: ${report.summary.fastestTest.testName} (${report.summary.fastestTest.averageTime.toFixed(4)}ms)`);
    console.log(`  Slowest Test: ${report.summary.slowestTest.testName} (${report.summary.slowestTest.averageTime.toFixed(4)}ms)`);
    console.log(`  Overall Accuracy: ${(report.summary.overallAccuracy * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { PerformanceBenchmark, runPerformanceTests };

// Run benchmarks if this file is executed directly
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}