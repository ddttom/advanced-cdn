# Node.js Advanced CDN Application

A production-quality Node.js application that provides advanced CDN functionality with caching, proxying, and edge computing capabilities.

## Features

- **High-Performance Proxy**: Efficiently forwards requests from configured domains to backend servers
- **Domain-to-Path Prefix Mapping**: Advanced routing system that maps different domains to specific backend path prefixes
- **Cascading File Resolution**: Automatically resolves extensionless requests by trying multiple file extensions in priority order
- **Content Transformation**: Built-in transformers for Markdown to HTML, JSON formatting, CSV to HTML tables, and more
- **Advanced Caching**: Intelligent in-memory caching with TTL management and cache control support
- **Complex Path Rewriting**: Regex-based transformations and sophisticated routing rules for domain-specific content delivery
- **Circuit Breaker Protection**: Automatic protection against failing domains with configurable thresholds and recovery
- **Clustering Support**: Multi-process operation for optimal performance on multi-core systems
- **Comprehensive Monitoring**: Health checks, metrics collection, and detailed logging with domain-aware tracking
- **Security Features**: Rate limiting, security headers, and domain validation
- **Production Readiness**: Graceful shutdown, error handling, and performance optimizations
- **Configurable**: All settings externalizable via environment variables
- **SSL Support**: HTTPS with optional HTTP-to-HTTPS redirection
- **URL Transformation**: Comprehensive URL masking that automatically detects and rewrites all URLs in HTML, JavaScript, and CSS content
- **Complete Domain Obscuration**: Routes all URLs through the proxy server to completely hide original server domains and paths
- **Browser Compatibility**: Robust gzip decompression with fallback mechanisms to prevent JavaScript syntax errors
- **HTTP Specification Compliance**: Proper Content-Length header management for all HTTP clients (Node.js, curl, browsers)
- **Module System Consistency**: CommonJS module system throughout for reliable operation and metrics collection

## Project Structure

The project is organized into logical directories for better maintainability and development experience:

bash
advanced-cdn/
├── src/                          # Core application source code
│   ├── app.js                   # Main Express application
│   ├── index.js                 # Application entry point
│   ├── cluster-manager.js       # Cluster management
│   ├── config.js                # Configuration management
│   ├── logger.js                # Logging utilities
│   ├── cache/                   # Cache-related modules
│   │   ├── cache-manager.js
│   │   └── file-resolution-cache.js
│   ├── proxy/                   # Proxy and networking
│   │   ├── proxy-manager.js
│   │   └── robust-http-client.js
│   ├── domain/                  # Domain and routing logic
│   │   ├── domain-manager.js
│   │   ├── path-rewriter.js
│   │   └── file-resolver.js
│   ├── transform/               # Content transformation
│   │   ├── url-transformer.js
│   │   └── transformers/
│   ├── middleware/              # Express middleware
│   │   └── rate-limiter.js
│   ├── monitoring/              # Metrics and health
│   │   ├── metrics-manager.js
│   │   └── health-manager.js
│   └── dashboard/               # Dashboard interface
│       ├── dashboard-integration.js
│       ├── api/
│       └── public/
├── tests/                       # All test files
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── scripts/                     # Utility and setup scripts
│   ├── setup-script.sh
├── config/                      # Configuration files
│   ├── env-example.txt
│   └── production-package-json.json
├── docs/                        # Documentation
└── [root config files]          # package.json, README.md, etc.

```bash

### Key Benefits of This Structure

- **Logical Grouping**: Related functionality is grouped together
- **Clear Separation**: Source code, tests, scripts, and config are clearly separated
- **Scalability**: Easy to add new modules within appropriate categories
- **Maintainability**: Easier to locate and modify specific functionality
- **Standard Structure**: Follows common Node.js project conventions

## Installation

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- Linux, macOS, or Windows operating system
- (Optional) SSL certificates for HTTPS

### Quick Start

1. **Clone the repository:**

   ```bash
   git clone https://github.com/ddttom/advanced-cdn.git
   cd advanced-cdn
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run the setup script:**

   ```bash
   chmod +x setup-script.sh
   ./setup-script.sh
   ```

4. **Start the CDN:**

   ```bash
   npm start
   ```

### Manual Installation

If you prefer manual setup:

```bash
npm install express http-proxy-middleware compression helmet winston express-rate-limit cors prom-client dotenv node-cache
```

## Key Application Files

- **app.js**: Main application entry point
- **cluster-manager.js**: Process management for multi-core operation
- **config.js**: Configuration management with environment variable support
- **logger.js**: Centralized logging with Winston
- **path-rewriter.js**: Domain-to-path prefix mapping and routing engine
- **file-resolver.js**: Cascading file resolution with HTTP HEAD requests and content transformation
- **transformers/index.js**: Content transformation plugins (Markdown, JSON, CSV, etc.)
- **file-resolution-cache.js**: Specialized caching for file resolution results
- **cache-manager.js**: Intelligent caching implementation with domain-aware keys
- **proxy-manager.js**: Request proxying and response handling with path transformation
- **url-transformer.js**: Comprehensive URL transformation for HTML, JavaScript, and CSS content
- **metrics-manager.js**: Prometheus-compatible metrics collection with path rewriting tracking
- **health-manager.js**: Application health monitoring with domain routing checks
- **rate-limiter.js**: Request rate limiting
- **domain-manager.js**: Domain validation and management with path rewriting integration

## Configuration

The application uses environment variables for configuration, with sensible defaults. 

### Quick Start

1. Copy the sample configuration:
   ```bash
   cp sample.env .env
   ```

2. Edit `.env` and customize for your deployment (at minimum, set `TARGET_DOMAIN`)

3. See [`sample.env`](sample.env) for a complete configuration template with inline documentation

### Configuration Options

Create a `.env` file in the project root with the following settings:

```bash
# Server configuration
PORT=8080
HOST=0.0.0.0
NODE_ENV=production
TRUST_PROXY=true
ENABLE_CLUSTER=true
CLUSTER_WORKERS=4

# SSL configuration
ENABLE_SSL=false
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
SSL_PASSPHRASE=
HTTP_TO_HTTPS_REDIRECT=true

# CDN configuration
USE_DYNAMIC_HOSTNAME=false
ORIGIN_DOMAIN=allabout.network
TARGET_DOMAIN=main--allaboutv2--ddttom.hlx.live
TARGET_HTTPS=true
CDN_NAME=advanced-nodejs-cdn
STRICT_DOMAIN_CHECK=true
ADDITIONAL_DOMAINS=

# Domain-to-path prefix mapping
PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING={"ddt.com": "/ddt", "blog.allabout.network": "/blog"}
PATH_REWRITE_RULES={"api.example.com": {"^/v1/(.*)": "/api/v1/$1"}}
DOMAIN_TARGETS={"api.example.com": "api-backend.example.com"}
PATH_REWRITE_FALLBACK_ENABLED=true
PATH_REWRITE_CACHE_ENABLED=true

# File resolution configuration
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_EXTENSIONS=html,md,json,csv,txt
FILE_RESOLUTION_TIMEOUT=5000
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_MARKDOWN=true
FILE_RESOLUTION_TRANSFORM_JSON=true
FILE_RESOLUTION_TRANSFORM_CSV=true
FILE_RESOLUTION_CACHE_ENABLED=true
FILE_RESOLUTION_CACHE_POSITIVE_TTL=300
FILE_RESOLUTION_CACHE_NEGATIVE_TTL=60
FILE_RESOLUTION_CIRCUIT_BREAKER_ENABLED=true

# URL transformation configuration
URL_TRANSFORM_ENABLED=true
URL_TRANSFORM_HTML=true
URL_TRANSFORM_JS=true
URL_TRANSFORM_CSS=true
URL_TRANSFORM_INLINE_STYLES=true
URL_TRANSFORM_DATA_ATTRS=true
URL_PRESERVE_FRAGMENTS=true
URL_PRESERVE_QUERY=true
URL_TRANSFORM_MAX_SIZE=52428800
URL_TRANSFORM_CACHE_SIZE=10000
URL_TRANSFORM_DEBUG=false

# Cache configuration
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=300
CACHE_MAX_TTL=3600
CACHE_CHECK_PERIOD=120
CACHE_MAX_ITEMS=1000
RESPECT_CACHE_CONTROL=true
CACHE_COOKIES=false

# Security configuration
SECURITY_HEADERS=true
CONTENT_SECURITY_POLICY=
ENABLE_CORS=false
CORS_ORIGINS=*
RATE_LIMIT_ENABLED=false
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# Logging configuration
LOG_LEVEL=info
LOG_FORMAT=combined
ACCESS_LOG_ENABLED=true
ERROR_LOG_ENABLED=true
LOG_DIR=./logs
LOG_TO_CONSOLE=true
LOG_TO_FILE=true

# Performance configuration
ENABLE_COMPRESSION=true
COMPRESSION_LEVEL=6
COMPRESSION_MIN_SIZE=1024
MAX_BODY_SIZE=1mb
REQUEST_TIMEOUT=30000

# Monitoring configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health
HEALTH_CHECK_DETAILED=false
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

## Running the Application

1. Install dependencies: `npm install`
2. Create a `.env` file with your configuration
3. Start the server: `node cluster-manager.js`

## Testing the Application

### Basic Health Check

```bash
# Test health endpoint
curl http://localhost:8080/health

# Expected response:
# {"status":"ok","name":"advanced-cdn-proxy","version":"1.0.0",...}
```

### Testing Dynamic Hostname Mode

When `USE_DYNAMIC_HOSTNAME=true`, the CDN accepts requests from any hostname:

```bash
# Test with custom hostname
curl -H "Host: test-domain.com" http://localhost:8080/health

# Test with another hostname
curl -H "Host: myapp.example.com" http://localhost:8080/health

# Test with any random hostname
curl -H "Host: random-site.org" http://localhost:8080/health

# All should return successful health check responses
```

### Testing Metrics and Cache

```bash
# View Prometheus metrics
curl http://localhost:8080/metrics

# View cache statistics (local access only)
curl http://localhost:8080/api/cache/stats

# Clear cache
curl -X DELETE http://localhost:8080/api/cache
```

### Testing with Different Ports

If you encounter port conflicts, explicitly set the PORT:

```bash
# Start with specific port
PORT=8080 npm start

# Test on that port
curl http://localhost:8080/health
```


## Production Deployment

For production deployment, consider the following:

1. Use a process manager like PM2 or systemd
2. Set up Nginx or Apache as a reverse proxy (optional)
3. Configure SSL certificates for HTTPS
4. Adjust cache settings based on your traffic patterns
5. Enable clustering for better performance
6. Set up monitoring and alerting using Prometheus/Grafana

## API Endpoints

- `/health`: Health check endpoint with domain routing and file resolution status
- `/metrics`: Prometheus-compatible metrics endpoint with path rewriting and file resolution metrics
- `/api/cache`: Cache management endpoint (local access only)
  - `DELETE /api/cache?pattern=*`: Purge cache with optional pattern
  - `GET /api/cache/stats`: Get cache statistics
  - `DELETE /api/cache/url-transform`: Clear URL transformation cache
  - `GET /api/cache/url-transform/stats`: Get URL transformation cache statistics
  - `DELETE /api/cache/file-resolution`: Clear file resolution cache
  - `GET /api/cache/file-resolution/stats`: Get file resolution cache statistics
  - `DELETE /api/cache/nuke`: Nuclear cache clear - clears ALL caches system-wide
- `/api/domains`: Domain management endpoint (local access only)
  - `GET /api/domains`: List configured domains and their path mappings
  - `POST /api/domains/reload`: Reload domain configuration
- `/api/file-resolution`: File resolution management endpoint (local access only)
  - `GET /api/file-resolution/status`: Get file resolution system status
  - `GET /api/file-resolution/stats`: Get file resolution statistics
  - `POST /api/file-resolution/test`: Test file resolution for specific paths
  - `DELETE /api/file-resolution/cache`: Clear file resolution cache

## Domain-to-Path Prefix Mapping Examples

The application supports sophisticated domain-based routing that maps different domains to specific backend path prefixes. This enables powerful content delivery scenarios:

### Basic Example: Personal Website with Subdomain Routing

```bash
# Configuration
ORIGIN_DOMAIN=allabout.network
TARGET_DOMAIN=main--allaboutv2--ddttom.hlx.live
PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING={"ddt.com": "/ddt", "portfolio.allabout.network": "/portfolio"}
```

**Request Transformations:**

- `ddt.com/about` → `main--allaboutv2--ddttom.hlx.live/ddt/about`
- `portfolio.allabout.network/projects` → `main--allaboutv2--ddttom.hlx.live/portfolio/projects`
- `allabout.network/home` → `main--allaboutv2--ddttom.hlx.live/home` (no prefix)

### Advanced Example: Multi-Brand E-commerce Platform

```bash
# Configuration
ORIGIN_DOMAIN=mainstore.com
TARGET_DOMAIN=backend.ecommerce.com
PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING={"brand-a.com": "/brands/a", "brand-b.com": "/brands/b"}
DOMAIN_TARGETS={"api.mainstore.com": "api-backend.ecommerce.com"}
```

**Request Transformations:**

- `brand-a.com/products/shoes` → `backend.ecommerce.com/brands/a/products/shoes`
- `brand-b.com/categories/electronics` → `backend.ecommerce.com/brands/b/categories/electronics`
- `api.mainstore.com/orders` → `api-backend.ecommerce.com/orders`

### Complex Example: API Gateway with Version Routing

```bash
# Configuration
PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING={"api-v1.service.com": "/api/v1", "api-v2.service.com": "/api/v2"}
PATH_REWRITE_RULES={"api.service.com": {"^/v1/(.*)": "/api/v1/$1", "^/v2/(.*)": "/api/v2/$1"}}
```

**Request Transformations:**

- `api-v1.service.com/users` → `backend.service.com/api/v1/users`
- `api.service.com/v1/users` → `backend.service.com/api/v1/users`
- `api.service.com/v2/users` → `backend.service.com/api/v2/users`

## File Resolution Examples

The application includes a sophisticated file resolution system that automatically searches for files with different extensions when extensionless requests are made, enabling clean URLs while supporting multiple content formats.

### Basic Example: Documentation Site with Markdown Support

```bash
# Configuration
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_EXTENSIONS=md,html,txt
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_MARKDOWN=true

# Domain-specific configuration
FILE_RESOLUTION_DOMAIN_CONFIG='{
  "docs.example.com": {
    "enabled": true,
    "extensions": ["md", "html", "txt"],
    "transformEnabled": true,
    "transformMarkdown": true
  }
}'
```

**Request Transformations:**

- `docs.example.com/getting-started` → checks for:
  1. `backend.example.com/getting-started.md` (found, transformed to HTML)
  2. `backend.example.com/getting-started.html` (fallback)
  3. `backend.example.com/getting-started.txt` (fallback)

### Advanced Example: API Gateway with JSON Formatting

```bash
# Configuration
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_EXTENSIONS=json,xml
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_JSON=true

# API-specific configuration
FILE_RESOLUTION_DOMAIN_CONFIG='{
  "api.example.com": {
    "enabled": true,
    "extensions": ["json", "xml"],
    "transformEnabled": true,
    "transformJson": true,
    "jsonOptions": {
      "pretty": true,
      "indent": 2
    }
  }
}'
```

**Request Transformations:**

- `api.example.com/users/123` → checks for:
  1. `backend.example.com/users/123.json` (found, formatted as pretty JSON)
  2. `backend.example.com/users/123.xml` (fallback)

### Complex Example: Data Portal with CSV Table Conversion

```bash
# Configuration
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_EXTENSIONS=csv,json,html
FILE_RESOLUTION_TRANSFORM_ENABLED=true
FILE_RESOLUTION_TRANSFORM_CSV=true

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
      "tableClass": "data-table table-striped",
      "responsive": true
    }
  }
}'
```

**Request Transformations:**

- `data.example.com/sales-report` → checks for:
  1. `backend.example.com/sales-report.csv` (found, converted to HTML table)
  2. `backend.example.com/sales-report.json` (fallback)
  3. `backend.example.com/sales-report.html` (fallback)

### Combined Example: Domain-to-Path Mapping with File Resolution

```bash
# Enable both systems
PATH_REWRITE_ENABLED=true
FILE_RESOLUTION_ENABLED=true

# Domain-to-path mapping
DOMAIN_PATH_MAPPING={"docs.mysite.com": "/documentation", "api.mysite.com": "/api"}

# File resolution configuration
FILE_RESOLUTION_EXTENSIONS=md,html,json,txt
FILE_RESOLUTION_TRANSFORM_ENABLED=true

# Combined domain configuration
FILE_RESOLUTION_DOMAIN_CONFIG='{
  "docs.mysite.com": {
    "enabled": true,
    "extensions": ["md", "html", "txt"],
    "transformEnabled": true,
    "transformMarkdown": true
  },
  "api.mysite.com": {
    "enabled": true,
    "extensions": ["json"],
    "transformEnabled": true,
    "transformJson": true
  }
}'
```

**Combined Request Transformations:**

## URL Transformation Examples

The application includes a comprehensive URL transformation system that automatically detects and rewrites all URLs in HTML, JavaScript, and CSS content, routing them through the proxy server to completely obscure the original server's domain and path structure.

### Basic Example: Complete Domain Masking

```bash
# Configuration
URL_TRANSFORM_ENABLED=true
URL_TRANSFORM_HTML=true
URL_TRANSFORM_JS=true
URL_TRANSFORM_CSS=true
ORIGIN_DOMAIN=proxy.example.com
TARGET_DOMAIN=backend.original-site.com
```

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

### Advanced Example: JavaScript and CSS Transformation

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

### Complex Example: Single Page Application with AJAX

**Original SPA Content:**

```html
<div id="app">
    <nav>
        <a href="/home" data-route="/home">Home</a>
        <a href="/products" data-route="/products">Products</a>
        <a href="/contact" data-route="/contact">Contact</a>
    </nav>
    <main id="content"></main>
</div>

<script>
// SPA routing and dynamic content loading
class Router {
    navigate(path) {
        fetch(`/api/pages${path}`)
            .then(response => response.text())
            .then(html => {
                document.getElementById('content').innerHTML = html;
                history.pushState({}, '', path);
            });
    }
    
    loadComponent(name) {
        return import(`/components/${name}.js`);
    }
}

// Form submissions
document.getElementById('contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    fetch('/api/contact', {
        method: 'POST',
        body: new FormData(e.target)
    });
});
</script>
```

**Transformed SPA Content:**

```html
<div id="app">
    <nav>
        <a href="https://proxy.example.com/home" data-route="https://proxy.example.com/home">Home</a>
        <a href="https://proxy.example.com/products" data-route="https://proxy.example.com/products">Products</a>
        <a href="https://proxy.example.com/contact" data-route="https://proxy.example.com/contact">Contact</a>
    </nav>
    <main id="content"></main>
</div>

<script>
// All URLs automatically transformed
class Router {
    navigate(path) {
        fetch(`https://proxy.example.com/api/pages${path}`)
            .then(response => response.text())
            .then(html => {
                document.getElementById('content').innerHTML = html;
                history.pushState({}, '', path);
            });
    }
    
    loadComponent(name) {
        return import(`https://proxy.example.com/components/${name}.js`);
    }
}

document.getElementById('contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    fetch('https://proxy.example.com/api/contact', {
        method: 'POST',
        body: new FormData(e.target)
    });
});
</script>
```

### URL Preservation Features

The transformation system preserves all URL functionality:

**Query Parameters and Fragments:**

```html
<!-- Original -->
<a href="/search?q=javascript&page=2#results">Search Results</a>
<a href="/docs/api#authentication">API Docs</a>

<!-- Transformed -->
<a href="https://proxy.example.com/search?q=javascript&page=2#results">Search Results</a>
<a href="https://proxy.example.com/docs/api#authentication">API Docs</a>
```

**Special URL Types:**

```html
<!-- Data URLs (preserved unchanged) -->
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">

<!-- JavaScript URLs (preserved unchanged) -->
<a href="javascript:void(0)" onclick="showModal()">Open Modal</a>

<!-- Mailto and tel URLs (preserved unchanged) -->
<a href="mailto:contact@example.com">Email Us</a>
<a href="tel:+1234567890">Call Us</a>
```

### Performance and Caching

**Configuration for Optimal Performance:**

```bash
# Enable caching for better performance
URL_TRANSFORM_CACHE_SIZE=10000
URL_TRANSFORM_MAX_SIZE=52428800  # 50MB max content size

# Content type optimization
URL_TRANSFORM_HTML=true
URL_TRANSFORM_JS=true
URL_TRANSFORM_CSS=true
URL_TRANSFORM_INLINE_STYLES=true
URL_TRANSFORM_DATA_ATTRS=true

# URL preservation
URL_PRESERVE_FRAGMENTS=true
URL_PRESERVE_QUERY=true

# Debug mode for development
URL_TRANSFORM_DEBUG=false
```

**Performance Metrics:**

- URL detection: < 10ms for typical HTML pages
- Content transformation: < 100ms for pages up to 1MB
- Cache hit rate: > 90% for repeated content
- Memory usage: < 50MB for transformation cache

### Security Features

**Automatic Security Validation:**

- XSS prevention through URL validation
- Content-type verification for transformed content
- Input sanitization for URL parameters
- Audit logging for security events

**Example Security Handling:**

```html
<!-- Malicious input (blocked) -->
<script>location.href='javascript:alert("XSS")'</script>

<!-- Safe transformation -->
<a href="https://proxy.example.com/safe-page">Safe Link</a>
```

### Integration with Domain Routing

**Combined with Path Rewriting:**

```bash
# Enable both systems
PATH_REWRITE_ENABLED=true
URL_TRANSFORM_ENABLED=true

# Domain-to-path mapping
DOMAIN_PATH_MAPPING={"api.example.com": "/api", "cdn.example.com": "/static"}
```

**Request Flow:**

1. `api.example.com/users` → Path rewriting → `/api/users`
2. Content fetched from backend with URLs like `https://backend.com/api/users`
3. URL transformation → All URLs become `https://api.example.com/...`
4. Complete domain masking achieved

### Monitoring and Debugging

**Available Metrics:**

- `url_transform_attempts_total`: Total transformation attempts
- `url_transform_cache_hits_total`: Cache hit statistics
- `url_transform_duration_seconds`: Transformation latency
- `url_transform_errors_total`: Transformation failures

**Debug Information:**

```bash
# Enable debug logging
URL_TRANSFORM_DEBUG=true


## Cache Management

The application provides comprehensive cache management capabilities for both general content caching and URL transformation caching, including advanced multi-cache coordination and nuclear cache clearing.

### URL Transformation Cache Management

#### API Endpoints

**Clear URL Transformation Cache:**
```bash
# Clear the entire URL transformation cache
curl -X DELETE http://localhost:8080/api/cache/url-transform

# Response:
{
  "message": "URL transformation cache cleared successfully",
  "timestamp": "2025-07-25T12:03:00.000Z"
}
```

**Get URL Transformation Cache Statistics:**

```bash
# View detailed cache performance metrics
curl http://localhost:8080/api/cache/url-transform/stats

# Response includes:
{
  "transformations": 1234,
  "urlsTransformed": 5678,
  "htmlTransformations": 890,
  "jsTransformations": 234,
  "cssTransformations": 123,
  "cacheHits": 890,
  "cacheMisses": 123,
  "cacheSize": 456,
  "maxCacheSize": 10000,
  "errors": 2,
  "config": {
    "enabled": true,
    "transformJavaScript": true,
    "transformCSS": true,
    "maxContentSize": 52428800
  }
}
```

#### Automatic Cache Management

**LRU Eviction:**

- **Default maximum size**: 10,000 entries
- **Configurable**: Set `URL_TRANSFORM_CACHE_SIZE` environment variable
- **Automatic cleanup**: Removes oldest entries when cache reaches capacity
- **Performance optimization**: Maintains optimal cache performance

**Application Shutdown:**

- **Graceful cleanup**: Cache automatically cleared during shutdown
- **Resource management**: Prevents memory leaks and ensures clean exit
- **Integration**: Fully integrated with existing shutdown procedures

#### Cache Performance Monitoring

**Production Monitoring:**

```bash
# Monitor cache performance
watch -n 5 'curl -s http://localhost:8080/api/cache/url-transform/stats | jq "{cacheHits: .cacheHits, cacheMisses: .cacheMisses, hitRate: (.cacheHits / (.cacheHits + .cacheMisses) * 100)}"'

# Check cache size and clear if needed
CACHE_SIZE=$(curl -s http://localhost:8080/api/cache/url-transform/stats | jq '.cacheSize')
if [ $CACHE_SIZE -gt 8000 ]; then
  curl -X DELETE http://localhost:8080/api/cache/url-transform
  echo "URL transformation cache cleared due to size: $CACHE_SIZE"
fi
```

**Performance Metrics:**

- **Cache hit rate**: Target > 90% for optimal performance
- **Memory usage**: < 50MB for transformation cache
- **Transformation time**: < 100ms for typical content
- **Cache efficiency**: Automatic optimization through LRU eviction

#### Security and Access Control

**Local Access Only:**

- Cache management APIs restricted to localhost (127.0.0.1, ::1)
- Same security model as existing cache management endpoints
- Comprehensive error handling and logging
- Audit trail for cache operations

#### Integration with Existing Cache System

**Unified Cache Management:**

```bash
# Clear all caches
curl -X DELETE http://localhost:8080/api/cache              # Main application cache
curl -X DELETE http://localhost:8080/api/cache/url-transform # URL transformation cache

# Get all cache statistics
curl http://localhost:8080/api/cache/stats                  # Main cache stats
curl http://localhost:8080/api/cache/url-transform/stats    # URL transformation stats
```

**Cache Key Strategy:**

- **Main cache**: `{method}:{domain}:{path}:{headers}`
- **URL transformation cache**: `{url}:{proxyHost}:{pathTransformation.target}`
- **Isolation**: Separate cache namespaces prevent conflicts
- **Efficiency**: Optimized key generation for fast lookups

#### File Resolution Cache Management

The application provides specialized cache management for file resolution operations, with separate endpoints for clearing and monitoring the file resolution cache.

#### API Endpoints

**Clear File Resolution Cache:**
```bash
# Clear the entire file resolution cache
curl -X DELETE http://localhost:8080/api/cache/file-resolution

# Response:
{
  "message": "File resolution cache cleared successfully",
  "timestamp": "2025-07-29T12:03:00.000Z"
}

# If file resolution cache is not available:
{
  "error": "File resolution cache not available",
  "message": "The file resolution cache module is not loaded or does not support clearing"
}
```

**Get File Resolution Cache Statistics:**

```bash
# View detailed cache performance metrics
curl http://localhost:8080/api/cache/file-resolution/stats

# Response includes:
{
  "hits": 1234,
  "misses": 567,
  "sets": 890,
  "deletes": 45,
  "evictions": 12,
  "cleanups": 8,
  "positiveHits": 890,
  "negativeHits": 344,
  "size": 456,
  "maxSize": 5000,
  "hitRate": 0.69,
  "positiveHitRate": 0.72,
  "memoryUsage": {
    "totalBytes": 1048576,
    "keyBytes": 262144,
    "valueBytes": 786432,
    "averageEntrySize": 2300
  }
}
```

#### Cache Performance Features

**Dual TTL Management:**

- **Positive results**: Cached longer (default: 300 seconds)
- **Negative results**: Cached shorter (default: 60 seconds)
- **Automatic cleanup**: LRU eviction when cache reaches capacity
- **Performance optimization**: Separate hit tracking for positive vs negative results

### Nuclear Cache Clear

The nuclear cache clear endpoint provides system-wide cache clearing capabilities, clearing all cache types in a single operation with comprehensive error handling and detailed feedback.

#### API Endpoint

**Nuclear Cache Clear:**
```bash
# Clear ALL caches system-wide
curl -X DELETE http://localhost:8080/api/cache/nuke

# Successful response (200):
{
  "success": true,
  "message": "All caches cleared successfully",
  "data": {
    "clearedCaches": [
      {
        "cache": "main",
        "type": "response-cache",
        "itemsCleared": 1234,
        "status": "success"
      },
      {
        "cache": "url-transform",
        "type": "transformation-cache",
        "status": "success"
      },
      {
        "cache": "file-resolution",
        "type": "file-cache",
        "status": "success"
      }
    ],
    "totalCachesCleared": 3,
    "timestamp": "2025-07-29T12:03:00.000Z"
  }
}

# Partial failure response (207 Multi-Status):
{
  "success": false,
  "message": "Some caches failed to clear",
  "data": {
    "clearedCaches": [
      {
        "cache": "main",
        "type": "response-cache",
        "itemsCleared": 1234,
        "status": "success"
      },
      {
        "cache": "url-transform",
        "type": "transformation-cache",
        "status": "success"
      }
    ],
    "totalCachesCleared": 2,
    "errors": [
      {
        "cache": "file-resolution",
        "error": "Cache module not available"
      }
    ],
    "timestamp": "2025-07-29T12:03:00.000Z"
  }
}
```

#### Nuclear Cache Clear Features

**Multi-Cache Coordination:**

- **Main cache**: Response cache with item count tracking
- **URL transformation cache**: Transformation result cache
- **File resolution cache**: File resolution result cache (if available)
- **Comprehensive logging**: Detailed operation logging for each cache type
- **Error isolation**: Individual cache failures don't prevent other caches from clearing

**Production Monitoring:**

```bash
# Monitor nuclear cache clear operations
tail -f logs/app.log | grep "Nuclear cache clear"

# Check cache status after nuclear clear
curl http://localhost:8080/api/cache/stats
curl http://localhost:8080/api/cache/url-transform/stats
curl http://localhost:8080/api/cache/file-resolution/stats

# Automated nuclear cache clear with monitoring
RESPONSE=$(curl -s -X DELETE http://localhost:8080/api/cache/nuke)
SUCCESS=$(echo $RESPONSE | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "Nuclear cache clear completed successfully"
  echo $RESPONSE | jq '.data.totalCachesCleared'
else
  echo "Nuclear cache clear had errors"
  echo $RESPONSE | jq '.data.errors'
fi
```

**Security and Access Control:**

- **Local access only**: Nuclear cache clear restricted to localhost (127.0.0.1, ::1)
- **Comprehensive audit trail**: All operations logged with detailed context
- **Error handling**: Graceful handling of unavailable cache modules
- **Status reporting**: Multi-status responses for partial failures

# View transformation logs

tail -f logs/app.log | grep "URL_TRANSFORM"

```bash</search>
</search_and_replace>

- `docs.mysite.com/getting-started` →
  1. Path rewriting: `/getting-started` → `/documentation/getting-started`
  2. File resolution: checks for `/documentation/getting-started.md` (found, transformed to HTML)
- `api.mysite.com/users` →
  1. Path rewriting: `/users` → `/api/users`
  2. File resolution: checks for `/api/users.json` (found, formatted JSON)

### Performance Features

- **Rule Caching**: Compiled regex patterns are cached for optimal performance
- **Domain-Aware Caching**: Cache keys include domain context for proper isolation
- **File Resolution Caching**: Both positive and negative file resolution results are cached
- **Circuit Breaker Protection**: Automatic protection against failing domains
- **Content Transformation**: Built-in transformers for common content types
- **Metrics Tracking**: Detailed metrics for transformation performance and hit rates
- **Health Monitoring**: Automatic health checks for domain routing and file resolution functionality

## Browser Issue Fixes

This version includes critical fixes for browser compatibility issues:

### Module System Compatibility
- **Issue**: Runtime errors due to ES modules mixed with CommonJS
- **Fix**: Converted all modules to CommonJS for consistency
- **Impact**: Eliminated `getStats is not a function` errors and improved server stability

### Gzip Decompression Error Handling
- **Issue**: Corrupted JavaScript files causing browser syntax errors
- **Fix**: Enhanced gzip decompression with robust error handling and fallback mechanisms
- **Impact**: Eliminated "Invalid or unexpected token" errors in browsers

### Content-Length Header Mismatch Fix
- **Issue**: Node.js HTTP clients experiencing "Parse Error: Expected HTTP/" due to Content-Length header mismatches
- **Root Cause**: Original Content-Length header (compressed size) sent with decompressed content
- **Fix**: Conditional Content-Length exclusion for compressed responses, proper header setting after decompression
- **Impact**: Eliminated HTTP parsing errors in Node.js clients while maintaining curl compatibility

### Testing and Validation
- **Integration Tests**: [`test-fixes.js`](test-fixes.js) validates both fixes
- **Documentation**: Detailed fix documentation in [`docs/browser-issue-fixes.md`](docs/browser-issue-fixes.md)

## Dashboard Integration

The application includes an integrated dashboard with enhanced initialization and error handling capabilities for comprehensive API management and monitoring.

### Enhanced Dashboard Features

**Improved Initialization:**

- **Error handling**: Graceful handling of dashboard initialization failures
- **Fallback behavior**: Application continues to function even if dashboard fails to initialize
- **Comprehensive logging**: Detailed logging of initialization steps and any errors
- **Resource management**: Proper cleanup of dashboard resources during shutdown

**Dashboard Integration Process:**

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

**Dashboard API Discovery:**

The dashboard automatically discovers and documents all API endpoints, including the new cache management endpoints:

- File resolution cache management endpoints
- Nuclear cache clear endpoint
- Enhanced error handling and parameter validation
- Comprehensive response documentation

**Access Dashboard:**

```bash
# Access the dashboard interface
http://localhost:8080/dashboard

# Dashboard API endpoints
http://localhost:8080/dashboard/api/discovery/endpoints
http://localhost:8080/dashboard/api/discovery/stats
http://localhost:8080/dashboard/api/docs/openapi.json
```

## Development and Testing

### Getting Started with Development</search>
</search_and_replace>

1. **Clone and Setup**
   ```bash
   git clone https://github.com/ddttom/advanced-cdn.git
   cd advanced-cdn
   npm install
   ```

2. **Development Mode**
   ```bash
   # Start in development mode with auto-reload
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

```
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
  echo "Memory: $(curl -s http://localhost:8080/health | jq -r '.system.memory.heapUsed')"
  sleep 10
done
```

#### Test Configuration

**Jest Configuration** (auto-detected from `package.json`):
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Test Environment Setup:**
- Mocked external dependencies to prevent network calls
- Isolated test environment with controlled configuration
- Automatic cleanup after each test
- Memory monitoring and leak detection

#### Continuous Integration Testing

**Memory Leak Detection in CI:**
```yaml
# Example GitHub Actions workflow
- name: Memory Leak Tests
  run: |
    npm test -- tests/memory-leak-*.test.js
    node --expose-gc tests/memory-stability-test.js
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
curl http://localhost:8080/health | jq '.system.memory'

# Monitor memory trends
watch -n 5 'curl -s http://localhost:8080/health | jq ".system.memory.heapUsed"'

# Check active intervals (requires debug mode)
curl http://localhost:8080/api/debug/intervals
```

#### Development Health Checks

**Validate Resource Cleanup:**
```bash
# Test graceful shutdown
kill -TERM $(pgrep -f "node.*cluster-manager")

# Check logs for cleanup messages
grep -E "(cleanup.*completed|resources.*cleaned|shutting down)" logs/app.log
```

#### IDE Integration

**Recommended VS Code Settings:**
```json
{
  "nodejs.terminal": "integrated",
  "nodejs.defaultDebugConfiguration": {
    "type": "node",
    "request": "launch",
    "program": "${workspaceFolder}/src/cluster-manager.js",
    "env": {
      "NODE_ENV": "development",
      "LOG_LEVEL": "debug",
      "MEMORY_MONITORING_ENABLED": "true"
    }
  }
}
```

**ESLint Configuration:**
- Configured to catch potential memory leak patterns
- Warns about uncleaned intervals and event listeners
- Enforces consistent resource management patterns

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

## License

MIT
