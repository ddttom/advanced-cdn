# Debugging Guide - Advanced CDN Application

This comprehensive guide covers all aspects of debugging the Advanced CDN application locally, including setup, monitoring, troubleshooting, and advanced debugging techniques.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Application Startup and Modes](#application-startup-and-modes)
3. [Logging System](#logging-system)
4. [Debugging Endpoints and APIs](#debugging-endpoints-and-apis)
5. [Configuration Debugging](#configuration-debugging)
6. [Component-Specific Debugging](#component-specific-debugging)
7. [Troubleshooting Workflows](#troubleshooting-workflows)
8. [Debugging Tools and Utilities](#debugging-tools-and-utilities)
9. [Performance Debugging](#performance-debugging)
10. [Advanced Debugging Techniques](#advanced-debugging-techniques)

## Development Environment Setup

### Prerequisites

Before debugging the application, ensure you have:

- Node.js 16.x or higher
- npm 7.x or higher
- Access to the application source code
- Proper environment configuration

### Initial Setup

1. **Clone and Install Dependencies**

   ```bash
   git clone <repository-url>
   cd advanced-cdn
   npm install
   ```

2. **Create Development Configuration**

   ```bash
   cp env-example.txt .env
   ```

3. **Configure for Debugging**

   Edit `.env` for optimal debugging:

   ```bash
   # Development mode settings
   NODE_ENV=development
   LOG_LEVEL=debug
   LOG_TO_CONSOLE=true
   LOG_TO_FILE=true
   
   # Disable clustering for easier debugging
   ENABLE_CLUSTER=false
   
   # Enable detailed health checks
   HEALTH_CHECK_DETAILED=true
   
   # Enable all monitoring features
   METRICS_ENABLED=true
   PATH_REWRITE_METRICS_ENABLED=true
   FILE_RESOLUTION_METRICS_ENABLED=true
   
   # Enable comprehensive logging
   PATH_REWRITE_LOG_ENABLED=true
   FILE_RESOLUTION_LOG_ENABLED=true
   ```

## Application Startup and Modes

### Development Mode

The application supports multiple startup modes optimized for different debugging scenarios:

#### 1. Standard Development Mode

```bash
# Start with nodemon for auto-reload
npm run dev
```

This mode:

- Uses [`app.js`](app.js:1) directly (bypasses clustering)
- Enables auto-reload on file changes
- Sets `NODE_ENV=development`
- Provides enhanced console logging

#### 2. Production Mode (for testing)

```bash
# Start with clustering
npm start
```

This mode:

- Uses [`cluster-manager.js`](cluster-manager.js:1) for multi-process operation
- Enables worker process management
- Simulates production environment

#### 3. Debug Mode with Inspector

```bash
# Start with Node.js debugger
node --inspect app.js

# Or with specific debug port
node --inspect=0.0.0.0:9229 app.js
```

This enables:

- Chrome DevTools debugging
- Breakpoint debugging
- Memory profiling
- CPU profiling

#### 4. Single Component Testing

```bash
# Test specific components
node -e "
const PathRewriter = require('./path-rewriter.js');
const config = { /* test config */ };
const rewriter = new PathRewriter(config);
console.log(rewriter.transformPath('ddt.com', '/test'));
"
```

### Startup Diagnostics

Monitor startup process with these checks:

```bash
# Check if application started successfully
curl http://localhost:3000/health

# Verify all components are loaded
curl http://localhost:3000/api/domains

# Check initial metrics
curl http://localhost:3000/metrics | head -20
```

## Logging System

The application uses Winston for comprehensive logging with multiple levels and outputs.

### Log Levels and Usage

#### DEBUG Level

- Detailed execution flow
- Variable values and state changes
- Performance timing information

```bash
# Enable debug logging
export LOG_LEVEL=debug

# View debug logs
tail -f logs/app.log | grep DEBUG
```

#### INFO Level

- General operational information
- Successful operations
- Configuration changes

```bash
# View info logs
grep "INFO" logs/app.log | tail -20
```

#### WARN Level

- Potential issues
- Fallback usage
- Performance warnings

```bash
# Monitor warnings
tail -f logs/app.log | grep WARN
```

#### ERROR Level

- Actual errors and failures
- Exception details
- Recovery actions

```bash
# Check recent errors
grep "ERROR" logs/error.log | tail -10
```

### Log File Structure

The application creates several log files in the `./logs` directory:

- **`app.log`** - General application logs
- **`error.log`** - Error-level logs only
- **`access.log`** - HTTP request logs
- **`exceptions.log`** - Uncaught exceptions
- **`rejections.log`** - Unhandled promise rejections

### Component-Specific Logging

#### Path Rewriter Logs

```bash
# Monitor path transformations
grep "path-rewriter" logs/app.log | tail -20

# Check transformation performance
grep "transformation.*time" logs/app.log
```

#### File Resolution Logs

```bash
# Monitor file resolution attempts
grep "file-resolver" logs/app.log | tail -20

# Check resolution success/failure rates
grep "file-resolver.*found" logs/app.log | tail -10
```

#### Cache Operation Logs

```bash
# Monitor cache hits/misses
grep "cache.*hit\|cache.*miss" logs/app.log

# Check cache performance
grep "cache.*stats" logs/app.log
```

### Real-Time Log Monitoring

```bash
# Monitor all logs in real-time
tail -f logs/app.log

# Monitor specific component
tail -f logs/app.log | grep "path-rewriter\|file-resolver\|cache"

# Monitor errors only
tail -f logs/error.log

# Monitor with filtering
tail -f logs/app.log | grep -E "(ERROR|WARN|transformation|resolution)"
```

## Debugging Endpoints and APIs

The application provides comprehensive debugging endpoints for monitoring and troubleshooting.

### Health Check Endpoints

#### Basic Health Check

```bash
curl http://localhost:3000/health
```

Response includes:

- Overall system status
- Uptime information
- Basic component status

#### Detailed Health Check

```bash
curl "http://localhost:3000/health?detailed=true"
```

Response includes:

- Memory usage statistics
- Path rewriting status
- File resolution status
- Domain routing health
- Cache performance metrics

### Domain Management APIs

#### View All Domains

```bash
curl http://localhost:3000/api/domains | jq '.'
```

#### View Specific Domain

```bash
curl http://localhost:3000/api/domains/ddt.com | jq '.'
```

#### Test Path Transformation

```bash
curl -X POST http://localhost:3000/api/domains/test-transformation \
  -H "Content-Type: application/json" \
  -d '{"domain": "ddt.com", "path": "/about"}'
```

#### Reload Domain Configuration

```bash
curl -X POST http://localhost:3000/api/domains/reload
```

### Cache Management APIs

#### Cache Statistics

```bash
curl http://localhost:3000/api/cache/stats | jq '.'
```

#### Purge Cache

```bash
# Purge all cache
curl -X DELETE http://localhost:3000/api/cache

# Purge by domain
curl -X DELETE "http://localhost:3000/api/cache?domain=ddt.com"

# Purge by pattern
curl -X DELETE "http://localhost:3000/api/cache?pattern=*.css"
```

### File Resolution APIs

#### File Resolution Status

```bash
curl http://localhost:3000/api/file-resolution/status | jq '.'
```

#### File Resolution Statistics

```bash
curl http://localhost:3000/api/file-resolution/stats | jq '.'
```

#### Test File Resolution

```bash
curl -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{"domain": "docs.example.com", "path": "/getting-started"}'
```

#### File Resolution Cache Management

```bash
# View cache
curl http://localhost:3000/api/file-resolution/cache | jq '.'

# Clear cache
curl -X DELETE http://localhost:3000/api/file-resolution/cache

# Clear by domain
curl -X DELETE "http://localhost:3000/api/file-resolution/cache?domain=docs.example.com"
```

#### Circuit Breaker Status

```bash
curl http://localhost:3000/api/file-resolution/circuit-breaker | jq '.'
```

#### Reset Circuit Breaker

```bash
curl -X POST http://localhost:3000/api/file-resolution/circuit-breaker/docs.example.com/reset
```

### Metrics Endpoint

```bash
# Get all metrics
curl http://localhost:3000/metrics

# Filter specific metrics
curl http://localhost:3000/metrics | grep path_rewrite
curl http://localhost:3000/metrics | grep file_resolution
curl http://localhost:3000/metrics | grep cache
```

## Configuration Debugging

### Environment Variable Validation

#### Check Current Configuration

```bash
# View all CDN-related environment variables
env | grep -E "(PATH_REWRITE|FILE_RESOLUTION|DOMAIN_|CACHE_|LOG_)" | sort
```

#### Validate JSON Configuration

```bash
# Validate domain path mapping
echo $DOMAIN_PATH_MAPPING | jq .

# Validate path rewrite rules
echo $PATH_REWRITE_RULES | jq .

# Validate file resolution domain config
echo $FILE_RESOLUTION_DOMAIN_CONFIG | jq .
```

#### Configuration Test Script

```bash
#!/bin/bash
# config-test.sh

echo "=== Configuration Validation ==="

# Test JSON configurations
configs=("DOMAIN_PATH_MAPPING" "PATH_REWRITE_RULES" "FILE_RESOLUTION_DOMAIN_CONFIG")

for config in "${configs[@]}"; do
    value=$(eval echo \$$config)
    if [ -n "$value" ]; then
        echo "Testing $config..."
        if echo "$value" | jq . > /dev/null 2>&1; then
            echo "✅ $config is valid JSON"
        else
            echo "❌ $config is invalid JSON"
        fi
    else
        echo "⚠️  $config is not set"
    fi
done

# Test required settings
required=("ORIGIN_DOMAIN" "TARGET_DOMAIN" "PORT")
for req in "${required[@]}"; do
    value=$(eval echo \$$req)
    if [ -n "$value" ]; then
        echo "✅ $req is set: $value"
    else
        echo "❌ $req is not set"
    fi
done
```

### Runtime Configuration Testing

#### Test Domain Configuration

```bash
# Test if domains are properly configured
test_domain_config() {
    local domain=$1
    echo "Testing domain: $domain"
    
    # Check if domain is in configuration
    curl -s http://localhost:3000/api/domains | jq -r ".domains[\"$domain\"]"
    
    # Test transformation
    curl -s -X POST http://localhost:3000/api/domains/test-transformation \
        -H "Content-Type: application/json" \
        -d "{\"domain\": \"$domain\", \"path\": \"/test\"}" | jq '.'
}

test_domain_config "ddt.com"
```

#### Test File Resolution Configuration

```bash
# Test file resolution for domain
test_file_resolution() {
    local domain=$1
    local path=$2
    
    echo "Testing file resolution for $domain$path"
    
    curl -s -X POST http://localhost:3000/api/file-resolution/test \
        -H "Content-Type: application/json" \
        -d "{\"domain\": \"$domain\", \"path\": \"$path\"}" | jq '.'
}

test_file_resolution "docs.example.com" "/getting-started"
```

## Component-Specific Debugging

### Path Rewriter Debugging

#### Enable Path Rewriter Logging

```bash
export PATH_REWRITE_LOG_ENABLED=true
export PATH_REWRITE_LOG_TRANSFORMATIONS=true
export PATH_REWRITE_LOG_PERFORMANCE=true
```

#### Monitor Path Transformations

```bash
# Real-time transformation monitoring
tail -f logs/app.log | grep "path-rewriter"

# Check transformation performance
grep "transformation.*time" logs/app.log | awk '{print $NF}' | sort -n
```

#### Debug Path Rewriter Issues

```bash
# Check rule compilation errors
grep "Failed to compile rule" logs/error.log

# Check transformation errors
grep "transformation.*error" logs/error.log

# Monitor cache performance
curl http://localhost:3000/api/cache/stats | jq '.domainStats'
```

### File Resolver Debugging

#### Enable File Resolver Logging

```bash
export FILE_RESOLUTION_LOG_ENABLED=true
export FILE_RESOLUTION_LOG_REQUESTS=true
export FILE_RESOLUTION_LOG_TRANSFORMATIONS=true
export FILE_RESOLUTION_LOG_CIRCUIT_BREAKER=true
```

#### Monitor File Resolution

```bash
# Real-time file resolution monitoring
tail -f logs/app.log | grep "file-resolver"

# Check resolution success rates
grep "file-resolver.*found" logs/app.log | grep -c "true\|false"

# Monitor circuit breaker events
grep "circuit.*breaker" logs/app.log | grep "file-resolver"
```

#### Debug File Resolution Issues

```bash
# Check resolution failures
grep "file-resolver.*error" logs/error.log

# Check transformation failures
grep "transformation.*failed" logs/error.log

# Monitor cache performance
curl http://localhost:3000/api/file-resolution/cache | jq '.statistics'
```

### Cache Manager Debugging

#### Monitor Cache Operations

```bash
# Real-time cache monitoring
tail -f logs/app.log | grep "cache"

# Check cache hit rates
curl http://localhost:3000/api/cache/stats | jq '.hitRate'

# Monitor cache size
curl http://localhost:3000/api/cache/stats | jq '.totalItems, .maxItems'
```

#### Debug Cache Issues

```bash
# Check cache errors
grep "cache.*error" logs/error.log

# Monitor cache evictions
grep "cache.*evict" logs/app.log

# Test cache functionality
curl -X DELETE http://localhost:3000/api/cache
curl http://localhost:3000/api/cache/stats
```

### Proxy Manager Debugging

#### Monitor Proxy Operations

```bash
# Check proxy errors
grep "proxy.*error" logs/error.log

# Monitor backend connectivity
grep "backend.*connect" logs/app.log

# Check response times
grep "response.*time" logs/app.log
```

### Domain Manager Debugging

#### Monitor Domain Validation

```bash
# Check domain validation errors
grep "domain.*validation" logs/error.log

# Monitor domain routing
grep "domain.*routing" logs/app.log

# Test domain configuration
curl http://localhost:3000/api/domains | jq '.domains | keys'
```

## Troubleshooting Workflows

### Common Issue Workflows

#### 1. Application Won't Start

**Diagnostic Steps:**

```bash
# Check port availability
netstat -tulpn | grep :3000

# Check configuration
node -e "console.log(require('./config.js'))"

# Check dependencies
npm list --depth=0

# Check logs
cat logs/error.log | tail -20
```

**Common Solutions:**

```bash
# Change port if occupied
export PORT=3001

# Fix configuration errors
echo $DOMAIN_PATH_MAPPING | jq .

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 2. Domain Not Being Transformed

**Diagnostic Steps:**

```bash
# Check if path rewriting is enabled
curl http://localhost:3000/api/domains | jq '.pathRewritingEnabled'

# Check domain configuration
curl http://localhost:3000/api/domains/ddt.com

# Test transformation
curl -X POST http://localhost:3000/api/domains/test-transformation \
  -H "Content-Type: application/json" \
  -d '{"domain": "ddt.com", "path": "/test"}'

# Check logs
grep "ddt.com" logs/app.log | tail -10
```

**Common Solutions:**

```bash
# Enable path rewriting
export PATH_REWRITE_ENABLED=true

# Add domain to configuration
export DOMAIN_PATH_MAPPING='{"ddt.com": "/ddt"}'
export ADDITIONAL_DOMAINS="ddt.com"

# Reload configuration
curl -X POST http://localhost:3000/api/domains/reload
```

#### 3. File Resolution Not Working

**Diagnostic Steps:**

```bash
# Check file resolution status
curl http://localhost:3000/api/file-resolution/status

# Test specific resolution
curl -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{"domain": "docs.example.com", "path": "/test"}'

# Check circuit breaker status
curl http://localhost:3000/api/file-resolution/circuit-breaker

# Check logs
grep "file-resolver" logs/app.log | tail -10
```

**Common Solutions:**

```bash
# Enable file resolution
export FILE_RESOLUTION_ENABLED=true

# Configure extensions
export FILE_RESOLUTION_EXTENSIONS="html,md,json,txt"

# Reset circuit breaker
curl -X POST http://localhost:3000/api/file-resolution/circuit-breaker/docs.example.com/reset
```

#### 4. Performance Issues

**Diagnostic Steps:**

```bash
# Check metrics
curl http://localhost:3000/metrics | grep -E "(duration|rate|cache)"

# Check memory usage
curl http://localhost:3000/health | jq '.system.memory'

# Run benchmark
node benchmark.js

# Check slow operations
grep "slow" logs/app.log
```

**Common Solutions:**

```bash
# Enable clustering
export ENABLE_CLUSTER=true

# Increase cache size
export CACHE_MAX_ITEMS=10000
export PATH_REWRITE_CACHE_SIZE=50000

# Optimize configuration
export PATH_REWRITE_SLOW_THRESHOLD=0.005
```

### Systematic Debugging Approach

#### 1. Quick Health Check

```bash
#!/bin/bash
# quick-health-check.sh

echo "=== Quick Health Check ==="

# Basic connectivity
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Application is responding"
else
    echo "❌ Application is not responding"
    exit 1
fi

# Check key components
components=("pathRewriting" "fileResolution" "cache")
for component in "${components[@]}"; do
    status=$(curl -s http://localhost:3000/health | jq -r ".$component.enabled // false")
    if [ "$status" = "true" ]; then
        echo "✅ $component is enabled"
    else
        echo "⚠️  $component is disabled or not configured"
    fi
done

# Check error rates
error_count=$(grep "ERROR" logs/error.log | wc -l)
if [ "$error_count" -gt 10 ]; then
    echo "⚠️  High error count: $error_count"
else
    echo "✅ Error count is acceptable: $error_count"
fi
```

#### 2. Component Status Check

```bash
#!/bin/bash
# component-status-check.sh

echo "=== Component Status Check ==="

# Path Rewriter Status
echo "Path Rewriter:"
curl -s http://localhost:3000/api/domains | jq '{
    enabled: .pathRewritingEnabled,
    domains: (.domains | length),
    totalRequests: [.domains[].statistics.totalRequests] | add
}'

# File Resolution Status
echo "File Resolution:"
curl -s http://localhost:3000/api/file-resolution/status | jq '{
    enabled: .enabled,
    cacheHitRate: .cache.hitRate,
    transformers: (.transformers | length)
}'

# Cache Status
echo "Cache:"
curl -s http://localhost:3000/api/cache/stats | jq '{
    enabled: .enabled,
    hitRate: .hitRate,
    items: .totalItems,
    maxItems: .maxItems
}'
```

## Debugging Tools and Utilities

### Built-in Debugging Scripts

#### 1. Configuration Validator

```bash
#!/bin/bash
# validate-config.sh

echo "=== Configuration Validation ==="

# Check required environment variables
required_vars=("ORIGIN_DOMAIN" "TARGET_DOMAIN" "PORT")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required variable: $var"
    else
        echo "✅ $var is set"
    fi
done

# Validate JSON configurations
json_vars=("DOMAIN_PATH_MAPPING" "PATH_REWRITE_RULES" "FILE_RESOLUTION_DOMAIN_CONFIG")
for var in "${json_vars[@]}"; do
    value="${!var}"
    if [ -n "$value" ]; then
        if echo "$value" | jq . > /dev/null 2>&1; then
            echo "✅ $var is valid JSON"
        else
            echo "❌ $var is invalid JSON"
        fi
    fi
done
```

#### 2. Performance Monitor

```bash
#!/bin/bash
# performance-monitor.sh

echo "=== Performance Monitor ==="

while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Get memory usage
    memory=$(curl -s http://localhost:3000/health | jq -r '.system.memory.heapUsed // 0')
    memory_mb=$((memory / 1024 / 1024))
    
    # Get cache hit rate
    cache_hit_rate=$(curl -s http://localhost:3000/api/cache/stats | jq -r '.hitRate // 0')
    
    # Get request rate (approximate)
    total_requests=$(curl -s http://localhost:3000/metrics | grep "http_requests_total" | awk '{sum+=$2} END {print sum}')
    
    echo "$timestamp - Memory: ${memory_mb}MB, Cache Hit Rate: $cache_hit_rate, Total Requests: $total_requests"
    
    sleep 10
done
```

#### 3. Log Analyzer

```bash
#!/bin/bash
# log-analyzer.sh

echo "=== Log Analysis ==="

# Error summary
echo "Recent Errors:"
grep "ERROR" logs/error.log | tail -5

# Performance warnings
echo "Performance Warnings:"
grep "slow\|timeout\|high" logs/app.log | tail -5

# Component activity
echo "Component Activity (last 100 lines):"
tail -100 logs/app.log | grep -E "(path-rewriter|file-resolver|cache)" | wc -l

# Cache performance
echo "Cache Operations:"
grep "cache.*hit\|cache.*miss" logs/app.log | tail -5
```

### External Debugging Tools

#### 1. Node.js Inspector

```bash
# Start with inspector
node --inspect app.js

# Connect with Chrome DevTools
# Open chrome://inspect in Chrome browser
```

#### 2. Memory Profiling

```bash
# Generate heap snapshot
node --inspect app.js &
# Use Chrome DevTools Memory tab to capture heap snapshots
```

#### 3. CPU Profiling

```bash
# Profile CPU usage
node --prof app.js
# Generate profile report
node --prof-process isolate-*.log > profile.txt
```

#### 4. Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Create load test configuration
cat > load-test.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Test domain transformation"
    requests:
      - get:
          url: "/test"
          headers:
            Host: "ddt.com"
EOF

# Run load test
artillery run load-test.yml
```

### Custom Debugging Utilities

#### 1. Request Tracer

```javascript
// request-tracer.js
const express = require('express');
const app = express();

// Middleware to trace requests
app.use((req, res, next) => {
    const start = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    req.requestId = requestId;
    
    console.log(`[${requestId}] ${req.method} ${req.url} - Start`);
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${requestId}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
});

module.exports = app;
```

#### 2. Component Health Checker

```javascript
// health-checker.js
class ComponentHealthChecker {
    constructor() {
        this.components = new Map();
    }
    
    registerComponent(name, healthCheckFn) {
        this.components.set(name, healthCheckFn);
    }
    
    async checkAll() {
        const results = {};
        
        for (const [name, checkFn] of this.components) {
            try {
                const result = await checkFn();
                results[name] = { status: 'healthy', ...result };
            } catch (error) {
                results[name] = { status: 'unhealthy', error: error.message };
            }
        }
        
        return results;
    }
}

module.exports = ComponentHealthChecker;
```

## Performance Debugging

### Performance Metrics Monitoring

#### Key Performance Indicators

```bash
# Monitor transformation performance
curl http://localhost:3000/metrics | grep path_rewrite_duration

# Monitor file resolution performance
curl http://localhost:3000/metrics | grep file_resolution_duration

# Monitor cache performance
curl http://localhost:3000/metrics | grep cache_operations

# Monitor HTTP request performance
curl http://localhost:3000/metrics | grep http_request_duration
```

#### Performance Benchmarking

```bash
# Run built-in benchmark
node benchmark.js

# Custom performance test
node -e "
const { PerformanceBenchmark } = require('./benchmark');
const benchmark = new PerformanceBenchmark();
benchmark.runBenchmark('simple_prefix', 1000).then(console.log);
"
```

### Memory Debugging

#### Monitor Memory Usage

```bash
# Check current memory usage
curl http://localhost:3000/health | jq '.system.memory'

# Monitor memory over time
while true; do
    curl -s http://localhost:3000/health | jq '.system.memory.heapUsed'
    sleep 5
done
```

#### Detect Memory Leaks

```bash
# Enable garbage collection logging
export NODE_OPTIONS="--max-old-space-size=2048 --trace-gc"

# Monitor heap growth
node --inspect app.js
# Use Chrome DevTools to monitor heap size over time
```

### CPU Debugging

#### Monitor CPU Usage

```bash
# Check CPU usage
top -p $(pgrep -f "node.*app.js")

# Profile CPU usage
node --prof app.js
```

#### Identify Performance Bottlenecks

```bash
# Check slow operations
grep "slow\|timeout" logs/app.log

# Monitor transformation times
grep "transformation.*time" logs/app.log | awk '{print $NF}' | sort -n | tail -10
```

## Advanced Debugging Techniques

### Distributed Tracing

#### Request Correlation

```javascript
// Add to middleware
app.use((req, res, next) => {
    req.correlationId = req.headers['x-correlation-id'] || 
                       Math.random().toString(36).substr(2, 9);
    res.setHeader('x-correlation-id', req.correlationId);
    next();
});
```

#### Component Tracing

```javascript
// Add to each component
class TracedComponent {
    constructor(name) {
        this.name = name;
    }
    
    trace(operation, fn) {
        const start = Date.now();
        console.log(`[${this.name}] ${operation} - Start`);
        
        const result = fn();
        
        if (result && typeof result.then === 'function') {
            return result.finally(() => {
                const duration = Date.now() - start;
                console.log(`[${this.name}] ${operation} - End (${duration}ms)`);
            });
        } else {
            const duration = Date.now() - start;
            console.log(`[${this.name}] ${operation} - End (${duration}ms)`);
            return result;
        }
    }
}
```

### Circuit Breaker Debugging

#### Monitor Circuit Breaker States

```bash
# Check path rewriter circuit breakers
curl http://localhost:3000/health | jq '.pathRewriting.circuitBreakers'

# Check file resolution circuit breakers
curl http://localhost:3000/api/file-resolution/circuit-breaker
```

#### Debug Circuit Breaker Issues

```bash
# Check circuit breaker logs
grep "circuit.*breaker" logs/app.log

# Monitor error rates
curl http://localhost:3000/api/domains | jq '.domains[].statistics.errorRate'

# Reset circuit breakers if needed
curl -X POST http://localhost:3000/api/file-resolution/circuit-breaker/domain.com/reset
```

### Cache Debugging

#### Cache Key Analysis

```bash
# Analyze cache keys
curl http://localhost:3000/api/cache/stats | jq '.domainStats'

# Check cache distribution
curl http://localhost:3000/api/file-resolution/cache | jq '.entries[].key'
```

#### Cache Performance Tuning

```bash
# Monitor cache hit rates
watch -n 5 'curl -s http://localhost:3000/api/cache/stats | jq ".hitRate"'

# Test cache purging
curl -X DELETE "http://localhost:3000/api/cache?domain=test.com"
curl http://localhost:3000/api/cache/stats
```

### Configuration Debugging

#### Dynamic Configuration Testing

```bash
# Test configuration changes
export DOMAIN_PATH_MAPPING='{"test.com": "/test"}'
curl -X POST http://localhost:3000/api/domains/reload

# Verify changes
curl http://localhost:3000/api/domains/test.com
```

#### Configuration Validation

```bash
# Validate all configurations
node -e "
const config = require('./config.js');
console.log('Configuration loaded successfully:');
console.log(JSON.stringify(config, null, 2));
"
```

## Debugging Best Practices

### 1. Systematic Approach

- Start with health checks
- Check logs for errors
- Verify configuration
- Test individual components
- Monitor performance metrics

### 2. Use Appropriate Log Levels

- **DEBUG**: Development and detailed troubleshooting
- **INFO**: General operational information
- **WARN**: Potential issues that need attention
- **ERROR**: Actual problems requiring immediate action

### 3. Monitor Key Metrics

- Response times
- Cache hit rates
- Error rates
- Memory usage
- CPU usage

### 4. Document Issues and Solutions

- Keep a debugging log
- Document configuration changes
- Record performance baselines
- Maintain troubleshooting runbooks

### 5. Use Version Control for Configuration

- Track configuration changes
- Use branches for testing
- Document configuration decisions
- Maintain rollback procedures

## Conclusion

This debugging guide provides comprehensive coverage of debugging the Advanced CDN application. The combination of built-in debugging features, comprehensive logging, monitoring APIs, and systematic troubleshooting approaches enables effective debugging of both simple and complex issues.

Key debugging capabilities include:

- **Multiple startup modes** for different debugging scenarios
- **Comprehensive logging system** with component-specific logs
- **Rich debugging APIs** for real-time monitoring and testing
- **Configuration validation** and dynamic updates
- **Component-specific debugging** techniques
- **Performance monitoring** and optimization tools
- **Advanced debugging techniques** for complex issues

Regular use of these debugging
