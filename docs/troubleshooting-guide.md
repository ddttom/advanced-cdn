# Troubleshooting Guide

This guide provides comprehensive troubleshooting information for common issues with the CDN application, including domain-to-path prefix routing and file resolution systems, with diagnostic steps, solutions, and prevention strategies.

## Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

1. **Check Configuration**

   ```bash
   # Verify environment variables are set
   echo $PATH_REWRITE_ENABLED
   echo $DOMAIN_PATH_MAPPING
   ```

2. **Check Application Logs**

   ```bash
   # Look for path rewriter errors
   grep "path-rewriter" logs/error.log | tail -20
   ```

3. **Test Basic Functionality**

   ```bash
   # Test a simple transformation
   curl -H "Host: ddt.com" http://localhost:3000/test
   ```

4. **Check Health Status**

   ```bash
   # Check application health
   curl http://localhost:3000/health
   ```

## Common Issues and Solutions

### 1. Domain Not Being Transformed

**Symptoms:**

- Requests to configured domains are not being transformed
- Original paths are passed through unchanged
- No transformation logs appear

**Diagnostic Steps:**

```bash
# Check if path rewriting is enabled
curl http://localhost:3000/api/domains | jq '.pathRewritingEnabled'

# Check if domain is configured
curl http://localhost:3000/api/domains | jq '.domains["ddt.com"]'

# Check application logs for domain validation
grep "No routing configuration found" logs/app.log
```

**Common Causes and Solutions:**

#### Cause 1: Path Rewriting Disabled

```bash
# Check configuration
echo $PATH_REWRITE_ENABLED
# Should return: true

# Solution: Enable path rewriting
export PATH_REWRITE_ENABLED=true
# Restart application
```

#### Cause 2: Domain Not in Configuration

```bash
# Check domain mapping
echo $DOMAIN_PATH_MAPPING
# Should include your domain

# Solution: Add domain to configuration
export DOMAIN_PATH_MAPPING='{"ddt.com": "/ddt", "blog.example.com": "/blog"}'
# Restart application
```

#### Cause 3: Strict Domain Check Blocking Request

```bash
# Check if strict domain checking is enabled
echo $STRICT_DOMAIN_CHECK
# If true, only configured domains are allowed

# Solution: Either add domain to ADDITIONAL_DOMAINS or disable strict checking
export ADDITIONAL_DOMAINS="ddt.com,blog.example.com"
# OR
export STRICT_DOMAIN_CHECK=false
```

#### Cause 4: Invalid JSON Configuration

```bash
# Test JSON validity
echo $DOMAIN_PATH_MAPPING | jq .
# Should parse without errors

# Solution: Fix JSON syntax
export DOMAIN_PATH_MAPPING='{"ddt.com": "/ddt"}'  # Note: proper quotes
```

**Example Fix:**

```bash
# Complete configuration for ddt.com → /ddt mapping
export PATH_REWRITE_ENABLED=true
export DOMAIN_PATH_MAPPING='{"ddt.com": "/ddt"}'
export STRICT_DOMAIN_CHECK=true
export ADDITIONAL_DOMAINS="ddt.com"
```

### 2. Incorrect Path Transformations

**Symptoms:**

- Paths are being transformed but incorrectly
- Expected `/ddt/about` but getting `/about` or other incorrect paths
- Regex patterns not matching as expected

**Diagnostic Steps:**

```bash
# Test specific transformation
curl -X POST http://localhost:3000/api/domains/test-transformation \
  -H "Content-Type: application/json" \
  -d '{"domain": "ddt.com", "path": "/about"}'

# Check rule compilation
grep "Failed to compile rule" logs/error.log

# Check transformation logs
grep "Path transformation" logs/app.log | grep "ddt.com"
```

**Common Causes and Solutions:**

#### Cause 1: Incorrect Prefix Configuration

```bash
# Check current mapping
curl http://localhost:3000/api/domains/ddt.com | jq '.pathPrefix'

# Should return: "/ddt"
# If incorrect, update configuration:
export DOMAIN_PATH_MAPPING='{"ddt.com": "/ddt"}'
```

#### Cause 2: Complex Regex Rules Interfering

```bash
# Check if complex rules are configured
echo $PATH_REWRITE_RULES | jq .

# Solution: Ensure simple prefix mapping takes precedence
# Remove complex rules for simple domains:
unset PATH_REWRITE_RULES
# OR ensure rules don't conflict with prefix mapping
```

#### Cause 3: Fallback Behavior

```bash
# Check fallback configuration
echo $PATH_REWRITE_FALLBACK_ENABLED
echo $PATH_REWRITE_FALLBACK_PREFIX

# Solution: Configure appropriate fallback
export PATH_REWRITE_FALLBACK_ENABLED=true
export PATH_REWRITE_FALLBACK_PREFIX="/default"
```

**Example Debug Session:**

```bash
# Test transformation step by step
echo "Testing ddt.com/about transformation..."

# 1. Check domain configuration
curl -s http://localhost:3000/api/domains/ddt.com | jq '.'

# 2. Test transformation
curl -s -X POST http://localhost:3000/api/domains/test-transformation \
  -H "Content-Type: application/json" \
  -d '{"domain": "ddt.com", "path": "/about"}' | jq '.'

# 3. Check actual request
curl -v -H "Host: ddt.com" http://localhost:3000/about
```

### 3. Performance Issues

**Symptoms:**

- Slow response times
- High CPU usage
- Memory leaks
- Timeouts

**Diagnostic Steps:**

```bash
# Check performance metrics
curl http://localhost:3000/metrics | grep path_rewrite

# Check transformation times
grep "Slow path transformation" logs/app.log

# Check memory usage
curl http://localhost:3000/health | jq '.system.memory'

# Run performance benchmark
node benchmark.js
```

**Common Causes and Solutions:**

#### Cause 1: Complex Regex Patterns

```bash
# Check for complex regex rules
curl http://localhost:3000/api/domains | jq '.domains[].regexRules'

# Solution: Optimize regex patterns
# Before (slow):
export PATH_REWRITE_RULES='{"api.example.com": {"^/v([1-9])/users/([0-9]+)/profile/([a-zA-Z0-9-_]+)$": "/api/v$1/user-profiles/$2/$3"}}'

# After (faster):
export PATH_REWRITE_RULES='{"api.example.com": {"^/v1/users/([0-9]+)": "/api/v1/users/$1"}}'
```

#### Cause 2: Cache Misses

```bash
# Check cache performance
curl http://localhost:3000/api/cache/stats | jq '.hitRate'

# Should be > 0.8 (80%)
# Solution: Increase cache size or check for cache invalidation issues
export PATH_REWRITE_CACHE_SIZE=50000
```

#### Cause 3: Memory Leaks

```bash
# Monitor memory over time
while true; do
  curl -s http://localhost:3000/health | jq '.system.memory.heapUsed'
  sleep 10
done

# Solution: Check for memory leaks and restart if necessary
# Enable garbage collection logging:
export NODE_OPTIONS="--max-old-space-size=2048"
```

### 4. Cache Issues

**Symptoms:**

- Inconsistent transformations
- Stale cached results
- Low cache hit rates

**Diagnostic Steps:**

```bash
# Check cache statistics
curl http://localhost:3000/api/cache/stats

# Check cache configuration
echo $CACHE_ENABLED
echo $CACHE_DEFAULT_TTL
echo $PATH_REWRITE_CACHE_ENABLED

# Clear cache and test
curl -X DELETE http://localhost:3000/api/cache
```

**Common Causes and Solutions:**

#### Cause 1: Cache Disabled

```bash
# Check if caching is enabled
echo $CACHE_ENABLED
echo $PATH_REWRITE_CACHE_ENABLED

# Solution: Enable caching
export CACHE_ENABLED=true
export PATH_REWRITE_CACHE_ENABLED=true
```

#### Cause 2: Cache Size Too Small

```bash
# Check cache size and usage
curl http://localhost:3000/api/cache/stats | jq '.totalItems, .maxItems'

# Solution: Increase cache size
export CACHE_MAX_ITEMS=10000
export PATH_REWRITE_CACHE_SIZE=10000
```

#### Cause 3: Cache Key Conflicts

```bash
# Check for domain-specific cache issues
curl http://localhost:3000/api/cache/stats | jq '.domainStats'

# Solution: Enable domain-aware caching
export CACHE_DOMAIN_AWARE=true
export CACHE_PATH_PREFIX_AWARE=true
```

### 5. Circuit Breaker Issues

**Symptoms:**

- Requests failing with "Circuit breaker open" messages
- High error rates for specific domains
- Intermittent failures

**Diagnostic Steps:**

```bash
# Check circuit breaker status
curl http://localhost:3000/health | jq '.pathRewriting.circuitBreakers'

# Check error rates
curl http://localhost:3000/api/domains | jq '.domains[].statistics.errorRate'

# Check circuit breaker logs
grep "Circuit breaker" logs/app.log
```

**Common Causes and Solutions:**

#### Cause 1: High Error Rate

```bash
# Check error threshold
echo $PATH_REWRITE_ERROR_RATE_THRESHOLD

# Solution: Fix underlying errors or adjust threshold
export PATH_REWRITE_ERROR_RATE_THRESHOLD=0.1  # 10%
```

#### Cause 2: Backend Issues

```bash
# Test backend connectivity
curl -v https://main--allaboutv2--ddttom.hlx.live/ddt/test

# Solution: Fix backend issues or configure fallback
export PATH_REWRITE_FALLBACK_ENABLED=true
```

#### Cause 3: Circuit Breaker Too Sensitive

```bash
# Adjust circuit breaker settings
export PATH_REWRITE_CIRCUIT_BREAKER_THRESHOLD=0.5  # 50% error rate
export PATH_REWRITE_CIRCUIT_BREAKER_TIMEOUT=60000  # 60 seconds
```

### 6. Configuration Reload Issues

**Symptoms:**

- Configuration changes not taking effect
- Reload endpoint returning errors
- Inconsistent behavior after configuration changes

**Diagnostic Steps:**

```bash
# Test configuration reload
curl -X POST http://localhost:3000/api/domains/reload

# Check for validation errors
grep "Rule validation failed" logs/error.log

# Verify new configuration
curl http://localhost:3000/api/domains
```

**Common Causes and Solutions:**

#### Cause 1: Invalid Configuration

```bash
# Test configuration validity
echo $DOMAIN_PATH_MAPPING | jq .

# Solution: Fix JSON syntax errors
export DOMAIN_PATH_MAPPING='{"ddt.com": "/ddt", "blog.example.com": "/blog"}'
```

#### Cause 2: Permission Issues

```bash
# Check if reload endpoint is accessible
curl -v -X POST http://localhost:3000/api/domains/reload

# Solution: Ensure request is from localhost or configure authentication
```

## Debugging Tools and Commands

### 1. Log Analysis Commands

```bash
# Find transformation errors
grep -E "(transformation error|path-rewriter.*error)" logs/error.log

# Monitor real-time transformations
tail -f logs/app.log | grep "path-rewriter"

# Check performance issues
grep "Slow path transformation" logs/app.log | tail -10

# Find circuit breaker events
grep "Circuit breaker" logs/app.log

# Check cache performance
grep "cache.*hit\|cache.*miss" logs/app.log | tail -20
```

### 2. API Testing Commands

```bash
# Test domain configuration
curl -s http://localhost:3000/api/domains | jq '.domains | keys'

# Test specific domain
curl -s http://localhost:3000/api/domains/ddt.com | jq '.'

# Test transformation
curl -s -X POST http://localhost:3000/api/domains/test-transformation \
  -H "Content-Type: application/json" \
  -d '{"domain": "ddt.com", "path": "/test"}' | jq '.'

# Check health status
curl -s http://localhost:3000/health | jq '.pathRewriting'

# Get performance metrics
curl -s http://localhost:3000/metrics | grep path_rewrite
```

### 3. Configuration Validation

```bash
# Validate JSON configuration
validate_json() {
  echo "$1" | jq . > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ Valid JSON"
  else
    echo "❌ Invalid JSON"
  fi
}

validate_json "$DOMAIN_PATH_MAPPING"
validate_json "$PATH_REWRITE_RULES"
```

### 4. Performance Testing

```bash
# Quick performance test
test_performance() {
  local domain=$1
  local path=$2
  
  echo "Testing $domain$path..."
  
  # Warm up
  for i in {1..10}; do
    curl -s -H "Host: $domain" http://localhost:3000$path > /dev/null
  done
  
  # Measure
  time for i in {1..100}; do
    curl -s -H "Host: $domain" http://localhost:3000$path > /dev/null
  done
}

test_performance "ddt.com" "/about"
```

## Prevention Strategies

### 1. Configuration Best Practices

```bash
# Use configuration validation
export PATH_REWRITE_VALIDATE_CONFIG=true

# Enable comprehensive logging
export LOG_LEVEL=debug
export PATH_REWRITE_LOG_ENABLED=true

# Set appropriate timeouts
export REQUEST_TIMEOUT=30000
export PATH_REWRITE_TIMEOUT=5000

# Configure monitoring
export PATH_REWRITE_METRICS_ENABLED=true
export HEALTH_CHECK_DETAILED=true
```

### 2. Monitoring Setup

```bash
# Set up alerts for common issues
export PATH_REWRITE_ALERT_ON_ERRORS=true
export PATH_REWRITE_ALERT_ON_SLOW=true
export PATH_REWRITE_ALERT_ON_CIRCUIT_BREAKER=true

# Configure performance thresholds
export PATH_REWRITE_SLOW_THRESHOLD=0.010  # 10ms
export PATH_REWRITE_ERROR_RATE_THRESHOLD=0.05  # 5%
```

### 3. Regular Maintenance

```bash
# Create maintenance script
cat > maintenance.sh << 'EOF'
#!/bin/bash

echo "Running path rewriter maintenance..."

# Check health
curl -s http://localhost:3000/health | jq '.pathRewriting'

# Check cache performance
CACHE_HIT_RATE=$(curl -s http://localhost:3000/api/cache/stats | jq -r '.hitRate')
if (( $(echo "$CACHE_HIT_RATE < 0.8" | bc -l) )); then
  echo "Warning: Low cache hit rate: $CACHE_HIT_RATE"
fi

# Check error rates
curl -s http://localhost:3000/api/domains | jq -r '.domains | to_entries[] | select(.value.statistics.errorRate > 0.05) | "High error rate for \(.key): \(.value.statistics.errorRate)"'

# Clean up old logs
find logs/ -name "*.log" -mtime +7 -delete

echo "Maintenance completed"
EOF

chmod +x maintenance.sh
```

## Emergency Procedures

### 1. Complete System Failure

```bash
# Disable path rewriting temporarily
export PATH_REWRITE_ENABLED=false
# Restart application

# OR use passthrough mode
export PATH_REWRITE_FALLBACK_ENABLED=true
export PATH_REWRITE_FALLBACK_PREFIX=""
```

### 2. High Error Rate

```bash
# Open all circuit breakers
curl -X POST http://localhost:3000/api/domains/circuit-breaker/open-all

# OR disable problematic domains
export DOMAIN_PATH_MAPPING='{"safe-domain.com": "/safe"}'
curl -X POST http://localhost:3000/api/domains/reload
```

### 3. Memory Issues

```bash
# Clear all caches
curl -X DELETE http://localhost:3000/api/cache

# Check for memory leaks
curl -X GET http://localhost:3000/health | jq '.system.memory'

# Restart with increased memory
export NODE_OPTIONS="--max-old-space-size=4096"
# Restart application
```

### 4. Performance Degradation

```bash
# Switch to simple prefix mode only
unset PATH_REWRITE_RULES
export DOMAIN_PATH_MAPPING='{"ddt.com": "/ddt"}'
curl -X POST http://localhost:3000/api/domains/reload

# Increase cache size
export PATH_REWRITE_CACHE_SIZE=50000
```

## Getting Help

### 1. Collect Diagnostic Information

```bash
# Create diagnostic report
cat > diagnostic-report.sh << 'EOF'
#!/bin/bash

echo "=== Path Rewriter Diagnostic Report ==="
echo "Timestamp: $(date)"
echo

echo "=== Configuration ==="
env | grep -E "(PATH_REWRITE|DOMAIN_|CACHE_)" | sort

echo -e "\n=== Health Status ==="
curl -s http://localhost:3000/health | jq '.pathRewriting'

echo -e "\n=== Domain Configuration ==="
curl -s http://localhost:3000/api/domains | jq '.domains | keys'

echo -e "\n=== Cache Statistics ==="
curl -s http://localhost:3000/api/cache/stats | jq '.'

echo -e "\n=== Recent Errors ==="
grep -E "(path-rewriter.*error|transformation error)" logs/error.log | tail -10

echo -e "\n=== Performance Metrics ==="
curl -s http://localhost:3000/metrics | grep path_rewrite | head -20

echo -e "\n=== System Information ==="
echo "Node Version: $(node --version)"
echo "Platform: $(uname -a)"
echo "Memory: $(free -h 2>/dev/null || vm_stat 2>/dev/null | head -5)"
EOF

chmod +x diagnostic-report.sh
./diagnostic-report.sh > diagnostic-report.txt
```

### 2. Enable Debug Mode

```bash
# Enable maximum debugging
export LOG_LEVEL=debug
export PATH_REWRITE_LOG_ENABLED=true
export PATH_REWRITE_LOG_TRANSFORMATIONS=true
export PATH_REWRITE_LOG_PERFORMANCE=true
export PATH_REWRITE_LOG_CACHE_OPERATIONS=true

# Restart application and reproduce issue
```

### 3. Contact Support

When contacting support, include:

- Diagnostic report output
- Relevant log excerpts
- Configuration details
- Steps to reproduce the issue
- Expected vs actual behavior

## Memory Leak Troubleshooting

Memory leaks can cause the application to consume increasing amounts of memory over time, leading to performance degradation and eventual crashes. This section covers detection, diagnosis, and prevention of memory leaks.

### Quick Memory Leak Diagnostic Checklist

Before diving into specific memory issues, run through this checklist:

1. **Check Memory Usage Trends**

   ```bash
   # Monitor memory usage over time
   while true; do
     curl -s http://localhost:3000/health | jq '.system.memory.heapUsed'
     sleep 30
   done
   ```

2. **Check for Dangling Intervals**

   ```bash
   # Check for interval cleanup warnings in logs
   grep -i "interval.*not.*cleared\|memory.*leak" logs/error.log
   ```

3. **Test Graceful Shutdown**

   ```bash
   # Send SIGTERM and check if cleanup occurs properly
   kill -TERM $(pgrep -f "node.*cluster-manager")
   grep "shutdown" logs/app.log | tail -10
   ```

4. **Check Active Handles**

   ```bash
   # Enable handle monitoring (requires restart with debug flag)
   export NODE_OPTIONS="--trace-warnings"
   ```

### Common Memory Leak Issues

#### 1. Interval Timer Memory Leaks

**Symptoms:**

- Memory usage continuously increases over time
- Application becomes slower over hours/days of operation
- High number of active timers in process

**Diagnostic Steps:**

```bash
# Check if intervals are being cleared properly
grep "shutting down" logs/app.log

# Look for cleanup completion messages
grep -E "(cleanup.*completed|resources.*cleaned)" logs/app.log

# Check for worker process cleanup
grep "Worker.*cleanup" logs/app.log | tail -5
```

**Common Causes and Solutions:**

##### Cause 1: Intervals Not Cleared on Shutdown

```bash
# Check if graceful shutdown is working
ps aux | grep node
kill -TERM <pid>
# Should see shutdown messages in logs

# If shutdown hangs, intervals may not be cleared
# Force restart if necessary:
kill -KILL <pid>
```

##### Cause 2: Worker Process Cleanup Issues

```bash
# Check cluster worker cleanup
grep "Worker.*shutdown" logs/app.log

# If workers don't clean up properly, restart cluster manager:
pm2 restart cluster-manager
# OR
systemctl restart cdn-service
```

##### Cause 3: Dashboard Integration Intervals

```bash
# Check dashboard integration cleanup
grep "Dashboard.*shutdown" logs/app.log

# If dashboard intervals persist:
curl -X POST http://localhost:3000/api/dashboard/shutdown
```

**Prevention and Fix:**

```bash
# Ensure proper shutdown handling is enabled
export GRACEFUL_SHUTDOWN_ENABLED=true
export SHUTDOWN_TIMEOUT=30000

# Enable cleanup logging
export LOG_LEVEL=info
export SHUTDOWN_LOG_ENABLED=true

# Regular restart schedule (preventive)
# Add to crontab for daily restart:
# 0 2 * * * systemctl restart cdn-service
```

#### 2. Cache Memory Accumulation

**Symptoms:**

- Memory usage increases with traffic volume
- Cache hit rates are low despite high traffic
- Memory doesn't decrease during low traffic periods

**Diagnostic Steps:**

```bash
# Check cache memory usage
curl -s http://localhost:3000/api/cache/stats | jq '.keys, .memoryUsage'

# Check cache configuration
echo $CACHE_MAX_ITEMS
echo $CACHE_DEFAULT_TTL

# Monitor cache cleanup
grep "cache.*cleanup\|cache.*expired" logs/app.log
```

**Common Causes and Solutions:**

##### Cause 1: Cache Size Too Large

```bash
# Check current cache size
curl -s http://localhost:3000/api/cache/stats | jq '.keys'

# Solution: Reduce cache size
export CACHE_MAX_ITEMS=5000
export PATH_REWRITE_CACHE_SIZE=5000
# Restart application
```

##### Cause 2: TTL Too Long

```bash
# Check TTL configuration
echo $CACHE_DEFAULT_TTL
echo $CACHE_MAX_TTL

# Solution: Reduce TTL
export CACHE_DEFAULT_TTL=300    # 5 minutes
export CACHE_MAX_TTL=1800      # 30 minutes
```

##### Cause 3: Cache Cleanup Not Running

```bash
# Force cache cleanup
curl -X DELETE http://localhost:3000/api/cache

# Check if automatic cleanup is working
grep "cache.*cleanup" logs/app.log | tail -5
```

#### 3. Event Listener Memory Leaks

**Symptoms:**

- Memory increases when handling many requests
- High number of event listeners in process
- Warning messages about MaxListenersExceededWarning

**Diagnostic Steps:**

```bash
# Enable event listener warnings
export NODE_OPTIONS="--trace-warnings --max-old-space-size=2048"

# Check for listener warnings in logs
grep -i "MaxListenersExceededWarning\|listener.*leak" logs/error.log

# Monitor event listener count
node -e "console.log(process.listenerCount('uncaughtException'))"
```

**Common Causes and Solutions:**

##### Cause 1: Request Handlers Not Cleaned Up

```bash
# Check for request cleanup warnings
grep "request.*cleanup\|response.*cleanup" logs/app.log

# Solution: Ensure proper request/response cleanup in middleware
# Check middleware configuration
echo $REQUEST_CLEANUP_ENABLED
```

##### Cause 2: WebSocket Connection Leaks

```bash
# If using WebSockets, check connection count
curl -s http://localhost:3000/health | jq '.connections'

# Solution: Implement connection cleanup
export WEBSOCKET_CLEANUP_ENABLED=true
export WEBSOCKET_TIMEOUT=300000
```

#### 4. File Descriptor Leaks

**Symptoms:**

- "Too many open files" errors
- High number of file descriptors in use
- Application crashes after running for extended periods

**Diagnostic Steps:**

```bash
# Check open file descriptors
lsof -p $(pgrep -f "node.*cluster-manager") | wc -l

# Check file descriptor limits
ulimit -n

# Monitor file descriptor usage
watch "lsof -p $(pgrep -f node) | wc -l"
```

**Common Causes and Solutions:**

##### Cause 1: HTTP Connections Not Closed

```bash
# Check for connection cleanup
grep "connection.*close\|socket.*cleanup" logs/app.log

# Solution: Ensure proper connection cleanup
export HTTP_KEEP_ALIVE_TIMEOUT=5000
export HTTP_MAX_SOCKETS=100
```

##### Cause 2: File Handles Not Released

```bash
# Check for file operation warnings
grep "file.*not.*closed\|EMFILE" logs/error.log

# Solution: Increase limits and ensure file cleanup
ulimit -n 65536
export FILE_CLEANUP_ENABLED=true
```

### Memory Leak Detection Tools

#### 1. Memory Monitoring Commands

```bash
# Continuous memory monitoring
monitor_memory() {
  echo "timestamp,heapUsed,heapTotal,rss" > memory.log
  while true; do
    local timestamp=$(date +%s)
    local memory=$(curl -s http://localhost:3000/health | jq -r '.system.memory | "\(.heapUsed),\(.heapTotal),\(.rss)"')
    echo "$timestamp,$memory" >> memory.log
    sleep 60
  done
}

monitor_memory &
```

#### 2. Memory Leak Testing

```bash
# Memory leak stress test
stress_test_memory() {
  echo "Running memory leak stress test..."
  
  # Record initial memory
  local initial_memory=$(curl -s http://localhost:3000/health | jq -r '.system.memory.heapUsed')
  echo "Initial memory: $initial_memory bytes"
  
  # Generate load
  for i in {1..1000}; do
    curl -s -H "Host: ddt.com" http://localhost:3000/test > /dev/null
    if [ $((i % 100)) -eq 0 ]; then
      local current_memory=$(curl -s http://localhost:3000/health | jq -r '.system.memory.heapUsed')
      echo "Memory after $i requests: $current_memory bytes"
    fi
  done
  
  # Wait for potential cleanup
  sleep 30
  
  # Record final memory
  local final_memory=$(curl -s http://localhost:3000/health | jq -r '.system.memory.heapUsed')
  echo "Final memory: $final_memory bytes"
  
  local increase=$((final_memory - initial_memory))
  echo "Memory increase: $increase bytes"
  
  if [ $increase -gt 50000000 ]; then  # 50MB
    echo "⚠️  Potential memory leak detected!"
  else
    echo "✅ Memory usage appears stable"
  fi
}

stress_test_memory
```

#### 3. Heap Dump Analysis

```bash
# Generate heap dump (requires --inspect flag)
kill -USR2 $(pgrep -f "node.*cluster-manager")

# Or use Node.js built-in
node -e "require('v8').writeHeapSnapshot('heap-$(date +%s).heapsnapshot')"

# Analyze with Chrome DevTools or clinic.js
npm install -g clinic
clinic doctor -- node src/cluster-manager.js
```

### Memory Leak Prevention Strategies

#### 1. Configuration Best Practices

```bash
# Memory management configuration
export NODE_OPTIONS="--max-old-space-size=2048 --gc-interval=100 --expose-gc"

# Cache limits
export CACHE_MAX_ITEMS=5000
export CACHE_DEFAULT_TTL=300
export CACHE_CLEANUP_INTERVAL=60000

# Resource cleanup settings
export GRACEFUL_SHUTDOWN_ENABLED=true
export SHUTDOWN_TIMEOUT=30000
export RESOURCE_CLEANUP_ENABLED=true

# Monitoring and alerting
export MEMORY_MONITORING_ENABLED=true
export MEMORY_ALERT_THRESHOLD=1073741824  # 1GB
export MEMORY_CHECK_INTERVAL=60000
```

#### 2. Monitoring and Alerting

```bash
# Set up memory monitoring alerts
cat > memory-alert.sh << 'EOF'
#!/bin/bash

THRESHOLD=1073741824  # 1GB in bytes
CURRENT_MEMORY=$(curl -s http://localhost:3000/health | jq -r '.system.memory.heapUsed')

if [ "$CURRENT_MEMORY" -gt "$THRESHOLD" ]; then
  echo "ALERT: Memory usage exceeds threshold"
  echo "Current: $(echo "$CURRENT_MEMORY / 1024 / 1024" | bc)MB"
  echo "Threshold: $(echo "$THRESHOLD / 1024 / 1024" | bc)MB"
  
  # Optional: automatic restart
  # systemctl restart cdn-service
fi
EOF

chmod +x memory-alert.sh

# Add to crontab for regular monitoring
# */5 * * * * /path/to/memory-alert.sh
```

#### 3. Regular Maintenance

```bash
# Create memory maintenance script
cat > memory-maintenance.sh << 'EOF'
#!/bin/bash

echo "Running memory maintenance..."

# Check current memory usage
CURRENT_MEMORY=$(curl -s http://localhost:3000/health | jq -r '.system.memory.heapUsed')
echo "Current memory usage: $(echo "$CURRENT_MEMORY / 1024 / 1024" | bc)MB"

# Clear caches
echo "Clearing caches..."
curl -s -X DELETE http://localhost:3000/api/cache > /dev/null
curl -s -X DELETE http://localhost:3000/api/cache/url-transform > /dev/null

# Check memory after cleanup
sleep 5
NEW_MEMORY=$(curl -s http://localhost:3000/health | jq -r '.system.memory.heapUsed')
echo "Memory after cleanup: $(echo "$NEW_MEMORY / 1024 / 1024" | bc)MB"

SAVED=$((CURRENT_MEMORY - NEW_MEMORY))
echo "Memory saved: $(echo "$SAVED / 1024 / 1024" | bc)MB"

# Force garbage collection if available
if command -v node >/dev/null 2>&1; then
  node -e "if (global.gc) { global.gc(); console.log('Garbage collection triggered'); }"
fi

echo "Memory maintenance completed"
EOF

chmod +x memory-maintenance.sh
```

### Memory Leak Emergency Procedures

#### 1. Immediate Memory Relief

```bash
# Clear all caches immediately
curl -X DELETE http://localhost:3000/api/cache
curl -X DELETE http://localhost:3000/api/cache/url-transform
curl -X DELETE http://localhost:3000/api/file-resolution/cache

# Force garbage collection if possible
kill -USR2 $(pgrep -f "node.*cluster-manager")
```

#### 2. Graceful Service Restart

```bash
# Graceful restart to clear memory leaks
echo "Initiating graceful restart..."

# Send SIGTERM for graceful shutdown
kill -TERM $(pgrep -f "node.*cluster-manager")

# Wait for graceful shutdown
sleep 30

# Check if process stopped
if pgrep -f "node.*cluster-manager" > /dev/null; then
  echo "Graceful shutdown failed, forcing stop..."
  kill -KILL $(pgrep -f "node.*cluster-manager")
fi

# Restart service
systemctl start cdn-service
# OR
pm2 start cluster-manager

echo "Service restarted"
```

#### 3. Memory Diagnostic Collection

```bash
# Collect memory diagnostic information
cat > collect-memory-diagnostics.sh << 'EOF'
#!/bin/bash

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="memory-diagnostics-$TIMESTAMP"
mkdir -p "$REPORT_DIR"

echo "Collecting memory diagnostics to $REPORT_DIR..."

# System memory info
echo "=== System Memory ===" > "$REPORT_DIR/system-memory.txt"
free -h >> "$REPORT_DIR/system-memory.txt"

# Process memory info
echo "=== Process Memory ===" > "$REPORT_DIR/process-memory.txt"
ps aux | grep node >> "$REPORT_DIR/process-memory.txt"

# Application memory info
echo "=== Application Memory ===" > "$REPORT_DIR/app-memory.txt"
curl -s http://localhost:3000/health | jq '.system.memory' >> "$REPORT_DIR/app-memory.txt"

# Cache statistics
echo "=== Cache Statistics ===" > "$REPORT_DIR/cache-stats.txt"
curl -s http://localhost:3000/api/cache/stats >> "$REPORT_DIR/cache-stats.txt"

# Open file descriptors
echo "=== File Descriptors ===" > "$REPORT_DIR/file-descriptors.txt"
lsof -p $(pgrep -f node) >> "$REPORT_DIR/file-descriptors.txt" 2>/dev/null

# Network connections
echo "=== Network Connections ===" > "$REPORT_DIR/network-connections.txt"
netstat -tulpn | grep node >> "$REPORT_DIR/network-connections.txt"

# Recent logs
echo "=== Recent Error Logs ===" > "$REPORT_DIR/recent-errors.txt"
grep -i "error\|warning\|memory\|leak" logs/error.log | tail -50 >> "$REPORT_DIR/recent-errors.txt"

# Generate heap snapshot if possible
if command -v node >/dev/null 2>&1; then
  echo "Generating heap snapshot..."
  node -e "require('v8').writeHeapSnapshot('$REPORT_DIR/heap-snapshot.heapsnapshot')" 2>/dev/null || echo "Could not generate heap snapshot"
fi

echo "Diagnostics collected in $REPORT_DIR/"
tar -czf "$REPORT_DIR.tar.gz" "$REPORT_DIR"
echo "Archive created: $REPORT_DIR.tar.gz"
EOF

chmod +x collect-memory-diagnostics.sh
```

This comprehensive memory leak troubleshooting section provides tools and procedures to detect, diagnose, and prevent memory leaks in the CDN application, with specific focus on the interval cleanup fixes that were implemented.

## File Resolution Troubleshooting

The file resolution system can encounter various issues related to file discovery, content transformation, and caching. This section covers common problems and their solutions.

### Quick File Resolution Diagnostic Checklist

Before diving into specific file resolution issues, run through this checklist:

1. **Check File Resolution Configuration**

   ```bash
   # Verify file resolution is enabled
   echo $FILE_RESOLUTION_ENABLED
   echo $FILE_RESOLUTION_EXTENSIONS
   ```

2. **Check File Resolution Logs**

   ```bash
   # Look for file resolution errors
   grep "file-resolver" logs/error.log | tail -20
   ```

3. **Test Basic File Resolution**

   ```bash
   # Test file resolution for a domain
   curl -X POST http://localhost:3000/api/file-resolution/test \
     -H "Content-Type: application/json" \
     -d '{"domain": "docs.example.com", "path": "/test"}'
   ```

4. **Check File Resolution Health**

   ```bash
   # Check file resolution status
   curl http://localhost:3000/api/file-resolution/status
   ```

### Common File Resolution Issues

#### 1. Files Not Being Resolved

**Symptoms:**

- Extensionless requests return 404 errors
- File resolution is not attempting to find files with extensions
- No file resolution logs appear

**Diagnostic Steps:**

```bash
# Check if file resolution is enabled
curl http://localhost:3000/api/file-resolution/status | jq '.enabled'

# Check domain configuration
curl http://localhost:3000/api/file-resolution/domains/docs.example.com

# Check file resolution logs
grep "file-resolver" logs/app.log | grep "docs.example.com"
```

**Common Causes and Solutions:**

##### Cause 1: File Resolution Disabled

```bash
# Check configuration
echo $FILE_RESOLUTION_ENABLED
# Should return: true

# Solution: Enable file resolution
export FILE_RESOLUTION_ENABLED=true
# Restart application
```

##### Cause 2: Domain Not Configured for File Resolution

```bash
# Check domain configuration
echo $FILE_RESOLUTION_DOMAIN_CONFIG
# Should include your domain

# Solution: Add domain to file resolution configuration
export FILE_RESOLUTION_DOMAIN_CONFIG='{
  "docs.example.com": {
    "enabled": true,
    "extensions": ["md", "html", "txt"]
  }
}'
# Restart application
```

##### Cause 3: No Extensions Configured

```bash
# Check extensions configuration
echo $FILE_RESOLUTION_EXTENSIONS
# Should have extensions like: html,md,json,txt

# Solution: Configure extensions
export FILE_RESOLUTION_EXTENSIONS="html,md,json,csv,txt"
```

**Example Fix:**

```bash
# Complete configuration for file resolution
export FILE_RESOLUTION_ENABLED=true
export FILE_RESOLUTION_EXTENSIONS="html,md,json,txt"
export FILE_RESOLUTION_DOMAIN_CONFIG='{
  "docs.example.com": {
    "enabled": true,
    "extensions": ["md", "html", "txt"],
    "transformEnabled": true
  }
}'
```

#### 2. Content Transformation Failures

**Symptoms:**

- Files are found but transformation fails
- Original content is served instead of transformed content
- Transformation error messages in logs

**Diagnostic Steps:**

```bash
# Test content transformation
curl -X POST http://localhost:3000/api/file-resolution/transform \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Test Markdown",
    "contentType": "text/markdown",
    "transformer": "markdown"
  }'

# Check transformer status
curl http://localhost:3000/api/file-resolution/transformers

# Check transformation logs
grep "transformation.*failed" logs/error.log
```

**Common Causes and Solutions:**

##### Cause 1: Transformer Disabled

```bash
# Check transformer configuration
curl http://localhost:3000/api/file-resolution/transformers | jq '.available.markdown.enabled'

# Solution: Enable transformer
export FILE_RESOLUTION_TRANSFORM_ENABLED=true
export FILE_RESOLUTION_TRANSFORM_MARKDOWN=true
```

##### Cause 2: Invalid Content Format

```bash
# Check for content parsing errors
grep "Invalid.*syntax" logs/error.log

# Solution: Validate content or disable transformation for problematic files
export FILE_RESOLUTION_TRANSFORMER_CONFIG='{
  "markdown": {
    "enabled": true,
    "options": {
      "breaks": true,
      "html": true
    }
  }
}'
```

##### Cause 3: Transformer Dependencies Missing

```bash
# Check if required dependencies are installed
npm list marked  # for markdown
npm list csv-parser  # for CSV

# Solution: Install missing dependencies
npm install marked csv-parser
```

#### 3. Circuit Breaker Issues

**Symptoms:**

- File resolution failing with "Circuit breaker open" messages
- High failure rates for specific domains
- Intermittent file resolution failures

**Diagnostic Steps:**

```bash
# Check circuit breaker status
curl http://localhost:3000/api/file-resolution/circuit-breaker

# Check domain-specific circuit breaker status
curl http://localhost:3000/api/file-resolution/domains/docs.example.com | jq '.circuitBreaker'

# Check circuit breaker logs
grep "Circuit breaker" logs/app.log | grep "file-resolver"
```

**Common Causes and Solutions:**

##### Cause 1: High Failure Rate

```bash
# Check failure threshold
echo $FILE_RESOLUTION_CIRCUIT_BREAKER_THRESHOLD
# Default is usually 5 failures

# Solution: Fix underlying issues or adjust threshold
export FILE_RESOLUTION_CIRCUIT_BREAKER_THRESHOLD=10
export FILE_RESOLUTION_CIRCUIT_BREAKER_TIMEOUT=60000
```

##### Cause 2: Backend Connectivity Issues

```bash
# Test backend connectivity directly
curl -I https://backend.example.com/test.md

# Solution: Fix backend issues or configure fallback
export FILE_RESOLUTION_FALLBACK_ENABLED=true
```

##### Cause 3: Reset Circuit Breaker

```bash
# Manually reset circuit breaker for a domain
curl -X POST http://localhost:3000/api/file-resolution/circuit-breaker/docs.example.com/reset
```

#### 4. Cache Performance Issues

**Symptoms:**

- Slow file resolution performance
- Low cache hit rates
- Inconsistent file resolution results

**Diagnostic Steps:**

```bash
# Check cache statistics
curl http://localhost:3000/api/file-resolution/cache

# Check cache hit rate
curl http://localhost:3000/api/file-resolution/stats | jq '.cacheStats.hitRate'

# Monitor cache operations
grep "cache.*hit\|cache.*miss" logs/app.log | grep "file-resolver"
```

**Common Causes and Solutions:**

##### Cause 1: Cache Disabled

```bash
# Check if cache is enabled
echo $FILE_RESOLUTION_CACHE_ENABLED
# Should return: true

# Solution: Enable cache
export FILE_RESOLUTION_CACHE_ENABLED=true
export FILE_RESOLUTION_CACHE_MAX_SIZE=1000
```

##### Cause 2: Cache Size Too Small

```bash
# Check cache utilization
curl http://localhost:3000/api/file-resolution/cache | jq '.currentSize, .maxSize'

# Solution: Increase cache size
export FILE_RESOLUTION_CACHE_MAX_SIZE=5000
```

##### Cause 3: TTL Configuration Issues

```bash
# Check TTL settings
echo $FILE_RESOLUTION_CACHE_POSITIVE_TTL
echo $FILE_RESOLUTION_CACHE_NEGATIVE_TTL

# Solution: Adjust TTL values
export FILE_RESOLUTION_CACHE_POSITIVE_TTL=600  # 10 minutes
export FILE_RESOLUTION_CACHE_NEGATIVE_TTL=120  # 2 minutes
```

#### 5. Performance and Timeout Issues

**Symptoms:**

- Slow file resolution responses
- Timeout errors during file resolution
- High CPU usage during file resolution

**Diagnostic Steps:**

```bash
# Check resolution performance
curl http://localhost:3000/api/file-resolution/stats | jq '.averageResolutionTime'

# Check for slow resolutions
grep "Slow file resolution" logs/app.log

# Monitor resolution times
curl -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{"domain": "docs.example.com", "path": "/test"}' | jq '.timing'
```

**Common Causes and Solutions:**

##### Cause 1: Timeout Too Low

```bash
# Check timeout configuration
echo $FILE_RESOLUTION_TIMEOUT
# Default is usually 5000ms

# Solution: Increase timeout
export FILE_RESOLUTION_TIMEOUT=10000
```

##### Cause 2: Too Many Extensions

```bash
# Check number of extensions being tried
echo $FILE_RESOLUTION_EXTENSIONS | tr ',' '\n' | wc -l

# Solution: Reduce extensions or reorder by priority
export FILE_RESOLUTION_EXTENSIONS="html,md,json"  # Most common first
```

##### Cause 3: Concurrent Request Limit

```bash
# Check concurrent request configuration
echo $FILE_RESOLUTION_CONCURRENT_REQUESTS

# Solution: Adjust concurrent request limit
export FILE_RESOLUTION_CONCURRENT_REQUESTS=10
export FILE_RESOLUTION_MAX_SOCKETS=50
```

### File Resolution Debugging Tools

#### 1. File Resolution Log Analysis

```bash
# Find file resolution errors
grep -E "(file-resolver.*error|resolution.*failed)" logs/error.log

# Monitor real-time file resolution
tail -f logs/app.log | grep "file-resolver"

# Check resolution performance
grep "file-resolver.*totalTime" logs/app.log | \
  awk '{print $NF}' | sort -n | tail -10

# Find circuit breaker events
grep "file-resolver.*circuit.*breaker" logs/app.log

# Check transformation success rates
grep "file-resolver.*transformed" logs/app.log | \
  grep -c "true\|false"
```

#### 2. File Resolution API Testing

```bash
# Test file resolution status
curl -s http://localhost:3000/api/file-resolution/status | jq '.'

# Test specific domain configuration
curl -s http://localhost:3000/api/file-resolution/domains/docs.example.com | jq '.'

# Test file resolution for specific path
curl -s -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{"domain": "docs.example.com", "path": "/getting-started"}' | jq '.'

# Check cache performance
curl -s http://localhost:3000/api/file-resolution/cache | jq '.statistics'

# Get transformer information
curl -s http://localhost:3000/api/file-resolution/transformers | jq '.available | keys'
```

#### 3. File Resolution Performance Testing

```bash
# Test file resolution performance
test_file_resolution_performance() {
  local domain=$1
  local path=$2
  
  echo "Testing file resolution for $domain$path..."
  
  # Clear cache first
  curl -s -X DELETE http://localhost:3000/api/file-resolution/cache > /dev/null
  
  # Test cold performance
  echo "Cold performance:"
  time curl -s -H "Host: $domain" http://localhost:3000$path > /dev/null
  
  # Test warm performance (cached)
  echo "Warm performance:"
  time curl -s -H "Host: $domain" http://localhost:3000$path > /dev/null
  
  # Check cache hit
  curl -s http://localhost:3000/api/file-resolution/cache | \
    jq ".entries[] | select(.key | contains(\"$domain:$path\"))"
}

test_file_resolution_performance "docs.example.com" "/getting-started"
```

#### 4. File Resolution Configuration Validation

```bash
# Validate file resolution configuration
validate_file_resolution_config() {
  echo "=== File Resolution Configuration Validation ==="
  
  # Check if enabled
  if [ "$FILE_RESOLUTION_ENABLED" = "true" ]; then
    echo "✅ File resolution enabled"
  else
    echo "❌ File resolution disabled"
  fi
  
  # Check extensions
  if [ -n "$FILE_RESOLUTION_EXTENSIONS" ]; then
    echo "✅ Extensions configured: $FILE_RESOLUTION_EXTENSIONS"
  else
    echo "❌ No extensions configured"
  fi
  
  # Validate domain config JSON
  if echo "$FILE_RESOLUTION_DOMAIN_CONFIG" | jq . > /dev/null 2>&1; then
    echo "✅ Domain configuration JSON is valid"
  else
    echo "❌ Domain configuration JSON is invalid"
  fi
  
  # Check transformer config
  if [ "$FILE_RESOLUTION_TRANSFORM_ENABLED" = "true" ]; then
    echo "✅ Content transformation enabled"
  else
    echo "⚠️  Content transformation disabled"
  fi
}

validate_file_resolution_config
```

### File Resolution Prevention Strategies

#### 1. Configuration Best Practices

```bash
# Use comprehensive file resolution configuration
export FILE_RESOLUTION_ENABLED=true
export FILE_RESOLUTION_EXTENSIONS="html,md,json,csv,txt,xml"
export FILE_RESOLUTION_TIMEOUT=5000
export FILE_RESOLUTION_MAX_REDIRECTS=3

# Enable caching for performance
export FILE_RESOLUTION_CACHE_ENABLED=true
export FILE_RESOLUTION_CACHE_MAX_SIZE=2000
export FILE_RESOLUTION_CACHE_POSITIVE_TTL=300
export FILE_RESOLUTION_CACHE_NEGATIVE_TTL=60

# Configure circuit breaker protection
export FILE_RESOLUTION_CIRCUIT_BREAKER_ENABLED=true
export FILE_RESOLUTION_CIRCUIT_BREAKER_THRESHOLD=5
export FILE_RESOLUTION_CIRCUIT_BREAKER_TIMEOUT=30000

# Enable comprehensive logging
export FILE_RESOLUTION_LOG_ENABLED=true
export FILE_RESOLUTION_LOG_REQUESTS=false  # Only enable for debugging
export FILE_RESOLUTION_LOG_TRANSFORMATIONS=true
```

#### 2. Monitoring Setup

```bash
# Set up file resolution monitoring
export FILE_RESOLUTION_METRICS_ENABLED=true
export FILE_RESOLUTION_PERFORMANCE_MONITORING=true
export FILE_RESOLUTION_SLOW_THRESHOLD=1000  # 1 second

# Configure health checks
export FILE_RESOLUTION_HEALTH_CHECK_ENABLED=true
export FILE_RESOLUTION_HEALTH_CHECK_INTERVAL=30000
```

#### 3. Regular Maintenance

```bash
# Create file resolution maintenance script
cat > file-resolution-maintenance.sh << 'EOF'
#!/bin/bash

echo "Running file resolution maintenance..."

# Check file resolution health
curl -s http://localhost:3000/api/file-resolution/status | jq '.enabled, .cache.hitRate'

# Check cache performance
CACHE_HIT_RATE=$(curl -s http://localhost:3000/api/file-resolution/stats | jq -r '.cacheStats.hitRate')
if (( $(echo "$CACHE_HIT_RATE < 0.7" | bc -l) )); then
  echo "Warning: Low cache hit rate: $CACHE_HIT_RATE"
fi

# Check circuit breaker status
OPEN_BREAKERS=$(curl -s http://localhost:3000/api/file-resolution/circuit-breaker | jq -r '.domains | to_entries[] | select(.value.status == "open") | .key')
if [ -n "$OPEN_BREAKERS" ]; then
  echo "Warning: Open circuit breakers for: $OPEN_BREAKERS"
fi

# Check transformation success rates
TRANSFORM_ERRORS=$(grep "transformation.*failed" logs/error.log | wc -l)
if [ "$TRANSFORM_ERRORS" -gt 10 ]; then
  echo "Warning: High transformation error count: $TRANSFORM_ERRORS"
fi

echo "File resolution maintenance completed"
EOF

chmod +x file-resolution-maintenance.sh
```

### File Resolution Emergency Procedures

#### 1. Disable File Resolution

```bash
# Temporarily disable file resolution
export FILE_RESOLUTION_ENABLED=false
# Restart application - requests will go directly to proxy
```

#### 2. Clear File Resolution Cache

```bash
# Clear all file resolution cache
curl -X DELETE http://localhost:3000/api/file-resolution/cache

# Clear cache for specific domain
curl -X DELETE "http://localhost:3000/api/file-resolution/cache?domain=docs.example.com"
```

#### 3. Reset Circuit Breakers

```bash
# Reset all circuit breakers
for domain in $(curl -s http://localhost:3000/api/file-resolution/circuit-breaker | jq -r '.domains | keys[]'); do
  curl -X POST "http://localhost:3000/api/file-resolution/circuit-breaker/$domain/reset"
done
```

#### 4. Disable Content Transformation

```bash
# Disable transformation but keep file resolution
export FILE_RESOLUTION_TRANSFORM_ENABLED=false
# Files will be served in original format
```

### File Resolution Diagnostic Report

```bash
# Create comprehensive file resolution diagnostic report
cat > file-resolution-diagnostic.sh << 'EOF'
#!/bin/bash

echo "=== File Resolution Diagnostic Report ==="
echo "Timestamp: $(date)"
echo

echo "=== Configuration ==="
env | grep -E "FILE_RESOLUTION_" | sort

echo -e "\n=== Status ==="
curl -s http://localhost:3000/api/file-resolution/status | jq '.'

echo -e "\n=== Statistics ==="
curl -s http://localhost:3000/api/file-resolution/stats | jq '.'

echo -e "\n=== Cache Information ==="
curl -s http://localhost:3000/api/file-resolution/cache | jq '.statistics'

echo -e "\n=== Circuit Breaker Status ==="
curl -s http://localhost:3000/api/file-resolution/circuit-breaker | jq '.statistics'

echo -e "\n=== Transformer Status ==="
curl -s http://localhost:3000/api/file-resolution/transformers | jq '.available | to_entries[] | {name: .key, enabled: .value.enabled, transformations: .value.statistics.totalTransformations}'

echo -e "\n=== Recent Errors ==="
grep -E "(file-resolver.*error|resolution.*failed)" logs/error.log | tail -10

echo -e "\n=== Performance Issues ==="
grep "Slow file resolution" logs/app.log | tail -5
EOF

chmod +x file-resolution-diagnostic.sh
./file-resolution-diagnostic.sh > file-resolution-diagnostic.txt
```

This comprehensive troubleshooting guide should help resolve most common issues with both the domain-to-path prefix routing and file resolution systems. For complex issues, use the diagnostic tools and procedures outlined above to gather detailed information before seeking additional help.
