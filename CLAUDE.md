# High-Performance CDN Application - Claude.md

## Codebase Description

This is a production-quality Node.js application that provides advanced CDN functionality with caching, proxying, and edge computing capabilities. The application serves as a comprehensive CDN proxy service with sophisticated URL transformation, domain-to-path mapping, file resolution, and content transformation features.

### Key Features

- **High-Performance Proxy**: Efficiently forwards requests from configured domains to backend servers
- **Domain-to-Path Prefix Mapping**: Advanced routing system that maps different domains to specific backend path prefixes
- **Cascading File Resolution**: Automatically resolves extensionless requests by trying multiple file extensions in priority order
- **Content Transformation**: Built-in transformers for Markdown to HTML, JSON formatting, CSV to HTML tables, and more
- **Advanced Caching**: Intelligent in-memory caching with TTL management and cache control support
- **URL Transformation**: Comprehensive URL masking that automatically detects and rewrites all URLs in HTML, JavaScript, and CSS content with protocol-aware transformation (HTTP→HTTP, HTTPS→HTTPS)
- **Circuit Breaker Protection**: Automatic protection against failing domains with configurable thresholds and recovery
- **Clustering Support**: Multi-process operation for optimal performance on multi-core systems
- **Production Readiness**: Graceful shutdown, error handling, and performance optimizations

## Codebase Structure

The project is organized into logical directories for better maintainability and development experience:

```bash
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
```

### Core Application Files (src/)

- **src/cluster-manager.js**: Main entry point - Process management for multi-core operation with worker clustering
- **src/app.js**: Express application setup with middleware configuration and route definitions
- **src/index.js**: Basic server startup file (alternative entry point)
- **src/config.js**: Configuration management with environment variable support and validation

### Cache Management (src/cache/)

- **src/cache/cache-manager.js**: Intelligent caching implementation with domain-aware keys and TTL management
- **src/cache/file-resolution-cache.js**: Specialized caching for file resolution results with positive/negative caching

### Proxy & Networking (src/proxy/)

- **src/proxy/proxy-manager.js**: Request proxying and response handling with path transformation capabilities
- **src/proxy/robust-http-client.js**: Enhanced HTTP client with retry logic and error handling

### Domain & Routing (src/domain/)

- **src/domain/domain-manager.js**: Domain validation and management with path rewriting integration
- **src/domain/path-rewriter.js**: Domain-to-path prefix mapping and routing engine with regex support
- **src/domain/file-resolver.js**: Cascading file resolution with HTTP HEAD requests and content transformation

### Content Transformation (src/transform/)

- **src/transform/url-transformer.js**: Comprehensive URL transformation for HTML, JavaScript, and CSS content
- **src/transform/transformers/index.js**: Content transformation plugins (Markdown, JSON, CSV, etc.)

### Middleware (src/middleware/)

- **src/middleware/rate-limiter.js**: Request rate limiting with configurable windows and limits

### Monitoring (src/monitoring/)

- **src/monitoring/metrics-manager.js**: Prometheus-compatible metrics collection with path rewriting tracking
- **src/monitoring/health-manager.js**: Application health monitoring with domain routing checks

### Dashboard & Management (src/dashboard/)

- **src/dashboard/dashboard-integration.js**: Web-based management dashboard integration
- **src/dashboard/api/dashboard-api.js**: API endpoints for dashboard functionality
- **src/dashboard/api/discovery.js**: Service discovery and configuration endpoints
- **src/dashboard/public/**: Static assets for web dashboard (HTML, CSS, JS)

### Testing & Debugging (tests/)

- **tests/**: Comprehensive test suite covering fixes, transformations, and functionality
- **tests/debug-ddt.js**: Debug tooling for DDT (debugging, diagnostics, and testing)
- **tests/benchmark.js**: Performance benchmarking tools
- **tests/diagnose-http-response.js**: HTTP response diagnostic utilities

### Documentation

- **docs/**: Comprehensive documentation including:
  - **api-documentation.md**: Complete API reference
  - **configuration.md**: Configuration options and examples
  - **troubleshooting-guide.md**: Common issues and solutions
  - **performance-optimization-guide.md**: Performance tuning guidelines
  - **url-transformation-architecture.md**: URL transformation system details
  - **browser-issue-fixes.md**: Browser compatibility fixes documentation
  - **for-ai/architecture.md**: AI-specific architecture documentation

## Dependencies

### Production Dependencies

- **express**: ^4.18.2 - Web application framework
- **http-proxy-middleware**: ^2.0.6 - HTTP proxy middleware for request forwarding
- **compression**: ^1.7.4 - Response compression middleware
- **helmet**: ^7.1.0 - Security headers middleware
- **cors**: ^2.8.5 - Cross-Origin Resource Sharing support
- **express-rate-limit**: ^7.1.4 - Rate limiting middleware
- **winston**: ^3.11.0 - Logging library with multiple transports
- **node-cache**: ^5.1.2 - In-memory caching solution
- **prom-client**: ^15.0.0 - Prometheus metrics client
- **dotenv**: ^16.3.1 - Environment variable loading

### Development Dependencies

- **eslint**: ^8.54.0 - JavaScript linting
- **jest**: ^29.7.0 - Testing framework
- **nodemon**: ^3.0.1 - Development server with auto-restart
- **supertest**: ^6.3.3 - HTTP assertion library for testing

## Configuration

The application uses environment variables for configuration with comprehensive defaults. Key configuration areas include:

### Server Configuration

- PORT=3000
- HOST=0.0.0.0
- NODE_ENV=production
- ENABLE_CLUSTER=true

### CDN Configuration

- ORIGIN_DOMAIN=allabout.network
- TARGET_DOMAIN=main--allaboutv2--ddttom.hlx.live
- PATH_REWRITE_ENABLED=true
- DOMAIN_PATH_MAPPING (JSON configuration)

### Feature Toggles

- FILE_RESOLUTION_ENABLED=true
- URL_TRANSFORM_ENABLED=true
- CACHE_ENABLED=true
- SECURITY_HEADERS=true

## Architecture Highlights

### URL Transformation System

- Comprehensive URL masking for complete domain obscuration
- Supports HTML, JavaScript, and CSS content transformation
- Preserves query parameters, fragments, and special URL types
- High-performance caching with LRU eviction

### Domain-to-Path Mapping

- Flexible domain routing with regex support
- Cascading fallback mechanisms
- Circuit breaker protection for failing domains
- Comprehensive metrics and monitoring

### File Resolution System

- Extensionless URL support with automatic file extension detection
- Content transformation pipeline (Markdown→HTML, CSV→Tables, etc.)
- Positive and negative result caching
- Domain-specific configuration support

### Caching Strategy

- Multi-layered caching (general, file resolution, URL transformation)
- TTL-based expiration with cache control header respect
- Domain-aware cache keys for proper isolation
- Comprehensive cache management APIs

## Development Commands

- **npm start**: Start production server with clustering
- **npm run dev**: Start development server with auto-reload
- **npm run lint**: Run ESLint code analysis
- **npm run test**: Run Jest test suite
- **npm run debug-ddt**: Run debug diagnostics and testing tools

## API Endpoints

- **/health**: Health check with detailed system status
- **/metrics**: Prometheus-compatible metrics
- **/api/cache**: Cache management (clear, stats)
- **/api/cache/keys**: List all cache keys with optional pattern filtering
- **/api/cache/url-transform**: URL transformation cache management
- **/api/domains**: Domain configuration management
- **/api/file-resolution**: File resolution system management

## Security Features

- Helmet.js security headers
- Rate limiting with configurable thresholds
- CORS policy enforcement
- Domain validation and sanitization
- XSS prevention in URL transformations
- Local-only access for management APIs

## Production Readiness

- Graceful shutdown handling
- Comprehensive error handling and logging
- Circuit breaker patterns for resilience
- Health checks and monitoring
- Performance optimizations
- SSL/TLS support
- Multi-process clustering
