# Advanced CDN Application - User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Installation & Setup](#installation--setup)
4. [Configuration](#configuration)
5. [Dashboard Interface](#dashboard-interface)
6. [API Reference](#api-reference)
7. [Authentication & Security](#authentication--security)
8. [Monitoring & Metrics](#monitoring--metrics)
9. [Cache Management](#cache-management)
10. [URL Transformation](#url-transformation)
11. [File Resolution](#file-resolution)
12. [Domain Management](#domain-management)
13. [Troubleshooting](#troubleshooting)
14. [Advanced Configuration](#advanced-configuration)
15. [Performance Tuning](#performance-tuning)

## Introduction

The Advanced CDN Application is a production-ready Node.js application that provides sophisticated CDN functionality with caching, proxying, and edge computing capabilities. It features advanced URL transformation, domain-to-path mapping, cascading file resolution, and comprehensive content transformation.

### Key Features

- **High-Performance Proxy**: Efficient request forwarding from configured domains to backend servers
- **Domain-to-Path Mapping**: Advanced routing system mapping different domains to specific backend path prefixes
- **Cascading File Resolution**: Automatic resolution of extensionless requests with multiple file extensions
- **Content Transformation**: Built-in transformers for Markdown to HTML, JSON formatting, CSV to HTML tables
- **Advanced Caching**: Intelligent in-memory caching with TTL management and cache control
- **URL Transformation**: Comprehensive URL masking for HTML, JavaScript, and CSS content
- **Circuit Breaker Protection**: Automatic protection against failing domains
- **Web Dashboard**: Real-time monitoring and management interface

## Quick Start

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager
- Basic understanding of proxy/CDN concepts

### Basic Setup

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd advanced-cdn
   npm install
   ```

2. **Configure Environment**

   ```bash
   # Copy the example environment file
   cp config/env-example.txt .env
   
   # Edit the configuration
   nano .env
   ```

3. **Start the Application**

   ```bash
   # Production mode with clustering
   npm start
   
   # Development mode with auto-reload
   npm run dev
   ```

4. **Verify Installation**

   ```bash
   # Check health status
   curl http://localhost:3000/health
   
   # Access the dashboard
   open http://localhost:3000/dashboard
   ```

## Installation & Setup

### System Requirements

- **Operating System**: Linux (recommended), macOS, Windows
- **Node.js**: Version 16.x or higher
- **Memory**: Minimum 512MB RAM, recommended 2GB+
- **Storage**: 100MB for application, additional space for logs and cache
- **Network**: Outbound HTTPS access to backend domains

### Installation Steps

1. **Install Node.js Dependencies**

   ```bash
   npm install --production
   ```

2. **Create Required Directories**

   ```bash
   mkdir -p logs ssl config
   ```

3. **Set Up SSL Certificates (Optional)**

   ```bash
   # For HTTPS support
   openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
   ```

4. **Configure Environment Variables**

   ```bash
   # Copy and customize the environment file
   cp config/env-example.txt .env
   ```

5. **Test Installation**

   ```bash
   # Run the test suite
   npm test
   
   # Start in development mode
   npm run dev
   ```

### Docker Installation

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run with Docker
docker build -t advanced-cdn .
docker run -p 3000:3000 --env-file .env advanced-cdn
```

## Configuration

The application uses environment variables for configuration with comprehensive defaults. All configuration is centralized in `src/config.js`.

### Core Configuration

#### Server Settings

```bash
# Basic server configuration
PORT=3000                    # Server port
HOST=0.0.0.0                # Bind address
NODE_ENV=production          # Environment mode
TRUST_PROXY=true            # Trust proxy headers
ENABLE_CLUSTER=true         # Enable multi-process clustering
CLUSTER_WORKERS=4           # Number of worker processes
```

#### CDN Configuration

```bash
# CDN domain configuration
ORIGIN_DOMAIN=allabout.network                    # Domain this CDN serves
TARGET_DOMAIN=main--allaboutv2--ddttom.hlx.live  # Target backend domain
TARGET_HTTPS=true                                # Use HTTPS for backend
CDN_NAME=advanced-nodejs-cdn                     # CDN identifier name
STRICT_DOMAIN_CHECK=true                         # Enforce domain validation
ADDITIONAL_DOMAINS=api.example.com,cdn.example.com  # Additional allowed domains
```

#### SSL/HTTPS Configuration

```bash
# SSL configuration
ENABLE_SSL=false                          # Enable HTTPS server
SSL_CERT_PATH=./ssl/cert.pem              # SSL certificate path
SSL_KEY_PATH=./ssl/key.pem                # SSL private key path
SSL_PASSPHRASE=                           # SSL key passphrase (if needed)
HTTP_TO_HTTPS_REDIRECT=true               # Redirect HTTP to HTTPS
```

### Advanced Configuration

#### Domain-to-Path Prefix Mapping

```bash
# Enable domain-to-path mapping
PATH_REWRITE_ENABLED=true

# Simple domain-to-path mapping (JSON format)
DOMAIN_PATH_MAPPING={"ddt.com": "/ddt", "blog.allabout.network": "/blog"}

# Complex routing rules with regex patterns (JSON format)
PATH_REWRITE_RULES={"api.example.com": {"^/v1/(.*)": "/api/v1/$1"}}

# Domain-specific backend targets (JSON format)
DOMAIN_TARGETS={"api.example.com": "api-backend.example.com"}

# Path rewriting options
PATH_REWRITE_FALLBACK_ENABLED=true       # Enable fallback mechanisms
PATH_REWRITE_CACHE_ENABLED=true          # Enable path rewriting cache
```

#### File Resolution Configuration

```bash
# Enable file resolution system
FILE_RESOLUTION_ENABLED=true

# File resolution extensions (priority order)
FILE_RESOLUTION_EXTENSIONS=html,md,json,csv,txt

# Performance settings
FILE_RESOLUTION_TIMEOUT=5000              # Request timeout in milliseconds
FILE_RESOLUTION_TRANSFORM_ENABLED=true   # Enable content transformation

# Content transformers
FILE_RESOLUTION_TRANSFORM_MARKDOWN=true  # Enable Markdown to HTML
FILE_RESOLUTION_TRANSFORM_JSON=true      # Enable JSON formatting
FILE_RESOLUTION_TRANSFORM_CSV=true       # Enable CSV to HTML tables

# Cache configuration
FILE_RESOLUTION_CACHE_ENABLED=true       # Enable file resolution cache
FILE_RESOLUTION_CACHE_POSITIVE_TTL=300   # TTL for successful resolutions
FILE_RESOLUTION_CACHE_NEGATIVE_TTL=60    # TTL for failed resolutions

# Circuit breaker protection
FILE_RESOLUTION_CIRCUIT_BREAKER_ENABLED=true  # Enable circuit breaker
```

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

# Performance settings
URL_TRANSFORM_MAX_SIZE=52428800           # 50MB max content size
URL_TRANSFORM_CACHE_SIZE=10000            # Cache size
URL_TRANSFORM_DEBUG=false                 # Debug mode
```

#### Cache Configuration

```bash
# Main cache settings
CACHE_ENABLED=true                        # Enable caching
CACHE_DEFAULT_TTL=300                     # Default TTL in seconds
CACHE_MAX_TTL=3600                       # Maximum TTL in seconds
CACHE_CHECK_PERIOD=120                   # Cache cleanup interval
CACHE_MAX_ITEMS=1000                     # Maximum cached items
RESPECT_CACHE_CONTROL=true               # Respect Cache-Control headers
CACHE_COOKIES=false                      # Cache responses with cookies

# Cacheable content types
CACHEABLE_CONTENT_TYPES=text/html,text/css,text/javascript,application/javascript,application/json,image/jpeg,image/png

# Cacheable status codes
CACHEABLE_STATUS_CODES=200,301,302,304
```

#### Security Configuration

```bash
# Security headers
SECURITY_HEADERS=true                     # Enable security headers
CONTENT_SECURITY_POLICY=                 # Custom CSP (leave empty for default)

# CORS configuration
ENABLE_CORS=false                        # Enable CORS
CORS_ORIGINS=*                          # Allowed CORS origins

# Rate limiting
RATE_LIMIT_ENABLED=false                 # Enable rate limiting
RATE_LIMIT_WINDOW_MS=60000              # Rate limit window (1 minute)
RATE_LIMIT_MAX=100                      # Max requests per window
```

#### Logging Configuration

```bash
# Logging settings
LOG_LEVEL=info                           # Log level (debug, info, warn, error)
LOG_FORMAT=combined                      # Log format
ACCESS_LOG_ENABLED=true                  # Enable access logging
ERROR_LOG_ENABLED=true                   # Enable error logging
LOG_DIR=./logs                          # Log directory
LOG_TO_CONSOLE=true                     # Console output
LOG_TO_FILE=true                        # File output
```

#### Performance Configuration

```bash
# Compression settings
ENABLE_COMPRESSION=true                  # Enable response compression
COMPRESSION_LEVEL=6                      # Compression level (1-9)
COMPRESSION_MIN_SIZE=1024               # Minimum size to compress
MAX_BODY_SIZE=1mb                       # Maximum request body size
REQUEST_TIMEOUT=30000                   # Request timeout in milliseconds
```

#### Monitoring Configuration

```bash
# Health check settings
HEALTH_CHECK_ENABLED=true               # Enable health check endpoint
HEALTH_CHECK_PATH=/health               # Health check endpoint path
HEALTH_CHECK_DETAILED=false             # Enable detailed health info

# Metrics settings
METRICS_ENABLED=true                    # Enable metrics collection
METRICS_PATH=/metrics                   # Metrics endpoint path
```

### Configuration Validation

The application automatically validates critical configuration on startup:

- Origin and target domains must be configured
- SSL certificate files must exist if SSL is enabled
- JSON configuration must be valid

## Dashboard Interface

The web dashboard provides real-time monitoring, configuration management, and API testing capabilities with enhanced initialization and error handling for comprehensive API management and monitoring.

### Enhanced Dashboard Features

#### Improved Initialization

- **Error handling**: Graceful handling of dashboard initialization failures
- **Fallback behavior**: Application continues to function even if dashboard fails to initialize
- **Comprehensive logging**: Detailed logging of initialization steps and any errors
- **Resource management**: Proper cleanup of dashboard resources during shutdown

#### Dashboard Integration Process

```javascript
// Enhanced initialization with error handling
dashboardIntegration.initialize()
  .then(() => {
    logger.info('Dashboard integration initialized successfully');
    startServer();
  })
  .catch(err => {
    logger.error('Failed to initialize dashboard integration', { error: err.message });
    // Start server anyway, just without dashboard
    startServer();
  });
```

### Accessing the Dashboard

1. **Navigate to Dashboard**

   ```bash
   http://localhost:3000/dashboard
   ```

2. **Dashboard Features**
   - Real-time metrics visualization
   - API endpoint discovery and testing
   - Cache management interface (including nuclear cache clear)
   - System health monitoring
   - Configuration management
   - File resolution monitoring and management
   - URL transformation cache management
   - Circuit breaker status monitoring

### Dashboard Navigation

#### Main Dashboard

- **System Overview**: CPU, memory, uptime statistics with enhanced memory leak monitoring
- **Request Metrics**: Request rates, response times, status codes
- **Cache Statistics**: Hit rates, cache size, TTL information for all cache types
- **Domain Routing**: Active routing rules and backend targets with path rewriting status
- **File Resolution**: File resolution statistics and circuit breaker status

#### API Explorer

- **Endpoint Discovery**: Automatic detection of available endpoints including new cache management endpoints
- **Interactive Testing**: Built-in API testing interface
- **Documentation**: Auto-generated API documentation with comprehensive endpoint coverage
- **Response Inspection**: Detailed response analysis

#### Enhanced Cache Management

- **Multi-Cache Statistics**: Real-time metrics for main, URL transformation, and file resolution caches
- **Nuclear Cache Control**: System-wide cache clearing capabilities
- **Cache Performance Analysis**: Hit/miss rates and optimization suggestions for all cache types
- **Content Analysis**: View cached content and metadata across all cache systems
- **Memory Usage Monitoring**: Detailed memory usage tracking and alerts

#### Configuration Panel

- **Environment Variables**: View and modify configuration including new URL transformation and file resolution settings
- **Domain Rules**: Manage domain-to-path mapping rules with complex routing support
- **Security Settings**: Configure CORS, rate limiting, security headers
- **Performance Tuning**: Adjust cache, compression, timeout settings, and memory monitoring
- **File Resolution Configuration**: Manage file resolution settings per domain
- **Circuit Breaker Management**: Monitor and control circuit breaker states

### Dashboard API Endpoints

The dashboard exposes several management endpoints:

#### Discovery Endpoints

```bash
# Get all discovered endpoints
curl http://localhost:3000/dashboard/api/discovery/endpoints

# Get endpoints by category
curl http://localhost:3000/dashboard/api/discovery/endpoints/monitoring

# Get available categories
curl http://localhost:3000/dashboard/api/discovery/categories

# Get discovery statistics
curl http://localhost:3000/dashboard/api/discovery/stats

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

#### Dashboard Status

```bash
# Get dashboard status
curl http://localhost:3000/dashboard/api/dashboard/status

# Get dashboard configuration
curl http://localhost:3000/dashboard/api/dashboard/config
```

## API Reference

The application provides comprehensive REST API endpoints for monitoring, management, and integration.

### Health Check Endpoints

#### Basic Health Check

```bash
# Basic health status
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0"
}
```

#### Detailed Health Check

```bash
# Detailed health information
curl http://localhost:3000/health?detailed=true
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "system": {
    "os": {
      "platform": "linux",
      "release": "5.15.0",
      "arch": "x64",
      "uptime": 86400,
      "loadavg": [0.5, 0.3, 0.2],
      "totalmem": 8589934592,
      "freemem": 4294967296,
      "cpus": 4
    },
    "process": {
      "version": "v18.17.0",
      "pid": 12345,
      "uptime": 3600.5,
      "memory": {
        "rss": 67108864,
        "heapTotal": 33554432,
        "heapUsed": 25165824
      }
    }
  },
  "cache": {
    "enabled": true,
    "stats": {
      "keys": 150,
      "hits": 1200,
      "misses": 300,
      "hitRate": 0.8
    }
  },
  "pathRewriting": {
    "enabled": true,
    "domainCount": 3,
    "rulesCount": 5
  }
}
```

### Metrics Endpoints

#### Prometheus Metrics

```bash
# Get Prometheus-compatible metrics
curl http://localhost:3000/metrics
```

**Response:** (Prometheus format)

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200",path="/",cache="hit",domain="example.com"} 1500

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",status="200",le="0.01"} 800
http_request_duration_seconds_bucket{method="GET",status="200",le="0.05"} 1200
```

#### Custom Metrics

```bash
# Get JSON metrics summary
curl http://localhost:3000/api/metrics/summary
```

**Response:**

```json
{
  "requests": {
    "total": 10000,
    "rate": 150.5,
    "errors": 25,
    "errorRate": 0.0025
  },
  "cache": {
    "hitRate": 0.85,
    "missRate": 0.15,
    "size": 500,
    "memory": "125MB"
  },
  "performance": {
    "avgResponseTime": 45.2,
    "p95ResponseTime": 120.5,
    "p99ResponseTime": 250.0
  }
}
```

### Cache Management Endpoints

#### Cache Statistics

```bash
# Get cache statistics
curl http://localhost:3000/api/cache/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "keys": 250,
    "hits": 2500,
    "misses": 500,
    "hitRate": 0.833,
    "memoryUsage": "50MB",
    "maxSize": 1000,
    "ttlStats": {
      "avgTtl": 300,
      "minTtl": 60,
      "maxTtl": 3600
    }
  }
}
```

#### Clear Cache

```bash
# Clear all cache
curl -X DELETE http://localhost:3000/api/cache/clear
```

**Response:**

```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "itemsCleared": 250
}
```

#### Clear Specific Cache Key

```bash
# Clear specific cache entry
curl -X DELETE "http://localhost:3000/api/cache/clear?key=example.com:/path"
```

**Response:**

```json
{
  "success": true,
  "message": "Cache key cleared",
  "key": "example.com:/path"
}
```

### URL Transformation Cache

#### URL Transform Cache Stats

```bash
# Get URL transformation cache statistics
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
    "transformations": {
      "html": 80,
      "javascript": 45,
      "css": 25
    }
  }
}
```

#### Clear URL Transform Cache

```bash
# Clear URL transformation cache
curl -X DELETE http://localhost:3000/api/cache/url-transform/clear
```

### Domain Management Endpoints

#### Get Domain Configuration

```bash
# Get all domain configurations
curl http://localhost:3000/api/domains
```

**Response:**

```json
{
  "success": true,
  "data": {
    "domains": {
      "ddt.com": {
        "target": "backend.example.com",
        "pathPrefix": "/ddt",
        "fallback": "prefix",
        "enabled": true
      },
      "api.example.com": {
        "target": "api-backend.example.com",
        "pathPrefix": "/api",
        "fallback": "passthrough",
        "enabled": true
      }
    },
    "defaultTarget": "main-backend.example.com"
  }
}
```

#### Update Domain Configuration

```bash
# Update domain configuration
curl -X PUT http://localhost:3000/api/domains/ddt.com \
  -H "Content-Type: application/json" \
  -d '{
    "target": "new-backend.example.com",
    "pathPrefix": "/new-ddt",
    "fallback": "prefix",
    "enabled": true
  }'
```

### File Resolution Management Endpoints

#### Get File Resolution Status

```bash
# Get current status and configuration of file resolution system
curl http://localhost:3000/api/file-resolution/status
```

**Response:**

```json
{
  "enabled": true,
  "globalConfig": {
    "extensions": ["html", "md", "json", "csv", "txt", "xml"],
    "timeout": 5000,
    "maxRedirects": 3,
    "transformEnabled": true,
    "cacheEnabled": true
  },
  "circuitBreaker": {
    "enabled": true,
    "threshold": 5,
    "timeout": 30000,
    "resetTimeout": 60000
  },
  "cache": {
    "enabled": true,
    "maxSize": 1000,
    "positiveTtl": 300,
    "negativeTtl": 60,
    "currentSize": 245,
    "hitRate": 0.87
  },
  "transformers": {
    "markdown": {
      "enabled": true,
      "processed": 156
    },
    "json": {
      "enabled": true,
      "processed": 89
    },
    "csv": {
      "enabled": true,
      "processed": 23
    }
  },
  "domainConfigs": {
    "docs.example.com": {
      "enabled": true,
      "extensions": ["md", "html"],
      "transformEnabled": true
    },
    "api.example.com": {
      "enabled": true,
      "extensions": ["json", "xml"],
      "transformEnabled": false
    }
  }
}
```

#### Get File Resolution Statistics

```bash
# Get detailed statistics about file resolution operations
curl http://localhost:3000/api/file-resolution/stats
```

**Response:**

```json
{
  "totalRequests": 1250,
  "successfulResolutions": 1087,
  "failedResolutions": 163,
  "successRate": 0.87,
  "averageResolutionTime": 45.2,
  "cacheStats": {
    "hits": 892,
    "misses": 358,
    "hitRate": 0.71,
    "positiveHits": 756,
    "negativeHits": 136
  },
  "extensionStats": {
    "html": {
      "requests": 456,
      "found": 398,
      "successRate": 0.87
    },
    "md": {
      "requests": 234,
      "found": 201,
      "successRate": 0.86,
      "transformed": 201
    },
    "json": {
      "requests": 189,
      "found": 167,
      "successRate": 0.88,
      "transformed": 89
    },
    "csv": {
      "requests": 45,
      "found": 23,
      "successRate": 0.51,
      "transformed": 23
    }
  },
  "domainStats": {
    "docs.example.com": {
      "requests": 567,
      "resolutions": 489,
      "successRate": 0.86,
      "averageTime": 42.1
    },
    "api.example.com": {
      "requests": 234,
      "resolutions": 201,
      "successRate": 0.86,
      "averageTime": 38.7
    }
  },
  "circuitBreakerStats": {
    "totalTrips": 2,
    "currentlyOpen": [],
    "recentFailures": {
      "unreliable.example.com": 3
    }
  }
}
```

#### Test File Resolution

```bash
# Test file resolution for a specific domain and path
curl -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "docs.example.com",
    "path": "/getting-started"
  }'
```

**Successful Resolution Response:**

```json
{
  "success": true,
  "input": {
    "domain": "docs.example.com",
    "path": "/getting-started"
  },
  "resolution": {
    "found": true,
    "extension": "md",
    "finalPath": "/getting-started.md",
    "target": "backend.example.com",
    "fullUrl": "https://backend.example.com/getting-started.md",
    "contentType": "text/markdown",
    "contentLength": 2048,
    "lastModified": "2024-01-15T09:30:00.000Z"
  },
  "transformation": {
    "applied": true,
    "transformer": "markdown",
    "outputContentType": "text/html",
    "outputSize": 3072
  },
  "timing": {
    "resolutionTime": 45.2,
    "transformationTime": 12.8,
    "totalTime": 58.0
  },
  "cacheKey": "file:docs.example.com:/getting-started",
  "wouldCache": true
}
```

**Failed Resolution Response:**

```json
{
  "success": false,
  "input": {
    "domain": "docs.example.com",
    "path": "/nonexistent"
  },
  "resolution": {
    "found": false,
    "extensionsTried": ["md", "html", "txt"],
    "attempts": [
      {
        "extension": "md",
        "url": "https://backend.example.com/nonexistent.md",
        "status": 404,
        "responseTime": 23.1
      },
      {
        "extension": "html",
        "url": "https://backend.example.com/nonexistent.html",
        "status": 404,
        "responseTime": 19.8
      },
      {
        "extension": "txt",
        "url": "https://backend.example.com/nonexistent.txt",
        "status": 404,
        "responseTime": 21.3
      }
    ]
  },
  "timing": {
    "totalTime": 64.2
  },
  "cacheKey": "file:docs.example.com:/nonexistent",
  "wouldCache": true
}
```

#### Test Content Transformation

```bash
# Test content transformation without performing file resolution
curl -X POST http://localhost:3000/api/file-resolution/transform \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Hello World\n\nThis is **markdown** content.",
    "contentType": "text/markdown",
    "transformer": "markdown",
    "options": {
      "breaks": true,
      "linkify": true
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "input": {
    "contentType": "text/markdown",
    "transformer": "markdown",
    "originalSize": 45
  },
  "transformation": {
    "applied": true,
    "outputContentType": "text/html",
    "outputSize": 156,
    "transformedContent": "<!DOCTYPE html><html><head><title>Transformed Content</title></head><body><h1>Hello World</h1><p>This is <strong>markdown</strong> content.</p></body></html>"
  },
  "timing": {
    "transformationTime": 8.2
  },
  "options": {
    "breaks": true,
    "linkify": true,
    "typographer": false
  }
}
```

#### Get Domain-Specific File Resolution Configuration

```bash
# Get file resolution configuration for a specific domain
curl http://localhost:3000/api/file-resolution/domains/docs.example.com
```

**Response:**

```json
{
  "domain": "docs.example.com",
  "config": {
    "enabled": true,
    "extensions": ["md", "html", "txt"],
    "transformEnabled": true,
    "transformers": {
      "markdown": {
        "enabled": true,
        "options": {
          "breaks": true,
          "linkify": true,
          "typographer": true
        }
      }
    },
    "timeout": 5000,
    "cacheEnabled": true,
    "circuitBreakerEnabled": true,
    "circuitBreakerThreshold": 5
  },
  "statistics": {
    "totalRequests": 567,
    "successfulResolutions": 489,
    "failedResolutions": 78,
    "successRate": 0.86,
    "averageResolutionTime": 42.1,
    "cacheHitRate": 0.73,
    "transformationsPerformed": 401
  },
  "recentActivity": [
    {
      "path": "/getting-started",
      "extension": "md",
      "status": "success",
      "responseTime": 38.2,
      "transformed": true,
      "cached": true,
      "timestamp": "2024-01-15T10:29:45.000Z"
    },
    {
      "path": "/api-reference",
      "extension": "md",
      "status": "success",
      "responseTime": 45.1,
      "transformed": true,
      "cached": false,
      "timestamp": "2024-01-15T10:29:30.000Z"
    }
  ],
  "circuitBreaker": {
    "status": "closed",
    "failureCount": 0,
    "lastFailure": null,
    "nextAttempt": null
  }
}
```

#### Reload Domain File Resolution Configuration

```bash
# Reload file resolution configuration for a specific domain
curl -X POST http://localhost:3000/api/file-resolution/domains/docs.example.com/reload
```

**Response:**

```json
{
  "success": true,
  "domain": "docs.example.com",
  "message": "File resolution configuration reloaded successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "changes": {
    "extensionsChanged": true,
    "transformersChanged": false,
    "cacheCleared": true
  },
  "newConfig": {
    "enabled": true,
    "extensions": ["md", "html", "txt", "json"],
    "transformEnabled": true,
    "timeout": 5000
  }
}
```

#### Get Circuit Breaker Status

```bash
# Get circuit breaker status for all domains
curl http://localhost:3000/api/file-resolution/circuit-breaker
```

**Response:**

```json
{
  "enabled": true,
  "globalConfig": {
    "threshold": 5,
    "timeout": 30000,
    "resetTimeout": 60000
  },
  "domains": {
    "docs.example.com": {
      "status": "closed",
      "failureCount": 0,
      "lastFailure": null,
      "nextAttempt": null
    },
    "unreliable.example.com": {
      "status": "open",
      "failureCount": 7,
      "lastFailure": "2024-01-15T10:25:00.000Z",
      "nextAttempt": "2024-01-15T10:35:00.000Z",
      "reason": "Consecutive failures exceeded threshold"
    },
    "api.example.com": {
      "status": "half-open",
      "failureCount": 3,
      "lastFailure": "2024-01-15T10:20:00.000Z",
      "nextAttempt": "2024-01-15T10:30:00.000Z",
      "reason": "Testing recovery"
    }
  },
  "statistics": {
    "totalTrips": 5,
    "currentlyOpen": 1,
    "currentlyHalfOpen": 1,
    "totalDomains": 15,
    "healthyDomains": 13
  }
}
```

#### Reset Circuit Breaker

```bash
# Manually reset circuit breaker for a specific domain
curl -X POST http://localhost:3000/api/file-resolution/circuit-breaker/unreliable.example.com/reset
```

**Response:**

```json
{
  "success": true,
  "domain": "unreliable.example.com",
  "message": "Circuit breaker reset successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "previousStatus": "open",
  "newStatus": "closed",
  "failureCountReset": true
}
```

#### Get Available Transformers

```bash
# Get information about available content transformers
curl http://localhost:3000/api/file-resolution/transformers
```

**Response:**

```json
{
  "available": {
    "markdown": {
      "enabled": true,
      "inputTypes": ["text/markdown", "text/x-markdown"],
      "outputType": "text/html",
      "options": {
        "breaks": "Enable line breaks",
        "linkify": "Auto-link URLs",
        "typographer": "Enable smart quotes",
        "highlight": "Syntax highlighting",
        "html": "Allow HTML tags"
      },
      "statistics": {
        "totalTransformations": 456,
        "averageTime": 12.8,
        "averageInputSize": 2048,
        "averageOutputSize": 3072
      }
    },
    "json": {
      "enabled": true,
      "inputTypes": ["application/json"],
      "outputType": "application/json",
      "options": {
        "pretty": "Pretty print JSON",
        "indent": "Indentation spaces",
        "sortKeys": "Sort object keys"
      },
      "statistics": {
        "totalTransformations": 234,
        "averageTime": 3.2,
        "averageInputSize": 1024,
        "averageOutputSize": 1536
      }
    },
    "csv": {
      "enabled": true,
      "inputTypes": ["text/csv"],
      "outputType": "text/html",
      "options": {
        "delimiter": "CSV delimiter",
        "headers": "First row as headers",
        "tableClass": "CSS class for table",
        "responsive": "Responsive table design"
      },
      "statistics": {
        "totalTransformations": 89,
        "averageTime": 18.5,
        "averageInputSize": 4096,
        "averageOutputSize": 8192
      }
    }
  },
  "globalConfig": {
    "enabled": true,
    "defaultTimeout": 10000,
    "maxContentSize": 10485760
  }
}
```

### Error Responses

All API endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "additional": "context information"
  }
}
```

Common HTTP status codes:

- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (endpoint/resource not found)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## Authentication & Security

### Security Features

The application implements multiple security layers:

#### Security Headers

```bash
# Configure security headers via environment
SECURITY_HEADERS=true

# Custom Content Security Policy
CONTENT_SECURITY_POLICY='{
  "default-src": ["self"],
  "script-src": ["self", "unsafe-inline", "cdnjs.cloudflare.com"],
  "style-src": ["self", "unsafe-inline"],
  "img-src": ["self", "data:", "https:"],
  "font-src": ["self", "fonts.gstatic.com"],
  "connect-src": ["self", "api.example.com"]
}'
```

#### CORS Configuration

```bash
# Enable CORS
ENABLE_CORS=true

# Configure allowed origins
CORS_ORIGINS=https://example.com,https://app.example.com

# Configure allowed methods and headers
CORS_METHODS=GET,POST,PUT,DELETE
CORS_HEADERS=Content-Type,Authorization,Accept
```

#### Rate Limiting

```bash
# Enable rate limiting
RATE_LIMIT_ENABLED=true

# Configure rate limits
RATE_LIMIT_WINDOW_MS=60000    # 1 minute window
RATE_LIMIT_MAX=100            # 100 requests per minute

# Per-IP rate limiting
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
RATE_LIMIT_SKIP_FAILED_REQUESTS=false
```

### Access Control

#### Local-Only API Access

Management APIs are restricted to local access only:

```javascript
// Example: Cache management endpoint
app.use('/api/cache', (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Access denied - local access only'
    });
  }
});
```

#### Domain Validation

```bash
# Enable strict domain checking
STRICT_DOMAIN_CHECK=true

# Configure allowed domains
ORIGIN_DOMAIN=example.com
ADDITIONAL_DOMAINS=api.example.com,cdn.example.com
```

### SSL/TLS Configuration

#### Certificate Setup

```bash
# Generate self-signed certificate (development)
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes

# Production certificate setup
ENABLE_SSL=true
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
SSL_PASSPHRASE=your_passphrase_if_needed

# HTTP to HTTPS redirect
HTTP_TO_HTTPS_REDIRECT=true
```

#### SSL Testing

```bash
# Test SSL configuration
curl -k https://localhost:3000/health

# Verify certificate
openssl x509 -in ssl/cert.pem -text -noout
```

### Security Best Practices

1. **Regular Updates**: Keep Node.js and dependencies updated
2. **Environment Variables**: Never commit sensitive data to repository
3. **Access Logs**: Monitor access patterns for suspicious activity
4. **Resource Limits**: Configure appropriate memory and request limits
5. **Network Security**: Use firewalls and network segmentation
6. **Monitoring**: Set up alerts for security events

#### Environment Security

```bash
# Secure environment file permissions
chmod 600 .env

# Use environment-specific configurations
NODE_ENV=production    # Disable debug features
LOG_LEVEL=warn        # Reduce log verbosity
DEBUG=false           # Disable debug output
```

#### Monitoring Security Events

```bash
# Monitor failed requests
curl http://localhost:3000/metrics | grep http_requests_total | grep 4[0-9][0-9]

# Check rate limit violations
curl http://localhost:3000/metrics | grep rate_limit_exceeded
```

## URL Transformation

### Overview

The URL transformation system provides comprehensive URL masking capabilities by automatically detecting and rewriting all URLs in HTML, JavaScript, and CSS responses. This ensures that all URLs are routed through the proxy server, completely obscuring the original server's domain, IP address, and path structure from end users while maintaining full functionality and session state.

### Core Features

#### Automatic URL Detection

The system automatically detects URLs in various content types and contexts:

- **HTML content**: href, src, action, data-* attributes
- **JavaScript content**: fetch calls, imports, location assignments, AJAX requests
- **CSS content**: url() functions, @import statements, font sources
- **Inline styles and scripts**: Within HTML documents

#### URL Classification and Transformation

The system classifies URLs and applies appropriate transformations:

- **External URLs**: Transform to route through proxy
- **Internal URLs**: Preserve relative structure while ensuring proxy routing
- **Fragment URLs**: Preserve functionality for single-page applications
- **Data URLs**: Pass through unchanged for embedded content
- **JavaScript URLs**: Handle special cases like `javascript:void(0)`

### Configuration

#### Basic URL Transformation Settings

```bash
# Enable URL transformation system
URL_TRANSFORM_ENABLED=true

# Content type transformations
URL_TRANSFORM_HTML=true                    # Transform HTML content
URL_TRANSFORM_JS=true                     # Transform JavaScript content
URL_TRANSFORM_CSS=true                    # Transform CSS content
URL_TRANSFORM_INLINE_STYLES=true          # Transform inline styles
URL_TRANSFORM_DATA_ATTRS=true             # Transform data-* attributes

# URL preservation options
URL_PRESERVE_FRAGMENTS=true               # Preserve #fragments
URL_PRESERVE_QUERY=true                   # Preserve ?query parameters

# Performance settings
URL_TRANSFORM_MAX_SIZE=52428800           # 50MB max content size
URL_TRANSFORM_CACHE_SIZE=10000            # Cache size
URL_TRANSFORM_DEBUG=false                 # Debug mode
```

#### Advanced Configuration

```bash
# Transformable content types
URL_TRANSFORM_CONTENT_TYPES=text/html,application/xhtml+xml,text/javascript,application/javascript,text/css

# Security settings
URL_TRANSFORM_VALIDATE_URLS=true          # Validate URLs for security
URL_TRANSFORM_SANITIZE_INPUT=true         # Sanitize input parameters
URL_TRANSFORM_AUDIT_LOGGING=true          # Enable audit logging

# Performance tuning
URL_TRANSFORM_CACHE_TTL=3600              # Cache TTL in seconds
URL_TRANSFORM_MAX_CONCURRENT=50           # Max concurrent transformations
```

### Comprehensive Transformation Examples

#### Complete Domain Masking Example

**Original Content:**

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://backend.original-site.com/styles/main.css">
    <script src="https://backend.original-site.com/js/app.js"></script>
</head>
<body>
    <a href="https://backend.original-site.com/about">About Us</a>
    <img src="/images/logo.png" alt="Logo">
    <script>
        fetch('https://backend.original-site.com/api/data')
            .then(response => response.json());
    </script>
</body>
</html>
```

**Transformed Content (served to users):**

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://proxy.example.com/styles/main.css">
    <script src="https://proxy.example.com/js/app.js"></script>
</head>
<body>
    <a href="https://proxy.example.com/about">About Us</a>
    <img src="https://proxy.example.com/images/logo.png" alt="Logo">
    <script>
        fetch('https://proxy.example.com/api/data')
            .then(response => response.json());
    </script>
</body>
</html>
```

#### Advanced JavaScript and CSS Transformation

**Original JavaScript:**

```javascript
// Dynamic imports and AJAX calls
import('/modules/feature.js').then(module => {
    module.init();
});

// XMLHttpRequest
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://backend.original-site.com/api/users');

// jQuery AJAX
$.ajax({
    url: '/api/posts',
    method: 'GET'
});

// Location assignments
window.location.href = '/dashboard';
```

**Transformed JavaScript:**

```javascript
// All URLs automatically routed through proxy
import('https://proxy.example.com/modules/feature.js').then(module => {
    module.init();
});

const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://proxy.example.com/api/users');

$.ajax({
    url: 'https://proxy.example.com/api/posts',
    method: 'GET'
});

window.location.href = 'https://proxy.example.com/dashboard';
```

**Original CSS:**

```css
/* Background images and imports */
@import url('https://backend.original-site.com/fonts/roboto.css');

.hero {
    background-image: url('/images/hero-bg.jpg');
}

.icon {
    background: url('../icons/search.svg') no-repeat;
}

@font-face {
    font-family: 'CustomFont';
    src: url('https://backend.original-site.com/fonts/custom.woff2');
}
```

**Transformed CSS:**

```css
/* All URLs routed through proxy */
@import url('https://proxy.example.com/fonts/roboto.css');

.hero {
    background-image: url('https://proxy.example.com/images/hero-bg.jpg');
}

.icon {
    background: url('https://proxy.example.com/icons/search.svg') no-repeat;
}

@font-face {
    font-family: 'CustomFont';
    src: url('https://proxy.example.com/fonts/custom.woff2');
}
```

### URL Preservation Features

The transformation system preserves all URL functionality:

#### Query Parameters and Fragments

```html
<!-- Original -->
<a href="/search?q=javascript&page=2#results">Search Results</a>
<a href="/docs/api#authentication">API Docs</a>

<!-- Transformed -->
<a href="https://proxy.example.com/search?q=javascript&page=2#results">Search Results</a>
<a href="https://proxy.example.com/docs/api#authentication">API Docs</a>
```

#### Special URL Types

```html
<!-- Data URLs (preserved unchanged) -->
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">

<!-- JavaScript URLs (preserved unchanged) -->
<a href="javascript:void(0)" onclick="showModal()">Open Modal</a>

<!-- Mailto and tel URLs (preserved unchanged) -->
<a href="mailto:contact@example.com">Email Us</a>
<a href="tel:+1234567890">Call Us</a>
```

### Performance Optimization

#### Caching Strategy

The URL transformation system uses intelligent caching:

1. **Pattern Cache**: Cache compiled regex patterns for URL detection
2. **Transformation Cache**: Cache transformation results with LRU eviction
3. **Content Cache**: Cache transformed content with configurable TTL
4. **Negative Cache**: Cache failed transformation attempts

#### Performance Targets

- URL detection: < 10ms for typical HTML pages
- Content transformation: < 100ms for pages up to 1MB
- Cache hit rate: > 90% for repeated content
- Memory usage: < 50MB for transformation cache

### Security Features

#### Automatic Security Validation

- XSS prevention through URL validation
- Content-type verification for transformed content
- Input sanitization for URL parameters
- Audit logging for security events

#### Example Security Handling

```html
<!-- Malicious input (blocked) -->
<script>location.href='javascript:alert("XSS")'</script>

<!-- Safe transformation -->
<a href="https://proxy.example.com/safe-page">Safe Link</a>
```

### Integration with Domain Routing

#### Combined with Path Rewriting

```bash
# Enable both systems
PATH_REWRITE_ENABLED=true
URL_TRANSFORM_ENABLED=true

# Domain-to-path mapping
DOMAIN_PATH_MAPPING={"api.example.com": "/api", "cdn.example.com": "/static"}
```

#### Request Flow

1. `api.example.com/users` → Path rewriting → `/api/users`
2. Content fetched from backend with URLs like `https://backend.com/api/users`
3. URL transformation → All URLs become `https://api.example.com/...`
4. Complete domain masking achieved

### Debugging URL Transformation

#### Debug Mode

```bash
# Enable debug logging
URL_TRANSFORM_DEBUG=true
LOG_LEVEL=debug

# Monitor transformation logs
tail -f logs/app.log | grep "url-transformer"
```

### Monitoring URL Transformation

#### Available Metrics

- `url_transform_attempts_total`: Total transformation attempts
- `url_transform_cache_hits_total`: Cache hit statistics
- `url_transform_duration_seconds`: Transformation latency
- `url_transform_errors_total`: Transformation failures

#### Debug Information

```bash
# Enable debug logging
URL_TRANSFORM_DEBUG=true

# View transformation logs
tail -f logs/app.log | grep "URL_TRANSFORM"
```

## Monitoring & Metrics

### Prometheus Integration

The application exposes comprehensive metrics in Prometheus format for monitoring and alerting.

#### Available Metrics

##### HTTP Metrics

```promql
# Total HTTP requests with labels
http_requests_total{method="GET",status="200",path="/",cache="hit",domain="example.com"}

# HTTP request duration histogram
http_request_duration_seconds{method="GET",status="200",cache="hit"}

# HTTP request size histogram
http_request_size_bytes{method="GET"}

# HTTP response size histogram
http_response_size_bytes{method="GET",status="200"}
```

##### Cache Metrics

```promql
# Cache operations counter
cache_operations_total{operation="get",result="hit"}
cache_operations_total{operation="set",result="success"}

# Cache size gauge
cache_size_items{cache="main"}
cache_size_bytes{cache="main"}

# Cache hit rate gauge
cache_hit_rate{cache="main"}
```

##### System Metrics

```promql
# Process CPU usage
process_cpu_user_seconds_total
process_cpu_system_seconds_total

# Process memory usage
process_resident_memory_bytes
process_heap_bytes

# Node.js specific metrics
nodejs_eventloop_lag_seconds
nodejs_active_handles_total
nodejs_active_requests_total
```

##### Domain Routing Metrics

```promql
# Path rewriting operations
path_rewrite_operations_total{domain="ddt.com",result="success"}

# Domain routing latency
domain_routing_duration_seconds{domain="ddt.com"}

# Backend target health
backend_health_status{target="backend.example.com"}
```

### Grafana Dashboard

#### Sample Queries

```promql
# Request rate (requests per second)
rate(http_requests_total[5m])

# Error rate percentage
rate(http_requests_total{status=~"4..|5.."}[5m]) / rate(http_requests_total[5m]) * 100

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Cache hit rate
cache_hit_rate{cache="main"}

# Memory usage trend
process_resident_memory_bytes
```

#### Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Advanced CDN Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Cache Performance",
        "type": "stat",
        "targets": [
          {
            "expr": "cache_hit_rate{cache=\"main\"}",
            "legendFormat": "Hit Rate"
          }
        ]
      }
    ]
  }
}
```

### Application Logging

#### Log Levels

```bash
# Configure log level
LOG_LEVEL=info          # debug, info, warn, error

# Log destinations
LOG_TO_CONSOLE=true     # Console output
LOG_TO_FILE=true        # File output
LOG_DIR=./logs         # Log directory
```

#### Log Formats

```bash
# HTTP access logs (combined format)
2023-12-07T10:30:00.000Z [INFO] 192.168.1.100 - - "GET /health HTTP/1.1" 200 156 "-" "curl/7.68.0"

# Application logs (JSON format)
{
  "timestamp": "2023-12-07T10:30:00.000Z",
  "level": "info",
  "module": "cache-manager",
  "message": "Cache hit for key: example.com:/path",
  "metadata": {
    "key": "example.com:/path",
    "ttl": 300,
    "size": 1024
  }
}
```

#### Log Analysis

```bash
# Monitor error logs
tail -f logs/error.log

# Search for specific patterns
grep "cache miss" logs/app.log

# Analyze response times
grep "request completed" logs/app.log | jq '.metadata.responseTime'
```

### Health Monitoring

#### Automated Health Checks

```bash
#!/bin/bash
# health-check.sh - Automated health monitoring script

ENDPOINT="http://localhost:3000/health"
ALERT_EMAIL="admin@example.com"

response=$(curl -s -o /dev/null -w "%{http_code}" "$ENDPOINT")

if [ "$response" != "200" ]; then
    echo "Health check failed: HTTP $response" | mail -s "CDN Alert" "$ALERT_EMAIL"
    exit 1
fi

echo "Health check passed"
```

#### Monitoring Script

```bash
#!/bin/bash
# monitor.sh - Comprehensive monitoring script

# Check health endpoint
health_status=$(curl -s http://localhost:3000/health | jq -r '.status')

# Check cache hit rate
cache_hit_rate=$(curl -s http://localhost:3000/api/cache/stats | jq -r '.data.hitRate')

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
```

## Cache Management

### Cache Architecture

The application implements a sophisticated multi-layered caching system:

1. **Main Cache**: General purpose request/response caching
2. **File Resolution Cache**: Caches file extension resolution results
3. **URL Transformation Cache**: Caches URL transformation results
4. **Circuit Breaker Cache**: Caches circuit breaker states

### Cache Configuration

#### Basic Cache Settings

```bash
# Enable/disable caching
CACHE_ENABLED=true

# TTL configuration
CACHE_DEFAULT_TTL=300          # 5 minutes default
CACHE_MAX_TTL=3600            # 1 hour maximum
CACHE_CHECK_PERIOD=120         # 2 minutes cleanup interval

# Size limits
CACHE_MAX_ITEMS=1000          # Maximum cached items
```

#### Content-Type Based Caching

```bash
# Cacheable content types
CACHEABLE_CONTENT_TYPES=text/html,text/css,text/javascript,application/javascript,application/json,image/jpeg,image/png,image/gif,image/webp

# Cacheable status codes
CACHEABLE_STATUS_CODES=200,301,302,304
```

#### Cache Control Headers

```bash
# Respect upstream Cache-Control headers
RESPECT_CACHE_CONTROL=true

# Cache responses with cookies
CACHE_COOKIES=false
```

### Cache Management API

#### Get Cache Statistics

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

### Cache Optimization

#### Cache Key Strategy

The application uses intelligent cache key generation:

```javascript
// Main cache keys format
"domain:path:queryString:headers"

// Examples
"example.com:/:/Accept-Encoding:gzip"
"api.example.com:/users/123::/Authorization:Bearer-token"
```

#### Cache Invalidation Strategies

1. **TTL-based**: Automatic expiration based on configured TTL
2. **Manual**: Explicit cache clearing via API
3. **Header-based**: Respects upstream Cache-Control headers
4. **Pattern-based**: Clear cache by URL patterns

```bash
# Clear cache by pattern
curl -X DELETE "http://localhost:3000/api/cache/clear?pattern=/api/*"

# Clear cache by domain
curl -X DELETE "http://localhost:3000/api/cache/clear?domain=example.com"
```

#### Performance Tuning

```bash
# Optimize cache performance
CACHE_CHECK_PERIOD=60          # More frequent cleanup
CACHE_MAX_ITEMS=5000          # Larger cache size
CACHE_DEFAULT_TTL=600         # Longer default TTL

# Memory optimization
NODE_OPTIONS="--max-old-space-size=4096"  # Increase heap size
```

### Monitoring Cache Performance

#### Cache Metrics

```promql
# Cache hit rate
cache_hit_rate{cache="main"}

# Cache operations per second
rate(cache_operations_total[5m])

# Cache memory usage
cache_size_bytes{cache="main"}

# Cache key count
cache_size_items{cache="main"}
```

#### Cache Health Alerts

```yaml
# Prometheus alert rules
groups:
  - name: cache_alerts
    rules:
      - alert: LowCacheHitRate
        expr: cache_hit_rate{cache="main"} < 0.7
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Cache hit rate is below 70%"
          
      - alert: CacheMemoryHigh
        expr: cache_size_bytes{cache="main"} > 1073741824  # 1GB
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Cache memory usage is above 1GB"
```

## URL Transformation

### Overview

The URL transformation system provides comprehensive URL masking and rewriting capabilities for HTML, JavaScript, and CSS content.

### Configuration

#### Enable URL Transformation

```bash
# Enable URL transformation system
URL_TRANSFORM_ENABLED=true

# Content type transformations
URL_TRANSFORM_HTML=true                    # Transform HTML content
URL_TRANSFORM_JS=true                     # Transform JavaScript content
URL_TRANSFORM_CSS=true                    # Transform CSS content
URL_TRANSFORM_INLINE_STYLES=true          # Transform inline styles
URL_TRANSFORM_DATA_ATTRS=true             # Transform data-* attributes

# URL preservation
URL_PRESERVE_FRAGMENTS=true               # Preserve #fragments
URL_PRESERVE_QUERY=true                   # Preserve ?query parameters

# Performance settings
URL_TRANSFORM_MAX_SIZE=52428800           # 50MB max content size
URL_TRANSFORM_CACHE_SIZE=10000            # Cache size
URL_TRANSFORM_DEBUG=false                 # Debug mode
```

#### Transformable Content Types

```bash
# Configure content types for transformation
URL_TRANSFORM_CONTENT_TYPES=text/html,application/xhtml+xml,text/javascript,application/javascript,text/css
```

### Transformation Examples

#### HTML Transformation

**Before:**

```html
<a href="https://backend.example.com/page">Link</a>
<img src="https://backend.example.com/image.jpg" />
<form action="https://backend.example.com/submit">
<link rel="stylesheet" href="https://backend.example.com/style.css">
```

**After:**

```html
<a href="https://example.com/page">Link</a>
<img src="https://example.com/image.jpg" />
<form action="https://example.com/submit">
<link rel="stylesheet" href="https://example.com/style.css">
```

#### JavaScript Transformation

**Before:**

```javascript
fetch('https://backend.example.com/api/data')
import module from 'https://backend.example.com/module.js'
const url = 'https://backend.example.com/endpoint'
```

**After:**

```javascript
fetch('https://example.com/api/data')
import module from 'https://example.com/module.js'
const url = 'https://example.com/endpoint'
```

#### CSS Transformation

**Before:**

```css
@import url('https://backend.example.com/styles.css');
background-image: url('https://backend.example.com/bg.jpg');
```

**After:**

```css
@import url('https://example.com/styles.css');
background-image: url('https://example.com/bg.jpg');
```

### API Management

#### URL Transform Cache Statistics

```bash
# Get URL transformation cache stats
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

### Performance Optimization

#### Caching Strategy

The URL transformation system uses intelligent caching:

1. **Content-based keys**: Cache based on content hash
2. **Domain-aware**: Separate cache entries per domain
3. **Type-specific**: Different caching for HTML, JS, CSS
4. **Size limits**: Configurable cache size limits

#### Memory Management

```bash
# Optimize memory usage
URL_TRANSFORM_MAX_SIZE=10485760           # 10MB limit
URL_TRANSFORM_CACHE_SIZE=5000            # Smaller cache

# Monitor memory usage
curl http://localhost:3000/api/cache/url-transform/stats | jq '.data.memoryUsage'
```

### Debugging URL Transformation

#### Debug Mode

```bash
# Enable debug logging
URL_TRANSFORM_DEBUG=true
LOG_LEVEL=debug

# Monitor transformation logs
tail -f logs/app.log | grep "url-transformer"
```

#### Test Transformation

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

### Monitoring URL Transformation

#### Metrics

```promql
# URL transformation operations
url_transform_operations_total{type="html",result="success"}

# Transformation cache hit rate
url_transform_cache_hit_rate

# Transformation duration
url_transform_duration_seconds{type="html"}
```

## File Resolution

### Overview

The file resolution system automatically resolves extensionless requests by trying multiple file extensions in priority order and applies content transformations.

### Configuration

#### Basic File Resolution

```bash
# Enable file resolution
FILE_RESOLUTION_ENABLED=true

# Default extensions to try (priority order)
FILE_RESOLUTION_DEFAULT_EXTENSIONS=html,md,json,csv,txt

# Performance settings
FILE_RESOLUTION_TIMEOUT=5000              # 5 second timeout
FILE_RESOLUTION_MAX_CONCURRENT=10         # Max concurrent requests
FILE_RESOLUTION_RETRY_ATTEMPTS=2          # Retry failed requests
FILE_RESOLUTION_RETRY_DELAY=1000          # 1 second retry delay
```

#### Cache Configuration

```bash
# File resolution cache
FILE_RESOLUTION_CACHE_ENABLED=true
FILE_RESOLUTION_CACHE_TTL=300             # 5 minutes TTL
FILE_RESOLUTION_CACHE_NEGATIVE_TTL=60     # 1 minute for negative results
FILE_RESOLUTION_CACHE_MAX_SIZE=10000      # Max cache entries
```

#### Circuit Breaker

```bash
# Circuit breaker protection
FILE_RESOLUTION_CIRCUIT_BREAKER_ENABLED=true
FILE_RESOLUTION_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5    # Failures before opening
FILE_RESOLUTION_CIRCUIT_BREAKER_RESET_TIMEOUT=30000   # 30 seconds reset timeout
FILE_RESOLUTION_CIRCUIT_BREAKER_MONITOR_WINDOW=60000  # 1 minute monitoring window
```

### Content Transformers

#### Available Transformers

1. **Markdown to HTML**: Converts `.md` files to HTML
2. **JSON Formatter**: Pretty-prints JSON with syntax highlighting
3. **CSV to HTML Table**: Converts CSV to HTML tables
4. **XML Pretty Print**: Formats XML with proper indentation
5. **HTML Minification**: Compresses HTML (optional)

#### Transformer Configuration

```bash
# Enable transformers
FILE_RESOLUTION_TRANSFORMERS_ENABLED=true

# Markdown options (JSON format)
FILE_RESOLUTION_MARKDOWN_OPTIONS='{"breaks": true, "linkify": true, "typographer": true}'

# JSON formatter settings
FILE_RESOLUTION_JSON_FORMATTER_INDENT=2

# CSV table options
FILE_RESOLUTION_CSV_TABLE_HEADERS=true

# HTML minification
FILE_RESOLUTION_HTML_MINIFY=false

# XML pretty print
FILE_RESOLUTION_XML_PRETTY_PRINT=true
```

#### Domain-Specific Configuration

```bash
# Per-domain file resolution configuration (JSON format)
FILE_RESOLUTION_DOMAIN_CONFIG='{
  "docs.example.com": {
    "extensions": ["md", "html", "txt"],
    "transformers": ["markdown", "html-minify"],
    "enabled": true,
    "cache": {
      "ttl": 600
    }
  },
  "api.example.com": {
    "extensions": ["json", "yaml"],
    "transformers": ["json-formatter"],
    "enabled": true
  }
}'
```

### File Resolution Process

#### Resolution Algorithm

1. **Direct Request**: Try original URL first
2. **Extension Cascade**: Try each configured extension in order
3. **Content Detection**: Analyze response content type
4. **Transformation**: Apply appropriate content transformers
5. **Caching**: Cache successful and failed resolution attempts

#### Example Resolution

```
Request: GET /docs/api-guide
Attempts:
1. /docs/api-guide (404)
2. /docs/api-guide.html (404) 
3. /docs/api-guide.md (200) → Transform to HTML
Result: Serve transformed HTML content
```

### API Management

#### File Resolution Statistics

```bash
# Get file resolution statistics
curl http://localhost:3000/api/file-resolution/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "requests": 500,
    "hits": 450,
    "misses": 50,
    "hitRate": 0.9,
    "avgResolutionTime": 25.5,
    "extensionStats": {
      "html": 200,
      "md": 150,
      "json": 75,
      "csv": 20,
      "txt": 5
    },
    "transformerStats": {
      "markdown": 150,
      "json-formatter": 75,
      "csv-table": 20
    },
    "circuitBreaker": {
      "state": "closed",
      "failures": 0,
      "successCount": 450
    }
  }
}
```

#### Cache Management

```bash
# Clear file resolution cache
curl -X DELETE http://localhost:3000/api/file-resolution/cache/clear

# Get cache statistics
curl http://localhost:3000/api/file-resolution/cache/stats

# Clear negative cache entries
curl -X DELETE http://localhost:3000/api/file-resolution/cache/clear?type=negative
```

#### Test File Resolution

```bash
# Test file resolution for a path
curl -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/docs/guide",
    "domain": "example.com"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "originalPath": "/docs/guide",
    "resolvedPath": "/docs/guide.md",
    "extension": "md",
    "transformer": "markdown",
    "cached": false,
    "resolutionTime": 45.2
  }
}
```

### Performance Tuning

#### Connection Pool

```bash
# HTTP connection pool settings
FILE_RESOLUTION_CONNECTION_POOL_SIZE=50
FILE_RESOLUTION_CONNECTION_TIMEOUT=3000
FILE_RESOLUTION_KEEP_ALIVE=true
FILE_RESOLUTION_MAX_REDIRECTS=3
```

#### Security Settings

```bash
# File size limits
FILE_RESOLUTION_MAX_FILE_SIZE=10485760    # 10MB limit

# Allowed content types
FILE_RESOLUTION_ALLOWED_CONTENT_TYPES=text/html,text/markdown,application/json,text/csv,text/plain,application/xml

# Security restrictions
FILE_RESOLUTION_BLOCK_PRIVATE_IPS=true
FILE_RESOLUTION_USER_AGENT="Advanced-CDN-FileResolver/1.0"
```

### Monitoring File Resolution

#### Metrics

```promql
# File resolution requests
file_resolution_requests_total{result="hit"}
file_resolution_requests_total{result="miss"}

# Resolution time
file_resolution_duration_seconds{extension="md"}

# Circuit breaker state
file_resolution_circuit_breaker_state{domain="example.com"}

# Transformer operations
file_resolution_transformer_operations_total{transformer="markdown"}
```

#### Health Monitoring

```bash
# Monitor file resolution health
curl http://localhost:3000/health | jq '.fileResolution'

# Check circuit breaker status
curl http://localhost:3000/api/file-resolution/circuit-breaker/status
```

## Domain Management

### Domain Configuration

The application supports sophisticated domain routing with multiple configuration methods:

#### Simple Domain-to-Path Mapping

```bash
# Basic domain mapping
DOMAIN_PATH_MAPPING=ddt.com:/ddt,api.example.com:/api,blog.example.com:/blog
```

#### Complex Routing Rules

```bash
# Advanced routing configuration (JSON format)
DOMAIN_ROUTING_RULES='{
  "ddt.com": {
    "target": "backend.example.com",
    "pathPrefix": "/ddt",
    "fallback": "prefix",
    "rules": [
      {
        "pattern": "^/api/v1/",
        "rewrite": "/api/v2/",
        "priority": 1
      },
      {
        "pattern": "^/old-path/",
        "rewrite": "/new-path/",
        "priority": 2
      }
    ]
  },
  "api.example.com": {
    "target": "api-backend.example.com",
    "pathPrefix": "/api",
    "fallback": "passthrough",
    "rules": [
      {
        "pattern": "^/v1/",
        "rewrite": "/v2/",
        "redirect": true
      }
    ]
  }
}'
```

#### Domain-Specific Backend Targets

```bash
# Map domains to different backend servers
DOMAIN_TARGETS='{
  "api.example.com": "api-backend.example.com",
  "cdn.example.com": "cdn-backend.example.com",
  "media.example.com": "media-backend.example.com"
}'
```

### Domain Management API

#### Get Domain Configuration

```bash
# Get all domain configurations
curl http://localhost:3000/api/domains
```

**Response:**

```json
{
  "success": true,
  "data": {
    "domains": {
      "ddt.com": {
        "target": "backend.example.com",
        "pathPrefix": "/ddt",
        "fallback": "prefix",
        "enabled": true,
        "rules": [
          {
            "pattern": "^/api/v1/",
            "rewrite": "/api/v2/",
            "priority": 1
          }
        ]
      },
      "api.example.com": {
        "target": "api-backend.example.com",
        "pathPrefix": "/api",
        "fallback": "passthrough",
        "enabled": true
      }
    },
    "defaultTarget": "main-backend.example.com",
    "stats": {
      "totalDomains": 2,
      "activeDomains": 2,
      "totalRules": 1
    }
  }
}
```

#### Update Domain Configuration

```bash
# Update domain configuration
curl -X PUT http://localhost:3000/api/domains/ddt.com \
  -H "Content-Type: application/json" \
  -d '{
    "target": "new-backend.example.com",
    "pathPrefix": "/new-ddt",
    "fallback": "prefix",
    "enabled": true,
    "rules": [
      {
        "pattern": "^/legacy/",
        "rewrite": "/modern/",
        "priority": 1
      }
    ]
  }'
```

#### Add New Domain

```bash
# Add new domain configuration
curl -X POST http://localhost:3000/api/domains \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "new.example.com",
    "target": "new-backend.example.com",
    "pathPrefix": "/new",
    "fallback": "prefix",
    "enabled": true
  }'
```

#### Delete Domain

```bash
# Remove domain configuration
curl -X DELETE http://localhost:3000/api/domains/old.example.com
```

### Path Rewriting Rules

#### Rule Syntax

```json
{
  "pattern": "^/api/v1/",      // Regular expression pattern
  "rewrite": "/api/v2/",       // Replacement pattern
  "priority": 1,               // Rule priority (lower = higher priority)
  "redirect": false,           // Send HTTP redirect instead of proxy
  "enabled": true              // Enable/disable rule
}
```

#### Rule Examples

```bash
# Version upgrade
{
  "pattern": "^/api/v1/(.*)$",
  "rewrite": "/api/v2/$1",
  "priority": 1
}

# Path normalization
{
  "pattern": "^/old-section/(.*)$",
  "rewrite": "/new-section/$1",
  "priority": 2
}

# Redirect rule
{
  "pattern": "^/deprecated/(.*)$",
  "rewrite": "/new-location/$1",
  "redirect": true,
  "priority": 3
}
```

### Domain Validation Middleware

#### Domain Checking Middleware

The application validates all incoming requests against configured domains:

```javascript
// Example domain validation
const allowedDomains = [
  'example.com',
  'api.example.com',
  'cdn.example.com'
];

// Strict domain checking (default)
STRICT_DOMAIN_CHECK=true

// Additional allowed domains
ADDITIONAL_DOMAINS=dev.example.com,staging.example.com
```

#### Bypass Domain Checking

```bash
# Disable strict domain checking (not recommended for production)
STRICT_DOMAIN_CHECK=false
```

### Monitoring Domain Routing

#### Domain Metrics

```promql
# Requests per domain
http_requests_total{domain="ddt.com"}

# Path rewriting operations
path_rewrite_operations_total{domain="ddt.com",result="success"}

# Backend target health
backend_health_check{target="backend.example.com"}

# Domain routing latency
domain_routing_duration_seconds{domain="api.example.com"}
```

#### Domain Statistics

```bash
# Get domain routing statistics
curl http://localhost:3000/api/domains/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "requestsByDomain": {
      "ddt.com": 1500,
      "api.example.com": 800,
      "cdn.example.com": 1200
    },
    "pathRewritingStats": {
      "totalRewrites": 2500,
      "successfulRewrites": 2450,
      "failedRewrites": 50,
      "avgRewriteTime": 2.5
    },
    "backendHealth": {
      "backend.example.com": "healthy",
      "api-backend.example.com": "healthy",
      "cdn-backend.example.com": "degraded"
    }
  }
}
```

### Circuit Breaker for Domains

#### Circuit Breaker Configuration

```bash
# Enable circuit breaker for domains
DOMAIN_CIRCUIT_BREAKER_ENABLED=true

# Circuit breaker thresholds
DOMAIN_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
DOMAIN_CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3
DOMAIN_CIRCUIT_BREAKER_TIMEOUT=30000
DOMAIN_CIRCUIT_BREAKER_MONITOR_WINDOW=60000
```

#### Circuit Breaker States

1. **Closed**: Normal operation, requests pass through
2. **Open**: Circuit breaker activated, requests fail fast
3. **Half-Open**: Testing backend recovery, limited requests allowed

#### Circuit Breaker API

```bash
# Get circuit breaker status for all domains
curl http://localhost:3000/api/domains/circuit-breaker/status

# Reset circuit breaker for specific domain
curl -X POST http://localhost:3000/api/domains/ddt.com/circuit-breaker/reset

# Get circuit breaker statistics
curl http://localhost:3000/api/domains/circuit-breaker/stats
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Symptoms:**

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

#### 2. High Memory Usage and Memory Leaks

**Symptoms:**

- Process memory continuously increasing
- Out of memory errors
- Slow response times
- Dangling intervals after shutdown

**Solutions:**

```bash
# Monitor memory usage
curl http://localhost:3000/health | jq '.system.process.memory'

# Check for memory leaks with detailed monitoring
NODE_OPTIONS="--expose-gc --trace-warnings" npm start

# Check cache sizes
curl http://localhost:3000/api/cache/stats
curl http://localhost:3000/api/cache/url-transform/stats
curl http://localhost:3000/api/cache/file-resolution/stats

# Reduce cache sizes
CACHE_MAX_ITEMS=500
URL_TRANSFORM_CACHE_SIZE=1000
FILE_RESOLUTION_CACHE_MAX_SIZE=500

# Clear all caches (nuclear option)
curl -X DELETE http://localhost:3000/api/cache/nuke

# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Enable memory monitoring
MEMORY_MONITORING_ENABLED=true
MEMORY_ALERT_THRESHOLD=536870912  # 512MB
```

#### 2a. Browser Compatibility Issues

**Symptoms:**

- JavaScript syntax errors in browser console
- "Invalid or unexpected token" errors
- Corrupted JavaScript files
- HTTP parsing errors in Node.js clients

**Root Causes and Solutions:**

**Module System Compatibility:**

```bash
# Issue: ES modules mixed with CommonJS causing runtime errors
# Solution: All modules converted to CommonJS for consistency
# Verify no ES module imports in CommonJS files
grep -r "import.*from" src/ --include="*.js" | grep -v "// ES6 import"
```

**Gzip Decompression Errors:**

```bash
# Issue: CDN failing to properly decompress gzipped content
# Solution: Enhanced error handling in proxy-manager.js
# Enable debug logging to monitor decompression
LOG_LEVEL=debug
URL_TRANSFORM_DEBUG=true

# Monitor decompression errors
tail -f logs/app.log | grep -E "(decompression|gzip|deflate)"
```

**Content-Length Header Mismatches:**

```bash
# Issue: Node.js HTTP clients getting "Parse Error: Expected HTTP/"
# Root Cause: Content-Length header mismatch after gzip decompression
# Solution: Conditional Content-Length exclusion for compressed responses

# Test with both Node.js and curl clients
curl -H "Accept-Encoding: gzip" http://localhost:3000/test.js
node -e "require('http').get('http://localhost:3000/test.js', res => console.log('Success'))"
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
curl -I https://main--allaboutv2--ddttom.hlx.live/

# Check DNS resolution
nslookup main--allaboutv2--ddttom.hlx.live
dig main--allaboutv2--ddttom.hlx.live

# Verify firewall rules
iptables -L | grep OUTPUT

# Test with different backend
TARGET_DOMAIN=alternative-backend.com npm start

# Check circuit breaker status
curl http://localhost:3000/api/file-resolution/circuit-breaker

# Reset circuit breaker if needed
curl -X POST http://localhost:3000/api/file-resolution/circuit-breaker/domain.com/reset

# Enable debug logging
LOG_LEVEL=debug npm start
```

#### 5. Cache Performance Issues

**Symptoms:**

- Low cache hit rates
- Slow response times
- Frequent cache misses
- Cache corruption

**Solutions:**

```bash
# Analyze cache statistics
curl http://localhost:3000/api/cache/stats | jq '.hitRate'
curl http://localhost:3000/api/cache/url-transform/stats | jq '.cacheHits'
curl http://localhost:3000/api/cache/file-resolution/stats | jq '.hitRate'

# Check cache configuration
grep CACHE .env

# Increase cache TTL
CACHE_DEFAULT_TTL=600
CACHE_MAX_TTL=7200
FILE_RESOLUTION_CACHE_POSITIVE_TTL=600

# Clear corrupted cache entries
curl -X DELETE http://localhost:3000/api/cache/nuke

# Monitor cache performance
watch -n 5 'curl -s http://localhost:3000/api/cache/stats | jq "{hitRate: .hitRate, size: .totalItems}"'
```

#### 6. File Resolution Issues

**Symptoms:**

- Files not found despite existing
- Transformation failures
- Circuit breaker constantly open
- Slow file resolution

**Solutions:**

```bash
# Test file resolution for specific paths
curl -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{"domain": "docs.example.com", "path": "/getting-started"}'

# Check file resolution status
curl http://localhost:3000/api/file-resolution/status

# Monitor circuit breaker
curl http://localhost:3000/api/file-resolution/circuit-breaker

# Reset circuit breaker for failing domain
curl -X POST http://localhost:3000/api/file-resolution/circuit-breaker/failing-domain.com/reset

# Clear file resolution cache
curl -X DELETE http://localhost:3000/api/cache/file-resolution

# Enable file resolution debugging
FILE_RESOLUTION_LOG_ENABLED=true
LOG_LEVEL=debug
```

#### 7. URL Transformation Issues

**Symptoms:**

- URLs not being transformed
- Broken links after transformation
- JavaScript errors due to incorrect URLs
- Performance issues with large content

**Solutions:**

```bash
# Check URL transformation status
curl http://localhost:3000/api/cache/url-transform/stats

# Test URL transformation
curl -X POST http://localhost:3000/api/debug/url-transform \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<a href=\"https://backend.example.com/test\">Test</a>",
    "contentType": "text/html",
    "domain": "example.com"
  }'

# Enable URL transformation debugging
URL_TRANSFORM_DEBUG=true
LOG_LEVEL=debug

# Clear URL transformation cache
curl -X DELETE http://localhost:3000/api/cache/url-transform

# Monitor transformation logs
tail -f logs/app.log | grep "url-transformer"

# Adjust content size limits
URL_TRANSFORM_MAX_SIZE=10485760  # 10MB limit
```

#### 8. Dashboard Integration Issues

**Symptoms:**

- Dashboard fails to load
- `ERR_CONNECTION_REFUSED` errors when accessing dashboard endpoints
- API discovery not working
- Dashboard initialization errors
- Resource cleanup failures
- Repeated failed fetch attempts to `/dashboard/api/dashboard/status`

**Root Causes and Solutions:**

**Server Not Running:**

```bash
# Check if server is running on port 3000
curl http://localhost:3000/health

# If server isn't running, start it
npm start

# Check if port 3000 is in use
netstat -tlnp | grep :3000
lsof -i :3000
```

**Dashboard Integration Not Initialized:**

```bash
# Check server logs for dashboard initialization
grep -E "(dashboard|Dashboard)" logs/app.log

# Look for dashboard integration errors
grep -E "(dashboard.*error|dashboard.*failed)" logs/app.log

# Enable debug logging to see initialization details
LOG_LEVEL=debug npm start
```

**Dashboard API Endpoints Not Available:**

```bash
# Test if main server is responding
curl http://localhost:3000/health

# Test dashboard root endpoint
curl http://localhost:3000/dashboard/

# Test dashboard API endpoints
curl http://localhost:3000/dashboard/api/dashboard/status
curl http://localhost:3000/dashboard/api/discovery/endpoints

# If endpoints return 404, dashboard integration may not be loaded
```

**Dashboard JavaScript Errors:**

```bash
# Check browser console for JavaScript errors
# Look for network errors or failed fetch requests

# Verify dashboard files are being served
curl http://localhost:3000/dashboard/js/dashboard.js
curl http://localhost:3000/dashboard/css/dashboard.css

# Check if dashboard static files exist
ls -la src/dashboard/public/
```

**Configuration Issues:**

```bash
# Ensure dashboard is enabled (if there's a config option)
grep -i dashboard .env

# Check if dashboard integration is properly imported in main app
grep -E "(dashboard|Dashboard)" src/app.js

# Verify dashboard routes are registered
grep -E "(/dashboard|dashboard)" src/app.js
```

**Memory or Resource Issues:**

```bash
# Check if server is running out of memory
curl http://localhost:3000/health | jq '.system.memory'

# Monitor server logs for out of memory errors
grep -E "(memory|heap|OOM)" logs/app.log

# Restart server with more memory if needed
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

**Quick Fix Steps:**

```bash
# 1. Verify server is running
curl http://localhost:3000/health

# 2. If server is down, restart it
npm start

# 3. If server is up but dashboard fails, check logs
tail -f logs/app.log | grep -i dashboard

# 4. Test dashboard endpoints manually
curl -v http://localhost:3000/dashboard/api/dashboard/status

# 5. If endpoints don't exist, dashboard integration may not be loaded
# Check if dashboard-integration.js is being imported and initialized
```

**Enhanced Error Handling:**
The application is designed to continue running even if dashboard initialization fails. Check the logs for messages like:

- "Dashboard integration initialized successfully"
- "Failed to initialize dashboard integration"
- "Starting server without dashboard features"

#### 9. Domain Management and Path Rewriting Issues

**Symptoms:**

- 502 Bad Gateway errors
- Connection timeouts
- Backend unreachable

**Solutions:**

```bash
# Test backend connectivity
curl -I https://backend.example.com/

# Check DNS resolution
nslookup backend.example.com
dig backend.example.com

# Verify firewall rules
iptables -L | grep OUTPUT

# Test with different backend
TARGET_DOMAIN=alternative-backend.com npm start

# Enable debug logging
LOG_LEVEL=debug npm start
```

#### 5. Cache Performance Issues

**Symptoms:**

- Low cache hit rates
- Slow response times
- Frequent cache misses

**Solutions:**

```bash
# Analyze cache statistics
curl http://localhost:3000/api/cache/stats | jq '.data.hitRate'

# Check cache configuration
grep CACHE .env

# Increase cache TTL
CACHE_DEFAULT_TTL=600
CACHE_MAX_TTL=7200

# Warm cache with common requests
curl -X POST http://localhost:3000/api/cache/warm \
  -H "Content-Type: application/json" \
  -d '{"urls": ["http://example.com/", "http://example.com/popular"]}'
```

### Debugging Techniques

#### Enable Debug Logging

```bash
# Enable comprehensive debug logging
LOG_LEVEL=debug
URL_TRANSFORM_DEBUG=true
FILE_RESOLUTION_LOG_LEVEL=debug

# Monitor logs in real-time
tail -f logs/app.log | grep -E "(ERROR|WARN|DEBUG)"
```

#### Request Tracing

```bash
# Add request tracing headers
curl -H "X-Debug: true" http://localhost:3000/path

# Monitor specific requests
grep "request-id-123" logs/app.log
```

#### Performance Profiling

```bash
# Enable Node.js performance profiling
node --prof src/cluster-manager.js

# Generate CPU profile
node --prof-process isolate-*.log > profile.txt
```

### Log Analysis

#### Common Log Patterns

```bash
# Find errors
grep -E "ERROR|error" logs/app.log | tail -20

# Monitor cache performance
grep "cache" logs/app.log | grep -E "(hit|miss)" | tail -20

# Track slow requests
grep "responseTime" logs/app.log | awk '$6 > 1000' | tail -10

# Monitor circuit breaker events
grep "circuit breaker" logs/app.log | tail -10
```

#### Log Rotation

```bash
# Set up logrotate
cat > /etc/logrotate.d/advanced-cdn << EOF
/path/to/advanced-cdn/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        killall -SIGUSR1 node
    endscript
}
EOF
```

### Health Check Diagnostics

#### Comprehensive Health Check

```bash
#!/bin/bash
# health-diagnostic.sh

echo "=== Advanced CDN Health Diagnostic ==="

# Basic connectivity
echo "1. Testing basic connectivity..."
curl -s http://localhost:3000/health > /dev/null && echo "✓ Health endpoint accessible" || echo "✗ Health endpoint failed"

# Cache performance
echo "2. Checking cache performance..."
hit_rate=$(curl -s http://localhost:3000/api/cache/stats | jq -r '.data.hitRate // 0')
echo "Cache hit rate: $hit_rate"
if (( $(echo "$hit_rate < 0.5" | bc -l) )); then
    echo "⚠ Warning: Low cache hit rate"
fi

# Memory usage
echo "3. Checking memory usage..."
memory_mb=$(curl -s http://localhost:3000/health | jq -r '.system.process.memory.heapUsed // 0' | awk '{print $1/1024/1024}')
echo "Memory usage: ${memory_mb}MB"

# Backend connectivity
echo "4. Testing backend connectivity..."
target_domain=$(grep TARGET_DOMAIN .env | cut -d'=' -f2)
curl -s --max-time 5 "https://$target_domain" > /dev/null && echo "✓ Backend accessible" || echo "✗ Backend connection failed"

echo "=== Diagnostic Complete ==="
```

### Performance Troubleshooting

#### Slow Response Times

```bash
# Profile slow requests
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/slow-endpoint

# Monitor with continuous requests
watch -n 1 'curl -w "%{time_total}s\n" -o /dev/null -s http://localhost:3000/'

# Analyze performance metrics
curl http://localhost:3000/metrics | grep http_request_duration
```

#### High CPU Usage

```bash
# Monitor CPU usage
top -p $(pgrep -f "node.*cluster-manager")

# Profile CPU usage
node --prof --prof-process src/cluster-manager.js

# Check worker distribution
ps aux | grep node | grep -v grep
```

### Recovery Procedures

#### Emergency Cache Clear

```bash
#!/bin/bash
# emergency-cache-clear.sh
echo "Clearing all caches..."
curl -X DELETE http://localhost:3000/api/cache/clear
curl -X DELETE http://localhost:3000/api/cache/url-transform/clear
curl -X DELETE http://localhost:3000/api/file-resolution/cache/clear
echo "Cache cleared successfully"
```

#### Service Restart

```bash
#!/bin/bash
# service-restart.sh
echo "Restarting Advanced CDN service..."
pkill -f "node.*cluster-manager"
sleep 5
npm start &
echo "Service restarted"
```

#### Configuration Reset

```bash
#!/bin/bash
# config-reset.sh
echo "Resetting to default configuration..."
cp config/env-example.txt .env
echo "Configuration reset. Please update .env with your settings."
```

## Testing and Development

### Getting Started with Development

#### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager
- Basic understanding of proxy/CDN concepts

#### Development Setup

1. **Clone and Setup**

   ```bash
   git clone <repository-url>
   cd advanced-cdn
   npm install
   ```

2. **Development Mode**

   ```bash
   # Start with nodemon auto-reload
   npm run dev
   
   # Start in debug mode
   npm run debug-ddt
   ```

3. **Development Environment Variables**

   ```bash
   # Create .env file for development
   NODE_ENV=development
   LOG_LEVEL=debug
   PORT=3001
   ENABLE_CLUSTER=false
   ```

### Testing Framework and Test Suites

The application includes comprehensive testing for memory leak prevention and system reliability:

#### Available Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test files
npm test -- tests/memory-leak-cleanup.test.js
npm test -- tests/memory-leak-integration.test.js

# Run in watch mode for development
npm test -- --watch
```

#### Test Structure

```bash
tests/
├── memory-leak-cleanup.test.js      # Unit tests for interval cleanup
├── memory-leak-integration.test.js  # Integration tests for memory stability
├── test-fixes.js                    # Browser compatibility fixes validation
├── test-url-transformation.js       # URL transformation functionality
├── benchmark.js                     # Performance benchmarking
├── debug-ddt.js                     # Debug utilities
└── [other test files]               # Additional test suites
```

#### Memory Leak Prevention Tests

**Unit Tests** (`memory-leak-cleanup.test.js`):

- Tests all `setInterval()` cleanup methods in components
- Verifies interval IDs are properly nulled after `clearInterval()`
- Ensures graceful handling of multiple shutdown calls
- Tests resource cleanup in PathRewriter, CacheManager, MetricsManager, etc.

**Integration Tests** (`memory-leak-integration.test.js`):

- Tests memory stability over time with simulated load
- Verifies no dangling intervals after graceful shutdown
- Tests multiple start/stop cycles without memory accumulation
- Validates worker process cleanup in cluster mode

**Example Test Output:**

```bash
✓ PathRewriter cleanup clears intervals (15ms)
✓ CacheManager cleanup clears intervals (8ms)
✓ MetricsManager cleanup clears intervals (12ms)
✓ APIDiscoveryService cleanup clears intervals (9ms)
✓ DashboardIntegration cleanup clears intervals (11ms)
✓ Multiple create/destroy cycles show no memory growth (245ms)
✓ No dangling intervals after shutdown (156ms)

Test Suites: 2 passed, 2 total
Tests: 13 passed, 13 total
```

#### Performance and Load Testing

**Benchmark Tests:**

```bash
# Run performance benchmarks
node tests/benchmark.js

# Memory stress testing
node -e "
const { runMemoryStressTest } = require('./tests/benchmark');
runMemoryStressTest(60000, 100); // 1 minute, 100 req/sec
"
```

**Memory Monitoring During Development:**

```bash
# Monitor memory usage in real-time
node --expose-gc --max-old-space-size=2048 src/cluster-manager.js &
PID=$!

# Track memory usage
while kill -0 $PID 2>/dev/null; do
  echo "Memory: $(curl -s http://localhost:3000/health | jq -r '.system.memory.heapUsed')"
  sleep 10
done
```

### Development Tools and Scripts

#### Available Scripts

```bash
# Development
npm run dev          # Start with nodemon auto-reload
npm run debug-ddt    # Debug mode with enhanced logging
npm start            # Production start with clustering

# Testing
npm test             # Run full test suite
npm run lint         # ESLint code analysis
npm run test:watch   # Watch mode for test development

# Utilities
node tests/debug-ddt.js              # Debug utilities
node tests/benchmark.js              # Performance benchmarks
node tests/diagnose-http-response.js # HTTP diagnostic tools
```

#### Development Configuration

**Recommended Development Settings:**

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
PORT=3001
ENABLE_CLUSTER=false
CACHE_ENABLED=true
MEMORY_MONITORING_ENABLED=true
SHUTDOWN_LOG_ENABLED=true

# Memory monitoring
NODE_OPTIONS="--max-old-space-size=1024 --trace-warnings"
MEMORY_ALERT_THRESHOLD=536870912    # 512MB
MEMORY_CHECK_INTERVAL=30000         # 30 seconds

# Enable all debug logging
PATH_REWRITE_LOG_ENABLED=true
FILE_RESOLUTION_LOG_ENABLED=true
URL_TRANSFORM_DEBUG=true
```

#### Memory Leak Prevention in Development

**Development Checklist:**

- ✅ Always store interval IDs: `this.intervalId = setInterval(...)`
- ✅ Implement shutdown methods that clear intervals: `clearInterval(this.intervalId)`
- ✅ Null interval references after clearing: `this.intervalId = null`
- ✅ Test cleanup methods with unit tests
- ✅ Monitor memory usage during development
- ✅ Use development memory alerts to catch leaks early

**Anti-patterns to Avoid:**

```javascript
// ❌ Bad: Interval not stored or cleared
setInterval(() => { /* task */ }, 1000);

// ❌ Bad: Interval cleared but not nulled
clearInterval(this.intervalId);

// ❌ Bad: Event listeners not removed
process.on('SIGTERM', handler);

// ✅ Good: Proper resource management
this.intervalId = setInterval(() => { /* task */ }, 1000);
// Later in shutdown():
if (this.intervalId) {
  clearInterval(this.intervalId);
  this.intervalId = null;
}
```

### Debugging and Troubleshooting

#### Memory Leak Debugging

**Enable Debug Mode:**

```bash
# Start with memory monitoring
NODE_OPTIONS="--expose-gc --trace-warnings" npm run dev

# Enable debug logging
LOG_LEVEL=debug MEMORY_MONITORING_ENABLED=true npm run dev
```

**Debug Tools:**

```bash
# Check for memory leaks
curl http://localhost:3000/health | jq '.system.memory'

# Monitor memory trends
watch -n 5 'curl -s http://localhost:3000/health | jq ".system.memory.heapUsed"'

# Check active intervals (requires debug mode)
curl http://localhost:3000/api/debug/intervals
```

#### Development Health Checks

**Validate Resource Cleanup:**

```bash
# Test graceful shutdown
kill -TERM $(pgrep -f "node.*cluster-manager")

# Check logs for cleanup messages
grep -E "(cleanup.*completed|resources.*cleaned|shutting down)" logs/app.log
```

### Contributing

When contributing to the project:

1. **Run Tests:** Ensure all tests pass, especially memory leak tests
2. **Memory Safety:** Follow resource cleanup patterns for any new intervals/timers
3. **Documentation:** Update relevant documentation for new features
4. **Performance:** Run benchmarks to ensure no performance regression

**Pre-commit Checklist:**

- [ ] All tests pass (`npm test`)
- [ ] No ESLint violations (`npm run lint`)
- [ ] Memory leak tests pass
- [ ] Documentation updated
- [ ] Manual testing performed

## Advanced Configuration

### Environment-Specific Configurations

#### Development Environment

```bash
# Development configuration
NODE_ENV=development
LOG_LEVEL=debug
CACHE_ENABLED=false              # Disable caching for development
ENABLE_CLUSTER=false             # Single process for debugging
HEALTH_CHECK_DETAILED=true       # Detailed health information
URL_TRANSFORM_DEBUG=true         # Debug URL transformations
```

#### Staging Environment

```bash
# Staging configuration
NODE_ENV=staging
LOG_LEVEL=info
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=60             # Shorter TTL for testing
ENABLE_CLUSTER=true
CLUSTER_WORKERS=2                # Fewer workers for staging
METRICS_ENABLED=true
```

#### Production Environment

```bash
# Production configuration
NODE_ENV=production
LOG_LEVEL=warn
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=300
CACHE_MAX_TTL=3600
ENABLE_CLUSTER=true
CLUSTER_WORKERS=4                # Optimize based on CPU cores
METRICS_ENABLED=true
HEALTH_CHECK_DETAILED=false      # Reduce health check overhead
```

### Load Balancer Integration

#### NGINX Configuration

```nginx
# /etc/nginx/sites-available/advanced-cdn
upstream advanced_cdn {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name example.com;
    
    # Health check endpoint
    location /health {
        proxy_pass http://advanced_cdn;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
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

# SSL configuration
server {
    listen 443 ssl http2;
    server_name example.com;
    
    ssl_certificate /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    
    location / {
        proxy_pass http://advanced_cdn;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  cdn-app-1:
    build: .
    environment:
      - PORT=3000
      - NODE_ENV=production
      - ENABLE_CLUSTER=false
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  cdn-app-2:
    build: .
    environment:
      - PORT=3001
      - NODE_ENV=production
      - ENABLE_CLUSTER=false
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - cdn-app-1
      - cdn-app-2
    restart: unless-stopped

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
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

## Performance Tuning

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
HTTP_KEEP_ALIVE=true
HTTP_KEEP_ALIVE_TIMEOUT=65000
HTTP_MAX_SOCKETS=1000
HTTP_MAX_FREE_SOCKETS=256

# Backend connection pooling
BACKEND_CONNECTION_POOL_SIZE=100
BACKEND_CONNECTION_TIMEOUT=5000
BACKEND_SOCKET_TIMEOUT=30000
```

#### Compression Optimization

```bash
# Advanced compression settings
ENABLE_COMPRESSION=true
COMPRESSION_LEVEL=6              # Balance between speed and ratio
COMPRESSION_MIN_SIZE=512         # Compress files larger than 512 bytes
COMPRESSION_TYPES=text/html,text/css,text/javascript,application/javascript,application/json,image/svg+xml
```

### Monitoring Performance

#### Performance Metrics Dashboard

```bash
# Key performance indicators to monitor
# 1. Response time percentiles (p50, p95, p99)
# 2. Request rate (requests per second)
# 3. Cache hit ratio
# 4. Error rate
# 5. Memory usage
# 6. CPU utilization
```

#### Benchmarking

```bash
# Load testing with wrk
wrk -t12 -c400 -d30s --script=lua/benchmark.lua http://localhost:3000/

# Benchmark specific endpoints
wrk -t8 -c200 -d60s http://localhost:3000/api/health

# Memory profiling
node --inspect src/cluster-manager.js &
# Connect with Chrome DevTools at chrome://inspect
```

#### Performance Analysis Script

```bash
#!/bin/bash
# performance-analysis.sh

echo "=== Performance Analysis Report ==="

# Response time analysis
echo "1. Response Time Analysis:"
for i in {1..10}; do
  curl -w "%{time_total}s " -o /dev/null -s http://localhost:3000/
done
echo

# Cache performance
echo "2. Cache Performance:"
hit_rate=$(curl -s http://localhost:3000/api/cache/stats | jq -r '.data.hitRate')
echo "Cache hit rate: $hit_rate"

# Memory usage
echo "3. Memory Usage:"
memory_mb=$(curl -s http://localhost:3000/health | jq -r '.system.process.memory.heapUsed' | awk '{print $1/1024/1024}')
echo "Memory usage: ${memory_mb}MB"

# Request rate
echo "4. Request Rate (last 5 minutes):"
curl -s http://localhost:3000/metrics | grep "http_requests_total" | tail -5

echo "=== Analysis Complete ==="
```

This comprehensive user manual provides detailed instructions for installing, configuring, and operating the Advanced CDN Application. It covers all major features, API endpoints, troubleshooting procedures, and performance optimization techniques to help users effectively deploy and manage the application in production environments.
