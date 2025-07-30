# Advanced CDN Application - User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Installation & Setup](#installation--setup)
4. [Core Configuration](#core-configuration)
5. [Feature Configuration](#feature-configuration)
6. [Dashboard & Management](#dashboard--management)
7. [API Reference](#api-reference)
8. [Monitoring & Metrics](#monitoring--metrics)
9. [Troubleshooting](#troubleshooting)
10. [Performance Optimization](#performance-optimization)
11. [Advanced Deployment](#advanced-deployment)

## Introduction

The Advanced CDN Application is a production-ready Node.js application that provides sophisticated content delivery network functionality with intelligent caching, advanced proxying, and edge computing capabilities. It's designed for organizations that need complete control over their content delivery infrastructure while maintaining high performance and reliability.

### Key Features

- **High-Performance Proxy**: Efficient request forwarding with intelligent routing
- **Domain-to-Path Mapping**: Advanced routing system for multi-domain architectures
- **Intelligent File Resolution**: Automatic resolution of extensionless requests with content transformation
- **URL Transformation**: Comprehensive URL masking for complete domain obscuration
- **Multi-Layer Caching**: Sophisticated caching system with TTL management and cache control
- **Circuit Breaker Protection**: Automatic protection against failing backends
- **Real-Time Dashboard**: Comprehensive monitoring and management interface
- **Content Transformation**: Built-in transformers for Markdown, JSON, CSV, and more
- **Security Features**: Advanced security headers, rate limiting, and access control

### Architecture Overview

The application follows a modular architecture with these core components:

- **Proxy Manager**: Handles request forwarding and response processing
- **Cache Manager**: Multi-layer caching with intelligent invalidation
- **Domain Manager**: Domain routing and path rewriting
- **URL Transformer**: Content URL masking and transformation
- **File Resolver**: Extensionless file resolution with content transformation
- **Dashboard**: Web-based management interface
- **Monitoring**: Health checks, metrics collection, and alerting

## Getting Started

This section will get you up and running quickly with a basic configuration.

### Prerequisites

- **Node.js**: Version 16.x or higher
- **npm**: Package manager (comes with Node.js)
- **System Memory**: Minimum 512MB RAM, recommended 2GB+
- **Network Access**: Outbound HTTPS access to your backend domains

### Quick Setup

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd advanced-cdn
   npm install
   ```

2. **Basic Configuration**

   ```bash
   # Copy the example environment file
   cp config/env-example.txt .env
   
   # Edit with your basic settings
   nano .env
   ```

   **Minimum required configuration:**

   ```bash
   # Your CDN domain (what users will access)
   ORIGIN_DOMAIN=your-cdn.example.com
   
   # Your backend domain (where content comes from)
   TARGET_DOMAIN=your-backend.example.com
   
   # Server port
   PORT=3000
   ```

3. **Start the Application**

   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode (with clustering)
   npm start
   ```

4. **Verify Installation**

   ```bash
   # Check health status
   curl http://localhost:3000/health
   
   # Access the dashboard
   open http://localhost:3000/dashboard
   ```

### First Test

Once running, test your CDN by accessing content through your configured domain:

```bash
# Test basic proxying
curl -H "Host: your-cdn.example.com" http://localhost:3000/

# Test with URL transformation
curl -H "Host: your-cdn.example.com" http://localhost:3000/some-page.html
```

## Installation & Setup

### System Requirements

#### Minimum Requirements

- **Operating System**: Linux (recommended), macOS, Windows
- **Node.js**: Version 16.x or higher
- **Memory**: 512MB RAM
- **Storage**: 100MB for application + space for logs and cache
- **Network**: Outbound HTTPS access to backend domains

#### Recommended for Production

- **Memory**: 2GB+ RAM
- **CPU**: 2+ cores
- **Storage**: SSD with 1GB+ free space
- **Network**: High-bandwidth connection with low latency to backends

### Installation Methods

#### Standard Installation

1. **Install Dependencies**

   ```bash
   # Production dependencies only
   npm install --production
   
   # Or all dependencies for development
   npm install
   ```

2. **Create Required Directories**

   ```bash
   mkdir -p logs ssl config
   ```

3. **Set Up SSL Certificates (Optional)**

   ```bash
   # Generate self-signed certificate for testing
   openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
   
   # Or copy your existing certificates
   cp /path/to/your/cert.pem ssl/cert.pem
   cp /path/to/your/key.pem ssl/key.pem
   ```

### Initial Configuration

#### Environment File Setup

Copy and customize the environment configuration:

```bash
cp config/env-example.txt .env
```

**Essential settings to configure:**

```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Domain Configuration
ORIGIN_DOMAIN=your-cdn.example.com
TARGET_DOMAIN=your-backend.example.com
TARGET_HTTPS=true

# Basic Security
STRICT_DOMAIN_CHECK=true
SECURITY_HEADERS=true
```

#### Validation

Test your installation:

```bash
# Validate configuration
node -e "require('./src/config')" 2>&1

# Run test suite
npm test

# Start in development mode
npm run dev
```

## Core Configuration

All configuration is managed through environment variables with sensible defaults. Configuration is centralized in [`src/config.js`](src/config.js) and automatically validated on startup.

### Server Configuration

#### Basic Server Settings

```bash
# Server binding
PORT=3000                    # Server port
HOST=0.0.0.0                # Bind address (0.0.0.0 for all interfaces)
NODE_ENV=production          # Environment mode (development/production)

# Process Management
ENABLE_CLUSTER=true         # Enable multi-process clustering
CLUSTER_WORKERS=4           # Number of worker processes (auto-detect if not set)
TRUST_PROXY=true           # Trust proxy headers (important for load balancers)
```

#### SSL/HTTPS Configuration

```bash
# SSL Settings
ENABLE_SSL=false                          # Enable HTTPS server
SSL_CERT_PATH=./ssl/cert.pem              # SSL certificate path
SSL_KEY_PATH=./ssl/key.pem                # SSL private key path
SSL_PASSPHRASE=                           # SSL key passphrase (if needed)
HTTP_TO_HTTPS_REDIRECT=true               # Redirect HTTP to HTTPS
```

### Domain Configuration

#### Basic Domain Setup

```bash
# Primary Domain Configuration
ORIGIN_DOMAIN=your-cdn.example.com                    # Domain this CDN serves
TARGET_DOMAIN=your-backend.example.com                # Target backend domain
TARGET_HTTPS=true                                     # Use HTTPS for backend
CDN_NAME=advanced-nodejs-cdn                          # CDN identifier name

# Domain Validation
STRICT_DOMAIN_CHECK=true                               # Enforce domain validation
ADDITIONAL_DOMAINS=api.example.com,cdn.example.com    # Additional allowed domains
```

#### Advanced Domain Routing

For complex multi-domain setups:

```bash
# Enable domain-to-path mapping
PATH_REWRITE_ENABLED=true

# Simple domain-to-path mapping (JSON format)
DOMAIN_PATH_MAPPING={"api.example.com": "/api", "blog.example.com": "/blog"}

# Complex routing rules with regex patterns (JSON format)
PATH_REWRITE_RULES={"api.example.com": {"^/v1/(.*)": "/api/v1/$1"}}

# Domain-specific backend targets (JSON format)
DOMAIN_TARGETS={"api.example.com": "api-backend.example.com", "blog.example.com": "blog-backend.example.com"}

# Path rewriting options
PATH_REWRITE_FALLBACK_ENABLED=true       # Enable fallback mechanisms
PATH_REWRITE_CACHE_ENABLED=true          # Enable path rewriting cache
```

### Security Configuration

#### Security Headers

```bash
# Enable security headers
SECURITY_HEADERS=true

# Custom Content Security Policy (leave empty for default)
CONTENT_SECURITY_POLICY=default-src 'self'; script-src 'self' 'unsafe-inline'

# Additional security headers
X_FRAME_OPTIONS=DENY
X_CONTENT_TYPE_OPTIONS=nosniff
```

#### Access Control

```bash
# CORS Configuration
ENABLE_CORS=false                        # Enable CORS
CORS_ORIGINS=*                          # Allowed CORS origins

# Rate Limiting
RATE_LIMIT_ENABLED=false                 # Enable rate limiting
RATE_LIMIT_WINDOW_MS=60000              # Rate limit window (1 minute)
RATE_LIMIT_MAX=100                      # Max requests per window

# IP Whitelisting (for management endpoints)
IP_WHITELIST_ENABLED=false
IP_WHITELIST=192.168.1.0/24,10.0.0.0/8
```

### Logging Configuration

```bash
# Logging Settings
LOG_LEVEL=info                           # Log level (debug, info, warn, error)
LOG_FORMAT=combined                      # Log format
ACCESS_LOG_ENABLED=true                  # Enable access logging
ERROR_LOG_ENABLED=true                   # Enable error logging
LOG_DIR=./logs                          # Log directory
LOG_TO_CONSOLE=true                     # Console output
LOG_TO_FILE=true                        # File output
```

### Performance Configuration

```bash
# Compression Settings
ENABLE_COMPRESSION=true                  # Enable response compression
COMPRESSION_LEVEL=6                      # Compression level (1-9)
COMPRESSION_MIN_SIZE=1024               # Minimum size to compress

# Request Handling
MAX_BODY_SIZE=1mb                       # Maximum request body size
REQUEST_TIMEOUT=30000                   # Request timeout in milliseconds
```

## Feature Configuration

### Caching System

The application implements a sophisticated multi-layer caching system for optimal performance.

#### Cache Configuration

```bash
# Main Cache Settings
CACHE_ENABLED=true                        # Enable caching
CACHE_DEFAULT_TTL=300                     # Default TTL in seconds (5 minutes)
CACHE_MAX_TTL=3600                       # Maximum TTL in seconds (1 hour)
CACHE_CHECK_PERIOD=120                   # Cache cleanup interval (2 minutes)
CACHE_MAX_ITEMS=1000                     # Maximum cached items

# Cache Behavior
RESPECT_CACHE_CONTROL=true               # Respect Cache-Control headers
CACHE_COOKIES=false                      # Cache responses with cookies

# Cacheable Content Types
CACHEABLE_CONTENT_TYPES=text/html,text/css,text/javascript,application/javascript,application/json,image/jpeg,image/png,image/gif,image/webp

# Cacheable Status Codes
CACHEABLE_STATUS_CODES=200,301,302,304
```

#### Cache Management

The caching system provides multiple cache layers:

1. **Main Cache**: General purpose request/response caching
2. **File Resolution Cache**: Caches file extension resolution results
3. **URL Transformation Cache**: Caches URL transformation results
4. **Circuit Breaker Cache**: Caches circuit breaker states

### URL Transformation

URL transformation provides comprehensive URL masking to completely obscure backend domains from end users with protocol-aware transformation capabilities.

#### URL Transformation Configuration

```bash
# Enable URL transformation system
URL_TRANSFORM_ENABLED=true

# Content type transformations
URL_TRANSFORM_HTML=true                   # Transform HTML content
URL_TRANSFORM_JS=true                     # Transform JavaScript content
URL_TRANSFORM_CSS=true                    # Transform CSS content
URL_TRANSFORM_INLINE_STYLES=true          # Transform inline styles
URL_TRANSFORM_DATA_ATTRS=true             # Transform data-* attributes

# URL preservation options
URL_PRESERVE_FRAGMENTS=true               # Preserve #fragments
URL_PRESERVE_QUERY=true                   # Preserve ?query parameters

# Protocol-aware transformation (NEW)
URL_TRANSFORM_PROTOCOL_AWARE=true         # Match request protocol (HTTP→HTTP, HTTPS→HTTPS)

# Performance settings
URL_TRANSFORM_MAX_SIZE=52428800           # 50MB max content size
URL_TRANSFORM_CACHE_SIZE=10000            # Cache size
URL_TRANSFORM_DEBUG=false                 # Debug mode

# Advanced settings
URL_TRANSFORM_CONTENT_TYPES=text/html,application/xhtml+xml,text/javascript,application/javascript,text/css
URL_TRANSFORM_VALIDATE_URLS=true          # Validate URLs for security
URL_TRANSFORM_SANITIZE_INPUT=true         # Sanitize input parameters
```

#### How URL Transformation Works

The system automatically detects and transforms URLs in:

- **HTML content**: `href`, `src`, `action`, `data-*` attributes
- **JavaScript content**: `fetch()` calls, imports, location assignments, AJAX requests, string literals
- **CSS content**: `url()` functions, `@import` statements, font sources
- **Inline styles and scripts**: Within HTML documents

**Protocol-Aware Transformation:**
- HTTP requests transform URLs to HTTP protocol
- HTTPS requests transform URLs to HTTPS protocol
- Maintains protocol consistency for security and functionality

**Example transformations:**

```html
<!-- Before transformation -->
<a href="https://backend.example.com/page">Link</a>
<img src="https://backend.example.com/image.jpg" />

<!-- After transformation (HTTPS request) -->
<a href="https://your-cdn.example.com/page">Link</a>
<img src="https://your-cdn.example.com/image.jpg" />

<!-- After transformation (HTTP request) -->
<a href="http://your-cdn.example.com/page">Link</a>
<img src="http://your-cdn.example.com/image.jpg" />
```

**JavaScript String Literals:**

```javascript
// Before transformation
window.finalHost = 'https://allabout.network/';
fetch('https://allabout.network/api/data');

// After transformation (HTTP request)
window.finalHost = 'http://example.ddt.com:3000/';
fetch('http://example.ddt.com:3000/api/data');

// After transformation (HTTPS request)
window.finalHost = 'https://example.ddt.com:3000/';
fetch('https://example.ddt.com:3000/api/data');
```

### File Resolution

The file resolution system automatically resolves extensionless requests by trying multiple file extensions in priority order.

#### File Resolution Configuration

```bash
# Enable file resolution system
FILE_RESOLUTION_ENABLED=true

# File resolution extensions (priority order)
FILE_RESOLUTION_EXTENSIONS=html,md,json,csv,txt

# Performance settings
FILE_RESOLUTION_TIMEOUT=5000              # Request timeout in milliseconds
FILE_RESOLUTION_MAX_CONCURRENT=10         # Max concurrent requests
FILE_RESOLUTION_RETRY_ATTEMPTS=2          # Retry failed requests
FILE_RESOLUTION_RETRY_DELAY=1000          # 1 second retry delay

# Content transformation
FILE_RESOLUTION_TRANSFORM_ENABLED=true   # Enable content transformation
FILE_RESOLUTION_TRANSFORM_MARKDOWN=true  # Enable Markdown to HTML
FILE_RESOLUTION_TRANSFORM_JSON=true      # Enable JSON formatting
FILE_RESOLUTION_TRANSFORM_CSV=true       # Enable CSV to HTML tables

# Cache configuration
FILE_RESOLUTION_CACHE_ENABLED=true       # Enable file resolution cache
FILE_RESOLUTION_CACHE_TTL=300            # TTL for successful resolutions
FILE_RESOLUTION_CACHE_NEGATIVE_TTL=60    # TTL for failed resolutions
FILE_RESOLUTION_CACHE_MAX_SIZE=10000     # Max cache entries

# Circuit breaker protection
FILE_RESOLUTION_CIRCUIT_BREAKER_ENABLED=true  # Enable circuit breaker
FILE_RESOLUTION_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5    # Failures before opening
FILE_RESOLUTION_CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3    # Successes before closing
FILE_RESOLUTION_CIRCUIT_BREAKER_TIMEOUT=30000          # Circuit breaker timeout
```

#### Content Transformers

Available transformers:

- **Markdown**: Converts `.md` files to HTML with configurable options
- **JSON**: Pretty-prints and formats JSON files
- **CSV**: Converts CSV files to HTML tables
- **HTML**: Minification and optimization
- **XML**: Pretty-printing and formatting

### Circuit Breaker Protection

Circuit breakers provide automatic protection against failing backends.

#### Circuit Breaker Configuration

```bash
# Enable circuit breaker for domains
DOMAIN_CIRCUIT_BREAKER_ENABLED=true

# Circuit breaker thresholds
DOMAIN_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5      # Failures before opening
DOMAIN_CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3      # Successes before closing
DOMAIN_CIRCUIT_BREAKER_TIMEOUT=30000            # Timeout in milliseconds
DOMAIN_CIRCUIT_BREAKER_MONITOR_WINDOW=60000     # Monitoring window
```

#### Circuit Breaker States

1. **Closed**: Normal operation, requests pass through
2. **Open**: Circuit breaker activated, requests fail fast
3. **Half-Open**: Testing backend recovery, limited requests allowed

## Dashboard & Management

The web dashboard provides comprehensive real-time monitoring, configuration management, and API testing capabilities.

### Accessing the Dashboard

Navigate to: `http://localhost:3000/dashboard`

### Dashboard Features

#### System Overview

- **Real-time Metrics**: CPU, memory, uptime statistics
- **Request Analytics**: Request rates, response times, status codes
- **Cache Performance**: Hit rates, cache size, TTL information for all cache types
- **Domain Routing**: Active routing rules and backend targets
- **Circuit Breaker Status**: Real-time circuit breaker monitoring

#### API Explorer

- **Endpoint Discovery**: Automatic detection of available endpoints
- **Interactive Testing**: Built-in API testing interface
- **Documentation**: Auto-generated API documentation
- **Response Inspection**: Detailed response analysis

#### Dashboard Cache Management

- **Multi-Cache Statistics**: Real-time metrics for all cache layers
- **Cache Control**: Individual and bulk cache clearing
- **Performance Analysis**: Hit/miss rates and optimization suggestions
- **Content Analysis**: View cached content and metadata
- **Memory Usage**: Detailed memory usage tracking and alerts

#### Configuration Management

- **Environment Variables**: View and modify configuration
- **Domain Rules**: Manage domain-to-path mapping rules
- **Security Settings**: Configure CORS, rate limiting, security headers
- **Performance Tuning**: Adjust cache, compression, timeout settings

### Dashboard API Endpoints

#### Discovery Endpoints

```bash
# Get all discovered endpoints
curl http://localhost:3000/dashboard/api/discovery/endpoints

# Get endpoints by category
curl http://localhost:3000/dashboard/api/discovery/endpoints/monitoring

# Get available categories
curl http://localhost:3000/dashboard/api/discovery/categories

# Trigger manual endpoint scan
curl -X POST http://localhost:3000/dashboard/api/discovery/scan
```

#### Testing Endpoints

```bash
# Test a specific endpoint
curl -X POST http://localhost:3000/dashboard/api/test/endpoint \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "path": "/health",
    "headers": {}
  }'

# Test all health endpoints
curl http://localhost:3000/dashboard/api/test/health
```

## API Reference

The application provides comprehensive REST API endpoints for monitoring, management, and integration.

### Health Check Endpoints

#### Basic Health Check

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0"
}
```

#### Detailed Health Check

```bash
curl http://localhost:3000/health/detailed
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "system": {
    "memory": {
      "used": 134217728,
      "total": 2147483648,
      "percentage": 6.25
    },
    "cpu": {
      "usage": 15.5,
      "loadAverage": [0.5, 0.3, 0.2]
    },
    "process": {
      "pid": 12345,
      "memory": {
        "rss": 67108864,
        "heapUsed": 33554432,
        "heapTotal": 50331648
      }
    }
  },
  "services": {
    "cache": {
      "status": "healthy",
      "hitRate": 0.85,
      "size": 250
    },
    "proxy": {
      "status": "healthy",
      "activeConnections": 15
    }
  }
}
```

### Cache Management API

#### Cache Statistics

```bash
# Overall cache statistics
curl http://localhost:3000/api/cache/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "mainCache": {
      "keys": 250,
      "hits": 2500,
      "misses": 500,
      "hitRate": 0.833,
      "memoryUsage": "50MB",
      "maxSize": 1000
    },
    "fileResolutionCache": {
      "keys": 100,
      "hits": 450,
      "misses": 50,
      "hitRate": 0.9
    },
    "urlTransformCache": {
      "keys": 150,
      "hits": 920,
      "misses": 80,
      "hitRate": 0.92
    }
  }
}
```

#### Cache Operations

```bash
# Clear all caches
curl -X DELETE http://localhost:3000/api/cache/clear

# Clear specific cache
curl -X DELETE http://localhost:3000/api/cache/clear?type=main
curl -X DELETE http://localhost:3000/api/cache/clear?type=fileResolution
curl -X DELETE http://localhost:3000/api/cache/clear?type=urlTransform

# Clear specific cache key
curl -X DELETE "http://localhost:3000/api/cache/clear?key=example.com:/path"

# Get cache key information
curl "http://localhost:3000/api/cache/get?key=example.com:/path"
```

#### Cache Warming

```bash
# Warm cache with common requests
curl -X POST http://localhost:3000/api/cache/warm \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "http://example.com/",
      "http://example.com/about",
      "http://example.com/contact"
    ]
  }'
```

### URL Transformation API

#### URL Transform Cache Statistics

```bash
curl http://localhost:3000/api/cache/url-transform/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "size": 150,
    "maxSize": 10000,
    "hitRate": 0.92,
    "memoryUsage": "25MB",
    "transformations": {
      "html": 80,
      "javascript": 45,
      "css": 25
    },
    "performance": {
      "avgTransformTime": 15.5,
      "totalTransforms": 150
    }
  }
}
```

#### Clear URL Transform Cache

```bash
# Clear URL transformation cache
curl -X DELETE http://localhost:3000/api/cache/url-transform/clear

# Clear by content type
curl -X DELETE "http://localhost:3000/api/cache/url-transform/clear?type=html"
```

#### Test URL Transformation

```bash
# Test URL transformation directly
curl -X POST http://localhost:3000/api/debug/url-transform \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<a href=\"https://backend.example.com/test\">Test</a>",
    "contentType": "text/html",
    "domain": "example.com"
  }'
```

### File Resolution API

#### File Resolution Statistics

```bash
curl http://localhost:3000/api/file-resolution/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "totalRequests": 1250,
    "successfulResolutions": 1100,
    "failedResolutions": 150,
    "successRate": 0.88,
    "averageResolutionTime": 45.2,
    "cacheHitRate": 0.75,
    "transformationsPerformed": 890,
    "extensionStats": {
      "html": 450,
      "md": 380,
      "json": 200,
      "csv": 70,
      "txt": 150
    },
    "transformerStats": {
      "markdown": 380,
      "json": 200,
      "csv": 70
    }
  }
}
```

#### Test File Resolution

```bash
# Test file resolution for a specific path
curl -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/getting-started",
    "domain": "docs.example.com"
  }'
```

### Domain Management API

#### Get Domain Configuration

```bash
# Get all domain configurations
curl http://localhost:3000/api/domains/config
```

#### Update Domain Configuration

```bash
# Update domain configuration
curl -X PUT http://localhost:3000/api/domains/config \
  -H "Content-Type: application/json" \
  -d '{
    "domainPathMapping": {
      "api.example.com": "/api",
      "blog.example.com": "/blog"
    },
    "domainTargets": {
      "api.example.com": "api-backend.example.com"
    }
  }'
```

### Circuit Breaker API

#### Get Circuit Breaker Status

```bash
# Get circuit breaker status for all domains
curl http://localhost:3000/api/domains/circuit-breaker/status
```

#### Reset Circuit Breaker

```bash
# Reset circuit breaker for specific domain
curl -X POST http://localhost:3000/api/domains/example.com/circuit-breaker/reset
```

### Metrics Endpoints

#### Prometheus Metrics

```bash
# Get Prometheus-compatible metrics
curl http://localhost:3000/metrics
```

**Sample output:**

```bash
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1500

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 1200
http_request_duration_seconds_bucket{le="0.5"} 1450
http_request_duration_seconds_bucket{le="1.0"} 1500
```

## Monitoring & Metrics

### Health Monitoring

#### Automated Health Checks

Create a monitoring script:

```bash
#!/bin/bash
# health-monitor.sh
ENDPOINT="http://localhost:3000/health"
ALERT_EMAIL="admin@example.com"

response=$(curl -s -o /dev/null -w "%{http_code}" "$ENDPOINT")

if [ "$response" != "200" ]; then
    echo "Health check failed: HTTP $response" | mail -s "CDN Alert" "$ALERT_EMAIL"
    exit 1
fi

echo "Health check passed"
```

#### Comprehensive Monitoring Script

```bash
#!/bin/bash
# monitor.sh
# Check health endpoint
health_status=$(curl -s http://localhost:3000/health | jq -r '.status')

# Check cache hit rate
cache_hit_rate=$(curl -s http://localhost:3000/api/cache/stats | jq -r '.data.mainCache.hitRate')

# Check memory usage
memory_usage=$(curl -s http://localhost:3000/metrics | grep process_resident_memory_bytes | awk '{print $2}')

echo "Health: $health_status"
echo "Cache Hit Rate: $cache_hit_rate"
echo "Memory Usage: $memory_usage bytes"

# Alert if cache hit rate is low
if (( $(echo "$cache_hit_rate < 0.7" | bc -l) )); then
    echo "WARNING: Low cache hit rate: $cache_hit_rate"
fi
```

### Performance Monitoring

#### Response Time Analysis

```bash
# Monitor response times using curl
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/

# curl-format.txt content:
#     time_namelookup:  %{time_namelookup}s\n
#        time_connect:  %{time_connect}s\n
#     time_appconnect:  %{time_appconnect}s\n
#    time_pretransfer:  %{time_pretransfer}s\n
#       time_redirect:  %{time_redirect}s\n
#  time_starttransfer:  %{time_starttransfer}s\n
#                     ----------\n
#          time_total:  %{time_total}s\n
```

#### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/

# Using wrk
wrk -t12 -c400 -d30s http://localhost:3000/

# Using curl for simple testing
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}\n" http://localhost:3000/
done
```

### Log Analysis

#### Common Log Patterns

```bash
# Find errors
grep "ERROR" logs/app.log

# Monitor cache performance
grep "cache" logs/app.log | grep -E "(hit|miss)"

# Track slow requests
grep "request completed" logs/app.log | jq '.metadata.responseTime' | awk '$1 > 1000'

# Monitor circuit breaker events
grep "circuit breaker" logs/app.log
```

#### Log Rotation Setup

```bash
# /etc/logrotate.d/advanced-cdn
/path/to/advanced-cdn/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        /bin/kill -USR1 $(cat /path/to/advanced-cdn/app.pid) 2>/dev/null || true
    endscript
}
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Symptoms:**

- Process memory continuously increasing
- Out of memory errors
- Slow response times
- Application crashes with heap errors

**Solutions:**

```bash
# Monitor memory usage
curl http://localhost:3000/health/detailed | jq '.system.memory'

# Check cache sizes
curl http://localhost:3000/api/cache/stats

# Reduce cache sizes if needed
CACHE_MAX_ITEMS=500
URL_TRANSFORM_CACHE_SIZE=1000
FILE_RESOLUTION_CACHE_MAX_SIZE=500

# Clear all caches (emergency option)
curl -X DELETE http://localhost:3000/api/cache/clear

# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Enable memory monitoring
MEMORY_MONITORING_ENABLED=true
MEMORY_ALERT_THRESHOLD=536870912  # 512MB
```

#### 3. SSL/HTTPS Issues

**Symptoms:**

- SSL certificate errors
- HTTPS connection failures
- Mixed content warnings

**Solutions:**

```bash
# Verify SSL certificate
openssl x509 -in ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect localhost:3000

# Check certificate permissions
ls -la ssl/
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem

# Generate new self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
```

#### 4. Proxy/Backend Connection Issues

**Symptoms:**

- 502 Bad Gateway errors
- Connection timeouts
- Backend unreachable
- Circuit breaker activation

**Solutions:**

```bash
# Test backend connectivity
curl -I https://your-backend.example.com/

# Check DNS resolution
nslookup your-backend.example.com
dig your-backend.example.com

# Check circuit breaker status
curl http://localhost:3000/api/domains/circuit-breaker/status

# Reset circuit breaker if needed
curl -X POST http://localhost:3000/api/domains/your-domain.com/circuit-breaker/reset

# Enable debug logging
LOG_LEVEL=debug
URL_TRANSFORM_DEBUG=true
```

#### 5. Cache Performance Issues

**Symptoms:**

- Low cache hit rates
- Slow response times
- High memory usage from cache

**Solutions:**

```bash
# Analyze cache statistics
curl http://localhost:3000/api/cache/stats

# Check cache configuration
curl http://localhost:3000/dashboard/api/dashboard/config

# Increase cache TTL for better hit rates
CACHE_DEFAULT_TTL=600
CACHE_MAX_TTL=3600

# Warm cache with common requests
curl -X POST http://localhost:3000/api/cache/warm \
  -H "Content-Type: application/json" \
  -d '{"urls": ["http://example.com/", "http://example.com/popular-page"]}'

# Clear corrupted cache entries
curl -X DELETE http://localhost:3000/api/cache/clear

# Monitor cache performance
curl http://localhost:3000/metrics | grep cache
```

#### 6. Dashboard Access Issues

**Symptoms:**

- Dashboard not loading
- 404 errors on dashboard endpoints
- JavaScript errors in browser console

**Solutions:**

```bash
# Check if server is running
curl http://localhost:3000/health

# Test dashboard endpoint
curl http://localhost:3000/dashboard/

# Check server logs for dashboard initialization
grep "dashboard" logs/app.log

# Verify dashboard files exist
ls -la src/dashboard/public/

# Test dashboard API endpoints
curl http://localhost:3000/dashboard/api/dashboard/status
```

### Debugging Techniques

#### Enable Debug Logging

```bash
# Enable comprehensive debug logging
LOG_LEVEL=debug
URL_TRANSFORM_DEBUG=true
FILE_RESOLUTION_DEBUG=true

# Monitor logs in real-time
tail -f logs/app.log | grep -E "(ERROR|WARN|DEBUG)"
```

#### Request Tracing

```bash
# Add request tracing headers
curl -H "X-Trace-Request: true" http://localhost:3000/your-path

# Monitor specific requests
tail -f logs/app.log | grep "request-id"
```

#### Performance Profiling

```bash
# Enable Node.js performance profiling
NODE_OPTIONS="--prof" npm start

# Generate CPU profile
node --prof-process isolate-*.log > profile.txt
```

### Recovery Procedures

#### Emergency Cache Clear

```bash
#!/bin/bash
# emergency-cache-clear.sh
echo "Clearing all caches..."
curl -X DELETE http://localhost:3000/api/cache/clear
curl -X DELETE http://localhost:3000/api/cache/url-transform/clear
curl -X DELETE http://localhost:3000/api/cache/file-resolution/clear
echo "All caches cleared"
```

#### Service Restart

```bash
#!/bin/bash
# service-restart.sh
echo "Restarting CDN service..."
pkill -f "node.*app.js"
sleep 5
npm start
echo "Service restarted"
```

## Performance Optimization

### System-Level Optimizations

#### Node.js Optimization

```bash
# Increase heap size
NODE_OPTIONS="--max-old-space-size=4096"

# Optimize garbage collection
NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"

# Enable performance profiling
NODE_OPTIONS="--perf-prof --perf-prof-unwinding-info"
```

#### Operating System Tuning

```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# TCP optimization
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_tw_reuse = 1" >> /etc/sysctl.conf

# Apply changes
sysctl -p
```

### Application-Level Tuning

#### Cache Optimization

```bash
# Optimize cache settings for high traffic
CACHE_MAX_ITEMS=10000
CACHE_DEFAULT_TTL=600
CACHE_MAX_TTL=7200
CACHE_CHECK_PERIOD=60

# Content-specific caching
CACHEABLE_CONTENT_TYPES=text/html,text/css,text/javascript,application/javascript,application/json,image/jpeg,image/png,image/gif,image/webp,image/svg+xml

# Advanced cache headers
CACHE_CONTROL_OVERRIDES='{
  "text/html": "public, max-age=300",
  "text/css": "public, max-age=31536000",
  "text/javascript": "public, max-age=31536000",
  "image/*": "public, max-age=31536000"
}'
```

#### Connection Pool Tuning

```bash
# HTTP connection optimization
HTTP_AGENT_KEEP_ALIVE=true
HTTP_AGENT_MAX_SOCKETS=50
HTTP_AGENT_MAX_FREE_SOCKETS=10

# Backend connection pooling
BACKEND_CONNECTION_POOL_SIZE=20
BACKEND_CONNECTION_TIMEOUT=30000
BACKEND_CONNECTION_KEEP_ALIVE=true
```

#### Compression Optimization

```bash
# Advanced compression settings
ENABLE_COMPRESSION=true
COMPRESSION_LEVEL=6
COMPRESSION_MIN_SIZE=1024
COMPRESSION_TYPES=text/html,text/css,text/javascript,application/javascript,application/json,text/xml,application/xml
```

### Performance Optimization Monitoring

#### Key Performance Indicators

Monitor these metrics for optimal performance:

1. **Response time percentiles** (p50, p95, p99)
2. **Request rate** (requests per second)
3. **Cache hit ratio** (should be > 80%)
4. **Error rate** (should be < 1%)
5. **Memory usage** (should be stable)
6. **CPU utilization** (should be < 80%)

#### Benchmarking

```bash
# Load testing with wrk
wrk -t12 -c400 -d30s http://localhost:3000/

# Benchmark specific endpoints
wrk -t4 -c100 -d10s http://localhost:3000/api/health

# Memory profiling
node --inspect=0.0.0.0:9229 src/app.js
# Connect with Chrome DevTools at chrome://inspect
```

#### Performance Analysis Script

```bash
#!/bin/bash
# performance-analysis.sh

echo "=== Performance Analysis ==="

# Response time analysis
echo "Response times:"
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/

# Cache performance
echo "Cache hit rate:"
curl -s http://localhost:3000/api/cache/stats | jq '.data.mainCache.hitRate'

# Memory usage
echo "Memory usage:"
curl -s http://localhost:3000/health/detailed | jq '.system.memory.percentage'

# Request rate
echo "Request rate (last 5 minutes):"
curl -s http://localhost:3000/metrics | grep http_requests_total
```

## Advanced Deployment

### Load Balancer Integration

#### NGINX Configuration

```nginx
# /etc/nginx/sites-available/advanced-cdn
upstream advanced_cdn {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;
}

# Cache configuration
proxy_cache_path /var/cache/nginx/advanced_cdn levels=1:2 keys_zone=advanced_cdn_cache:10m max_size=1g inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name your-cdn.example.com;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Main proxy configuration
    location / {
        proxy_pass http://advanced_cdn;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Enable proxy caching
        proxy_cache advanced_cdn_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    }
}
```

#### HAProxy Configuration

```bash
# /etc/haproxy/haproxy.cfg
global
    daemon
    log stdout local0

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend advanced_cdn_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/example.com.pem
    redirect scheme https if !{ ssl_fc }
    
    # Health check
    acl health_check path_beg /health
    use_backend advanced_cdn_health if health_check
    
    default_backend advanced_cdn_backend

backend advanced_cdn_backend
    balance roundrobin
    option httpchk GET /health
    server cdn1 127.0.0.1:3000 check
    server cdn2 127.0.0.1:3001 check
    server cdn3 127.0.0.1:3002 check
    server cdn4 127.0.0.1:3003 check

backend advanced_cdn_health
    server cdn1 127.0.0.1:3000 check
```

### Multi-Instance Deployment

For running multiple instances of the CDN application, you can use process managers or systemd services:

#### Using PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'cdn-app-1',
      script: 'src/app.js',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'cdn-app-2',
      script: 'src/app.js',
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'cdn-app-3',
      script: 'src/app.js',
      env: {
        PORT: 3002,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'cdn-app-4',
      script: 'src/app.js',
      env: {
        PORT: 3003,
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Start all instances
pm2 start ecosystem.config.js

# Monitor instances
pm2 status
pm2 logs
```

#### Using Systemd Services

```bash
# Create systemd service file for each instance
sudo tee /etc/systemd/system/advanced-cdn@.service << EOF
[Unit]
Description=Advanced CDN Application (Instance %i)
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/path/to/advanced-cdn
Environment=NODE_ENV=production
Environment=PORT=300%i
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
sudo systemctl enable advanced-cdn@0
sudo systemctl enable advanced-cdn@1
sudo systemctl enable advanced-cdn@2
sudo systemctl enable advanced-cdn@3

sudo systemctl start advanced-cdn@0
sudo systemctl start advanced-cdn@1
sudo systemctl start advanced-cdn@2
sudo systemctl start advanced-cdn@3

# Check status
sudo systemctl status advanced-cdn@*
```

### Security Hardening

#### Advanced Security Headers

```bash
# Comprehensive security configuration
SECURITY_HEADERS=true
CONTENT_SECURITY_POLICY='{
  "default-src": ["self"],
  "script-src": ["self", "unsafe-inline"],
  "style-src": ["self", "unsafe-inline", "fonts.googleapis.com"],
  "font-src": ["self", "fonts.gstatic.com"],
  "img-src": ["self", "data:", "https:"],
  "connect-src": ["self"],
  "frame-ancestors": ["none"],
  "base-uri": ["self"],
  "form-action": ["self"]
}'

# Additional security headers
SECURITY_ADDITIONAL_HEADERS='{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}'
```

#### IP Whitelisting

```bash
# Configure IP whitelisting
IP_WHITELIST_ENABLED=true
IP_WHITELIST=192.168.1.0/24,10.0.0.0/8,172.16.0.0/12

# Management API restrictions
MANAGEMENT_API_WHITELIST=127.0.0.1,::1
```

---

## Quick Reference

### Essential Commands

```bash
# Start/Stop
npm start                    # Production mode
npm run dev                  # Development mode
npm stop                     # Stop application

# Health & Status
curl http://localhost:3000/health
curl http://localhost:3000/health/detailed
curl http://localhost:3000/metrics

# Cache Management
curl -X DELETE http://localhost:3000/api/cache/clear
curl http://localhost:3000/api/cache/stats

# Dashboard
open http://localhost:3000/dashboard
```

### Configuration Quick Start

```bash
# Minimum required configuration
ORIGIN_DOMAIN=your-cdn.example.com
TARGET_DOMAIN=your-backend.example.com
PORT=3000

# Enable key features
CACHE_ENABLED=true
URL_TRANSFORM_ENABLED=true
FILE_RESOLUTION_ENABLED=true
SECURITY_HEADERS=true
```

### Support and Resources

- **Documentation**: See [`docs/`](docs/) directory for additional guides
- **Configuration Examples**: [`config/env-example.txt`](config/env-example.txt)
- **API Documentation**: [`docs/api-documentation.md`](docs/api-documentation.md)
- **Troubleshooting**: [`docs/troubleshooting-guide.md`](docs/troubleshooting-guide.md)

For additional support, check the application logs in the `logs/` directory and use the dashboard's diagnostic tools.

- Application crashes on startup
- Port binding errors
- Configuration validation errors

**Solutions:**

```bash
# Check port availability
netstat -tlnp | grep :3000
lsof -i :3000

# Validate configuration
node -e "require('./src/config')" 2>&1

# Check environment variables
env | grep -E "(PORT|HOST|ORIGIN_DOMAIN|TARGET_DOMAIN)"

# Test with minimal configuration
PORT=3001 NODE_ENV=development npm run dev
```

#### 2. High Memory Usage

**Symptoms:**
