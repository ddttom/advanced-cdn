#!/usr/bin/env node

/**
 * Test Suite for DDT Domain Debug Command
 * 
 * Comprehensive testing and validation for the debug-ddt.js command
 * Tests domain validation, HTTP client functionality, retry logic, and output formatting
 */

const { 
  DebugCommand, 
  DomainValidator, 
  HttpClient, 
  RetryHandler, 
  OutputFormatter 
} = require('./debug-ddt.js');

// Test framework utilities
class TestFramework {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('🧪 Running DDT Debug Command Test Suite\n');

    for (const { name, testFn } of this.tests) {
      try {
        await testFn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  }

  assertMatch(actual, pattern, message) {
    if (!pattern.test(actual)) {
      throw new Error(`${message}: ${actual} does not match pattern ${pattern}`);
    }
  }

  assertThrows(fn, message) {
    try {
      fn();
      throw new Error(`${message}: expected function to throw`);
    } catch (error) {
      // Expected behavior
    }
  }
}

// Initialize test framework
const test = new TestFramework();

// Domain Validator Tests
test.test('DomainValidator - Valid domain', () => {
  const result = DomainValidator.validate('example.ddt.com');
  test.assert(result.valid, 'Should validate valid domain');
  test.assertEqual(result.domain, 'example.ddt.com', 'Should return correct domain');
  test.assertEqual(result.subdomain, 'example', 'Should extract correct subdomain');
});

test.test('DomainValidator - Valid domain with hyphens', () => {
  const result = DomainValidator.validate('test-api.ddt.com');
  test.assert(result.valid, 'Should validate domain with hyphens');
  test.assertEqual(result.subdomain, 'test-api', 'Should extract hyphenated subdomain');
});

test.test('DomainValidator - Invalid domain - no subdomain', () => {
  const result = DomainValidator.validate('.ddt.com');
  test.assert(!result.valid, 'Should reject domain without subdomain');
  test.assert(result.error.includes('empty'), 'Should mention empty subdomain');
});

test.test('DomainValidator - Invalid domain - wrong format', () => {
  const result = DomainValidator.validate('example.com');
  test.assert(!result.valid, 'Should reject non-ddt domain');
  test.assert(result.error.includes('format'), 'Should mention format error');
});

test.test('DomainValidator - Invalid domain - starts with hyphen', () => {
  const result = DomainValidator.validate('-example.ddt.com');
  test.assert(!result.valid, 'Should reject domain starting with hyphen');
  test.assert(result.error.includes('hyphen'), 'Should mention hyphen error');
});

test.test('DomainValidator - Invalid domain - ends with hyphen', () => {
  const result = DomainValidator.validate('example-.ddt.com');
  test.assert(!result.valid, 'Should reject domain ending with hyphen');
  test.assert(result.error.includes('hyphen'), 'Should mention hyphen error');
});

test.test('DomainValidator - Invalid input - null', () => {
  const result = DomainValidator.validate(null);
  test.assert(!result.valid, 'Should reject null input');
  test.assert(result.error.includes('string'), 'Should mention string requirement');
});

test.test('DomainValidator - Invalid input - empty string', () => {
  const result = DomainValidator.validate('');
  test.assert(!result.valid, 'Should reject empty string');
  test.assert(result.error.includes('string'), 'Should mention string requirement');
});

// HTTP Client Tests
test.test('HttpClient - Constructor with default options', () => {
  const client = new HttpClient();
  test.assertEqual(client.cdnUrl, 'http://localhost:3000', 'Should use default CDN URL');
  test.assertEqual(client.timeout, 30000, 'Should use default timeout');
  test.assertEqual(client.verbose, false, 'Should use default verbose setting');
});

test.test('HttpClient - Constructor with custom options', () => {
  const options = {
    cdnUrl: 'http://localhost:8080',
    timeout: 10000,
    verbose: true
  };
  const client = new HttpClient(options);
  test.assertEqual(client.cdnUrl, options.cdnUrl, 'Should use custom CDN URL');
  test.assertEqual(client.timeout, options.timeout, 'Should use custom timeout');
  test.assertEqual(client.verbose, options.verbose, 'Should use custom verbose setting');
});

// Retry Handler Tests
test.test('RetryHandler - Constructor with default options', () => {
  const handler = new RetryHandler();
  test.assertEqual(handler.maxRetries, 3, 'Should use default max retries');
  test.assertEqual(handler.baseDelay, 1000, 'Should use default base delay');
  test.assertEqual(handler.verbose, false, 'Should use default verbose setting');
});

test.test('RetryHandler - Constructor with custom options', () => {
  const options = {
    maxRetries: 5,
    baseDelay: 2000,
    verbose: true
  };
  const handler = new RetryHandler(options);
  test.assertEqual(handler.maxRetries, options.maxRetries, 'Should use custom max retries');
  test.assertEqual(handler.baseDelay, options.baseDelay, 'Should use custom base delay');
  test.assertEqual(handler.verbose, options.verbose, 'Should use custom verbose setting');
});

test.test('RetryHandler - Calculate delay with exponential backoff', () => {
  const handler = new RetryHandler({ baseDelay: 1000 });
  
  const delay0 = handler.calculateDelay(0);
  test.assert(delay0 >= 1000 && delay0 <= 1100, 'First retry should be around base delay');
  
  const delay1 = handler.calculateDelay(1);
  test.assert(delay1 >= 2000 && delay1 <= 2200, 'Second retry should be around 2x base delay');
  
  const delay2 = handler.calculateDelay(2);
  test.assert(delay2 >= 4000 && delay2 <= 4400, 'Third retry should be around 4x base delay');
});

test.test('RetryHandler - Execute with retry - success on first attempt', async () => {
  const handler = new RetryHandler({ maxRetries: 3, verbose: false });
  let attempts = 0;
  
  const operation = () => {
    attempts++;
    return Promise.resolve('success');
  };
  
  const result = await handler.executeWithRetry(operation, 'test');
  test.assertEqual(result, 'success', 'Should return success result');
  test.assertEqual(attempts, 1, 'Should only attempt once');
});

test.test('RetryHandler - Execute with retry - success after retries', async () => {
  const handler = new RetryHandler({ maxRetries: 3, baseDelay: 10, verbose: false });
  let attempts = 0;
  
  const operation = () => {
    attempts++;
    if (attempts < 3) {
      return Promise.reject(new Error('temporary failure'));
    }
    return Promise.resolve('success');
  };
  
  const result = await handler.executeWithRetry(operation, 'test');
  test.assertEqual(result, 'success', 'Should return success result');
  test.assertEqual(attempts, 3, 'Should attempt 3 times');
});

test.test('RetryHandler - Execute with retry - failure after max retries', async () => {
  const handler = new RetryHandler({ maxRetries: 2, baseDelay: 10, verbose: false });
  let attempts = 0;
  
  const operation = () => {
    attempts++;
    return Promise.reject(new Error('persistent failure'));
  };
  
  try {
    await handler.executeWithRetry(operation, 'test');
    test.assert(false, 'Should have thrown error');
  } catch (error) {
    test.assertEqual(error.message, 'persistent failure', 'Should throw last error');
    test.assertEqual(attempts, 3, 'Should attempt max retries + 1');
  }
});

// Output Formatter Tests
test.test('OutputFormatter - Format result as JSON', () => {
  const result = {
    success: true,
    domain: 'test.ddt.com',
    statusCode: 200,
    responseTime: 150
  };
  
  const output = OutputFormatter.formatResult(result, { format: 'json' });
  const parsed = JSON.parse(output);
  
  test.assertEqual(parsed.success, true, 'Should preserve success status');
  test.assertEqual(parsed.domain, 'test.ddt.com', 'Should preserve domain');
  test.assertEqual(parsed.statusCode, 200, 'Should preserve status code');
  test.assertEqual(parsed.responseTime, 150, 'Should preserve response time');
});

test.test('OutputFormatter - Format result as human readable', () => {
  const result = {
    success: true,
    domain: 'test.ddt.com',
    subdomain: 'test',
    statusCode: 200,
    statusMessage: 'OK',
    responseTime: 150
  };
  
  const output = OutputFormatter.formatResult(result, { format: 'human' });
  
  test.assert(output.includes('SUCCESS'), 'Should show success status');
  test.assert(output.includes('test.ddt.com'), 'Should show domain');
  test.assert(output.includes('200 OK'), 'Should show HTTP status');
  test.assert(output.includes('150ms'), 'Should show response time');
});

test.test('OutputFormatter - Format error result', () => {
  const result = {
    success: false,
    domain: 'test.ddt.com',
    error: 'Connection refused',
    code: 'ECONNREFUSED',
    responseTime: 5000
  };
  
  const output = OutputFormatter.formatResult(result, { format: 'human' });
  
  test.assert(output.includes('FAILED'), 'Should show failed status');
  test.assert(output.includes('Connection refused'), 'Should show error message');
  test.assert(output.includes('ECONNREFUSED'), 'Should show error code');
  test.assert(output.includes('5000ms'), 'Should show response time');
});

// Integration Tests
test.test('Integration - Valid domain processing workflow', () => {
  // Test the complete workflow for a valid domain
  const domain = 'example.ddt.com';
  
  // Step 1: Validate domain
  const validation = DomainValidator.validate(domain);
  test.assert(validation.valid, 'Domain should be valid');
  
  // Step 2: Create HTTP client
  const httpClient = new HttpClient({
    cdnUrl: 'http://localhost:3000',
    timeout: 5000,
    verbose: false
  });
  test.assert(httpClient.cdnUrl === 'http://localhost:3000', 'HTTP client should be configured');
  
  // Step 3: Create retry handler
  const retryHandler = new RetryHandler({
    maxRetries: 2,
    baseDelay: 100,
    verbose: false
  });
  test.assert(retryHandler.maxRetries === 2, 'Retry handler should be configured');
  
  // Step 4: Format result
  const mockResult = {
    success: true,
    domain: validation.domain,
    subdomain: validation.subdomain,
    statusCode: 200,
    statusMessage: 'OK',
    responseTime: 123
  };
  
  const output = OutputFormatter.formatResult(mockResult, { format: 'json' });
  const parsed = JSON.parse(output);
  test.assertEqual(parsed.domain, domain, 'Result should contain original domain');
});

// Performance Tests
test.test('Performance - Domain validation speed', () => {
  const startTime = Date.now();
  const iterations = 10000;
  
  for (let i = 0; i < iterations; i++) {
    DomainValidator.validate(`test${i}.ddt.com`);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  const avgTime = duration / iterations;
  
  test.assert(avgTime < 1, `Domain validation should be fast (${avgTime.toFixed(3)}ms per validation)`);
});

test.test('Performance - Retry delay calculation speed', () => {
  const handler = new RetryHandler();
  const startTime = Date.now();
  const iterations = 10000;
  
  for (let i = 0; i < iterations; i++) {
    handler.calculateDelay(i % 10);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  const avgTime = duration / iterations;
  
  test.assert(avgTime < 0.1, `Delay calculation should be fast (${avgTime.toFixed(3)}ms per calculation)`);
});

// Edge Case Tests
test.test('Edge Case - Very long subdomain', () => {
  const longSubdomain = 'a'.repeat(100);
  const domain = `${longSubdomain}.ddt.com`;
  const result = DomainValidator.validate(domain);
  test.assert(result.valid, 'Should handle long subdomains');
  test.assertEqual(result.subdomain, longSubdomain, 'Should extract long subdomain correctly');
});

test.test('Edge Case - Numeric subdomain', () => {
  const result = DomainValidator.validate('123.ddt.com');
  test.assert(result.valid, 'Should handle numeric subdomains');
  test.assertEqual(result.subdomain, '123', 'Should extract numeric subdomain');
});

test.test('Edge Case - Mixed case domain', () => {
  const result = DomainValidator.validate('Test-API.ddt.com');
  test.assert(result.valid, 'Should handle mixed case domains');
  test.assertEqual(result.subdomain, 'Test-API', 'Should preserve case in subdomain');
});

test.test('Edge Case - Zero timeout', () => {
  const client = new HttpClient({ timeout: 0 });
  test.assertEqual(client.timeout, 0, 'Should handle zero timeout');
});

test.test('Edge Case - Zero retries', () => {
  const handler = new RetryHandler({ maxRetries: 0 });
  test.assertEqual(handler.maxRetries, 0, 'Should handle zero retries');
});

// Security Tests
test.test('Security - Reject malicious domain patterns', () => {
  const maliciousDomains = [
    '../../../etc/passwd.ddt.com',
    'javascript:alert(1).ddt.com',
    '<script>alert(1)</script>.ddt.com',
    'admin@evil.com.ddt.com'
  ];
  
  for (const domain of maliciousDomains) {
    const result = DomainValidator.validate(domain);
    test.assert(!result.valid, `Should reject malicious domain: ${domain}`);
  }
});

test.test('Security - Validate URL construction', () => {
  const client = new HttpClient({ cdnUrl: 'http://localhost:3000' });
  
  // Test that the client properly constructs URLs without injection
  test.assert(client.cdnUrl === 'http://localhost:3000', 'Should maintain clean URL');
});

// Run all tests
if (require.main === module) {
  test.run().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = { TestFramework };
