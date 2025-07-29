# Configuration Guide

This document provides detailed information about configuring the Advanced CDN application through environment variables and explains how to manage domains.

## Environment Variables Overview

The application uses a `.env` file for configuration. All settings have sensible defaults but can be customized for your specific deployment needs.

## Server Configuration

### Basic Server Settings

```bash
PORT=3000                    # Port the server listens on
HOST=0.0.0.0                # Host interface to bind to (0.0.0.0 for all interfaces)
NODE_ENV=production          # Environment mode (development, production, test)
TRUST_PROXY=true            # Trust proxy headers (important for load balancers)
```

### Clustering Configuration

```bash
ENABLE_CLUSTER=true         # Enable multi-process clustering
CLUSTER_WORKERS=4           # Number of worker processes (0 = auto-detect CPU cores)
```

**Clustering Benefits:**

- Utilizes multiple CPU cores
- Improves performance and reliability
- Automatic worker restart on crashes
- Set `CLUSTER_WORKERS=0` to use all available CPU cores

## SSL/TLS Configuration

```bash
ENABLE_SSL=false            # Enable HTTPS server
SSL_CERT_PATH=./ssl/cert.pem    # Path to SSL certificate file
SSL_KEY_PATH=./ssl/key.pem      # Path to SSL private key file
SSL_PASSPHRASE=             # Passphrase for encrypted private key (optional)
HTTP_TO_HTTPS_REDIRECT=true # Redirect HTTP requests to HTTPS
```

**SSL Setup:**

1. Obtain SSL certificates (Let's Encrypt, commercial CA, or self-signed for testing)
2. Place certificate files in the specified paths
3. Set `ENABLE_SSL=true`
4. Restart the application

## CDN Configuration

### Domain Management

```bash
ORIGIN_DOMAIN=allabout.network              # Primary domain that clients connect to
TARGET_DOMAIN=main--allaboutv2--ddttom.hlx.live    # Backend server to proxy requests to
TARGET_HTTPS=true                           # Use HTTPS when connecting to backend
CDN_NAME=advanced-nodejs-cdn               # CDN identifier for headers
STRICT_DOMAIN_CHECK=true                   # Enforce domain validation
ADDITIONAL_DOMAINS=                        # Comma-separated list of additional domains
```

### Adding New Domains

There are two ways to configure domains:

#### Method 1: Additional Domains (Recommended)

Add multiple domains to the `ADDITIONAL_DOMAINS` variable:

```bash
ADDITIONAL_DOMAINS=example.com,www.example.com,api.example.com
```

#### Method 2: Multiple Origin Configurations

For different backends, you can set up multiple configurations by modifying the domain manager. The current setup supports:

1. **Single Backend**: All domains proxy to the same `TARGET_DOMAIN`
2. **Multiple Backends**: Requires code modification in `domain-manager.js`

**Example for multiple domains with same backend:**

```bash
ORIGIN_DOMAIN=mysite.com
ADDITIONAL_DOMAINS=www.mysite.com,cdn.mysite.com,static.mysite.com
TARGET_DOMAIN=backend.mysite.com
```

**Domain Validation:**

- When `STRICT_DOMAIN_CHECK=true`, only configured domains are accepted
- When `STRICT_DOMAIN_CHECK=false`, all domains are proxied (security risk)

## Cache Configuration

```bash
CACHE_ENABLED=true          # Enable/disable caching
CACHE_DEFAULT_TTL=300       # Default cache time-to-live in seconds (5 minutes)
CACHE_MAX_TTL=3600         # Maximum cache TTL in seconds (1 hour)
CACHE_CHECK_PERIOD=120     # Cache cleanup interval in seconds
CACHE_MAX_ITEMS=1000       # Maximum number of cached items
RESPECT_CACHE_CONTROL=true # Honor Cache-Control headers from backend
CACHE_COOKIES=false        # Cache responses with cookies (usually false for security)
```

**Cache Behavior:**

- Responses are cached based on URL and method
- Cache-Control headers from backend are respected when `RESPECT_CACHE_CONTROL=true`
- Cache is automatically purged when items expire or max items reached

## Security Configuration

```bash
SECURITY_HEADERS=true       # Add security headers to responses
CONTENT_SECURITY_POLICY=   # Custom CSP header (optional)
ENABLE_CORS=false          # Enable Cross-Origin Resource Sharing
CORS_ORIGINS=*             # Allowed CORS origins (* for all, or comma-separated list)
```

### Rate Limiting

```bash
RATE_LIMIT_ENABLED=false   # Enable rate limiting
RATE_LIMIT_WINDOW_MS=60000 # Rate limit window in milliseconds (1 minute)
RATE_LIMIT_MAX=100         # Maximum requests per window per IP
```

**Security Headers Added:**

- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## Logging Configuration

```bash
LOG_LEVEL=info             # Logging level (error, warn, info, debug)
LOG_FORMAT=combined        # Log format (combined, common, dev, short, tiny)
ACCESS_LOG_ENABLED=true    # Enable access logging
ERROR_LOG_ENABLED=true     # Enable error logging
LOG_DIR=./logs            # Directory for log files
LOG_TO_CONSOLE=true       # Output logs to console
LOG_TO_FILE=true          # Write logs to files
```

**Log Files Created:**

- `access.log`: HTTP access logs
- `error.log`: Application errors
- `app.log`: General application logs
- `exceptions.log`: Uncaught exceptions
- `rejections.log`: Unhandled promise rejections

## Performance Configuration

```bash
ENABLE_COMPRESSION=true    # Enable gzip compression
COMPRESSION_LEVEL=6        # Compression level (1-9, higher = better compression)
COMPRESSION_MIN_SIZE=1024  # Minimum response size to compress (bytes)
MAX_BODY_SIZE=1mb         # Maximum request body size
REQUEST_TIMEOUT=30000     # Request timeout in milliseconds
```

## Monitoring Configuration

```bash
HEALTH_CHECK_ENABLED=true     # Enable health check endpoint
HEALTH_CHECK_PATH=/health     # Health check endpoint path
HEALTH_CHECK_DETAILED=false   # Include detailed system info in health check
METRICS_ENABLED=true          # Enable Prometheus metrics
METRICS_PATH=/metrics         # Metrics endpoint path
```

**Monitoring Endpoints:**

- `/health`: Basic health status
- `/metrics`: Prometheus-compatible metrics
- `/api/cache/stats`: Cache statistics (local access only)

## File Resolution Configuration

The application includes a sophisticated file resolution system that automatically searches for files with different extensions when extensionless requests are made.

```bash
# Enable file resolution system
FILE_RESOLUTION_ENABLED=false

# Default file extensions to try (in priority order)
FILE_RESOLUTION_DEFAULT_EXTENSIONS=html,md,json,csv,txt

# Request timeout for file existence checks
FILE_RESOLUTION_TIMEOUT=5000

# Maximum concurrent file resolution requests
FILE_RESOLUTION_MAX_CONCURRENT=10

# Retry configuration
FILE_RESOLUTION_RETRY_ATTEMPTS=2
FILE_RESOLUTION_RETRY_DELAY=1000

# Caching configuration
FILE_RESOLUTION_CACHE_ENABLED=true
FILE_RESOLUTION_CACHE_TTL=300

# Content transformation
FILE_RESOLUTION_TRANSFORMERS_ENABLED=true
```

**File Resolution Features:**

- Automatically tries multiple file extensions for extensionless URLs
- Transforms content (Markdown to HTML, CSV to tables, etc.)
- Caches resolution results for performance
- Circuit breaker protection for failing domains

## URL Transformation Configuration

The URL transformation system automatically rewrites URLs in HTML, JavaScript, and CSS content to route through the proxy server.

```bash
# Enable URL transformation
URL_TRANSFORM_ENABLED=false

# Content type transformations
URL_TRANSFORM_HTML=true
URL_TRANSFORM_JS=true
URL_TRANSFORM_CSS=true
URL_TRANSFORM_INLINE_STYLES=true
URL_TRANSFORM_DATA_ATTRS=true

# URL preservation options
URL_PRESERVE_FRAGMENTS=true
URL_PRESERVE_QUERY=true

# Performance settings
URL_TRANSFORM_MAX_SIZE=52428800
URL_TRANSFORM_CACHE_SIZE=10000
URL_TRANSFORM_DEBUG=false

# Supported content types for transformation
URL_TRANSFORM_CONTENT_TYPES=text/html,application/xhtml+xml,text/javascript,application/javascript,application/x-javascript,text/css
```

**URL Transformation Features:**

- Comprehensive URL detection in HTML, JS, and CSS
- Intelligent caching for performance
- Preserves query parameters and fragments
- Debug mode for development

## Advanced Cache Configuration

Additional cache configuration options for specific content types and status codes.

```bash
# Content types that should be cached
CACHEABLE_CONTENT_TYPES=text/html,text/css,text/javascript,application/javascript,application/json,image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/font-woff,application/font-woff2,application/vnd.ms-fontobject,font/ttf,font/otf

# HTTP status codes that should be cached
CACHEABLE_STATUS_CODES=200,301,302,304
```

## Domain-to-Path Prefix Mapping

The application now includes comprehensive domain-based path rewriting functionality that allows you to map different domains to specific path prefixes on your backend server. This enables sophisticated routing scenarios where different domains can serve content from different sections of your backend.

### Core Configuration

Enable domain-to-path prefix mapping with these environment variables:

```bash
# Enable path rewriting system
PATH_REWRITE_ENABLED=true

# Domain-to-path prefix mapping (colon-separated format)
DOMAIN_PATH_MAPPING=ddt.com:/ddt,blog.site.com:/blog,api.example.com:/api

# Note: JSON format is NOT supported - use colon-separated format only

# Complex transformation rules (JSON format)
PATH_REWRITE_RULES={"api.example.com": {"^/v1/(.*)": "/api/v1/$1", "^/v2/(.*)": "/api/v2/$1"}}

# Domain-specific backend targets (optional)
DOMAIN_TARGETS={"api.example.com": "api-backend.example.com", "cdn.example.com": "static.example.com"}

# Fallback behavior for unmatched domains
PATH_REWRITE_FALLBACK_ENABLED=true
PATH_REWRITE_FALLBACK_PREFIX=/default
```

### Real-World Examples

#### Example 1: Personal Website with Subdomain Routing

**Scenario**: Route different subdomains to different sections of your main website.

```bash
# Configuration
ORIGIN_DOMAIN=allabout.network
TARGET_DOMAIN=main--allaboutv2--ddttom.hlx.live
TARGET_HTTPS=true
PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING=ddt.com:/ddt,portfolio.allabout.network:/portfolio,blog.allabout.network:/blog
```

**Request Transformations**:

- `ddt.com/about` → `main--allaboutv2--ddttom.hlx.live/ddt/about`
- `portfolio.allabout.network/projects` → `main--allaboutv2--ddttom.hlx.live/portfolio/projects`
- `blog.allabout.network/latest` → `main--allaboutv2--ddttom.hlx.live/blog/latest`
- `allabout.network/home` → `main--allaboutv2--ddttom.hlx.live/home` (no prefix)

#### Example 2: Multi-Brand E-commerce Platform

**Scenario**: Multiple brand domains serving content from different backend sections.

```bash
# Configuration
ORIGIN_DOMAIN=mainstore.com
TARGET_DOMAIN=backend.ecommerce.com
PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING=brand-a.com:/brands/a,brand-b.com:/brands/b,wholesale.mainstore.com:/wholesale
```

**Request Transformations**:

- `brand-a.com/products/shoes` → `backend.ecommerce.com/brands/a/products/shoes`
- `brand-b.com/categories/electronics` → `backend.ecommerce.com/brands/b/categories/electronics`
- `wholesale.mainstore.com/bulk-orders` → `backend.ecommerce.com/wholesale/bulk-orders`

#### Example 3: API Gateway with Version Routing

**Scenario**: Route different API domains to versioned backend endpoints.

```bash
# Configuration
ORIGIN_DOMAIN=api.myservice.com
TARGET_DOMAIN=backend.myservice.com
PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING=api-v1.myservice.com:/api/v1,api-v2.myservice.com:/api/v2
PATH_REWRITE_RULES={"api.myservice.com": {"^/v1/(.*)": "/api/v1/$1", "^/v2/(.*)": "/api/v2/$1", "^/(.*)": "/api/latest/$1"}}
```

**Request Transformations**:

- `api-v1.myservice.com/users` → `backend.myservice.com/api/v1/users`
- `api-v2.myservice.com/users` → `backend.myservice.com/api/v2/users`
- `api.myservice.com/v1/users` → `backend.myservice.com/api/v1/users`
- `api.myservice.com/users` → `backend.myservice.com/api/latest/users`

#### Example 4: Content Delivery Network with Asset Routing

**Scenario**: Route static assets and media to appropriate backend paths.

```bash
# Configuration
ORIGIN_DOMAIN=mywebsite.com
TARGET_DOMAIN=backend.mywebsite.com
PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING=cdn.mywebsite.com:/static,images.mywebsite.com:/media/images,videos.mywebsite.com:/media/videos
DOMAIN_TARGETS={"cdn.mywebsite.com": "static-backend.mywebsite.com"}
```

**Request Transformations**:

- `cdn.mywebsite.com/css/styles.css` → `static-backend.mywebsite.com/static/css/styles.css`
- `images.mywebsite.com/logo.png` → `backend.mywebsite.com/media/images/logo.png`
- `videos.mywebsite.com/intro.mp4` → `backend.mywebsite.com/media/videos/intro.mp4`

#### Example 5: Multi-Tenant SaaS Platform

**Scenario**: Route tenant-specific domains to isolated backend sections.

```bash
# Configuration
ORIGIN_DOMAIN=app.saasplatform.com
TARGET_DOMAIN=backend.saasplatform.com
PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING=tenant1.saasplatform.com:/tenants/tenant1,tenant2.saasplatform.com:/tenants/tenant2,admin.saasplatform.com:/admin
```

**Request Transformations**:

- `tenant1.saasplatform.com/dashboard` → `backend.saasplatform.com/tenants/tenant1/dashboard`
- `tenant2.saasplatform.com/settings` → `backend.saasplatform.com/tenants/tenant2/settings`
- `admin.saasplatform.com/users` → `backend.saasplatform.com/admin/users`

### Advanced Configuration Options

#### Complex Regex Transformations

For sophisticated path transformations, use regex patterns:

```bash
PATH_REWRITE_RULES={
  "api.example.com": {
    "^/v([0-9]+)/(.*)": "/api/v$1/$2",
    "^/legacy/(.*)": "/api/v1/legacy/$1",
    "^/(.*)": "/api/latest/$1"
  },
  "docs.example.com": {
    "^/([a-z]+)/(.*)": "/documentation/$1/$2",
    "^/(.*)": "/documentation/general/$1"
  }
}
```

#### Domain-Specific Backend Targets

Route different domains to completely different backend servers:

```bash
DOMAIN_TARGETS={
  "api.example.com": "api-cluster.example.com",
  "static.example.com": "cdn.example.com",
  "admin.example.com": "admin-backend.example.com"
}
```

#### Fallback Configuration

Configure fallback behavior for domains without specific rules:

```bash
PATH_REWRITE_FALLBACK_ENABLED=true
PATH_REWRITE_FALLBACK_PREFIX=/default
PATH_REWRITE_FALLBACK_TARGET=fallback-backend.example.com
```

### Performance Considerations

The path rewriting system includes several performance optimizations:

```bash
# Rule compilation and caching
PATH_REWRITE_CACHE_ENABLED=true
PATH_REWRITE_CACHE_SIZE=1000
PATH_REWRITE_CACHE_TTL=3600

# Performance monitoring
PATH_REWRITE_METRICS_ENABLED=true
PATH_REWRITE_TIMING_ENABLED=true
```

### Monitoring and Debugging

Enable detailed logging for path rewriting operations:

```bash
# Logging configuration
LOG_LEVEL=debug
PATH_REWRITE_LOG_ENABLED=true
PATH_REWRITE_LOG_TRANSFORMATIONS=true
```

**Log Output Examples**:

```bash
[INFO] Path rewriter initialized with 5 domain mappings
[DEBUG] Domain ddt.com mapped to prefix /ddt
[DEBUG] Request transformation: ddt.com/about -> /ddt/about
[INFO] Path rewrite cache hit for domain ddt.com
```

### Cache Key Generation

The system automatically generates domain-aware cache keys:

```bash
# Cache configuration for path rewriting
CACHE_DOMAIN_AWARE=true
CACHE_PATH_PREFIX_AWARE=true
```

**Cache Key Examples**:

- Original: `GET:/about`
- With domain mapping: `GET:ddt.com:/ddt/about`

### Health Monitoring

The health check system monitors domain routing:

```bash
# Health check configuration
HEALTH_CHECK_DOMAIN_ROUTING=true
HEALTH_CHECK_PATH_REWRITING=true
```

**Health Check Response**:

```json
{
  "status": "healthy",
  "pathRewriting": {
    "enabled": true,
    "domainsConfigured": 5,
    "rulesCompiled": true,
    "cacheHitRate": 0.95
  },
  "domainRouting": {
    "ddt.com": "healthy",
    "blog.site.com": "healthy"
  }
}
```

## Domain Configuration Examples

### Single Domain Setup

```bash
ORIGIN_DOMAIN=mywebsite.com
TARGET_DOMAIN=backend.mywebsite.com
ADDITIONAL_DOMAINS=
```

### Multi-Domain Setup (Same Backend, Same Paths)

```bash
ORIGIN_DOMAIN=mywebsite.com
TARGET_DOMAIN=backend.mywebsite.com
ADDITIONAL_DOMAINS=www.mywebsite.com,m.mywebsite.com
```

### Multi-Domain Setup (Same Backend, Different Paths)

```bash
ORIGIN_DOMAIN=mywebsite.com
TARGET_DOMAIN=backend.mywebsite.com
ADDITIONAL_DOMAINS=api.mywebsite.com,cdn.mywebsite.com
PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING=api.mywebsite.com:/api,cdn.mywebsite.com:/static
```

### Development Setup

```bash
ORIGIN_DOMAIN=localhost
TARGET_DOMAIN=localhost:8080
TARGET_HTTPS=false
STRICT_DOMAIN_CHECK=false
```

## Environment-Specific Configurations

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_TO_CONSOLE=true
ENABLE_CLUSTER=false
CACHE_DEFAULT_TTL=60
STRICT_DOMAIN_CHECK=false
```

### Production

```bash
NODE_ENV=production
LOG_LEVEL=info
ENABLE_CLUSTER=true
CLUSTER_WORKERS=0
CACHE_DEFAULT_TTL=300
STRICT_DOMAIN_CHECK=true
ENABLE_SSL=true
```

### Testing

```bash
NODE_ENV=test
LOG_LEVEL=error
ENABLE_CLUSTER=false
CACHE_ENABLED=false
RATE_LIMIT_ENABLED=false
```

## File Resolution System

The application includes a sophisticated cascading file resolution system that automatically searches for files with different extensions when extensionless requests are made. This system uses HTTP HEAD requests to check file existence on target domains and includes content transformation capabilities.

### Core File Resolution Configuration

Enable and configure the file resolution system with these environment variables:

```bash
# Enable file resolution system
FILE_RESOLUTION_ENABLED=true

# Default extension search order (comma-separated)
FILE_RESOLUTION_EXTENSIONS=html,md,json,csv,txt,xml

# HTTP request configuration
FILE_RESOLUTION_TIMEOUT=5000
FILE_RESOLUTION_MAX_REDIRECTS=3
FILE_RESOLUTION_USER_AGENT=AdvancedCDN-FileResolver/1.0

# Circuit breaker configuration
FILE_RESOLUTION_CIRCUIT_BREAKER_ENABLED=true
FILE_RESOLUTION_CIRCUIT_BREAKER_THRESHOLD=5
FILE_RESOLUTION_CIRCUIT_BREAKER_TIMEOUT=30000
FILE_RESOLUTION_CIRCUIT_BREAKER_RESET_TIMEOUT=60000

# Cache configuration
FILE_RESOLUTION_CACHE_ENABLED=true
FILE_RESOLUTION_CACHE_POSITIVE_TTL=300
FILE_RESOLUTION_CACHE_NEGATIVE_TTL=60
FILE_RESOLUTION_CACHE_MAX_SIZE=1000

# Content transformation
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_MARKDOWN=true
FILE_RESOLUTION_TRANSFORM_JSON=true
FILE_RESOLUTION_TRANSFORM_CSV=true
```

### Per-Domain File Resolution Configuration

Configure different file resolution settings for specific domains:

```bash
# Domain-specific file resolution settings (JSON format)
FILE_RESOLUTION_DOMAIN_CONFIG={
  "api.example.com": {
    "enabled": true,
    "extensions": ["json", "xml"],
    "transformEnabled": false,
    "cacheEnabled": true,
    "timeout": 3000
  },
  "docs.example.com": {
    "enabled": true,
    "extensions": ["md", "html", "txt"],
    "transformEnabled": true,
    "transformMarkdown": true,
    "cacheEnabled": true,
    "timeout": 5000
  },
  "static.example.com": {
    "enabled": false
  }
}
```

### Real-World File Resolution Examples

#### Example 1: Documentation Site with Markdown Support

**Scenario**: Automatically serve markdown files as HTML for a documentation site.

```bash
# Configuration
ORIGIN_DOMAIN=docs.mysite.com
TARGET_DOMAIN=backend.mysite.com
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_EXTENSIONS=md,html,txt
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_MARKDOWN=true

FILE_RESOLUTION_DOMAIN_CONFIG={
  "docs.mysite.com": {
    "enabled": true,
    "extensions": ["md", "html"],
    "transformEnabled": true,
    "transformMarkdown": true,
    "markdownOptions": {
      "breaks": true,
      "linkify": true,
      "typographer": true
    }
  }
}
```

**Request Transformations**:

- `docs.mysite.com/getting-started` → checks for:
  1. `backend.mysite.com/getting-started.md` (found, transformed to HTML)
  2. `backend.mysite.com/getting-started.html` (fallback)
- `docs.mysite.com/api/reference` → checks for:
  1. `backend.mysite.com/api/reference.md` (found, transformed to HTML)

#### Example 2: API Gateway with JSON Response Formatting

**Scenario**: Serve formatted JSON responses for API endpoints.

```bash
# Configuration
ORIGIN_DOMAIN=api.myservice.com
TARGET_DOMAIN=backend.myservice.com
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_EXTENSIONS=json,xml
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_JSON=true

FILE_RESOLUTION_DOMAIN_CONFIG={
  "api.myservice.com": {
    "enabled": true,
    "extensions": ["json", "xml"],
    "transformEnabled": true,
    "transformJson": true,
    "jsonOptions": {
      "pretty": true,
      "indent": 2
    },
    "timeout": 3000,
    "cacheEnabled": true
  }
}
```

**Request Transformations**:

- `api.myservice.com/users/123` → checks for:
  1. `backend.myservice.com/users/123.json` (found, formatted as pretty JSON)
  2. `backend.myservice.com/users/123.xml` (fallback)

#### Example 3: Data Portal with CSV Table Conversion

**Scenario**: Convert CSV files to HTML tables for a data portal.

```bash
# Configuration
ORIGIN_DOMAIN=data.mysite.com
TARGET_DOMAIN=storage.mysite.com
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_EXTENSIONS=csv,json,txt
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_CSV=true

FILE_RESOLUTION_DOMAIN_CONFIG={
  "data.mysite.com": {
    "enabled": true,
    "extensions": ["csv", "json", "txt"],
    "transformEnabled": true,
    "transformCsv": true,
    "csvOptions": {
      "delimiter": ",",
      "headers": true,
      "tableClass": "data-table",
      "responsive": true
    }
  }
}
```

**Request Transformations**:

- `data.mysite.com/reports/sales-2024` → checks for:
  1. `storage.mysite.com/reports/sales-2024.csv` (found, converted to HTML table)
  2. `storage.mysite.com/reports/sales-2024.json` (fallback)

#### Example 4: Multi-Format Content Site

**Scenario**: Support multiple content formats with intelligent fallbacks.

```bash
# Configuration
ORIGIN_DOMAIN=content.mysite.com
TARGET_DOMAIN=cms.mysite.com
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_EXTENSIONS=html,md,json,txt
FILE_RESOLUTION_TRANSFORM_ENABLED=true

FILE_RESOLUTION_DOMAIN_CONFIG={
  "content.mysite.com": {
    "enabled": true,
    "extensions": ["html", "md", "json", "txt"],
    "transformEnabled": true,
    "transformMarkdown": true,
    "transformJson": true,
    "cacheEnabled": true,
    "timeout": 5000
  }
}
```

**Request Transformations**:

- `content.mysite.com/articles/tech-news` → checks for:
  1. `cms.mysite.com/articles/tech-news.html` (preferred)
  2. `cms.mysite.com/articles/tech-news.md` (transformed to HTML)
  3. `cms.mysite.com/articles/tech-news.json` (formatted JSON)
  4. `cms.mysite.com/articles/tech-news.txt` (plain text)

#### Example 5: Static Site with Performance Optimization

**Scenario**: Optimize file resolution for a high-traffic static site.

```bash
# Configuration
ORIGIN_DOMAIN=static.mysite.com
TARGET_DOMAIN=cdn.mysite.com
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_EXTENSIONS=html,json
FILE_RESOLUTION_CACHE_ENABLED=true
FILE_RESOLUTION_CACHE_POSITIVE_TTL=600
FILE_RESOLUTION_CACHE_NEGATIVE_TTL=120

FILE_RESOLUTION_DOMAIN_CONFIG={
  "static.mysite.com": {
    "enabled": true,
    "extensions": ["html", "json"],
    "transformEnabled": false,
    "cacheEnabled": true,
    "timeout": 2000,
    "circuitBreakerEnabled": true,
    "circuitBreakerThreshold": 3
  }
}
```

### Advanced File Resolution Configuration

#### Custom Transformer Settings

Configure content transformers with specific options:

```bash
FILE_RESOLUTION_TRANSFORMER_CONFIG={
  "markdown": {
    "enabled": true,
    "options": {
      "breaks": true,
      "linkify": true,
      "typographer": true,
      "highlight": true,
      "html": true
    },
    "template": "<!DOCTYPE html><html><head><title>{{title}}</title></head><body>{{content}}</body></html>"
  },
  "json": {
    "enabled": true,
    "options": {
      "pretty": true,
      "indent": 2,
      "sortKeys": false
    }
  },
  "csv": {
    "enabled": true,
    "options": {
      "delimiter": ",",
      "headers": true,
      "tableClass": "table table-striped",
      "responsive": true,
      "pagination": false
    }
  }
}
```

#### Circuit Breaker Configuration

Protect against failing domains with circuit breaker settings:

```bash
# Global circuit breaker settings
FILE_RESOLUTION_CIRCUIT_BREAKER_ENABLED=true
FILE_RESOLUTION_CIRCUIT_BREAKER_THRESHOLD=5
FILE_RESOLUTION_CIRCUIT_BREAKER_TIMEOUT=30000
FILE_RESOLUTION_CIRCUIT_BREAKER_RESET_TIMEOUT=60000

# Per-domain circuit breaker overrides
FILE_RESOLUTION_DOMAIN_CONFIG={
  "unreliable.example.com": {
    "circuitBreakerEnabled": true,
    "circuitBreakerThreshold": 3,
    "circuitBreakerTimeout": 15000
  }
}
```

#### Performance Optimization

Configure performance settings for file resolution:

```bash
# Connection pooling
FILE_RESOLUTION_MAX_SOCKETS=50
FILE_RESOLUTION_MAX_SOCKETS_PER_HOST=10
FILE_RESOLUTION_KEEP_ALIVE=true
FILE_RESOLUTION_KEEP_ALIVE_TIMEOUT=30000

# Request optimization
FILE_RESOLUTION_CONCURRENT_REQUESTS=5
FILE_RESOLUTION_REQUEST_PRIORITY=high
FILE_RESOLUTION_RETRY_ENABLED=true
FILE_RESOLUTION_RETRY_ATTEMPTS=2
FILE_RESOLUTION_RETRY_DELAY=1000
```

### File Resolution Monitoring

Enable comprehensive monitoring for the file resolution system:

```bash
# Metrics configuration
FILE_RESOLUTION_METRICS_ENABLED=true
FILE_RESOLUTION_METRICS_DETAILED=true
FILE_RESOLUTION_METRICS_HISTOGRAM_BUCKETS=0.1,0.5,1,2,5,10

# Health check configuration
FILE_RESOLUTION_HEALTH_CHECK_ENABLED=true
FILE_RESOLUTION_HEALTH_CHECK_INTERVAL=30000
FILE_RESOLUTION_HEALTH_CHECK_TIMEOUT=5000

# Logging configuration
FILE_RESOLUTION_LOG_ENABLED=true
FILE_RESOLUTION_LOG_LEVEL=info
FILE_RESOLUTION_LOG_REQUESTS=false
FILE_RESOLUTION_LOG_CACHE_OPERATIONS=false
FILE_RESOLUTION_LOG_TRANSFORMATIONS=true
```

### File Resolution Cache Configuration

Configure caching behavior for optimal performance:

```bash
# Cache settings
FILE_RESOLUTION_CACHE_ENABLED=true
FILE_RESOLUTION_CACHE_MAX_SIZE=1000
FILE_RESOLUTION_CACHE_POSITIVE_TTL=300
FILE_RESOLUTION_CACHE_NEGATIVE_TTL=60
FILE_RESOLUTION_CACHE_CHECK_PERIOD=120

# Cache key configuration
FILE_RESOLUTION_CACHE_INCLUDE_DOMAIN=true
FILE_RESOLUTION_CACHE_INCLUDE_HEADERS=false
FILE_RESOLUTION_CACHE_INCLUDE_QUERY=false

# Cache statistics
FILE_RESOLUTION_CACHE_STATS_ENABLED=true
FILE_RESOLUTION_CACHE_STATS_INTERVAL=60000
```

### Debugging File Resolution

Enable detailed logging for troubleshooting:

```bash
# Debug configuration
LOG_LEVEL=debug
FILE_RESOLUTION_LOG_ENABLED=true
FILE_RESOLUTION_LOG_REQUESTS=true
FILE_RESOLUTION_LOG_CACHE_OPERATIONS=true
FILE_RESOLUTION_LOG_TRANSFORMATIONS=true
FILE_RESOLUTION_LOG_CIRCUIT_BREAKER=true
```

**Debug Log Examples**:

```bash
[DEBUG] File resolution: checking /api/users with extensions [json, xml]
[DEBUG] File resolution: HEAD request to backend.com/api/users.json
[DEBUG] File resolution: found file at /api/users.json, size: 1024 bytes
[DEBUG] File resolution: applying JSON transformer with pretty formatting
[DEBUG] File resolution: cache miss for key file:api.example.com:/api/users
[DEBUG] File resolution: cached result for 300 seconds
[INFO] File resolution: served /api/users.json (transformed) in 45ms
```

### File Resolution Security

Configure security settings for file resolution:

```bash
# Security configuration
FILE_RESOLUTION_SECURITY_ENABLED=true
FILE_RESOLUTION_MAX_FILE_SIZE=10485760
FILE_RESOLUTION_ALLOWED_CONTENT_TYPES=text/html,text/markdown,application/json,text/csv,text/plain,application/xml
FILE_RESOLUTION_BLOCKED_EXTENSIONS=exe,bat,sh,php,asp
FILE_RESOLUTION_VALIDATE_CONTENT_TYPE=true

# Rate limiting for file resolution
FILE_RESOLUTION_RATE_LIMIT_ENABLED=true
FILE_RESOLUTION_RATE_LIMIT_WINDOW=60000
FILE_RESOLUTION_RATE_LIMIT_MAX=100
```

## Configuration Validation

The application validates configuration on startup and will:

- Use default values for missing variables
- Warn about invalid configurations
- Exit if critical settings are invalid

## Memory Management Configuration

The application includes comprehensive memory leak prevention and resource cleanup capabilities. These settings help ensure optimal memory usage in production environments.

### Resource Cleanup Configuration

```bash
# Enable automatic resource cleanup on shutdown
GRACEFUL_SHUTDOWN_ENABLED=true
GRACEFUL_SHUTDOWN_TIMEOUT=30000    # Timeout for graceful shutdown in milliseconds

# Memory leak prevention
CLEANUP_INTERVALS_ON_SHUTDOWN=true # Clear all setInterval timers on shutdown
CLEANUP_CACHES_ON_SHUTDOWN=true    # Flush caches during shutdown
CLEANUP_METRICS_ON_SHUTDOWN=true   # Clear metrics registries on shutdown

# Memory monitoring
MEMORY_MONITORING_ENABLED=true     # Enable memory usage monitoring
MEMORY_LOG_INTERVAL=60000          # Log memory usage every minute
MEMORY_WARNING_THRESHOLD=80        # Warn when memory usage exceeds 80%
MEMORY_CRITICAL_THRESHOLD=95       # Critical alert when memory usage exceeds 95%
```

### Cleanup Behavior

The application automatically performs the following cleanup operations during shutdown:

- **Interval Cleanup**: All `setInterval` timers are cleared and nullified
- **Cache Cleanup**: All cache stores are flushed and cleared
- **Metrics Cleanup**: Prometheus metrics registries are cleared
- **Connection Cleanup**: HTTP agents and connection pools are destroyed
- **Worker Cleanup**: In cluster mode, all workers are gracefully terminated

### Memory Monitoring

Enable memory monitoring to detect potential memory leaks:

```bash
# Development monitoring (more verbose)
MEMORY_MONITORING_DETAILED=true   # Include detailed memory breakdowns
MEMORY_MONITORING_INTERVAL=30000  # Check memory every 30 seconds in development

# Production monitoring (optimized)
MEMORY_MONITORING_DETAILED=false  # Basic memory stats only
MEMORY_MONITORING_INTERVAL=300000 # Check memory every 5 minutes in production
```

## Troubleshooting

### Common Issues

1. **Domain Not Working**: Check `STRICT_DOMAIN_CHECK` and `ADDITIONAL_DOMAINS`
2. **SSL Errors**: Verify certificate paths and permissions
3. **Performance Issues**: Adjust `CLUSTER_WORKERS` and cache settings
4. **Memory Usage**: Reduce `CACHE_MAX_ITEMS` if memory is limited
5. **Memory Leaks**: Enable memory monitoring and check cleanup procedures
6. **Resource Cleanup**: Ensure graceful shutdown is working properly

### Memory Leak Troubleshooting

If experiencing memory leaks or high memory usage:

```bash
# Enable comprehensive memory debugging
LOG_LEVEL=debug
MEMORY_MONITORING_ENABLED=true
MEMORY_MONITORING_DETAILED=true
MEMORY_MONITORING_INTERVAL=10000

# Enable cleanup logging
CLEANUP_LOGGING_ENABLED=true
SHUTDOWN_LOGGING_ENABLED=true
```

**Memory Leak Indicators:**

- Continuously increasing memory usage over time
- Memory not being released after periods of low activity
- High memory usage despite cache limits
- Process crashes due to out-of-memory errors

**Debug Steps:**

1. Enable memory monitoring and observe usage patterns
2. Check logs for cleanup operations during shutdown
3. Monitor interval and cache cleanup in the logs
4. Use development tools to profile memory usage
5. Verify all intervals are properly cleared on shutdown

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
LOG_LEVEL=debug
LOG_TO_CONSOLE=true
```

This will provide detailed information about:

- Request routing
- Cache operations  
- Domain validation
- Backend communication
- Memory usage patterns
- Resource cleanup operations
- Interval management
