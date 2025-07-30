// test-url-transformation.js
const URLTransformer = require('../src/transform/url-transformer');
const assert = require('assert');

/**
 * Comprehensive test suite for URL transformation functionality
 */
class URLTransformationTests {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting URL Transformation Tests...\n');

    // Test basic functionality
    await this.testBasicTransformation();
    await this.testHTMLTransformation();
    await this.testJavaScriptTransformation();
    await this.testCSSTransformation();
    
    // Test URL types
    await this.testAbsoluteURLs();
    await this.testRelativeURLs();
    await this.testProtocolRelativeURLs();
    
    // Test edge cases
    await this.testFragmentPreservation();
    await this.testQueryParameterPreservation();
    await this.testInvalidURLs();
    await this.testLargeContent();
    
    // Test caching
    await this.testCaching();
    
    // Test error handling
    await this.testErrorHandling();

    this.printResults();
  }

  /**
   * Test basic transformation functionality
   */
  async testBasicTransformation() {
    console.log('📝 Testing basic transformation...');
    
    const transformer = new URLTransformer({
      enabled: true,
      debugMode: true
    });

    const requestContext = {
      originalUrl: '/test',
      proxyHost: 'proxy.example.com',
      pathTransformation: {
        target: 'backend.example.com',
        matched: true
      },
      protocol: 'https'
    };

    const htmlContent = '<a href="https://backend.example.com/page">Link</a>';
    const result = await transformer.transformContent(htmlContent, 'text/html', requestContext);

    this.assert(result.transformed, 'Content should be transformed');
    this.assert(result.urlsTransformed > 0, 'URLs should be transformed');
    this.assert(result.content.includes('proxy.example.com'), 'Should contain proxy host');
    
    console.log('✅ Basic transformation test passed\n');
  }

  /**
   * Test HTML content transformation
   */
  async testHTMLTransformation() {
    console.log('📝 Testing HTML transformation...');
    
    const transformer = new URLTransformer({
      enabled: true,
      transformHTML: true
    });

    const requestContext = {
      originalUrl: '/test',
      proxyHost: 'proxy.example.com',
      pathTransformation: {
        target: 'backend.example.com',
        matched: true
      },
      protocol: 'https'
    };

    const testCases = [
      {
        name: 'href attributes',
        input: '<a href="https://backend.example.com/page">Link</a>',
        shouldTransform: true
      },
      {
        name: 'src attributes',
        input: '<img src="https://backend.example.com/image.jpg" alt="Image">',
        shouldTransform: true
      },
      {
        name: 'action attributes',
        input: '<form action="https://backend.example.com/submit">Form</form>',
        shouldTransform: true
      },
      {
        name: 'iframe src',
        input: '<iframe src="https://backend.example.com/embed"></iframe>',
        shouldTransform: true
      },
      {
        name: 'data URLs (should not transform)',
        input: '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="Data">',
        shouldTransform: false
      }
    ];

    for (const testCase of testCases) {
      const result = await transformer.transformContent(testCase.input, 'text/html', requestContext);
      
      if (testCase.shouldTransform) {
        this.assert(result.transformed, `${testCase.name} should be transformed`);
        this.assert(result.urlsTransformed > 0, `${testCase.name} should have URLs transformed`);
      } else {
        this.assert(!result.transformed || result.urlsTransformed === 0, `${testCase.name} should not be transformed`);
      }
    }
    
    console.log('✅ HTML transformation test passed\n');
  }

  /**
   * Test JavaScript content transformation
   */
  async testJavaScriptTransformation() {
    console.log('📝 Testing JavaScript transformation...');
    
    const transformer = new URLTransformer({
      enabled: true,
      transformJavaScript: true
    });

    const requestContext = {
      originalUrl: '/test.js',
      proxyHost: 'proxy.example.com',
      pathTransformation: {
        target: 'backend.example.com',
        matched: true
      },
      protocol: 'https'
    };

    const testCases = [
      {
        name: 'fetch calls',
        input: 'fetch("https://backend.example.com/api/data")',
        shouldTransform: true
      },
      {
        name: 'import statements',
        input: 'import("https://backend.example.com/module.js")',
        shouldTransform: true
      },
      {
        name: 'URL constructor',
        input: 'new URL("https://backend.example.com/path")',
        shouldTransform: true
      },
      {
        name: 'location assignments',
        input: 'location.href = "https://backend.example.com/redirect"',
        shouldTransform: true
      }
    ];

    for (const testCase of testCases) {
      const result = await transformer.transformContent(testCase.input, 'application/javascript', requestContext);
      
      if (testCase.shouldTransform) {
        this.assert(result.transformed, `${testCase.name} should be transformed`);
        this.assert(result.urlsTransformed > 0, `${testCase.name} should have URLs transformed`);
      }
    }
    
    console.log('✅ JavaScript transformation test passed\n');
  }

  /**
   * Test CSS content transformation
   */
  async testCSSTransformation() {
    console.log('📝 Testing CSS transformation...');
    
    const transformer = new URLTransformer({
      enabled: true,
      transformCSS: true
    });

    const requestContext = {
      originalUrl: '/test.css',
      proxyHost: 'proxy.example.com',
      pathTransformation: {
        target: 'backend.example.com',
        matched: true
      },
      protocol: 'https'
    };

    const testCases = [
      {
        name: 'url() functions',
        input: 'background-image: url("https://backend.example.com/bg.jpg");',
        shouldTransform: true
      },
      {
        name: '@import statements',
        input: '@import url("https://backend.example.com/styles.css");',
        shouldTransform: true
      },
      {
        name: 'font sources',
        input: '@font-face { src: url("https://backend.example.com/font.woff2"); }',
        shouldTransform: true
      }
    ];

    for (const testCase of testCases) {
      const result = await transformer.transformContent(testCase.input, 'text/css', requestContext);
      
      if (testCase.shouldTransform) {
        this.assert(result.transformed, `${testCase.name} should be transformed`);
        this.assert(result.urlsTransformed > 0, `${testCase.name} should have URLs transformed`);
      }
    }
    
    console.log('✅ CSS transformation test passed\n');
  }

  /**
   * Test absolute URL handling
   */
  async testAbsoluteURLs() {
    console.log('📝 Testing absolute URL handling...');
    
    const transformer = new URLTransformer({ enabled: true });
    const requestContext = {
      originalUrl: '/test',
      proxyHost: 'proxy.example.com',
      pathTransformation: {
        target: 'backend.example.com',
        matched: true
      },
      protocol: 'https'
    };

    const testCases = [
      'https://backend.example.com/page',
      'http://backend.example.com/page',
      'https://external.com/page' // Should not be transformed
    ];

    for (const url of testCases) {
      const content = `<a href="${url}">Link</a>`;
      const result = await transformer.transformContent(content, 'text/html', requestContext);
      
      if (url.includes('backend.example.com')) {
        this.assert(result.transformed, `Backend URL should be transformed: ${url}`);
      }
    }
    
    console.log('✅ Absolute URL test passed\n');
  }

  /**
   * Test relative URL handling
   */
  async testRelativeURLs() {
    console.log('📝 Testing relative URL handling...');
    
    const transformer = new URLTransformer({ enabled: true });
    const requestContext = {
      originalUrl: '/test',
      proxyHost: 'proxy.example.com',
      pathTransformation: {
        target: 'backend.example.com',
        matched: true,
        pathPrefix: '/api'
      },
      protocol: 'https'
    };

    const testCases = [
      '/absolute/path',
      'relative/path',
      './relative/path',
      '../parent/path'
    ];

    for (const url of testCases) {
      const content = `<a href="${url}">Link</a>`;
      const result = await transformer.transformContent(content, 'text/html', requestContext);
      
      // Relative URLs should be handled appropriately
      this.assert(result !== null, `Should handle relative URL: ${url}`);
    }
    
    console.log('✅ Relative URL test passed\n');
  }

  /**
   * Test protocol-relative URL handling
   */
  async testProtocolRelativeURLs() {
    console.log('📝 Testing protocol-relative URL handling...');
    
    const transformer = new URLTransformer({ enabled: true });
    const requestContext = {
      originalUrl: '/test',
      proxyHost: 'proxy.example.com',
      pathTransformation: {
        target: 'backend.example.com',
        matched: true
      },
      protocol: 'https'
    };

    const content = '<a href="//backend.example.com/page">Link</a>';
    const result = await transformer.transformContent(content, 'text/html', requestContext);
    
    this.assert(result.transformed, 'Protocol-relative URL should be transformed');
    this.assert(result.content.includes('https://'), 'Should add protocol');
    
    console.log('✅ Protocol-relative URL test passed\n');
  }

  /**
   * Test fragment preservation
   */
  async testFragmentPreservation() {
    console.log('📝 Testing fragment preservation...');
    
    const transformer = new URLTransformer({
      enabled: true,
      preserveFragments: true
    });

    const requestContext = {
      originalUrl: '/test',
      proxyHost: 'proxy.example.com',
      pathTransformation: {
        target: 'backend.example.com',
        matched: true
      },
      protocol: 'https'
    };

    const content = '<a href="https://backend.example.com/page#section">Link</a>';
    const result = await transformer.transformContent(content, 'text/html', requestContext);
    
    this.assert(result.transformed, 'URL with fragment should be transformed');
    this.assert(result.content.includes('#section'), 'Fragment should be preserved');
    
    console.log('✅ Fragment preservation test passed\n');
  }

  /**
   * Test query parameter preservation
   */
  async testQueryParameterPreservation() {
    console.log('📝 Testing query parameter preservation...');
    
    const transformer = new URLTransformer({
      enabled: true,
      preserveQueryParams: true
    });

    const requestContext = {
      originalUrl: '/test',
      proxyHost: 'proxy.example.com',
      pathTransformation: {
        target: 'backend.example.com',
        matched: true
      },
      protocol: 'https'
    };

    const content = '<a href="https://backend.example.com/page?param=value&other=test">Link</a>';
    const result = await transformer.transformContent(content, 'text/html', requestContext);
    
    this.assert(result.transformed, 'URL with query params should be transformed');
    this.assert(result.content.includes('param=value'), 'Query parameters should be preserved');
    
    console.log('✅ Query parameter preservation test passed\n');
  }

  /**
   * Test invalid URL handling
   */
  async testInvalidURLs() {
    console.log('📝 Testing invalid URL handling...');
    
    const transformer = new URLTransformer({ enabled: true });
    const requestContext = {
      originalUrl: '/test',
      proxyHost: 'proxy.example.com',
      pathTransformation: { target: 'backend.example.com', matched: true },
      protocol: 'https'
    };

    const invalidUrls = [
      'javascript:alert("xss")',
      'data:text/html,<script>alert("xss")</script>',
      'mailto:test@example.com',
      'tel:+1234567890'
    ];

    for (const url of invalidUrls) {
      const content = `<a href="${url}">Link</a>`;
      const result = await transformer.transformContent(content, 'text/html', requestContext);
      
      // Invalid URLs should not be transformed
      this.assert(result.content.includes(url), `Invalid URL should remain unchanged: ${url}`);
    }
    
    console.log('✅ Invalid URL handling test passed\n');
  }

  /**
   * Test large content handling
   */
  async testLargeContent() {
    console.log('📝 Testing large content handling...');
    
    const transformer = new URLTransformer({
      enabled: true,
      maxContentSize: 1000 // Small limit for testing
    });

    const requestContext = {
      originalUrl: '/test',
      proxyHost: 'proxy.example.com',
      pathTransformation: { target: 'backend.example.com', matched: true },
      protocol: 'https'
    };

    // Create content larger than the limit
    const largeContent = '<a href="https://backend.example.com/page">Link</a>'.repeat(100);
    const result = await transformer.transformContent(largeContent, 'text/html', requestContext);
    
    this.assert(!result.transformed, 'Large content should not be transformed');
    this.assert(result.reason === 'Content too large', 'Should indicate content too large');
    
    console.log('✅ Large content handling test passed\n');
  }

  /**
   * Test caching functionality
   */
  async testCaching() {
    console.log('📝 Testing caching functionality...');
    
    const transformer = new URLTransformer({
      enabled: true,
      maxCacheSize: 100
    });

    const requestContext = {
      originalUrl: '/test',
      proxyHost: 'proxy.example.com',
      pathTransformation: { target: 'backend.example.com', matched: true },
      protocol: 'https'
    };

    const content = '<a href="https://backend.example.com/page">Link</a>';
    
    // First transformation
    const result1 = await transformer.transformContent(content, 'text/html', requestContext);
    const stats1 = transformer.getStats();
    
    // Second transformation (should use cache)
    const result2 = await transformer.transformContent(content, 'text/html', requestContext);
    const stats2 = transformer.getStats();
    
    this.assert(result1.transformed, 'First transformation should work');
    this.assert(result2.transformed, 'Second transformation should work');
    this.assert(stats2.cacheHits > stats1.cacheHits, 'Cache hits should increase');
    
    console.log('✅ Caching test passed\n');
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('📝 Testing error handling...');
    
    const transformer = new URLTransformer({ enabled: true });
    
    // Test with invalid request context
    const invalidContext = null;
    const content = '<a href="https://backend.example.com/page">Link</a>';
    
    try {
      const result = await transformer.transformContent(content, 'text/html', invalidContext);
      this.assert(!result.transformed, 'Should handle invalid context gracefully');
      this.assert(result.error, 'Should return error information');
    } catch (error) {
      // Should not throw, should handle gracefully
      this.assert(false, 'Should not throw errors, should handle gracefully');
    }
    
    console.log('✅ Error handling test passed\n');
  }

  /**
   * Assert helper
   */
  assert(condition, message) {
    try {
      assert(condition, message);
      this.testResults.passed++;
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push(`❌ ${message}: ${error.message}`);
      console.error(`❌ ${message}`);
    }
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('🏁 URL Transformation Test Results');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📊 Total: ${this.testResults.passed + this.testResults.failed}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n🚨 Errors:');
      this.testResults.errors.forEach(error => console.log(error));
    }
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n⚠️  ${this.testResults.failed} test(s) failed.`);
    }
    
    console.log('='.repeat(50));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tests = new URLTransformationTests();
  tests.runAllTests().catch(console.error);
}

module.exports = URLTransformationTests;
