# User Manual - Advanced CDN

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Operation](#operation)
5. [Administration](#administration)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Usage](#advanced-usage)
9. [FAQ](#faq)

## Introduction

This Node.js-based CDN application provides advanced CDN functionality for caching and serving content from origin servers. It is designed for high performance, reliability, and ease of configuration.

### Key Features

- Content delivery with edge caching
- Request routing and proxying
- Domain-based traffic management with path prefix mapping
- Advanced domain-to-path prefix routing (ddt.com → /ddt prefix)
- Complex regex-based path transformations
- Cascading file resolution with extensionless requests
- Content transformation (Markdown to HTML, JSON formatting, CSV to tables)
- HTTP/HTTPS support
- Health monitoring and metrics
- Configurable caching rules with domain-aware cache keys
- Cache purging API with domain filtering
- Rate limiting
- Clustering for multi-core systems
- Circuit breaker protection for domain routing and file resolution
- Performance monitoring and benchmarking

## Installation

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- Linux, macOS, or Windows operating system
- (Optional) SSL certificates for HTTPS

### Standard Installation

Clone or download the repository:

bash
   git clone <https://github.com/ddttom/advanced-cdn.git>
   cd advanced-cdn

   ```bash

Install dependencies:

   ```bash
   npm install
   ```

Create a configuration file by copying the example:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file to match your requirements (see [Configuration](#configuration))

Start the application:

   ```bash
   npm start
   ```

### Production Installation

For production environments, we recommend:

1. Using a process manager like PM2:

   ```bash
   npm install -g pm2
   pm2 start index.js --name "advanced-cdn"
   ```

2. Configuring system limits for open files and connections
3. Setting up log rotation

## Configuration

The CDN is configured via environment variables, which can be set in the `.env` file or directly in your environment.

### Core Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port to listen on | `3000` |
| `HOST` | Host to bind to | `0.0.0.0` |
| `NODE_ENV` | Environment (production/development) | `production` |
| `ORIGIN_DOMAIN` | Domain this CDN will accept requests for | `allabout.network` |
| `TARGET_DOMAIN` | Origin domain to fetch content from | `main--allaboutv2--ddttom.hlx.live` |
| `TARGET_HTTPS` | Whether to use HTTPS for backend | `true` |

### Clustering Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_CLUSTER` | Enable multi-process clustering | `true` |
| `CLUSTER_WORKERS` | Number of worker processes | CPU count - 1 |

### Cache Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `CACHE_ENABLED` | Enable caching | `true` |
| `CACHE_DEFAULT_TTL` | Default cache TTL in seconds | `300` |
| `CACHE_MAX_TTL` | Maximum cache TTL in seconds | `3600` |
| `CACHE_MAX_ITEMS` | Maximum number of items in cache | `1000` |
| `RESPECT_CACHE_CONTROL` | Respect origin Cache-Control headers | `true` |
| `CACHE_COOKIES` | Cache responses with cookies | `false` |

### SSL Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_SSL` | Enable HTTPS | `false` |
| `SSL_CERT_PATH` | Path to SSL certificate | `./ssl/cert.pem` |
| `SSL_KEY_PATH` | Path to SSL private key | `./ssl/key.pem` |
| `SSL_PASSPHRASE` | Passphrase for SSL key | `""` |
| `HTTP_TO_HTTPS_REDIRECT` | Redirect HTTP to HTTPS | `true` |

### Security Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `SECURITY_HEADERS` | Enable security headers | `true` |
| `RATE_LIMIT_ENABLED` | Enable rate limiting | `false` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `60000` |
| `RATE_LIMIT_MAX` | Maximum requests per window | `100` |

### Logging Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | `info` |
| `LOG_TO_CONSOLE` | Output logs to console | `true` |
| `LOG_TO_FILE` | Output logs to files | `true` |
| `LOG_DIR` | Directory for log files | `./logs` |

### Domain-to-Path Prefix Mapping Configuration

The CDN now supports advanced domain-to-path prefix mapping, allowing you to route different domains to specific path prefixes on your backend server.

#### Basic Configuration Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PATH_REWRITE_ENABLED` | Enable domain-to-path prefix mapping | `true` |
| `DOMAIN_PATH_MAPPING` | JSON mapping of domains to path prefixes | `{"ddt.com": "/ddt"}` |
| `PATH_REWRITE_RULES` | Complex regex transformation rules | `{"api.example.com": {"^/v1/(.*)": "/api/v1/$1"}}` |
| `DOMAIN_TARGETS` | Domain-specific backend targets | `{"api.example.com": "api-backend.com"}` |
| `PATH_REWRITE_FALLBACK_ENABLED` | Enable fallback for unmatched domains | `true` |
| `PATH_REWRITE_FALLBACK_PREFIX` | Default prefix for unmatched domains | `/default` |

#### Performance and Monitoring Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PATH_REWRITE_CACHE_ENABLED` | Enable transformation result caching | `true` |
| `PATH_REWRITE_CACHE_SIZE` | Maximum cached transformations | `10000` |
| `PATH_REWRITE_SLOW_THRESHOLD` | Slow transformation threshold (ms) | `0.010` |
| `PATH_REWRITE_ERROR_RATE_THRESHOLD` | Error rate threshold for circuit breaker | `0.05` |
| `PATH_REWRITE_CIRCUIT_BREAKER_ENABLED` | Enable circuit breaker protection | `true` |
| `PATH_REWRITE_METRICS_ENABLED` | Enable detailed metrics collection | `true` |

### Example Configuration

Here's a minimal configuration example:

```bash
# Core settings
PORT=80
ORIGIN_DOMAIN=mycdn.example.com
TARGET_DOMAIN=origin.example.com

# Cache settings
CACHE_DEFAULT_TTL=600
CACHE_MAX_ITEMS=2000

# Security settings
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=200
```

### Domain-to-Path Prefix Mapping Examples

#### Example 1: Simple Personal Website Setup

This example shows how to set up domain-to-path prefix mapping for a personal website where `ddt.com` maps to the `/ddt` prefix on the main backend.

```bash
# Core CDN settings
ORIGIN_DOMAIN=allabout.network
TARGET_DOMAIN=main--allaboutv2--ddttom.hlx.live
TARGET_HTTPS=true

# Enable path rewriting
PATH_REWRITE_ENABLED=true

# Simple domain-to-path mapping
DOMAIN_PATH_MAPPING={"ddt.com": "/ddt", "portfolio.allabout.network": "/portfolio"}

# Additional domains that should be accepted
ADDITIONAL_DOMAINS=ddt.com,portfolio.allabout.network

# Enable fallback for unmapped domains
PATH_REWRITE_FALLBACK_ENABLED=true
PATH_REWRITE_FALLBACK_PREFIX=/default
```

**Result**:

- `ddt.com/about` → `main--allaboutv2--ddttom.hlx.live/ddt/about`
- `portfolio.allabout.network/projects` → `main--allaboutv2--ddttom.hlx.live/portfolio/projects`
- `allabout.network/home` → `main--allaboutv2--ddttom.hlx.live/home` (no prefix)

#### Example 2: Multi-Brand E-commerce Platform

This example demonstrates routing multiple brand domains to different backend sections.

```bash
# Core settings
ORIGIN_DOMAIN=mainstore.com
TARGET_DOMAIN=backend.ecommerce.com
TARGET_HTTPS=true

# Enable path rewriting
PATH_REWRITE_ENABLED=true

# Multi-brand domain mapping
DOMAIN_PATH_MAPPING={"brand-a.com": "/brands/a", "brand-b.com": "/brands/b", "wholesale.mainstore.com": "/wholesale"}

# Additional domains
ADDITIONAL_DOMAINS=brand-a.com,brand-b.com,wholesale.mainstore.com

# Performance settings
PATH_REWRITE_CACHE_ENABLED=true
PATH_REWRITE_CACHE_SIZE=50000
```

**Result**:

- `brand-a.com/products/shoes` → `backend.ecommerce.com/brands/a/products/shoes`
- `brand-b.com/categories/electronics` → `backend.ecommerce.com/brands/b/categories/electronics`
- `wholesale.mainstore.com/bulk-orders` → `backend.ecommerce.com/wholesale/bulk-orders`

#### Example 3: API Gateway with Version Routing

This example shows complex regex-based routing for API versioning.

```bash
# Core settings
ORIGIN_DOMAIN=api.myservice.com
TARGET_DOMAIN=backend.myservice.com
TARGET_HTTPS=true

# Enable path rewriting
PATH_REWRITE_ENABLED=true

# Simple prefix mapping for versioned subdomains
DOMAIN_PATH_MAPPING={"api-v1.myservice.com": "/api/v1", "api-v2.myservice.com": "/api/v2"}

# Complex regex rules for main API domain
PATH_REWRITE_RULES={"api.myservice.com": {"^/v1/(.*)": "/api/v1/$1", "^/v2/(.*)": "/api/v2/$1", "^/(.*)": "/api/latest/$1"}}

# Additional domains
ADDITIONAL_DOMAINS=api-v1.myservice.com,api-v2.myservice.com

# Circuit breaker for API protection
PATH_REWRITE_CIRCUIT_BREAKER_ENABLED=true
PATH_REWRITE_ERROR_RATE_THRESHOLD=0.1
```

**Result**:

- `api-v1.myservice.com/users` → `backend.myservice.com/api/v1/users`
- `api.myservice.com/v1/users` → `backend.myservice.com/api/v1/users`
- `api.myservice.com/users` → `backend.myservice.com/api/latest/users`

#### Example 4: Content Delivery Network with Asset Routing

This example demonstrates routing different asset types to appropriate backends.

```bash
# Core settings
ORIGIN_DOMAIN=mywebsite.com
TARGET_DOMAIN=backend.mywebsite.com
TARGET_HTTPS=true

# Enable path rewriting
PATH_REWRITE_ENABLED=true

# Asset-specific domain mapping
DOMAIN_PATH_MAPPING={"cdn.mywebsite.com": "/static", "images.mywebsite.com": "/media/images", "videos.mywebsite.com": "/media/videos"}

# Domain-specific backends for better performance
DOMAIN_TARGETS={"cdn.mywebsite.com": "static-backend.mywebsite.com", "images.mywebsite.com": "images-backend.mywebsite.com"}

# Additional domains
ADDITIONAL_DOMAINS=cdn.mywebsite.com,images.mywebsite.com,videos.mywebsite.com

# High-performance caching for assets
CACHE_DEFAULT_TTL=3600
CACHE_MAX_TTL=86400
PATH_REWRITE_CACHE_SIZE=100000
```

**Result**:

- `cdn.mywebsite.com/css/styles.css` → `static-backend.mywebsite.com/static/css/styles.css`
- `images.mywebsite.com/logo.png` → `images-backend.mywebsite.com/media/images/logo.png`
- `videos.mywebsite.com/intro.mp4` → `backend.mywebsite.com/media/videos/intro.mp4`

## Step-by-Step Setup Guide for Domain-to-Path Prefix Mapping

This section provides detailed step-by-step instructions for setting up domain-to-path prefix mapping for common use cases.

### Setup 1: Basic Personal Website with Custom Domain

**Goal**: Route `ddt.com` to `/ddt` prefix on your main backend server.

**Step 1: Configure Environment Variables**

Create or update your `.env` file:

```bash
# Core CDN settings
PORT=3000
ORIGIN_DOMAIN=allabout.network
TARGET_DOMAIN=main--allaboutv2--ddttom.hlx.live
TARGET_HTTPS=true

# Enable path rewriting
PATH_REWRITE_ENABLED=true

# Configure domain mapping
DOMAIN_PATH_MAPPING={"ddt.com": "/ddt"}

# Allow the custom domain
ADDITIONAL_DOMAINS=ddt.com
STRICT_DOMAIN_CHECK=true

# Enable monitoring
PATH_REWRITE_METRICS_ENABLED=true
HEALTH_CHECK_DETAILED=true
```

**Step 2: Test Configuration**

```bash
# Start the CDN
npm start

# Test the health endpoint
curl http://localhost:3000/health

# Verify domain configuration
curl http://localhost:3000/api/domains
```

**Step 3: Test Domain Mapping**

```bash
# Test the transformation
curl -X POST http://localhost:3000/api/domains/test-transformation \
  -H "Content-Type: application/json" \
  -d '{"domain": "ddt.com", "path": "/about"}'

# Expected response:
# {
#   "success": true,
#   "transformation": {
#     "originalPath": "/about",
#     "transformedPath": "/ddt/about",
#     "target": "main--allaboutv2--ddttom.hlx.live"
#   }
# }
```

**Step 4: Test Live Requests**

```bash
# Test actual request routing
curl -H "Host: ddt.com" http://localhost:3000/about

# Check transformation logs
grep "ddt.com" logs/app.log | tail -5
```

### Setup 2: Multi-Domain E-commerce Platform

**Goal**: Route multiple brand domains to different backend sections.

**Step 1: Configure Multiple Domains**

```bash
# Core settings
ORIGIN_DOMAIN=mainstore.com
TARGET_DOMAIN=backend.ecommerce.com
TARGET_HTTPS=true

# Enable path rewriting
PATH_REWRITE_ENABLED=true

# Multi-brand mapping
DOMAIN_PATH_MAPPING={"brand-a.com": "/brands/a", "brand-b.com": "/brands/b", "wholesale.mainstore.com": "/wholesale"}

# Allow all brand domains
ADDITIONAL_DOMAINS=brand-a.com,brand-b.com,wholesale.mainstore.com

# Performance optimization
PATH_REWRITE_CACHE_ENABLED=true
PATH_REWRITE_CACHE_SIZE=50000
```

**Step 2: Verify Configuration**

```bash
# Check all configured domains
curl http://localhost:3000/api/domains | jq '.domains | keys'

# Test each brand transformation
curl -X POST http://localhost:3000/api/domains/test-transformation \
  -H "Content-Type: application/json" \
  -d '{"domain": "brand-a.com", "path": "/products"}'

curl -X POST http://localhost:3000/api/domains/test-transformation \
  -H "Content-Type: application/json" \
  -d '{"domain": "brand-b.com", "path": "/categories"}'
```

**Step 3: Monitor Performance**

```bash
# Check cache performance
curl http://localhost:3000/api/cache/stats | jq '.domainStats'

# Monitor transformation metrics
curl http://localhost:3000/metrics | grep path_rewrite
```

### Setup 3: API Gateway with Complex Routing

**Goal**: Set up API versioning with regex-based path transformations.

**Step 1: Configure Complex Rules**

```bash
# API gateway settings
ORIGIN_DOMAIN=api.myservice.com
TARGET_DOMAIN=backend.myservice.com
TARGET_HTTPS=true

# Enable path rewriting
PATH_REWRITE_ENABLED=true

# Simple subdomain mapping
DOMAIN_PATH_MAPPING={"api-v1.myservice.com": "/api/v1", "api-v2.myservice.com": "/api/v2"}

# Complex regex rules for main API domain
PATH_REWRITE_RULES={"api.myservice.com": {"^/v1/(.*)": "/api/v1/$1", "^/v2/(.*)": "/api/v2/$1", "^/(.*)": "/api/latest/$1"}}

# Additional API domains
ADDITIONAL_DOMAINS=api-v1.myservice.com,api-v2.myservice.com

# Circuit breaker protection
PATH_REWRITE_CIRCUIT_BREAKER_ENABLED=true
PATH_REWRITE_ERROR_RATE_THRESHOLD=0.1
```

**Step 2: Test Regex Transformations**

```bash
# Test regex pattern matching
curl -X POST http://localhost:3000/api/domains/test-regex \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "api.myservice.com",
    "path": "/v1/users/123",
    "rules": [
      {"pattern": "^/v1/(.*)", "replacement": "/api/v1/$1"}
    ]
  }'
```

**Step 3: Monitor API Health**

```bash
# Check circuit breaker status
curl http://localhost:3000/health | jq '.pathRewriting.circuitBreakers'

# Monitor error rates
curl http://localhost:3000/api/domains | jq '.domains[].statistics.errorRate'
```

### Setup 4: Content Delivery with Asset Routing

**Goal**: Route different asset types to specialized backends.

**Step 1: Configure Asset Domains**

```bash
# Main website settings
ORIGIN_DOMAIN=mywebsite.com
TARGET_DOMAIN=backend.mywebsite.com
TARGET_HTTPS=true

# Enable path rewriting
PATH_REWRITE_ENABLED=true

# Asset-specific routing
DOMAIN_PATH_MAPPING={"cdn.mywebsite.com": "/static", "images.mywebsite.com": "/media/images"}

# Specialized backends for assets
DOMAIN_TARGETS={"cdn.mywebsite.com": "static-backend.mywebsite.com", "images.mywebsite.com": "images-backend.mywebsite.com"}

# Asset domains
ADDITIONAL_DOMAINS=cdn.mywebsite.com,images.mywebsite.com

# High-performance caching for assets
CACHE_DEFAULT_TTL=3600
CACHE_MAX_TTL=86400
PATH_REWRITE_CACHE_SIZE=100000
```

**Step 2: Test Asset Routing**

```bash
# Test CDN routing
curl -H "Host: cdn.mywebsite.com" http://localhost:3000/css/styles.css

# Test image routing
curl -H "Host: images.mywebsite.com" http://localhost:3000/logo.png

# Check backend targets
curl http://localhost:3000/api/domains/cdn.mywebsite.com | jq '.target'
```

**Step 3: Optimize Cache Performance**

```bash
# Monitor cache hit rates for assets
curl http://localhost:3000/api/cache/stats | jq '.domainStats["cdn.mywebsite.com"].hitRate'

# Purge specific domain cache if needed
curl -X DELETE "http://localhost:3000/api/cache?domain=cdn.mywebsite.com"
```

### Common Configuration Patterns

#### Pattern 1: Subdomain to Path Prefix

```bash
# blog.example.com → /blog
# api.example.com → /api
# docs.example.com → /docs
DOMAIN_PATH_MAPPING={"blog.example.com": "/blog", "api.example.com": "/api", "docs.example.com": "/docs"}
```

#### Pattern 2: Brand Domains to Tenant Paths

```bash
# brand1.com → /tenants/brand1
# brand2.com → /tenants/brand2
DOMAIN_PATH_MAPPING={"brand1.com": "/tenants/brand1", "brand2.com": "/tenants/brand2"}
```

#### Pattern 3: Geographic Routing

```bash
# us.example.com → /regions/us
# eu.example.com → /regions/eu
# asia.example.com → /regions/asia
DOMAIN_PATH_MAPPING={"us.example.com": "/regions/us", "eu.example.com": "/regions/eu", "asia.example.com": "/regions/asia"}
```

#### Pattern 4: Environment-Based Routing

```bash
# dev.example.com → /environments/dev
# staging.example.com → /environments/staging
# Different backends for different environments
DOMAIN_PATH_MAPPING={"dev.example.com": "/environments/dev", "staging.example.com": "/environments/staging"}
DOMAIN_TARGETS={"dev.example.com": "dev-backend.example.com", "staging.example.com": "staging-backend.example.com"}
```

### Validation and Testing Checklist

Before going live with your domain-to-path prefix mapping configuration:

1. **Configuration Validation**

   ```bash
   # Validate JSON syntax
   echo $DOMAIN_PATH_MAPPING | jq .
   echo $PATH_REWRITE_RULES | jq .
   echo $DOMAIN_TARGETS | jq .
   ```

2. **Domain Resolution Test**

   ```bash
   # Test each configured domain
   for domain in ddt.com blog.example.com api.example.com; do
     curl -X POST http://localhost:3000/api/domains/test-transformation \
       -H "Content-Type: application/json" \
       -d "{\"domain\": \"$domain\", \"path\": \"/test\"}"
   done
   ```

3. **Performance Baseline**

   ```bash
   # Run performance benchmark
   node benchmark.js
   
   # Check initial metrics
   curl http://localhost:3000/metrics | grep path_rewrite
   ```

4. **Health Check Verification**

   ```bash
   # Verify all systems are healthy
   curl http://localhost:3000/health | jq '.pathRewriting'
   ```

5. **Cache Functionality Test**

   ```bash
   # Test cache operations
   curl http://localhost:3000/api/cache/stats
   
   # Test domain-specific cache purging
   curl -X DELETE "http://localhost:3000/api/cache?domain=ddt.com"
   ```

## Operation

### Starting the Service

To start the CDN:

```bash
npm start
```

For development mode with auto-reload:

```bash
npm run dev
```

### Stopping the Service

If running directly:

- Press `Ctrl+C` to stop the process

If running with PM2:

```bash
pm2 stop advanced-cdn
```

### Restarting the Service

If running with PM2:

```bash
pm2 restart advanced-cdn
```

### Log Files

Log files are stored in the `./logs` directory (configurable):

- `app.log` - General application logs
- `error.log` - Error-level logs only
- `access.log` - HTTP request logs
- `exceptions.log` - Uncaught exceptions

## Administration

### Domain-to-Path Prefix Management

The CDN provides comprehensive APIs for managing domain-to-path prefix mappings. These APIs are accessible from localhost by default.

#### View Domain Configuration

Get all configured domains and their mappings:

```bash
curl http://localhost:3000/api/domains
```

Example response:

```json
{
  "pathRewritingEnabled": true,
  "totalDomains": 3,
  "originDomain": "allabout.network",
  "targetDomain": "main--allaboutv2--ddttom.hlx.live",
  "domains": {
    "ddt.com": {
      "type": "mapped",
      "pathPrefix": "/ddt",
      "target": "main--allaboutv2--ddttom.hlx.live",
      "status": "active"
    },
    "blog.allabout.network": {
      "type": "mapped",
      "pathPrefix": "/blog",
      "target": "main--allaboutv2--ddttom.hlx.live",
      "status": "active"
    }
  }
}
```

#### View Specific Domain Details

Get detailed information about a specific domain:

```bash
curl http://localhost:3000/api/domains/ddt.com
```

Example response:

```json
{
  "domain": "ddt.com",
  "pathPrefix": "/ddt",
  "target": "main--allaboutv2--ddttom.hlx.live",
  "statistics": {
    "totalRequests": 1250,
    "transformationsPerformed": 1250,
    "cacheHits": 1087,
    "averageResponseTime": 45
  },
  "healthCheck": {
    "status": "healthy",
    "lastCheck": "2024-01-15T10:29:45.000Z"
  }
}
```

#### Test Path Transformations

Test how a specific domain and path would be transformed:

```bash
curl -X POST http://localhost:3000/api/domains/test-transformation \
  -H "Content-Type: application/json" \
  -d '{"domain": "ddt.com", "path": "/about"}'
```

Example response:

```json
{
  "success": true,
  "transformation": {
    "originalPath": "/about",
    "transformedPath": "/ddt/about",
    "target": "main--allaboutv2--ddttom.hlx.live",
    "fullUrl": "https://main--allaboutv2--ddttom.hlx.live/ddt/about"
  }
}
```

#### Reload Domain Configuration

Reload domain configuration without restarting the service:

```bash
curl -X POST http://localhost:3000/api/domains/reload
```

Example response:

```json
{
  "success": true,
  "message": "Domain configuration reloaded successfully",
  "changes": {
    "domainsAdded": ["new-domain.com"],
    "domainsRemoved": [],
    "domainsModified": ["ddt.com"]
  }
}
```

### Cache Management

The CDN provides enhanced cache management with domain-aware capabilities.

#### Purge Cache

Purge the entire cache:

```bash
curl -X DELETE http://localhost:3000/api/cache
```

Purge by pattern:

```bash
curl -X DELETE "http://localhost:3000/api/cache?pattern=*.jpg"
```

Purge by domain:

```bash
curl -X DELETE "http://localhost:3000/api/cache?domain=ddt.com"
```

Purge by domain and pattern:

```bash
curl -X DELETE "http://localhost:3000/api/cache?domain=ddt.com&pattern=/images/*"
```

#### Cache Statistics

Get comprehensive cache statistics including domain-specific data:

```bash
curl http://localhost:3000/api/cache/stats
```

Example response:

```json
{
  "enabled": true,
  "totalItems": 450,
  "hitRate": 0.87,
  "domainStats": {
    "ddt.com": {
      "items": 180,
      "hits": 1087,
      "misses": 163,
      "hitRate": 0.87,
      "prefix": "/ddt"
    },
    "blog.allabout.network": {
      "items": 95,
      "hits": 297,
      "misses": 43,
      "hitRate": 0.87,
      "prefix": "/blog"
    }
  }
}
```

### Performance Monitoring

#### Real-time Metrics

Get real-time performance metrics:

```bash
curl http://localhost:3000/metrics | grep path_rewrite
```

Key metrics to monitor:

- `path_rewrite_transformations_total`: Total transformations performed
- `path_rewrite_duration_seconds`: Transformation performance
- `path_rewrite_cache_hits_total`: Cache performance
- `path_rewrite_errors_total`: Error rates

#### Performance Benchmarking

Run performance benchmarks:

```bash
# Run comprehensive benchmark suite
node benchmark.js

# Run specific benchmark
node -e "
const { PerformanceBenchmark } = require('./benchmark');
const benchmark = new PerformanceBenchmark();
benchmark.initializePathRewriter();
benchmark.runBenchmark('simple_prefix', 10000);
"
```

### Health Monitoring

#### Health Check with Domain Status

Get detailed health information including domain routing status:

```bash
curl "http://localhost:3000/health?detailed=true"
```

Example response:

```json
{
  "status": "healthy",
  "pathRewriting": {
    "enabled": true,
    "domainsConfigured": 3,
    "rulesCompiled": true,
    "cacheHitRate": 0.95
  },
  "domainRouting": {
    "ddt.com": {
      "status": "healthy",
      "prefix": "/ddt",
      "responseTime": 45
    },
    "blog.allabout.network": {
      "status": "healthy",
      "prefix": "/blog",
      "responseTime": 32
    }
  }
}
```

#### Circuit Breaker Status

Monitor circuit breaker status for domain protection:

```bash
curl http://localhost:3000/health | jq '.pathRewriting.circuitBreakers'
```

### Configuration Management

#### Dynamic Configuration Updates

Update domain mappings without service restart:

1. **Update Environment Variables**:

   ```bash
   # Add new domain mapping
   export DOMAIN_PATH_MAPPING='{"ddt.com": "/ddt", "new-domain.com": "/new"}'
   export ADDITIONAL_DOMAINS="ddt.com,new-domain.com"
   ```

2. **Reload Configuration**:

   ```bash
   curl -X POST http://localhost:3000/api/domains/reload
   ```

3. **Verify Changes**:

   ```bash
   curl http://localhost:3000/api/domains | jq '.domains | keys'
   ```

#### Configuration Validation

Validate configuration before applying:

```bash
# Test JSON syntax
echo $DOMAIN_PATH_MAPPING | jq .

# Test domain transformation
curl -X POST http://localhost:3000/api/domains/test-transformation \
  -H "Content-Type: application/json" \
  -d '{"domain": "new-domain.com", "path": "/test"}'
```

### Troubleshooting Commands

#### Quick Diagnostics

```bash
# Check if path rewriting is enabled
curl -s http://localhost:3000/api/domains | jq '.pathRewritingEnabled'

# Check for configuration errors
grep "path-rewriter.*error" logs/error.log | tail -5

# Check transformation performance
grep "Slow path transformation" logs/app.log | tail -5

# Monitor real-time transformations
tail -f logs/app.log | grep "path-rewriter"
```

#### Performance Diagnostics

```bash
# Check cache performance by domain
curl -s http://localhost:3000/api/cache/stats | jq '.domainStats'

# Check error rates
curl -s http://localhost:3000/api/domains | jq '.domains[].statistics.errorRate'

# Check circuit breaker status
curl -s http://localhost:3000/health | jq '.pathRewriting.circuitBreakers'
```

### Domains Management

#### Adding New Domains

To add new domains with path prefix mapping:

1. **Update Configuration**:

   ```bash
   # Add to domain mapping
   DOMAIN_PATH_MAPPING='{"ddt.com": "/ddt", "new-domain.com": "/new"}'
   
   # Add to additional domains
   ADDITIONAL_DOMAINS=ddt.com,new-domain.com
   ```

2. **Reload Configuration**:

   ```bash
   curl -X POST http://localhost:3000/api/domains/reload
   ```

3. **Test New Domain**:

   ```bash
   curl -X POST http://localhost:3000/api/domains/test-transformation \
     -H "Content-Type: application/json" \
     -d '{"domain": "new-domain.com", "path": "/test"}'
   ```

#### Removing Domains

To remove domains:

1. **Update Configuration**:

   ```bash
   # Remove from domain mapping
   DOMAIN_PATH_MAPPING='{"ddt.com": "/ddt"}'
   
   # Remove from additional domains
   ADDITIONAL_DOMAINS=ddt.com
   ```

2. **Clear Domain Cache**:

   ```bash
   curl -X DELETE "http://localhost:3000/api/cache?domain=removed-domain.com"
   ```

3. **Reload Configuration**:

   ```bash
   curl -X POST http://localhost:3000/api/domains/reload
   ```

## Monitoring

### Health Check Endpoint

The CDN provides a health check endpoint at `/health`:

```bash
curl http://localhost:3000/health
```

Example response:

```json
{
  "status": "ok",
  "name": "advanced-nodejs-cdn",
  "version": "1.0.0",
  "timestamp": "2023-11-08T12:34:56.789Z",
  "uptime": 3600
}
```

For detailed health information:

```bash
curl "http://localhost:3000/health?detailed=true"
```

### Metrics Endpoint

The CDN provides Prometheus-compatible metrics at `/metrics`:

```bash
curl http://localhost:3000/metrics
```

This endpoint can be integrated with Prometheus and Grafana for advanced monitoring.

### Key Metrics to Monitor

1. Cache hit rate
2. Response time
3. CPU and memory usage
4. Error rate
5. Request rate

## Troubleshooting

### Common Issues

#### Service Won't Start

**Symptoms**: The service fails to start, with an error message about port binding.

**Solution**:

- Check if another process is using the configured port
- Verify you have permission to bind to the port (ports < 1024 require root)
- Check the `PORT` setting in your `.env` file

#### High Memory Usage

**Symptoms**: The service consumes excessive memory.

**Solution**:

- Reduce `CACHE_MAX_ITEMS` to limit cache size
- Check for memory leaks using Node.js profiling tools
- Increase server memory if caching requirements demand it

#### Slow Performance

**Symptoms**: High latency in responses.

**Solution**:

- Enable clustering mode with `ENABLE_CLUSTER=true`
- Optimize cache settings
- Check origin server performance
- Verify network latency between CDN and origin

#### SSL Certificate Issues

**Symptoms**: HTTPS connections fail with certificate errors.

**Solution**:

- Verify certificate and key paths are correct
- Ensure certificate is valid and not expired
- Check certificate matches the domain name

### Debug Mode

To enable debug logging:

1. Set `LOG_LEVEL=debug` in your `.env` file
2. Restart the service

This will provide much more detailed information about request processing, caching decisions, and errors.

## Advanced Usage

### Custom Cache Keys

By default, the CDN generates cache keys based on the request URL and vary headers. For more advanced cache key generation, you can modify the `cache-manager.js` file:

```javascript
generateKey(req) {
  // Custom cache key generation logic
  let key = `${req.method}:${req.headers.host}:${req.originalUrl}`;
  
  // Add custom elements to the key
  if (req.headers['user-agent'] && req.headers['user-agent'].includes('Mobile')) {
    key += ':mobile';
  }
  
  return key;
}
```

### HTTPS Configuration

Setting up HTTPS for your CDN is essential for secure content delivery. This section provides detailed instructions for configuring HTTPS.

#### Certificate Types

You have several options for SSL certificates:

1. **Let's Encrypt** - Free, automated certificates (recommended for production)
2. **Commercial CA** - Purchased certificates from trusted authorities like DigiCert, Comodo, etc.
3. **Self-signed** - For development and testing environments only

#### Obtaining Let's Encrypt Certificates

1. Install Certbot:

   ```bash
   # On Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install certbot
   
   # On CentOS/RHEL
   sudo yum install certbot
   ```

2. Generate certificates:

   ```bash
   sudo certbot certonly --standalone -d allabout.network -d www.allabout.network
   ```

3. Certificate files will be saved to `/etc/letsencrypt/live/allabout.network/`

#### Setting Up HTTPS in the CDN

1. Configure the SSL settings in `.env`:

   ```bash
   ENABLE_SSL=true
   SSL_CERT_PATH=/etc/letsencrypt/live/allabout.network/fullchain.pem
   SSL_KEY_PATH=/etc/letsencrypt/live/allabout.network/privkey.pem
   HTTP_TO_HTTPS_REDIRECT=true
   ```

2. Ensure the Node.js process has read access to the certificate files:

   ```bash
   # If running as non-root user (recommended)
   sudo setfacl -R -m u:nodeuser:rX /etc/letsencrypt/live/
   sudo setfacl -R -m u:nodeuser:rX /etc/letsencrypt/archive/
   ```

3. Restart the service to apply changes:

   ```bash
   npm restart
   # or if using PM2
   pm2 restart advanced-cdn
   ```

#### Certificate Renewal

Let's Encrypt certificates expire after 90 days. Set up automatic renewal:

1. Create a cron job:

   ```bash
   sudo crontab -e
   ```

2. Add the following line to run renewal twice daily:

   ```bash
   0 0,12 * * * certbot renew --quiet --post-hook "pm2 restart advanced-cdn"
   ```

#### Using Self-Signed Certificates (Development Only)

For testing, you can generate self-signed certificates:

1. Generate certificate and key:

   ```bash
   mkdir -p ssl
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem
   ```

2. Configure the SSL settings in `.env`:

   ```bash
   ENABLE_SSL=true
   SSL_CERT_PATH=./ssl/cert.pem
   SSL_KEY_PATH=./ssl/key.pem
   HTTP_TO_HTTPS_REDIRECT=true
   ```

3. Restart the service to apply changes

#### Troubleshooting HTTPS

1. **Certificate not found errors**:
   - Verify paths in `.env` are correct
   - Check file permissions
   - Ensure certificate files exist and are valid

2. **Certificate validation failures**:
   - Verify the certificate chain is complete (fullchain.pem)
   - Check the certificate is for the correct domain
   - Ensure the certificate hasn't expired

3. **HTTPS connection refused**:
   - Check the port isn't blocked by a firewall
   - Verify the server is listening on the HTTPS port
   - Check for errors in the application logs

4. **Mixed content warnings**:
   - Make sure all resources (images, scripts, etc.) are also served via HTTPS
   - Use relative URLs in your content
   - Add appropriate Content-Security-Policy headers

### Custom Error Pages

To serve custom error pages:

1. Create a folder named `error_pages` in your project root
2. Add HTML files named with their respective status codes (e.g., `404.html`, `500.html`)
3. Modify the `proxy-manager.js` to serve these pages when errors occur

### Content Transformation

For advanced content transformation (similar to commercial CDN VCL):

1. Modify the `onProxyRes` handler in `proxy-manager.js`
2. Add content transformation logic based on content type, URL patterns, etc.

### Custom Headers

To add custom response headers:

1. Update the `.env` file with custom header configuration
2. Modify the `setupResponseHeaders` method in `proxy-manager.js`

## FAQ

### Q: How does this compare to commercial CDN services?

**A**: This is a self-hosted version that implements core CDN functionality (proxying, caching, purging), but lacks advanced features like VCL, edge compute, and global distribution found in commercial services.

### Q: Can this handle high traffic loads?

**A**: Yes, with proper configuration. Enable clustering mode and ensure your server has adequate resources. For very high traffic, consider load balancing across multiple instances.

### Q: How do I implement custom caching rules?

**A**: Modify the `shouldCache` method in `cache-manager.js` with your custom logic.

### Q: Does this support WebSocket proxying?

**A**: Not in the current version. WebSocket support would require additional configuration in the proxy middleware.

### Q: Can I use this with a third-party CDN provider?

**A**: Yes, you can put this behind a CDN provider for additional caching and distribution.

### Q: How can I secure the cache purge API?

**A**: By default, it's restricted to localhost. For remote access, implement authentication by modifying the API route in `app.js`.

### Q: Is this suitable for production use?

**A**: Yes, with proper monitoring, configuration, and server resources. Consider adding additional security measures for public-facing deployments.

### Q: How do I handle custom error responses?

**A**: Modify the error handling in `proxy-manager.js` to return custom error responses based on status codes.

### Q: How do I set up domain-to-path prefix mapping?

**A**: Enable path rewriting with `PATH_REWRITE_ENABLED=true` and configure domain mappings using `DOMAIN_PATH_MAPPING='{"ddt.com": "/ddt"}'`. See the Step-by-Step Setup Guide for detailed instructions.

### Q: Can I use regex patterns for complex path transformations?

**A**: Yes, use the `PATH_REWRITE_RULES` environment variable with regex patterns. For example: `PATH_REWRITE_RULES='{"api.example.com": {"^/v1/(.*)": "/api/v1/$1"}}'`.

### Q: How do I route different domains to different backend servers?

**A**: Use the `DOMAIN_TARGETS` configuration to specify different backends for different domains. For example: `DOMAIN_TARGETS='{"api.example.com": "api-backend.com"}'`.

### Q: What happens if a domain doesn't have a configured mapping?

**A**: The system uses fallback behavior. Enable `PATH_REWRITE_FALLBACK_ENABLED=true` and set `PATH_REWRITE_FALLBACK_PREFIX` to define the default behavior for unmapped domains.

### Q: How can I monitor the performance of path transformations?

**A**: Use the `/metrics` endpoint to get detailed performance metrics, or run the benchmark script with `node benchmark.js`. You can also check `/health` for real-time status.

### Q: Can I update domain mappings without restarting the service?

**A**: Yes, update your environment variables and call `curl -X POST http://localhost:3000/api/domains/reload` to reload the configuration dynamically.

### Q: How do I troubleshoot domain routing issues?

**A**: Use the test transformation endpoint: `curl -X POST http://localhost:3000/api/domains/test-transformation` with your domain and path. Also check the troubleshooting guide for common issues.

### Q: What is the circuit breaker and when does it activate?

**A**: The circuit breaker protects against failing domains by temporarily blocking requests when error rates exceed the threshold (default 5%). It automatically recovers when the domain becomes healthy again.

### Q: How do I optimize cache performance for domain-specific content?

**A**: Enable domain-aware caching with `CACHE_DOMAIN_AWARE=true` and `CACHE_PATH_PREFIX_AWARE=true`. Monitor cache hit rates per domain using `/api/cache/stats`.

### Q: Can I use wildcards in domain mappings?

**A**: Currently, exact domain matching is supported. For subdomain patterns, configure each subdomain explicitly or use regex rules for complex matching scenarios.

### Q: How do I handle SSL certificates for multiple domains?

**A**: You'll need a wildcard certificate (*.example.com) or a multi-domain certificate that covers all your configured domains. Update the SSL configuration accordingly.

## File Resolution Configuration

The CDN includes a sophisticated file resolution system that automatically searches for files with different extensions when extensionless requests are made. This enables clean URLs while supporting multiple content formats.

### File Resolution Overview

The file resolution system works by:

1. **Intercepting extensionless requests** (e.g., `/getting-started`)
2. **Trying multiple extensions** in priority order (e.g., `.html`, `.md`, `.json`)
3. **Using HTTP HEAD requests** to check file existence on the backend
4. **Transforming content** when appropriate (Markdown to HTML, JSON formatting)
5. **Caching results** to optimize performance

### Basic File Resolution Configuration

#### Core File Resolution Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FILE_RESOLUTION_ENABLED` | Enable file resolution system | `false` |
| `FILE_RESOLUTION_EXTENSIONS` | Comma-separated list of extensions to try | `html,md,json,csv,txt` |
| `FILE_RESOLUTION_TIMEOUT` | HTTP request timeout in milliseconds | `5000` |
| `FILE_RESOLUTION_MAX_REDIRECTS` | Maximum redirects to follow | `3` |
| `FILE_RESOLUTION_USER_AGENT` | User agent for backend requests | `AdvancedCDN-FileResolver/1.0` |

#### Content Transformation Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FILE_RESOLUTION_TRANSFORM_ENABLED` | Enable content transformation | `true` |
| `FILE_RESOLUTION_TRANSFORM_MARKDOWN` | Transform Markdown to HTML | `true` |
| `FILE_RESOLUTION_TRANSFORM_JSON` | Format JSON responses | `true` |
| `FILE_RESOLUTION_TRANSFORM_CSV` | Convert CSV to HTML tables | `true` |

#### Cache Configuration Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FILE_RESOLUTION_CACHE_ENABLED` | Enable file resolution caching | `true` |
| `FILE_RESOLUTION_CACHE_MAX_SIZE` | Maximum cache entries | `1000` |
| `FILE_RESOLUTION_CACHE_POSITIVE_TTL` | Cache TTL for found files (seconds) | `300` |
| `FILE_RESOLUTION_CACHE_NEGATIVE_TTL` | Cache TTL for not found files (seconds) | `60` |

#### Circuit Breaker Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FILE_RESOLUTION_CIRCUIT_BREAKER_ENABLED` | Enable circuit breaker protection | `true` |
| `FILE_RESOLUTION_CIRCUIT_BREAKER_THRESHOLD` | Failure threshold to open circuit | `5` |
| `FILE_RESOLUTION_CIRCUIT_BREAKER_TIMEOUT` | Circuit open timeout (milliseconds) | `30000` |
| `FILE_RESOLUTION_CIRCUIT_BREAKER_RESET_TIMEOUT` | Time before retry (milliseconds) | `60000` |

### Step-by-Step File Resolution Setup

#### Setup 1: Basic Documentation Site with Markdown Support

**Goal**: Enable file resolution for a documentation site that serves Markdown files as HTML.

**Step 1: Configure Basic File Resolution**

Create or update your `.env` file:

```bash
# Enable file resolution
FILE_RESOLUTION_ENABLED=true

# Configure extensions (prioritize markdown and HTML)
FILE_RESOLUTION_EXTENSIONS=md,html,txt

# Enable content transformation
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_MARKDOWN=true

# Configure caching for performance
FILE_RESOLUTION_CACHE_ENABLED=true
FILE_RESOLUTION_CACHE_POSITIVE_TTL=600
FILE_RESOLUTION_CACHE_NEGATIVE_TTL=120

# Configure timeouts
FILE_RESOLUTION_TIMEOUT=5000
```

**Step 2: Configure Domain-Specific Settings**

```bash
# Configure per-domain file resolution
FILE_RESOLUTION_DOMAIN_CONFIG='{
  "docs.example.com": {
    "enabled": true,
    "extensions": ["md", "html", "txt"],
    "transformEnabled": true,
    "transformMarkdown": true,
    "markdownOptions": {
      "breaks": true,
      "linkify": true,
      "typographer": true
    }
  }
}'
```

**Step 3: Test File Resolution**

```bash
# Start the CDN
npm start

# Test file resolution status
curl http://localhost:3000/api/file-resolution/status

# Test specific file resolution
curl -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{"domain": "docs.example.com", "path": "/getting-started"}'
```

**Step 4: Test Live Requests**

```bash
# Test extensionless request
curl -H "Host: docs.example.com" http://localhost:3000/getting-started

# Check file resolution logs
grep "file-resolver" logs/app.log | tail -5
```

#### Setup 2: API Documentation with JSON Formatting

**Goal**: Set up file resolution for an API that serves formatted JSON responses.

**Step 1: Configure API-Focused File Resolution**

```bash
# Enable file resolution for API
FILE_RESOLUTION_ENABLED=true

# Prioritize JSON and XML for API responses
FILE_RESOLUTION_EXTENSIONS=json,xml,txt

# Enable JSON transformation
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_JSON=true

# Configure JSON formatting options
FILE_RESOLUTION_TRANSFORMER_CONFIG='{
  "json": {
    "enabled": true,
    "options": {
      "pretty": true,
      "indent": 2,
      "sortKeys": false
    }
  }
}'
```

**Step 2: Configure API Domain**

```bash
# API-specific configuration
FILE_RESOLUTION_DOMAIN_CONFIG='{
  "api.example.com": {
    "enabled": true,
    "extensions": ["json", "xml"],
    "transformEnabled": true,
    "transformJson": true,
    "timeout": 3000,
    "cacheEnabled": true
  }
}'
```

**Step 3: Test API File Resolution**

```bash
# Test API endpoint resolution
curl -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{"domain": "api.example.com", "path": "/users/123"}'

# Test live API request
curl -H "Host: api.example.com" http://localhost:3000/users/123
```

#### Setup 3: Data Portal with CSV Table Conversion

**Goal**: Convert CSV files to HTML tables for a data visualization portal.

**Step 1: Configure CSV Processing**

```bash
# Enable file resolution with CSV support
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_EXTENSIONS=csv,json,html

# Enable CSV transformation
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_CSV=true

# Configure CSV transformation options
FILE_RESOLUTION_TRANSFORMER_CONFIG='{
  "csv": {
    "enabled": true,
    "options": {
      "delimiter": ",",
      "headers": true,
      "tableClass": "data-table table-striped",
      "responsive": true,
      "pagination": false
    }
  }
}'
```

**Step 2: Configure Data Domain**

```bash
# Data portal configuration
FILE_RESOLUTION_DOMAIN_CONFIG='{
  "data.example.com": {
    "enabled": true,
    "extensions": ["csv", "json", "html"],
    "transformEnabled": true,
    "transformCsv": true,
    "csvOptions": {
      "delimiter": ",",
      "headers": true,
      "tableClass": "data-table",
      "responsive": true
    }
  }
}'
```

**Step 3: Test CSV Transformation**

```bash
# Test CSV content transformation
curl -X POST http://localhost:3000/api/file-resolution/transform \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Name,Age,City\nJohn,30,NYC\nJane,25,LA",
    "contentType": "text/csv",
    "transformer": "csv"
  }'

# Test live CSV request
curl -H "Host: data.example.com" http://localhost:3000/sales-report
```

#### Setup 4: Multi-Format Content Site

**Goal**: Support multiple content formats with intelligent fallbacks.

**Step 1: Configure Multi-Format Support**

```bash
# Enable comprehensive file resolution
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_EXTENSIONS=html,md,json,csv,txt,xml

# Enable all transformers
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_MARKDOWN=true
FILE_RESOLUTION_TRANSFORM_JSON=true
FILE_RESOLUTION_TRANSFORM_CSV=true

# Optimize for performance
FILE_RESOLUTION_CACHE_ENABLED=true
FILE_RESOLUTION_CACHE_MAX_SIZE=2000
FILE_RESOLUTION_CONCURRENT_REQUESTS=10
```

**Step 2: Configure Content Domain**

```bash
# Multi-format content configuration
FILE_RESOLUTION_DOMAIN_CONFIG='{
  "content.example.com": {
    "enabled": true,
    "extensions": ["html", "md", "json", "csv", "txt"],
    "transformEnabled": true,
    "transformMarkdown": true,
    "transformJson": true,
    "transformCsv": true,
    "cacheEnabled": true,
    "timeout": 5000
  }
}'
```

**Step 3: Test Multi-Format Resolution**

```bash
# Test different content types
curl -H "Host: content.example.com" http://localhost:3000/article
curl -H "Host: content.example.com" http://localhost:3000/data-report
curl -H "Host: content.example.com" http://localhost:3000/api-spec

# Check cache performance
curl http://localhost:3000/api/file-resolution/cache | jq '.statistics'
```

### Advanced File Resolution Configuration

#### Performance Optimization

```bash
# High-performance configuration
FILE_RESOLUTION_CACHE_MAX_SIZE=5000
FILE_RESOLUTION_CONCURRENT_REQUESTS=20
FILE_RESOLUTION_MAX_SOCKETS=100
FILE_RESOLUTION_KEEP_ALIVE=true
FILE_RESOLUTION_KEEP_ALIVE_TIMEOUT=30000

# Request optimization
FILE_RESOLUTION_RETRY_ENABLED=true
FILE_RESOLUTION_RETRY_ATTEMPTS=2
FILE_RESOLUTION_RETRY_DELAY=1000
```

#### Security Configuration

```bash
# Security settings
FILE_RESOLUTION_MAX_FILE_SIZE=10485760
FILE_RESOLUTION_ALLOWED_CONTENT_TYPES=text/html,text/markdown,application/json,text/csv,text/plain
FILE_RESOLUTION_BLOCKED_EXTENSIONS=exe,bat,sh,php,asp
FILE_RESOLUTION_VALIDATE_CONTENT_TYPE=true

# Rate limiting
FILE_RESOLUTION_RATE_LIMIT_ENABLED=true
FILE_RESOLUTION_RATE_LIMIT_WINDOW=60000
FILE_RESOLUTION_RATE_LIMIT_MAX=100
```

#### Monitoring and Logging

```bash
# Enable comprehensive monitoring
FILE_RESOLUTION_METRICS_ENABLED=true
FILE_RESOLUTION_PERFORMANCE_MONITORING=true
FILE_RESOLUTION_SLOW_THRESHOLD=1000

# Detailed logging
FILE_RESOLUTION_LOG_ENABLED=true
FILE_RESOLUTION_LOG_REQUESTS=false
FILE_RESOLUTION_LOG_TRANSFORMATIONS=true
FILE_RESOLUTION_LOG_CACHE_OPERATIONS=false
FILE_RESOLUTION_LOG_CIRCUIT_BREAKER=true
```

### File Resolution Management

#### View File Resolution Status

Get comprehensive file resolution system status:

```bash
curl http://localhost:3000/api/file-resolution/status
```

Example response:

```json
{
  "enabled": true,
  "globalConfig": {
    "extensions": ["html", "md", "json", "csv", "txt"],
    "timeout": 5000,
    "transformEnabled": true,
    "cacheEnabled": true
  },
  "cache": {
    "enabled": true,
    "maxSize": 1000,
    "currentSize": 245,
    "hitRate": 0.87
  },
  "transformers": {
    "markdown": {"enabled": true, "processed": 156},
    "json": {"enabled": true, "processed": 89},
    "csv": {"enabled": true, "processed": 23}
  }
}
```

#### View File Resolution Statistics

Get detailed performance statistics:

```bash
curl http://localhost:3000/api/file-resolution/stats
```

Example response:

```json
{
  "totalRequests": 1250,
  "successfulResolutions": 1087,
  "failedResolutions": 163,
  "successRate": 0.87,
  "averageResolutionTime": 45.2,
  "extensionStats": {
    "html": {"requests": 456, "found": 398, "successRate": 0.87},
    "md": {"requests": 234, "found": 201, "successRate": 0.86, "transformed": 201}
  },
  "domainStats": {
    "docs.example.com": {"requests": 567, "resolutions": 489, "successRate": 0.86}
  }
}
```

#### Test File Resolution

Test file resolution for specific paths:

```bash
curl -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{"domain": "docs.example.com", "path": "/getting-started"}'
```

#### Test Content Transformation

Test content transformation without file resolution:

```bash
curl -X POST http://localhost:3000/api/file-resolution/transform \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Hello World\n\nThis is **markdown**.",
    "contentType": "text/markdown",
    "transformer": "markdown"
  }'
```

#### Manage File Resolution Cache

View cache information:

```bash
curl http://localhost:3000/api/file-resolution/cache
```

Clear cache:

```bash
# Clear all cache
curl -X DELETE http://localhost:3000/api/file-resolution/cache

# Clear cache for specific domain
curl -X DELETE "http://localhost:3000/api/file-resolution/cache?domain=docs.example.com"

# Clear cache by extension
curl -X DELETE "http://localhost:3000/api/file-resolution/cache?extension=md"
```

#### Monitor Circuit Breakers

Check circuit breaker status:

```bash
curl http://localhost:3000/api/file-resolution/circuit-breaker
```

Reset circuit breaker for a domain:

```bash
curl -X POST http://localhost:3000/api/file-resolution/circuit-breaker/docs.example.com/reset
```

### File Resolution Validation Checklist

Before deploying file resolution in production:

1. **Configuration Validation**

   ```bash
   # Validate JSON configuration
   echo $FILE_RESOLUTION_DOMAIN_CONFIG | jq .
   echo $FILE_RESOLUTION_TRANSFORMER_CONFIG | jq .
   ```

2. **Extension Priority Testing**

   ```bash
   # Test extension priority order
   for ext in html md json txt; do
     curl -X POST http://localhost:3000/api/file-resolution/test \
       -H "Content-Type: application/json" \
       -d "{\"domain\": \"docs.example.com\", \"path\": \"/test.$ext\"}"
   done
   ```

3. **Performance Baseline**

   ```bash
   # Test file resolution performance
   time curl -H "Host: docs.example.com" http://localhost:3000/getting-started
   
   # Check cache hit rates
   curl http://localhost:3000/api/file-resolution/stats | jq '.cacheStats.hitRate'
   ```

4. **Transformation Testing**

   ```bash
   # Test each transformer
   curl -X POST http://localhost:3000/api/file-resolution/transform \
     -H "Content-Type: application/json" \
     -d '{"content": "# Test", "contentType": "text/markdown", "transformer": "markdown"}'
   ```

5. **Circuit Breaker Testing**

   ```bash
   # Check circuit breaker configuration
   curl http://localhost:3000/api/file-resolution/circuit-breaker | jq '.globalConfig'
   ```

### Common File Resolution Patterns

#### Pattern 1: Documentation Site

```bash
# Clean URLs for documentation
# /getting-started → /getting-started.md (transformed to HTML)
# /api-reference → /api-reference.md (transformed to HTML)
FILE_RESOLUTION_EXTENSIONS=md,html,txt
FILE_RESOLUTION_TRANSFORM_MARKDOWN=true
```

#### Pattern 2: API Gateway

```bash
# JSON API responses with formatting
# /users/123 → /users/123.json (formatted)
# /health → /health.json (formatted)
FILE_RESOLUTION_EXTENSIONS=json,xml
FILE_RESOLUTION_TRANSFORM_JSON=true
```

#### Pattern 3: Data Portal

```bash
# CSV data converted to HTML tables
# /sales-report → /sales-report.csv (converted to table)
# /user-data → /user-data.csv (converted to table)
FILE_RESOLUTION_EXTENSIONS=csv,json,html
FILE_RESOLUTION_TRANSFORM_CSV=true
```

#### Pattern 4: Mixed Content Site

```bash
# Support multiple content types
# /article → /article.md or /article.html
# /data → /data.csv or /data.json
FILE_RESOLUTION_EXTENSIONS=html,md,json,csv,txt
FILE_RESOLUTION_TRANSFORM_ENABLED=true
```

### File Resolution FAQ

#### Q: How does file resolution work with domain-to-path prefix mapping?

**A**: File resolution works seamlessly with path rewriting. The system first applies domain-to-path transformations, then performs file resolution on the transformed path.

#### Q: What happens if no file is found with any extension?

**A**: The request continues through the normal proxy flow. File resolution is non-blocking and falls back gracefully to standard proxying.

#### Q: Can I customize the HTML output for transformed content?

**A**: Yes, use the `FILE_RESOLUTION_TRANSFORMER_CONFIG` to customize transformation options, including HTML templates for Markdown and table styling for CSV.

#### Q: How does caching work with file resolution?

**A**: The system caches both positive (file found) and negative (file not found) results with separate TTL values to optimize performance and reduce backend requests.

#### Q: What is the circuit breaker and when does it activate?

**A**: The circuit breaker protects against failing domains by temporarily disabling file resolution when error rates exceed the threshold. It automatically recovers when the domain becomes healthy.

#### Q: Can I disable file resolution for specific domains?

**A**: Yes, set `"enabled": false` for specific domains in the `FILE_RESOLUTION_DOMAIN_CONFIG`, or omit the domain from the configuration entirely.

#### Q: How do I monitor file resolution performance?

**A**: Use the `/api/file-resolution/stats` endpoint for detailed statistics, `/metrics` for Prometheus metrics, and enable performance logging for detailed timing information.

#### Q: What's the performance impact of file resolution?

**A**: With caching enabled, file resolution typically adds 1-5ms overhead for cache hits and 50-200ms for cache misses (depending on backend response time). The system is optimized for high performance with connection pooling and concurrent request handling.

### Q: What's the performance impact of domain-to-path prefix mapping?

**A**: The system is optimized for high performance with rule caching and fast transformations. Simple prefix mappings typically add less than 1ms overhead, while complex regex patterns may add 2-5ms.
