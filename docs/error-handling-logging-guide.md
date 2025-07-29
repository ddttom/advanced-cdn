# Error Handling and Logging Guide

This document provides comprehensive guidance on error handling and logging for the CDN application, including domain-to-path prefix rewriting and file resolution systems, with detailed examples and troubleshooting scenarios.

## Overview

The domain-to-path prefix rewriting system includes multiple layers of error handling and logging to ensure robust operation and easy debugging:

1. **Configuration Validation**: Validates domain mappings and rules at startup
2. **Runtime Error Handling**: Graceful handling of transformation errors
3. **Fallback Mechanisms**: Automatic fallback when rules fail
4. **Comprehensive Logging**: Detailed logging at multiple levels
5. **Performance Monitoring**: Error rate tracking and alerting

## Error Categories

### 1. Configuration Errors

These errors occur during application startup or configuration reload.

#### Invalid Domain Format

```javascript
// Error Example
{
  "error": "INVALID_DOMAIN_FORMAT",
  "message": "Domain 'invalid..domain' contains invalid characters",
  "domain": "invalid..domain",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "severity": "error"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [path-rewriter] Failed to compile rule for domain invalid..domain: Domain 'invalid..domain' contains invalid characters
```

#### Missing Target Configuration

```javascript
// Error Example
{
  "error": "MISSING_TARGET",
  "message": "No target specified for domain 'api.example.com' and no default target configured",
  "domain": "api.example.com",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "severity": "error"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [path-rewriter] No target specified for domain: api.example.com
```

#### Invalid Regex Pattern

```javascript
// Error Example
{
  "error": "INVALID_REGEX",
  "message": "Invalid regex pattern '^/v1/(' in rule 0 for domain api.example.com: Unterminated group",
  "domain": "api.example.com",
  "ruleIndex": 0,
  "pattern": "^/v1/(",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "severity": "error"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [path-rewriter] Invalid regex pattern in rule 0 for domain api.example.com: Unterminated group
```

### 2. Runtime Transformation Errors

These errors occur during request processing.

#### Path Transformation Failure

```javascript
// Error Example
{
  "error": "TRANSFORMATION_FAILED",
  "message": "Failed to transform path '/api/users' for domain 'api.example.com': Regex execution error",
  "domain": "api.example.com",
  "originalPath": "/api/users",
  "rulePattern": "^/api/(.+)$",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req-123456",
  "severity": "error"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [path-rewriter] Path transformation error for api.example.com/api/users: Regex execution error
```

#### Domain Not Found

```javascript
// Error Example
{
  "error": "DOMAIN_NOT_CONFIGURED",
  "message": "No routing configuration found for domain 'unknown.example.com'",
  "domain": "unknown.example.com",
  "originalPath": "/test",
  "fallbackUsed": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req-123457",
  "severity": "warning"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 warn: [path-rewriter] No routing configuration found for domain: unknown.example.com, using fallback
```

### 3. Performance and Resource Errors

#### Cache Overflow

```javascript
// Error Example
{
  "error": "CACHE_OVERFLOW",
  "message": "Path rewriter cache exceeded maximum size (10000), performing cleanup",
  "cacheSize": 10000,
  "maxCacheSize": 10000,
  "cleanupPerformed": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "severity": "warning"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 warn: [path-rewriter] Cache size exceeded limit, performing cleanup
```

#### Rule Compilation Timeout

```javascript
// Error Example
{
  "error": "RULE_COMPILATION_TIMEOUT",
  "message": "Rule compilation for domain 'complex.example.com' exceeded timeout (5000ms)",
  "domain": "complex.example.com",
  "timeout": 5000,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "severity": "error"
}
```

## Logging Levels and Examples

### DEBUG Level

Used for detailed debugging information during development.

```javascript
// Path transformation success
logger.debug('Path transformation successful', {
  domain: 'ddt.com',
  originalPath: '/about',
  transformedPath: '/ddt/about',
  target: 'main--allaboutv2--ddttom.hlx.live',
  ruleMatched: true,
  cacheHit: false,
  transformationTime: 0.0012
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 debug: [path-rewriter] Transformed ddt.com/about → main--allaboutv2--ddttom.hlx.live/ddt/about
```

```javascript
// Cache operations
logger.debug('Cache operation', {
  operation: 'hit',
  cacheKey: 'ddt.com:/about:GET',
  domain: 'ddt.com',
  path: '/about',
  method: 'GET'
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 debug: [path-rewriter] Cache hit for ddt.com:/about:GET: /about → /ddt/about
```

### INFO Level

Used for general operational information.

```javascript
// System initialization
logger.info('Path rewriter initialized', {
  rulesLoaded: 5,
  domainsConfigured: ['ddt.com', 'blog.allabout.network', 'api.example.com'],
  cacheEnabled: true,
  fallbackEnabled: true
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 info: [path-rewriter] Path rewriter initialized with 5 domain mappings
```

```javascript
// Rule reload
logger.info('Rules reloaded successfully', {
  previousRuleCount: 5,
  newRuleCount: 7,
  domainsAdded: ['new-domain.com', 'another.com'],
  domainsRemoved: [],
  reloadTime: 0.045
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 info: [path-rewriter] Successfully reloaded routing rules
```

### WARN Level

Used for potentially problematic situations that don't prevent operation.

```javascript
// Fallback usage
logger.warn('Using fallback transformation', {
  domain: 'unmapped.example.com',
  originalPath: '/test',
  fallbackPath: '/default/test',
  reason: 'no_rule_match'
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 warn: [path-rewriter] No routing configuration found for domain: unmapped.example.com, using fallback
```

```javascript
// Performance warning
logger.warn('High transformation latency detected', {
  domain: 'complex.example.com',
  path: '/complex/nested/path',
  transformationTime: 0.150,
  threshold: 0.100,
  ruleComplexity: 'high'
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 warn: [path-rewriter] High transformation latency (150ms) for complex.example.com/complex/nested/path
```

### ERROR Level

Used for errors that affect functionality but don't crash the application.

```javascript
// Rule compilation error
logger.error('Rule compilation failed', {
  domain: 'broken.example.com',
  error: 'Invalid regex pattern',
  pattern: '^/api/(',
  ruleIndex: 2,
  stack: error.stack
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [path-rewriter] Failed to compile rule for domain broken.example.com: Invalid regex pattern
```

```javascript
// Transformation error with recovery
logger.error('Transformation failed, using passthrough', {
  domain: 'api.example.com',
  originalPath: '/users/123',
  error: 'Regex execution failed',
  fallbackUsed: true,
  requestId: 'req-123456'
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [path-rewriter] Path transformation error for api.example.com/users/123: Regex execution failed
```

## Error Recovery Mechanisms

### 1. Graceful Degradation

When path transformation fails, the system automatically falls back to safe defaults:

```javascript
// Example: Transformation failure with graceful degradation
try {
  const result = pathRewriter.transformPath(domain, originalPath, method);
  return result;
} catch (error) {
  logger.error('Transformation failed, using passthrough', {
    domain,
    originalPath,
    error: error.message,
    fallbackUsed: true
  });
  
  return {
    domain,
    originalPath,
    transformedPath: originalPath, // Passthrough
    target: config.defaultTarget,
    method,
    matched: false,
    error: error.message,
    fallbackUsed: true
  };
}
```

### 2. Rule Validation and Rollback

When reloading rules, the system validates new rules before applying them:

```javascript
// Example: Safe rule reload with rollback
reloadRules(newRules) {
  // Backup current rules
  const backup = new Map(this.compiledRules);
  
  try {
    // Validate new rules
    const validation = this.validateRules(newRules);
    if (!validation.valid) {
      logger.error('Rule validation failed', {
        errors: validation.errors,
        warnings: validation.warnings
      });
      return false;
    }
    
    // Apply new rules
    this.loadRules(newRules);
    logger.info('Rules reloaded successfully');
    return true;
    
  } catch (error) {
    // Restore backup on failure
    this.compiledRules = backup;
    logger.error('Rule reload failed, restored backup', {
      error: error.message,
      rulesRestored: backup.size
    });
    return false;
  }
}
```

### 3. Circuit Breaker Pattern

For domains with high error rates, implement circuit breaker logic:

```javascript
// Example: Circuit breaker for problematic domains
class DomainCircuitBreaker {
  constructor(domain, threshold = 0.5, windowSize = 100) {
    this.domain = domain;
    this.threshold = threshold;
    this.windowSize = windowSize;
    this.failures = [];
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  recordFailure() {
    this.failures.push(Date.now());
    this.cleanup();
    
    const errorRate = this.failures.length / this.windowSize;
    if (errorRate > this.threshold && this.state === 'CLOSED') {
      this.state = 'OPEN';
      logger.warn('Circuit breaker opened for domain', {
        domain: this.domain,
        errorRate,
        threshold: this.threshold
      });
    }
  }
  
  isOpen() {
    return this.state === 'OPEN';
  }
}
```

## Monitoring and Alerting

### 1. Error Rate Monitoring

Track error rates and alert when thresholds are exceeded:

```javascript
// Example: Error rate monitoring
class ErrorRateMonitor {
  constructor() {
    this.errorCounts = new Map();
    this.totalCounts = new Map();
  }
  
  recordError(domain, errorType) {
    const key = `${domain}:${errorType}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    this.totalCounts.set(domain, (this.totalCounts.get(domain) || 0) + 1);
    
    // Check if error rate exceeds threshold
    const errorRate = this.getErrorRate(domain);
    if (errorRate > 0.1) { // 10% threshold
      logger.error('High error rate detected', {
        domain,
        errorRate,
        threshold: 0.1,
        totalRequests: this.totalCounts.get(domain),
        errorCount: this.errorCounts.get(key)
      });
    }
  }
  
  getErrorRate(domain) {
    const total = this.totalCounts.get(domain) || 0;
    const errors = Array.from(this.errorCounts.entries())
      .filter(([key]) => key.startsWith(domain))
      .reduce((sum, [, count]) => sum + count, 0);
    
    return total > 0 ? errors / total : 0;
  }
}
```

### 2. Performance Monitoring

Monitor transformation performance and alert on degradation:

```javascript
// Example: Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.timings = [];
    this.slowThreshold = 0.100; // 100ms
  }
  
  recordTiming(domain, path, duration) {
    this.timings.push({ domain, path, duration, timestamp: Date.now() });
    
    // Clean old timings (keep last hour)
    const oneHourAgo = Date.now() - 3600000;
    this.timings = this.timings.filter(t => t.timestamp > oneHourAgo);
    
    // Alert on slow transformations
    if (duration > this.slowThreshold) {
      logger.warn('Slow path transformation detected', {
        domain,
        path,
        duration,
        threshold: this.slowThreshold
      });
    }
    
    // Alert on performance degradation
    const recentAverage = this.getRecentAverage(domain);
    if (recentAverage > this.slowThreshold * 2) {
      logger.error('Performance degradation detected', {
        domain,
        recentAverage,
        threshold: this.slowThreshold * 2,
        sampleSize: this.timings.filter(t => t.domain === domain).length
      });
    }
  }
  
  getRecentAverage(domain) {
    const domainTimings = this.timings.filter(t => t.domain === domain);
    if (domainTimings.length === 0) return 0;
    
    const sum = domainTimings.reduce((total, t) => total + t.duration, 0);
    return sum / domainTimings.length;
  }
}
```

## Structured Logging Examples

### Request Context Logging

Include request context in all path rewriting logs:

```javascript
// Example: Request context logging
function logWithContext(level, message, data, req) {
  const context = {
    requestId: req.id || generateRequestId(),
    userAgent: req.get('user-agent'),
    ip: req.ip,
    method: req.method,
    originalUrl: req.originalUrl,
    timestamp: new Date().toISOString(),
    ...data
  };
  
  logger[level](message, context);
}

// Usage
logWithContext('info', 'Path transformation successful', {
  domain: 'ddt.com',
  originalPath: '/about',
  transformedPath: '/ddt/about',
  transformationTime: 0.0012
}, req);
```

### Domain-Specific Logging

Create domain-specific loggers for better organization:

```javascript
// Example: Domain-specific logging
class DomainLogger {
  constructor(domain) {
    this.domain = domain;
    this.logger = logger.child({ domain });
  }
  
  logTransformation(originalPath, transformedPath, metadata = {}) {
    this.logger.info('Path transformed', {
      originalPath,
      transformedPath,
      ...metadata
    });
  }
  
  logError(error, context = {}) {
    this.logger.error('Domain error', {
      error: error.message,
      stack: error.stack,
      ...context
    });
  }
  
  logPerformance(operation, duration, metadata = {}) {
    const level = duration > 0.100 ? 'warn' : 'debug';
    this.logger[level]('Performance metric', {
      operation,
      duration,
      ...metadata
    });
  }
}

// Usage
const ddtLogger = new DomainLogger('ddt.com');
ddtLogger.logTransformation('/about', '/ddt/about', { cacheHit: true });
```

## Log Analysis and Debugging

### 1. Common Log Patterns

#### Successful Transformation

```bash
2024-01-15 10:30:00 info: [path-rewriter] {"domain":"ddt.com","originalPath":"/about","transformedPath":"/ddt/about","target":"main--allaboutv2--ddttom.hlx.live","method":"GET","matched":true,"cacheHit":false,"transformationTime":0.0012}
```

#### Cache Hit

```bash
2024-01-15 10:30:00 debug: [path-rewriter] {"operation":"cache_hit","domain":"ddt.com","path":"/about","cacheKey":"ddt.com:/about:GET","transformationTime":0.0001}
```

#### Fallback Usage

```bash
2024-01-15 10:30:00 warn: [path-rewriter] {"domain":"unknown.com","originalPath":"/test","fallbackUsed":true,"reason":"no_rule_match","transformedPath":"/test"}
```

#### Error with Recovery

```bash
2024-01-15 10:30:00 error: [path-rewriter] {"domain":"api.example.com","originalPath":"/users","error":"Regex execution failed","fallbackUsed":true,"transformedPath":"/users"}
```

### 2. Log Aggregation Queries

#### Find High Error Rate Domains

```bash
# Using grep and awk to find domains with high error rates
grep "path-rewriter.*error" app.log | \
  jq -r '.domain' | \
  sort | uniq -c | sort -nr | head -10
```

#### Monitor Transformation Performance

```bash
# Find slow transformations
grep "transformationTime" app.log | \
  jq 'select(.transformationTime > 0.050)' | \
  jq -r '[.domain, .originalPath, .transformationTime] | @csv'
```

#### Track Cache Performance

```bash
# Calculate cache hit rate
grep "cache_hit\|cache_miss" app.log | \
  jq -r '.operation' | \
  sort | uniq -c
```

### 3. Debugging Checklist

When troubleshooting path rewriting issues:

1. **Check Configuration**

   ```bash
   grep "Failed to compile rule" error.log
   grep "Rule validation failed" error.log
   ```

2. **Verify Domain Mapping**

   ```bash
   grep "No routing configuration found" app.log | jq -r '.domain' | sort | uniq
   ```

3. **Monitor Performance**

   ```bash
   grep "transformationTime" app.log | jq '.transformationTime' | awk '{sum+=$1; count++} END {print "Average:", sum/count}'
   ```

4. **Check Error Patterns**

   ```bash
   grep "path-rewriter.*error" error.log | jq -r '.error' | sort | uniq -c
   ```

## Best Practices

### 1. Error Handling

- Always provide fallback mechanisms
- Log errors with sufficient context
- Use structured logging for better analysis
- Implement circuit breakers for problematic domains
- Validate configurations before applying

### 2. Logging

- Use appropriate log levels
- Include request context in logs
- Log performance metrics
- Implement log rotation
- Use correlation IDs for request tracing

### 3. Monitoring

- Set up alerts for high error rates
- Monitor transformation performance
- Track cache hit rates
- Monitor memory usage
- Set up health checks

### 4. Debugging

- Enable debug logging in development
- Use structured logs for analysis
- Implement request tracing
- Provide detailed error messages
- Include stack traces for errors

## Configuration Examples

### Enable Detailed Logging

```bash
# Environment variables for enhanced logging
LOG_LEVEL=debug
PATH_REWRITE_LOG_ENABLED=true
PATH_REWRITE_LOG_TRANSFORMATIONS=true
PATH_REWRITE_LOG_PERFORMANCE=true
PATH_REWRITE_LOG_CACHE_OPERATIONS=true
```

### Error Handling Configuration

```bash
# Error handling settings
PATH_REWRITE_FALLBACK_ENABLED=true
PATH_REWRITE_FALLBACK_PREFIX=/default
PATH_REWRITE_ERROR_RECOVERY=true
PATH_REWRITE_CIRCUIT_BREAKER_ENABLED=true
PATH_REWRITE_CIRCUIT_BREAKER_THRESHOLD=0.5
```

### Performance Monitoring

```bash
# Performance monitoring settings
PATH_REWRITE_PERFORMANCE_MONITORING=true
PATH_REWRITE_SLOW_THRESHOLD=0.100
PATH_REWRITE_ALERT_ON_DEGRADATION=true
PATH_REWRITE_METRICS_ENABLED=true
```

## File Resolution Error Handling and Logging

The file resolution system includes comprehensive error handling and logging for cascading file resolution, content transformation, and cache operations.

### File Resolution Error Categories

#### 1. File Resolution Errors

These errors occur during the file resolution process when checking for files with different extensions.

##### File Not Found After All Extensions

```javascript
// Error Example
{
  "error": "FILE_NOT_FOUND",
  "message": "No file found for path '/getting-started' after trying extensions: html,md,json,txt",
  "domain": "docs.example.com",
  "path": "/getting-started",
  "extensionsTried": ["html", "md", "json", "txt"],
  "attempts": [
    {
      "extension": "html",
      "url": "https://backend.example.com/getting-started.html",
      "status": 404,
      "responseTime": 23.1
    },
    {
      "extension": "md",
      "url": "https://backend.example.com/getting-started.md",
      "status": 404,
      "responseTime": 19.8
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req-123456",
  "severity": "info"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 info: [file-resolver] No file found for docs.example.com/getting-started after trying 4 extensions
```

##### HTTP Request Timeout

```javascript
// Error Example
{
  "error": "FILE_RESOLUTION_TIMEOUT",
  "message": "HTTP request timeout while checking file existence for '/api-reference.md'",
  "domain": "docs.example.com",
  "path": "/api-reference",
  "extension": "md",
  "url": "https://backend.example.com/api-reference.md",
  "timeout": 5000,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req-123457",
  "severity": "error"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [file-resolver] Request timeout for docs.example.com/api-reference.md (5000ms)
```

##### Circuit Breaker Open

```javascript
// Error Example
{
  "error": "CIRCUIT_BREAKER_OPEN",
  "message": "Circuit breaker is open for domain 'unreliable.example.com', skipping file resolution",
  "domain": "unreliable.example.com",
  "path": "/test-file",
  "circuitBreakerStatus": "open",
  "failureCount": 7,
  "nextAttempt": "2024-01-15T10:35:00.000Z",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req-123458",
  "severity": "warning"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 warn: [file-resolver] Circuit breaker open for unreliable.example.com, skipping resolution
```

#### 2. Content Transformation Errors

These errors occur during content transformation after successful file resolution.

##### Markdown Transformation Error

```javascript
// Error Example
{
  "error": "MARKDOWN_TRANSFORMATION_FAILED",
  "message": "Failed to transform markdown content: Invalid syntax at line 15",
  "domain": "docs.example.com",
  "path": "/getting-started.md",
  "transformer": "markdown",
  "contentSize": 2048,
  "errorLine": 15,
  "errorColumn": 8,
  "syntaxError": "Unexpected token",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req-123459",
  "severity": "error"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [file-resolver] Markdown transformation failed for docs.example.com/getting-started.md: Invalid syntax at line 15
```

##### JSON Transformation Error

```javascript
// Error Example
{
  "error": "JSON_TRANSFORMATION_FAILED",
  "message": "Failed to parse JSON content: Unexpected token at position 156",
  "domain": "api.example.com",
  "path": "/users.json",
  "transformer": "json",
  "contentSize": 1024,
  "parseError": "Unexpected token } in JSON at position 156",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req-123460",
  "severity": "error"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [file-resolver] JSON transformation failed for api.example.com/users.json: Unexpected token at position 156
```

##### CSV Transformation Error

```javascript
// Error Example
{
  "error": "CSV_TRANSFORMATION_FAILED",
  "message": "Failed to parse CSV content: Invalid delimiter configuration",
  "domain": "data.example.com",
  "path": "/sales-data.csv",
  "transformer": "csv",
  "contentSize": 4096,
  "parseError": "Invalid delimiter configuration",
  "delimiter": ",",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req-123461",
  "severity": "error"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [file-resolver] CSV transformation failed for data.example.com/sales-data.csv: Invalid delimiter configuration
```

#### 3. Cache-Related Errors

These errors occur during file resolution cache operations.

##### Cache Write Error

```javascript
// Error Example
{
  "error": "CACHE_WRITE_FAILED",
  "message": "Failed to write file resolution result to cache",
  "cacheKey": "file:docs.example.com:/getting-started",
  "cacheSize": 1000,
  "maxCacheSize": 1000,
  "error": "Cache full, unable to evict entries",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "severity": "warning"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 warn: [file-resolver] Failed to cache result for docs.example.com/getting-started: Cache full
```

##### Cache Corruption

```javascript
// Error Example
{
  "error": "CACHE_CORRUPTION",
  "message": "Corrupted cache entry detected and removed",
  "cacheKey": "file:api.example.com:/users",
  "corruptionType": "invalid_json",
  "entryRemoved": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "severity": "error"
}
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [file-resolver] Cache corruption detected for api.example.com/users, entry removed
```

### File Resolution Logging Levels

#### DEBUG Level - File Resolution

Used for detailed debugging of file resolution operations.

```javascript
// Successful file resolution
logger.debug('File resolution successful', {
  domain: 'docs.example.com',
  path: '/getting-started',
  extension: 'md',
  finalUrl: 'https://backend.example.com/getting-started.md',
  responseTime: 45.2,
  contentType: 'text/markdown',
  contentLength: 2048,
  cacheHit: false,
  transformed: true,
  transformationTime: 12.8
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 debug: [file-resolver] Resolved docs.example.com/getting-started → getting-started.md (45ms, transformed)
```

```javascript
// Cache operations
logger.debug('File resolution cache operation', {
  operation: 'hit',
  cacheKey: 'file:docs.example.com:/getting-started',
  domain: 'docs.example.com',
  path: '/getting-started',
  ttl: 287,
  hitCount: 15
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 debug: [file-resolver] Cache hit for docs.example.com/getting-started (TTL: 287s, hits: 15)
```

```javascript
// Extension attempts
logger.debug('Trying file extension', {
  domain: 'docs.example.com',
  path: '/getting-started',
  extension: 'md',
  url: 'https://backend.example.com/getting-started.md',
  attempt: 2,
  totalExtensions: 4
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 debug: [file-resolver] Trying extension md for docs.example.com/getting-started (2/4)
```

#### INFO Level - File Resolution

Used for general file resolution operational information.

```javascript
// System initialization
logger.info('File resolver initialized', {
  enabled: true,
  globalExtensions: ['html', 'md', 'json', 'csv', 'txt'],
  transformersEnabled: ['markdown', 'json', 'csv'],
  cacheEnabled: true,
  circuitBreakerEnabled: true,
  domainsConfigured: 5
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 info: [file-resolver] File resolver initialized with 5 extensions and 3 transformers
```

```javascript
// Successful transformation
logger.info('Content transformed successfully', {
  domain: 'docs.example.com',
  path: '/getting-started.md',
  transformer: 'markdown',
  inputSize: 2048,
  outputSize: 3072,
  transformationTime: 12.8,
  options: {
    breaks: true,
    linkify: true
  }
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 info: [file-resolver] Transformed markdown content for docs.example.com/getting-started.md (2KB → 3KB)
```

#### WARN Level - File Resolution

Used for potentially problematic situations in file resolution.

```javascript
// High resolution time
logger.warn('Slow file resolution detected', {
  domain: 'slow.example.com',
  path: '/large-file',
  totalTime: 2500,
  threshold: 1000,
  extensionsTried: 3,
  slowestAttempt: {
    extension: 'json',
    responseTime: 1800
  }
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 warn: [file-resolver] Slow resolution for slow.example.com/large-file (2500ms > 1000ms threshold)
```

```javascript
// Cache near capacity
logger.warn('File resolution cache near capacity', {
  currentSize: 950,
  maxSize: 1000,
  utilizationPercent: 95,
  oldestEntry: '2024-01-15T09:30:00.000Z',
  evictionSoon: true
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 warn: [file-resolver] Cache utilization at 95% (950/1000), eviction imminent
```

#### ERROR Level - File Resolution

Used for errors that affect file resolution functionality.

```javascript
// Circuit breaker trip
logger.error('Circuit breaker tripped for domain', {
  domain: 'unreliable.example.com',
  failureCount: 5,
  threshold: 5,
  windowSize: 100,
  errorRate: 0.6,
  lastErrors: [
    'Connection timeout',
    'HTTP 500 error',
    'Connection refused'
  ]
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [file-resolver] Circuit breaker tripped for unreliable.example.com (5 failures, 60% error rate)
```

```javascript
// Transformation failure with fallback
logger.error('Content transformation failed, serving original', {
  domain: 'docs.example.com',
  path: '/broken-markdown.md',
  transformer: 'markdown',
  error: 'Invalid syntax at line 15',
  fallbackUsed: true,
  originalContentServed: true
});
```

**Log Output:**

```bash
2024-01-15 10:30:00 error: [file-resolver] Transformation failed for docs.example.com/broken-markdown.md, serving original content
```

### File Resolution Error Recovery

#### 1. Graceful Degradation for File Resolution

When file resolution fails, the system falls back to normal proxy behavior:

```javascript
// Example: File resolution failure with graceful degradation
async function resolveFileWithFallback(domain, path, extensions) {
  try {
    const result = await fileResolver.resolve(domain, path, extensions);
    if (result.found) {
      return result;
    }
    
    // No file found, continue with normal proxy
    logger.info('File not found, continuing with normal proxy', {
      domain,
      path,
      extensionsTried: extensions,
      fallbackToProxy: true
    });
    
    return null; // Let normal proxy handle the request
    
  } catch (error) {
    logger.error('File resolution failed, using proxy fallback', {
      domain,
      path,
      error: error.message,
      fallbackUsed: true
    });
    
    return null; // Let normal proxy handle the request
  }
}
```

#### 2. Content Transformation Fallback

When content transformation fails, serve the original content:

```javascript
// Example: Transformation failure with fallback
async function transformContentWithFallback(content, contentType, transformer) {
  try {
    const result = await transformers[transformer].transform(content, contentType);
    return result;
    
  } catch (error) {
    logger.error('Content transformation failed, serving original', {
      transformer,
      contentType,
      contentSize: content.length,
      error: error.message,
      fallbackUsed: true
    });
    
    // Return original content with original content type
    return {
      content,
      contentType,
      transformed: false,
      error: error.message
    };
  }
}
```

#### 3. Circuit Breaker Recovery

Implement circuit breaker pattern for failing domains:

```javascript
// Example: Circuit breaker for file resolution
class FileResolutionCircuitBreaker {
  constructor(domain, threshold = 5, windowSize = 100, timeout = 30000) {
    this.domain = domain;
    this.threshold = threshold;
    this.windowSize = windowSize;
    this.timeout = timeout;
    this.failures = [];
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailure = null;
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker half-open, testing recovery', {
          domain: this.domain
        });
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = [];
        logger.info('Circuit breaker closed, domain recovered', {
          domain: this.domain
        });
      }
      
      return result;
      
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  recordFailure() {
    this.failures.push(Date.now());
    this.lastFailure = Date.now();
    this.cleanup();
    
    const errorRate = this.failures.length / this.windowSize;
    if (errorRate > (this.threshold / this.windowSize) && this.state === 'CLOSED') {
      this.state = 'OPEN';
      logger.error('Circuit breaker opened for domain', {
        domain: this.domain,
        failureCount: this.failures.length,
        errorRate,
        threshold: this.threshold
      });
    }
  }
  
  cleanup() {
    const oneMinuteAgo = Date.now() - 60000;
    this.failures = this.failures.filter(time => time > oneMinuteAgo);
  }
}
```

### File Resolution Performance Monitoring

#### 1. Resolution Time Monitoring

Track file resolution performance and alert on degradation:

```javascript
// Example: File resolution performance monitoring
class FileResolutionPerformanceMonitor {
  constructor() {
    this.timings = new Map(); // domain -> [timings]
    this.slowThreshold = 1000; // 1 second
  }
  
  recordTiming(domain, path, totalTime, details) {
    if (!this.timings.has(domain)) {
      this.timings.set(domain, []);
    }
    
    const timing = {
      path,
      totalTime,
      timestamp: Date.now(),
      ...details
    };
    
    this.timings.get(domain).push(timing);
    this.cleanup(domain);
    
    // Alert on slow resolutions
    if (totalTime > this.slowThreshold) {
      logger.warn('Slow file resolution detected', {
        domain,
        path,
        totalTime,
        threshold: this.slowThreshold,
        details
      });
    }
    
    // Check for performance degradation
    const recentAverage = this.getRecentAverage(domain);
    if (recentAverage > this.slowThreshold * 2) {
      logger.error('File resolution performance degradation', {
        domain,
        recentAverage,
        threshold: this.slowThreshold * 2,
        sampleSize: this.timings.get(domain).length
      });
    }
  }
  
  getRecentAverage(domain) {
    const domainTimings = this.timings.get(domain) || [];
    if (domainTimings.length === 0) return 0;
    
    const sum = domainTimings.reduce((total, t) => total + t.totalTime, 0);
    return sum / domainTimings.length;
  }
  
  cleanup(domain) {
    const oneHourAgo = Date.now() - 3600000;
    const timings = this.timings.get(domain) || [];
    this.timings.set(domain, timings.filter(t => t.timestamp > oneHourAgo));
  }
}
```

#### 2. Cache Performance Monitoring

Monitor file resolution cache performance:

```javascript
// Example: Cache performance monitoring
class FileResolutionCacheMonitor {
  constructor() {
    this.stats = {
      hits: 0,
      misses: 0,
      positiveHits: 0,
      negativeHits: 0,
      evictions: 0,
      errors: 0
    };
  }
  
  recordHit(cacheKey, entryType) {
    this.stats.hits++;
    if (entryType === 'positive') {
      this.stats.positiveHits++;
    } else {
      this.stats.negativeHits++;
    }
    
    logger.debug('File resolution cache hit', {
      cacheKey,
      entryType,
      totalHits: this.stats.hits,
      hitRate: this.getHitRate()
    });
  }
  
  recordMiss(cacheKey) {
    this.stats.misses++;
    
    logger.debug('File resolution cache miss', {
      cacheKey,
      totalMisses: this.stats.misses,
      hitRate: this.getHitRate()
    });
  }
  
  recordEviction(cacheKey, reason) {
    this.stats.evictions++;
    
    logger.info('File resolution cache eviction', {
      cacheKey,
      reason,
      totalEvictions: this.stats.evictions
    });
  }
  
  getHitRate() {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }
  
  getStats() {
    return {
      ...this.stats,
      hitRate: this.getHitRate(),
      total: this.stats.hits + this.stats.misses
    };
  }
}
```

### File Resolution Log Analysis

#### 1. Common Log Patterns

##### Successful File Resolution with Transformation

```bash
2024-01-15 10:30:00 info: [file-resolver] {"domain":"docs.example.com","path":"/getting-started","extension":"md","finalUrl":"https://backend.example.com/getting-started.md","responseTime":45.2,"contentType":"text/markdown","contentLength":2048,"transformed":true,"transformationTime":12.8,"cacheHit":false}
```

##### Cache Hit

```bash
2024-01-15 10:30:00 debug: [file-resolver] {"operation":"cache_hit","cacheKey":"file:docs.example.com:/getting-started","domain":"docs.example.com","path":"/getting-started","ttl":287,"hitCount":15}
```

##### File Not Found

```bash
2024-01-15 10:30:00 info: [file-resolver] {"domain":"docs.example.com","path":"/nonexistent","extensionsTried":["html","md","json","txt"],"found":false,"totalTime":64.2}
```

##### Circuit Breaker Trip

```bash
2024-01-15 10:30:00 error: [file-resolver] {"domain":"unreliable.example.com","circuitBreakerTripped":true,"failureCount":5,"errorRate":0.6,"state":"open"}
```

#### 2. Log Aggregation Queries for File Resolution

##### Find Domains with High File Resolution Failure Rates

```bash
# Using grep and jq to find domains with high failure rates
grep "file-resolver.*found.*false" app.log | \
  jq -r '.domain' | \
  sort | uniq -c | sort -nr | head -10
```

##### Monitor File Resolution Performance

```bash
# Find slow file resolutions
grep "file-resolver.*totalTime" app.log | \
  jq 'select(.totalTime > 1000)' | \
  jq -r '[.domain, .path, .totalTime] | @csv'
```

##### Track Transformation Success Rates

```bash
# Calculate transformation success rate
grep "file-resolver.*transformed" app.log | \
  jq -r '.transformed' | \
  sort | uniq -c
```

##### Monitor Circuit Breaker Activity

```bash
# Find circuit breaker events
grep "file-resolver.*circuitBreaker" app.log | \
  jq -r '[.domain, .state, .failureCount] | @csv'
```

### File Resolution Configuration for Enhanced Logging

#### Enable Detailed File Resolution Logging

```bash
# Environment variables for enhanced file resolution logging
LOG_LEVEL=debug
FILE_RESOLUTION_LOG_ENABLED=true
FILE_RESOLUTION_LOG_REQUESTS=true
FILE_RESOLUTION_LOG_CACHE_OPERATIONS=true
FILE_RESOLUTION_LOG_TRANSFORMATIONS=true
FILE_RESOLUTION_LOG_CIRCUIT_BREAKER=true
FILE_RESOLUTION_LOG_PERFORMANCE=true
```

#### Error Handling Configuration

```bash
# File resolution error handling settings
FILE_RESOLUTION_FALLBACK_ENABLED=true
FILE_RESOLUTION_CIRCUIT_BREAKER_ENABLED=true
FILE_RESOLUTION_CIRCUIT_BREAKER_THRESHOLD=5
FILE_RESOLUTION_CIRCUIT_BREAKER_TIMEOUT=30000
FILE_RESOLUTION_ERROR_RECOVERY=true
FILE_RESOLUTION_TRANSFORMATION_FALLBACK=true
```

#### Performance Monitoring Configuration

```bash
# File resolution performance monitoring
FILE_RESOLUTION_PERFORMANCE_MONITORING=true
FILE_RESOLUTION_SLOW_THRESHOLD=1000
FILE_RESOLUTION_ALERT_ON_DEGRADATION=true
FILE_RESOLUTION_METRICS_ENABLED=true
FILE_RESOLUTION_CACHE_STATS_ENABLED=true
```

This comprehensive error handling and logging system ensures robust operation of both the domain-to-path prefix rewriting and file resolution functionality while providing detailed insights for debugging and monitoring.
