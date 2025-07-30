# Product Requirements Document (PRD)

## Advanced CDN Application

## Document Information

- **Version:** 1.0.0
- **Date:** May 15, 2025
- **Status:** Final

## Executive Summary

The Advanced CDN application is a Node.js-based content delivery network solution designed to accelerate web content delivery by proxying and caching responses from origin servers. This PRD outlines the requirements, features, and specifications for the application.

The product aims to provide a self-hosted alternative to commercial CDN services, with a focus on ease of deployment, configurability, and performance optimization. The primary use case is for organizations that need to accelerate content delivery while maintaining control over their infrastructure.

## Product Overview

### Problem Statement

Traditional web servers face challenges delivering content efficiently to users, particularly when:

- Serving users across different geographic locations
- Handling high traffic loads
- Delivering large files or complex web applications
- Requiring reduced load on origin servers

Commercial CDN solutions solve these problems but come with high costs, vendor lock-in, and limited customization options for specific requirements.

### Product Vision

To create a flexible, self-hosted CDN solution that provides core CDN functionality, allowing organizations to:

- Reduce origin server load through intelligent caching
- Improve content delivery speed through optimized proxying
- Maintain full control over their content delivery infrastructure
- Scale according to their specific needs
- Support custom domain configurations

### Target Users

1. **Web Developers** who need to improve website performance without investing in commercial CDN services
2. **DevOps Engineers** responsible for infrastructure optimization
3. **System Administrators** managing content delivery systems
4. **Small to Medium Businesses** with specific content delivery requirements
5. **Development Teams** needing a staging CDN that mimics production behavior

## Product Requirements

### Functional Requirements

#### Core CDN Functionality

1. **Request Proxying**
   - The system must proxy HTTP/HTTPS requests from configured domains to origin servers
   - The system must preserve request headers and path information
   - The system must support query parameters and URL patterns

2. **Response Caching**
   - The system must cache responses based on configurable rules
   - The system must respect standard cache control headers
   - The system must provide mechanisms to purge cached content
   - The system must support different cache TTLs for different content types

3. **Domain Management**
   - The system must accept requests for configured domains only
   - The system must support multiple domains pointing to the same or different origins
   - The system must validate domain configurations on startup

4. **SSL/TLS Support**
   - The system must support HTTPS connections
   - The system must handle SSL certificate management
   - The system must optionally redirect HTTP to HTTPS

5. **Content Compression and Header Management**
   - The system must compress responses when appropriate
   - The system must respect pre-compressed content
   - The system must optimize compression settings for different content types
   - The system must properly handle gzip decompression for content transformation
   - The system must ensure Content-Length headers match actual response body size
   - The system must use chunked transfer encoding when Content-Length cannot be determined
   - The system must prevent HTTP parsing errors in Node.js clients due to header mismatches

6. **Health Monitoring**
   - The system must provide a health check endpoint
   - The system must monitor its own resource usage
   - The system must check origin server availability

7. **Metrics Collection**
   - The system must track cache hit/miss rates
   - The system must measure response times
   - The system must count requests by type and status
   - The system must expose metrics in Prometheus format

8. **Cache Management API**
   - The system must provide an API to purge cached content
   - The system must support pattern-based cache purging
   - The system must provide cache statistics
   - The system must provide specialized cache management for file resolution operations
   - The system must support nuclear cache clearing across all cache types
   - The system must provide detailed cache performance metrics and monitoring

9. **Logging**
   - The system must log all requests with relevant details
   - The system must log errors and exceptions
   - The system must support different log levels
   - The system must support console and file logging

10. **Multi-core Support**
    - The system must utilize multiple CPU cores through clustering
    - The system must distribute load across worker processes
    - The system must handle worker failures gracefully

11. **Graceful Shutdown**
    - The system must complete in-flight requests during shutdown
    - The system must release resources properly on exit
    - The system must handle signals for controlled shutdown
12. **URL Transformation**
     - The system must automatically detect and transform URLs in HTML, JavaScript, and CSS content
     - The system must route all URLs through the proxy server to obscure original domains
     - The system must preserve query parameters, fragments, and URL functionality
     - The system must support configurable transformation patterns and content types
     - The system must cache transformation results for optimal performance
     - The system must implement protocol-aware transformation (HTTP requests → HTTP URLs, HTTPS requests → HTTPS URLs)
     - The system must handle JavaScript string literals without corrupting syntax
     - The system must provide protocol-aware caching to prevent HTTP/HTTPS cache conflicts

### Non-Functional Requirements

#### Performance

1. **Response Time**
   - Cached responses must be served within 50ms (p95)
   - Non-cached responses must add no more than 100ms overhead to origin response time
   - The system must handle at least 1000 requests per second per CPU core

2. **Resource Usage**
   - The system must use no more than 1GB of RAM per worker under normal load
   - The system must optimize CPU usage during request processing

3. **Availability**
   - The system must achieve 99.9% uptime
   - The system must recover automatically from most failure conditions
   - The system must handle network errors gracefully

4. **Fault Tolerance**
   - The system must continue functioning if worker processes fail
   - The system must handle malformed requests without crashing
   - The system must recover from temporary origin server outages

5. **Access Control**
   - The system must restrict management API access to authorized users
   - The system must validate input parameters
   - The system must implement rate limiting for protection against abuse

6. **Data Protection**
   - The system must not modify or expose sensitive content
   - The system must implement security headers by default
   - The system must support HTTPS for all connections

7. **Configuration**
   - The system must use environment variables for configuration
   - The system must provide sensible defaults for all settings
   - The system must validate configuration on startup

8. **Documentation**
   - The system must include comprehensive installation instructions
   - The system must document all configuration options
   - The system must provide troubleshooting guidance

## Technical Specifications

### Architecture

The application follows a modular architecture with the following components:

1. **Request Handler**
   - Express.js web server
   - HTTP/HTTPS server setup
   - Request routing

2. **Path Rewriter**
   - Domain-based path transformation
   - Routing rule compilation and execution
   - Pattern matching and substitution
   - Fallback mechanism management

3. **File Resolver**
   - Cascading file resolution with HTTP HEAD requests
   - Circuit breaker protection for failing domains
   - File existence validation and caching
   - Integration with transformer pipeline

4. **Transformer System**
   - Plugin-based content transformation
   - Built-in transformers for common file types
   - Transformer cache management
   - Content-type handling and validation

5. **Proxy Manager**
   - Request forwarding using http-proxy-middleware
   - Response processing and header management
   - Integration with path rewriting and file resolution
   - Fallback to normal proxy behavior

6. **Cache Manager**
   - In-memory cache using node-cache
   - Domain-aware cache key generation
   - TTL management and purge mechanism
   - Specialized file resolution caching

7. **Domain Manager**
   - Domain validation and configuration
   - Host header processing
   - Multi-domain support with per-domain settings
   - File resolution configuration per domain

8. **Cluster Manager**
   - Worker process management
   - Load distribution
   - Worker recovery

9. **Monitoring Components**
   - Health check provider with file resolution monitoring
   - Metrics collector using prom-client
   - Resource usage tracking
   - Circuit breaker status monitoring

10. **Logging System**
    - Winston logger integration
    - Log formatting and storage
    - Log level management
    - File resolution and transformation logging

### Technology Stack

1. **Runtime Environment**
   - Node.js 16.x or higher

2. **Core Dependencies**
   - Express.js - Web framework
   - http-proxy-middleware - Proxy functionality
   - node-cache - In-memory caching
   - winston - Logging
   - prom-client - Metrics collection
   - cluster - Multi-process support

3. **File Resolution Dependencies**
   - axios - HTTP client for HEAD requests
   - marked - Markdown to HTML transformation
   - csv-parser - CSV file processing
   - xml2js - XML parsing and formatting

4. **Security Dependencies**
   - helmet - Security headers
   - express-rate-limit - Rate limiting
   - cors - CORS support

5. **Infrastructure**
   - Docker support (optional)
   - PM2 or systemd for process management (production)
   - Nginx or Apache for SSL termination (optional)

## Implementation Phases

### Phase 1: Core Functionality

1. Basic HTTP server setup
2. Proxy functionality implementation
3. Simple caching mechanism
4. Domain validation

### Phase 2: Advanced Routing and Resolution

1. Domain-based path rewriting system
2. Cascading file resolution with HTTP HEAD requests
3. Transformer plugin system for content processing
4. Per-domain configuration management

### Phase 3: Performance Optimization

1. Advanced caching with TTL management
2. Response compression
3. Clustering support
4. Performance tuning
5. Circuit breaker protection for file resolution

### Phase 4: Management and Monitoring

1. Health check endpoint
2. Metrics collection
3. Cache management API
4. Advanced logging
5. File resolution monitoring and metrics

### Phase 5: Production Readiness

1. SSL/TLS support
2. Security hardening
3. Graceful shutdown
4. Documentation completion
5. File resolution security and validation

## Metrics and Success Criteria

### Performance Metrics

1. Response time improvement over direct origin access
2. Cache hit rate percentage
3. Origin server load reduction
4. Resource utilization efficiency
5. File resolution success rate and latency
6. Content transformation performance
7. Circuit breaker effectiveness for failing domains

### Success Criteria

1. Successful proxying of requests to origin servers
2. Proper caching of responses with respect to cache control
3. Support for multiple domains and origins
4. Ability to handle production traffic loads
5. Comprehensive monitoring and management capabilities
6. Effective domain-based path rewriting with < 1ms latency
7. File resolution success rate > 95% for valid requests
8. Content transformation completion within 200ms
9. Circuit breaker protection preventing cascade failures
10. Per-domain configuration flexibility and runtime updates

## Domain-Based Path Rewriting System

### System Overview

The domain-based path rewriting system enables intelligent request routing based on the incoming domain, allowing different domains to map to different backend paths or entirely different backend servers. This functionality is essential for multi-tenant applications, API versioning, and content organization.

### Path Rewriting Requirements

#### 1. Domain-to-Path Prefix Mapping

**Requirement**: The system must support mapping incoming domains to specific path prefixes on the backend server.

**Examples**:

- `ddt.com/page` → `allabout.network/ddt/page`
- `api.example.com/users` → `backend.com/api/users`
- `blog.site.com/posts/123` → `backend.com/blog/posts/123`
- `cdn.mysite.com/images/logo.png` → `backend.com/static/images/logo.png`

**Configuration Format**:

```bash
# Simple prefix mapping
DOMAIN_PATH_MAPPING=ddt.com:/ddt,api.example.com:/api,blog.site.com:/blog

# Complex routing rules (JSON format)
DOMAIN_ROUTING_RULES={"ddt.com": {"target": "allabout.network", "pathPrefix": "/ddt"}}
```

#### 2. Multiple Backend Support

**Requirement**: Different domains must be able to route to completely different backend servers.

**Examples**:

- `api.company.com` → `api-server.company.com`
- `static.company.com` → `cdn.company.com`
- `docs.company.com` → `documentation-server.company.com`

#### 3. Complex Pattern Matching

**Requirement**: Support for regex-based path transformations with pattern matching and substitution.

**Examples**:

- `api.v1.example.com/(.*)` → `backend.com/api/v1/$1`
- `([^.]+).api.example.com/(.*)` → `backend.com/tenants/$1/api/$2`
- `docs.example.com/v(\d+)/(.*)` → `backend.com/documentation/version-$1/$2`

#### 4. Fallback Mechanisms

**Requirement**: The system must provide graceful fallback when no routing rules match.

**Fallback Options**:

1. **Default Path Prefix**: Apply a default prefix when no rules match
2. **Pass-through**: Forward the original path unchanged
3. **Error Response**: Return a configured error response
4. **Redirect**: Redirect to a default domain/path

#### 5. Performance Requirements

**Requirement**: Path rewriting must add minimal latency to request processing.

**Performance Targets**:

- Path transformation: < 1ms per request
- Rule compilation: < 100ms at startup
- Memory usage: < 10MB for 1000 routing rules
- Cache efficiency: > 95% hit rate for compiled rules

### Path Rewriting Technical Specification

#### 1. Path Rewriter Engine

**Component**: `path-rewriter.js`

**Responsibilities**:

- Parse and compile routing rules
- Execute path transformations
- Handle pattern matching and substitution
- Manage fallback mechanisms
- Cache compiled rules for performance

**API Interface**:

```javascript
class PathRewriter {
  // Transform a request path based on domain
  transformPath(domain, originalPath, method = 'GET')
  
  // Get target backend for a domain
  getTargetBackend(domain)
  
  // Validate routing rules
  validateRules(rules)
  
  // Reload rules at runtime
  reloadRules(newRules)
}
```

#### 2. Domain Routing Configuration

**Configuration Schema**:

```javascript
{
  "domains": {
    "ddt.com": {
      "target": "allabout.network",
      "pathPrefix": "/ddt",
      "rules": [],
      "fallback": "prefix"
    },
    "api.example.com": {
      "target": "api-backend.example.com",
      "rules": [
        {
          "pattern": "/v1/(.*)",
          "replacement": "/api/v1/$1",
          "method": ["GET", "POST"]
        }
      ],
      "fallback": "passthrough"
    },
    "*.tenant.example.com": {
      "target": "multi-tenant-backend.com",
      "rules": [
        {
          "pattern": "/(.*)",
          "replacement": "/tenants/{subdomain}/$1"
        }
      ]
    }
  },
  "defaultFallback": {
    "action": "prefix",
    "value": "/default"
  }
}
```

#### 3. Cache Integration

**Requirement**: Cache keys must include domain information to prevent cross-domain cache pollution.

**Cache Key Format**: `{method}:{domain}:{transformedPath}:{varyHeaders}`

**Example**: `GET:ddt.com:/ddt/page:accept-encoding=gzip`

#### 4. Metrics and Monitoring

**Required Metrics**:

- `domain_requests_total{domain, target_backend}`: Total requests per domain
- `path_transformations_total{domain, rule_type}`: Path transformation counts
- `path_transformation_duration_seconds{domain}`: Transformation latency
- `routing_rule_matches_total{domain, rule_pattern}`: Rule match statistics
- `fallback_usage_total{domain, fallback_type}`: Fallback mechanism usage

#### 5. Error Handling

**Error Scenarios**:

1. **Invalid Routing Rules**: Malformed regex patterns or configuration
2. **Target Backend Unreachable**: Backend server connection failures
3. **Transformation Failures**: Pattern matching errors
4. **Configuration Reload Failures**: Runtime rule update errors

**Error Response Format**:

```javascript
{
  "error": "ROUTING_ERROR",
  "message": "Failed to transform path for domain",
  "domain": "example.com",
  "originalPath": "/api/users",
  "timestamp": "2025-01-15T10:30:00Z",
  "requestId": "req-123456"
}
```

### Path Rewriting Implementation Requirements

#### 1. Backward Compatibility

**Requirement**: Existing configurations must continue to work during migration period.

**Migration Strategy**:

- Support both old and new configuration formats
- Provide automatic migration script
- Deprecation warnings for old format
- Complete removal of old format in next major version

#### 2. Runtime Configuration Updates

**Requirement**: Routing rules should be updatable without server restart.

**Implementation**:

- Configuration reload API endpoint
- Graceful rule compilation and validation
- Atomic rule updates to prevent partial states
- Rollback capability for failed updates

#### 3. Security Considerations

**Security Requirements**:

- Input validation for all routing rules
- Prevention of path traversal attacks
- Rate limiting for configuration updates
- Audit logging for rule changes

### Path Rewriting Testing Requirements

#### 1. Unit Tests

**Coverage Requirements**:

- Path transformation logic: 100%
- Rule compilation and validation: 100%
- Error handling scenarios: 100%
- Performance benchmarks: All critical paths

#### 2. Integration Tests

**Test Scenarios**:

- End-to-end request routing
- Cache integration with domain-aware keys
- Metrics collection accuracy
- Fallback mechanism behavior

#### 3. Performance Tests

**Benchmarks**:

- Path transformation latency under load
- Memory usage with large rule sets
- Cache hit rates with domain-specific keys
- Concurrent request handling

### Path Rewriting Documentation Requirements

#### 1. Configuration Guide

**Required Documentation**:

- Step-by-step setup instructions
- Configuration examples for common scenarios
- Migration guide from existing setup
- Troubleshooting common issues

#### 2. API Documentation

**Required Documentation**:

- Configuration management endpoints
- Request/response formats
- Error codes and messages
- Rate limiting information

#### 3. Performance Guide

**Required Documentation**:

- Performance tuning recommendations
- Monitoring and alerting setup
- Capacity planning guidelines
- Optimization best practices

## Cascading File Resolution System

### File Resolution Overview

The cascading file resolution system enables automatic file discovery and content transformation for extensionless requests. When a request is made for a path without a file extension, the system attempts to locate files with various extensions in a configurable priority order, then applies appropriate content transformations before serving the response.

### File Resolution Core Requirements

#### 1. Extensionless File Resolution

**Requirement**: The system must automatically resolve extensionless requests by checking for files with common extensions in priority order.

**Examples**:

- `/docs/readme` → checks for `/docs/readme.html`, `/docs/readme.md`, `/docs/readme.json`, etc.
- `/api/users` → checks for `/api/users.json`, `/api/users.csv`, `/api/users.txt`
- `/content/page` → checks for `/content/page.html`, `/content/page.md`

**Default Extension Priority**: `.html`, `.md`, `.json`, `.csv`, `.txt`, `.xml`

#### 2. HTTP HEAD Request Validation

**Requirement**: The system must use HTTP HEAD requests to verify file existence on target domains before attempting to fetch content.

**Implementation Details**:

- Non-intrusive file existence checking
- Minimal bandwidth usage for validation
- Circuit breaker protection for failing domains
- Configurable timeout and retry mechanisms

#### 3. Content Transformation Pipeline

**Requirement**: The system must transform content based on file type before serving to clients.

**Built-in Transformers**:

- **Markdown to HTML**: Convert `.md` files to HTML with proper styling
- **JSON Formatting**: Pretty-print JSON with syntax highlighting
- **CSV to HTML Table**: Convert CSV data to formatted HTML tables
- **XML Formatting**: Format XML with proper indentation and highlighting
- **Plain Text**: Serve text files with appropriate content-type headers

**Transformer Configuration**:

```javascript
{
  "transformers": {
    "markdown": {
      "enabled": true,
      "options": {
        "breaks": true,
        "linkify": true,
        "typographer": true
      }
    },
    "json": {
      "enabled": true,
      "options": {
        "indent": 2,
        "highlightSyntax": true
      }
    },
    "csv": {
      "enabled": true,
      "options": {
        "delimiter": ",",
        "headers": true,
        "tableClass": "csv-table"
      }
    }
  }
}
```

#### 4. Per-Domain Configuration

**Requirement**: File resolution settings must be configurable per domain to support different use cases.

**Configuration Examples**:

```bash
# Domain-specific extension priorities
FILE_RESOLUTION_EXTENSIONS_ddt_com=.html,.md,.json
FILE_RESOLUTION_EXTENSIONS_api_example_com=.json,.csv,.txt

# Domain-specific transformer settings
FILE_RESOLUTION_TRANSFORMERS_docs_site_com=markdown,json
FILE_RESOLUTION_TRANSFORMERS_api_site_com=json,csv
```

#### 5. Caching Strategy

**Requirement**: The system must cache both positive and negative file resolution results to optimize performance.

**Cache Types**:

- **Positive Cache**: Store successful file resolutions with content metadata
- **Negative Cache**: Store failed resolution attempts to avoid repeated checks
- **Transformer Cache**: Cache transformed content to avoid reprocessing

**Cache Configuration**:

```javascript
{
  "fileResolutionCache": {
    "positiveTTL": 3600,    // 1 hour for successful resolutions
    "negativeTTL": 300,     // 5 minutes for failed resolutions
    "transformerTTL": 7200, // 2 hours for transformed content
    "maxSize": 1000         // Maximum cache entries
  }
}
```

#### 6. Circuit Breaker Protection

**Requirement**: The system must protect against cascading failures when target domains become unavailable.

**Circuit Breaker Settings**:

- **Failure Threshold**: 5 consecutive failures
- **Recovery Timeout**: 30 seconds
- **Half-Open Test**: Single request to test recovery
- **Success Threshold**: 3 consecutive successes to close circuit

### File Resolution Technical Specification

#### 1. File Resolver Engine

**Component**: `file-resolver.js`

**Responsibilities**:

- Execute cascading file resolution logic
- Perform HTTP HEAD requests for file existence checking
- Manage circuit breaker state for domains
- Cache resolution results (positive and negative)
- Coordinate with transformer plugins

**API Interface**:

```javascript
class FileResolver {
  // Resolve file for extensionless request
  async resolveFile(domain, path, extensions = [])
  
  // Check if file exists using HTTP HEAD
  async checkFileExists(url)
  
  // Get circuit breaker status for domain
  getCircuitBreakerStatus(domain)
  
  // Clear cache for specific domain/path
  clearCache(domain, path = null)
}
```

#### 2. Transformer Plugin System

**Component**: `transformers/index.js`

**Responsibilities**:

- Load and manage transformer plugins
- Execute content transformations based on file type
- Cache transformed content
- Handle transformation errors gracefully

**Plugin Interface**:

```javascript
class TransformerPlugin {
  // Check if plugin can handle file type
  canTransform(fileExtension, contentType)
  
  // Transform content
  async transform(content, options = {})
  
  // Get output content type
  getOutputContentType()
  
  // Validate transformation options
  validateOptions(options)
}
```

#### 3. Integration Points

**Proxy Manager Integration**:

- File resolution middleware executes before normal proxy flow
- Successful resolutions bypass normal proxying
- Failed resolutions fall back to standard proxy behavior

**Cache Manager Integration**:

- File resolution uses specialized cache keys: `file-resolution:{domain}:{path}`
- Transformer cache uses keys: `transformer:{type}:{hash}`
- Integration with existing cache purging mechanisms

**Metrics Integration**:

- File resolution attempt counters
- Cache hit/miss rates for file resolution
- Transformer execution times and success rates
- Circuit breaker state changes

#### 4. Performance Requirements

**Response Time Targets**:

- File existence check: < 100ms per extension
- Content transformation: < 200ms for typical files
- Cache retrieval: < 5ms for cached results
- Total resolution overhead: < 500ms for cache misses

**Throughput Requirements**:

- Support 100+ concurrent file resolution requests
- Handle 1000+ cached resolutions per second
- Process transformer operations without blocking

**Resource Usage Limits**:

- File resolution cache: < 100MB memory usage
- Transformer cache: < 200MB memory usage
- HTTP connection pool: < 50 concurrent connections per domain

#### 5. Error Handling and Fallbacks

**Error Scenarios**:

1. **Target Domain Unreachable**: Circuit breaker activation
2. **File Not Found**: Negative cache entry, fallback to normal proxy
3. **Transformation Failure**: Serve original content with warning headers
4. **Cache Corruption**: Clear affected cache entries, rebuild from source
5. **Configuration Errors**: Disable file resolution for affected domains

**Fallback Mechanisms**:

- Graceful degradation to normal proxy behavior
- Configurable fallback content for common scenarios
- Error response customization per domain
- Automatic recovery after temporary failures

#### 6. Security Considerations

**Security Requirements**:

- Path traversal prevention in file resolution
- Content-type validation for transformed content
- Rate limiting for file resolution requests
- Input sanitization for transformer options

**Security Headers**:

- Appropriate Content-Security-Policy for transformed content
- X-Content-Type-Options: nosniff for all responses
- X-Frame-Options for HTML transformations
- Cache-Control headers for sensitive content

### Monitoring and Observability

#### 1. Metrics Collection

**File Resolution Metrics**:

- `file_resolution_attempts_total{domain, extension}`: Total resolution attempts
- `file_resolution_cache_hits_total{domain, cache_type}`: Cache hit statistics
- `file_resolution_duration_seconds{domain, extension}`: Resolution latency
- `file_resolution_circuit_breaker_state{domain}`: Circuit breaker status

**Transformer Metrics**:

- `transformer_executions_total{type, domain}`: Transformation counts
- `transformer_duration_seconds{type}`: Transformation latency
- `transformer_cache_hits_total{type}`: Transformer cache statistics
- `transformer_errors_total{type, error_type}`: Transformation failures

#### 2. Health Checks

**Health Check Endpoints**:

- `/health/file-resolution`: Overall file resolution system health
- `/health/transformers`: Transformer plugin status
- `/health/circuit-breakers`: Circuit breaker status for all domains

**Health Indicators**:

- File resolution success rate > 95%
- Average resolution time < 200ms
- Circuit breaker failure rate < 5%
- Transformer error rate < 1%

#### 3. Logging and Debugging

**Log Categories**:

- File resolution attempts and results
- Circuit breaker state changes
- Transformer execution and errors
- Cache operations and performance

**Debug Information**:

- Detailed resolution path for troubleshooting
- Transformer input/output samples
- Cache hit/miss analysis
- Performance bottleneck identification

### File Resolution Implementation Requirements

#### 1. Configuration Management

**Environment Variables**:

```bash
# Global file resolution settings
FILE_RESOLUTION_ENABLED=true
FILE_RESOLUTION_DEFAULT_EXTENSIONS=.html,.md,.json,.csv,.txt,.xml
FILE_RESOLUTION_TIMEOUT=5000
FILE_RESOLUTION_MAX_CONCURRENT=50

# Cache configuration
FILE_RESOLUTION_CACHE_POSITIVE_TTL=3600
FILE_RESOLUTION_CACHE_NEGATIVE_TTL=300
FILE_RESOLUTION_CACHE_MAX_SIZE=1000

# Circuit breaker settings
FILE_RESOLUTION_CIRCUIT_BREAKER_THRESHOLD=5
FILE_RESOLUTION_CIRCUIT_BREAKER_TIMEOUT=30000
FILE_RESOLUTION_CIRCUIT_BREAKER_RECOVERY_THRESHOLD=3

# Transformer settings
FILE_RESOLUTION_TRANSFORMERS_ENABLED=markdown,json,csv,xml,text
FILE_RESOLUTION_TRANSFORMER_CACHE_TTL=7200
```

**Runtime Configuration Updates**:

- API endpoints for updating file resolution settings
- Graceful configuration reloading without service interruption
- Configuration validation and rollback capabilities

#### 2. Testing Requirements

**Unit Test Coverage**:

- File resolution logic: 100%
- Transformer plugins: 100%
- Circuit breaker functionality: 100%
- Cache operations: 100%

**Integration Test Scenarios**:

- End-to-end file resolution with various extensions
- Transformer pipeline with different content types
- Circuit breaker behavior under failure conditions
- Cache performance under load

**Performance Test Benchmarks**:

- File resolution latency under concurrent load
- Memory usage with large cache sizes
- Transformer performance with various file sizes
- Circuit breaker recovery time

### File Resolution Documentation Requirements

#### 1. User Documentation

**Setup Guide**:

- Step-by-step file resolution configuration
- Domain-specific setup examples
- Transformer configuration options
- Troubleshooting common issues

**API Documentation**:

- File resolution management endpoints
- Configuration update procedures
- Monitoring and metrics access
- Cache management operations

#### 2. Developer Documentation

**Architecture Guide**:

- File resolution system design
- Transformer plugin development
- Integration patterns and best practices
- Performance optimization techniques

**Plugin Development Guide**:

- Transformer plugin interface specification
- Plugin registration and lifecycle
- Testing and validation procedures
- Example plugin implementations

## Browser Issue Fixes (Completed)

The following critical browser issues have been resolved in the current version:

### Module System Compatibility Fix

**Issue**: Module system mismatch causing runtime errors and preventing proper metrics collection.

**Solution**: Converted ES modules to CommonJS for consistency across the codebase:

- [`file-resolver.js`](../file-resolver.js) - Converted from ES modules to CommonJS
- [`file-resolution-cache.js`](../file-resolution-cache.js) - Converted from ES modules to CommonJS  
- [`transformers/index.js`](../transformers/index.js) - Converted from ES modules to CommonJS

**Impact**: Eliminated `getStats is not a function` errors, improved server stability, and enabled reliable metrics collection.

### Gzip Decompression Error Handling

**Issue**: CDN failing to properly decompress gzipped content from upstream servers, causing corrupted JavaScript files and browser syntax errors.

**Solution**: Implemented robust error handling in [`proxy-manager.js`](../proxy-manager.js):

- Enhanced decompression error handling with comprehensive logging
- Added fallback mechanisms for failed decompression
- Special protection for JavaScript files (returns 502 Bad Gateway instead of corrupted content)
- Improved content-encoding header management

**Impact**: Eliminated "Invalid or unexpected token" JavaScript syntax errors in browsers, improved content delivery reliability, and enhanced debugging capabilities.

### Content-Length Header Mismatch Fix

**Issue**: Node.js HTTP clients experiencing "Parse Error: Expected HTTP/" errors due to Content-Length header mismatches when serving decompressed gzip content.

**Root Cause**: When the proxy decompressed gzip content, the original Content-Length header (referring to compressed size) was sent with decompressed content, causing Node.js HTTP parser to expect more data than actually sent.

**Solution**: Implemented comprehensive header management in [`proxy-manager.js`](../proxy-manager.js):

- Conditional Content-Length header exclusion in `setupResponseHeaders()` for compressed responses
- Proper Content-Length setting after decompression in `handleProxyResponse()`
- Fallback to chunked transfer encoding when Content-Length cannot be determined
- Comprehensive logging for debugging header flow

**Impact**: Eliminated HTTP parsing errors in Node.js clients while maintaining compatibility with curl and other HTTP clients. Both clients now receive identical, correctly formatted responses.

### Testing and Validation

**Integration Tests**: Created [`test-fixes.js`](../test-fixes.js) to validate both fixes and prevent regression.

**Documentation**: Comprehensive fix documentation available in [`docs/browser-issue-fixes.md`](browser-issue-fixes.md).

## Future Enhancements

The following features may be considered for future versions:

1. **Distributed Caching**
   - Redis integration for shared cache
   - Cluster-aware cache invalidation
   - Cross-region cache synchronization

2. **Advanced File Resolution**
   - WebAssembly-based transformers for better performance
   - Real-time file watching and cache invalidation
   - Content negotiation based on Accept headers
   - Custom transformer plugin marketplace

3. **Edge Logic**
   - Custom response transformation with JavaScript runtime
   - Request manipulation based on complex rules
   - Content optimization at the edge (image resizing, minification)
   - Edge-side includes (ESI) support

4. **Advanced Routing**
   - A/B testing support with traffic splitting
   - Canary deployments with gradual rollout
   - Feature flagging with real-time updates
   - Geographic routing with latency optimization

5. **Authentication and Authorization**
   - API key management with rate limiting
   - OAuth integration with multiple providers
   - JWT validation and claims-based routing
   - Role-based access control for content

6. **Analytics and Intelligence**
   - Detailed usage reporting with custom dashboards
   - Traffic pattern analysis with ML insights
   - Performance insights with anomaly detection
   - Predictive caching based on usage patterns

7. **Enhanced Domain Routing**
   - Geographic routing based on domain with CDN integration
   - Load balancing across multiple backends with health checks
   - Health-based backend selection with automatic failover
   - Dynamic rule generation from external sources (databases, APIs)

8. **Content Management**
   - Git-based content deployment with webhooks
   - Content versioning with rollback capabilities
   - Automated content optimization (compression, format conversion)
   - Content delivery optimization based on device type

9. **Security Enhancements**
   - DDoS protection with rate limiting and IP blocking
   - Web Application Firewall (WAF) integration
   - SSL certificate automation with Let's Encrypt

## URL Transformation System

### Transformation Overview

The URL transformation system provides comprehensive URL masking capabilities by automatically detecting and rewriting all URLs in HTML, JavaScript, and CSS responses. This ensures that all URLs are routed through the proxy server, completely obscuring the original server's domain, IP address, and path structure from end users while maintaining full functionality and session state.

### URL Transformation Core Requirements

#### 1. Automatic URL Detection

**Requirement**: The system must automatically detect URLs in various content types and contexts.

**Supported Content Types**:

- HTML content (href, src, action, data-* attributes)
- JavaScript content (fetch calls, imports, location assignments, AJAX requests, string literals)
- CSS content (url() functions, @import statements, font sources)
- Inline styles and scripts within HTML

**Detection Patterns**:

- Absolute URLs: `https://example.com/path`
- Relative URLs: `/path/to/resource`, `../relative/path`
- Protocol-relative URLs: `//example.com/path`
- Fragment identifiers: `#section`
- Query parameters: `?param=value&other=data`

**JavaScript String Literals**: Fixed regex pattern `/(["'`])(https?:\/\/[^"'`\s]+)\1/gi` to properly capture URLs without syntax corruption

#### 2. URL Classification and Transformation

**Requirement**: The system must classify URLs and apply appropriate transformations based on their type and context.

**URL Types**:

- **External URLs**: Transform to route through proxy
- **Internal URLs**: Preserve relative structure while ensuring proxy routing
- **Fragment URLs**: Preserve functionality for single-page applications
- **Data URLs**: Pass through unchanged for embedded content
- **JavaScript URLs**: Handle special cases like `javascript:void(0)`

**Transformation Logic**:

```javascript
// Original URL in content
https://backend.example.com/api/users

// Transformed URL through proxy
https://proxy.domain.com/api/users
```

#### 3. Content Type Support

**Requirement**: The system must support transformation across multiple content types with context-aware processing.

**HTML Transformation**:

- Attribute-based URLs: `href`, `src`, `action`, `data-*`
- Inline event handlers: `onclick`, `onload`, etc.
- Meta refresh redirects
- Base href elements

**JavaScript Transformation**:

- Fetch API calls: `fetch('/api/data')`
- XMLHttpRequest URLs
- Dynamic imports: `import('/module.js')`
- Location assignments: `window.location.href = '/page'`
- AJAX library calls (jQuery, Axios, etc.)

**CSS Transformation**:

- URL functions: `url('/images/bg.jpg')`
- Import statements: `@import '/styles/theme.css'`
- Font sources: `src: url('/fonts/font.woff')`

#### 4. URL Preservation Features

**Requirement**: The system must preserve URL functionality and parameters during transformation.

**Preservation Requirements**:

- Query parameters: `?search=term&page=2`
- Fragment identifiers: `#section-anchor`
- URL encoding: Maintain proper encoding/decoding
- Special characters: Handle Unicode and encoded characters
- Case sensitivity: Preserve original case where required

#### 5. Performance and Caching

**Requirement**: The system must provide optimal performance through intelligent caching and optimization.

**Caching Strategy**:

- **Pattern Cache**: Cache compiled regex patterns for URL detection
- **Transformation Cache**: Cache transformation results with LRU eviction
- **Content Cache**: Cache transformed content with configurable TTL
- **Negative Cache**: Cache failed transformation attempts

**Performance Targets**:

- URL detection: < 10ms for typical HTML pages
- Content transformation: < 100ms for pages up to 1MB
- Cache hit rate: > 90% for repeated content
- Memory usage: < 50MB for transformation cache

#### 6. Security and Validation

**Requirement**: The system must implement security measures to prevent malicious URL manipulation.

**Security Features**:

- URL validation to prevent XSS attacks
- Content-type verification for transformed content
- Input sanitization for URL parameters
- Rate limiting for transformation requests
- Audit logging for security events

**Validation Rules**:

- Reject malicious URL patterns
- Validate URL structure and encoding
- Prevent path traversal attacks
- Sanitize user-provided URL components

### URL Transformation Technical Specification

#### 1. URL Transformer Engine

**Component**: `url-transformer.js`

**Responsibilities**:

- Execute URL detection using compiled regex patterns
- Perform URL classification and transformation logic
- Manage transformation cache and performance optimization
- Handle error conditions and fallback mechanisms
- Integrate with existing path-rewriter and domain-manager

**API Interface**:

```javascript
class URLTransformer {
  // Transform content with URL rewriting
  async transformContent(content, contentType, options = {})
  
  // Transform individual URL
  transformURL(url, baseURL, options = {})
  
  // Validate URL for security
  validateURL(url)
  
  // Clear transformation cache
  clearCache(pattern = null)
  
  // Get transformation statistics
  getStats()
}
```

#### 2. Integration Points

**Proxy Manager Integration**:

- URL transformation executes during response processing
- Automatic content-type detection and transformation
- Maintains response headers and status codes
- Async/await support for transformation pipeline

**Configuration Integration**:

- Environment variable support for all transformation options
- Per-domain transformation settings
- Content-type filtering and exclusion rules
- Performance tuning parameters

**Monitoring Integration**:

- Transformation attempt counters and success rates
- Cache hit/miss statistics for transformation operations
- Performance metrics for transformation latency
- Error tracking and debugging information

#### 3. Configuration Options

**Environment Variables**:

```bash
# Enable URL transformation
URL_TRANSFORM_ENABLED=true

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
URL_TRANSFORM_MAX_SIZE=52428800  # 50MB
URL_TRANSFORM_CACHE_SIZE=10000
URL_TRANSFORM_DEBUG=false
```

**Advanced Configuration**:

```javascript
{
  "urlTransformation": {
    "enabled": true,
    "contentTypes": {
      "html": true,
      "javascript": true,
      "css": true,
      "inlineStyles": true,
      "dataAttributes": true
    },
    "preservation": {
      "fragments": true,
      "queryParameters": true,
      "encoding": true
    },
    "performance": {
      "maxContentSize": 52428800,
      "cacheSize": 10000,
      "cacheTTL": 3600
    },
    "security": {
      "validateUrls": true,
      "sanitizeInput": true,
      "auditLogging": true
    }
  }
}
```

#### 4. Error Handling and Fallbacks

**Error Scenarios**:

1. **Malformed Content**: Invalid HTML, JavaScript, or CSS syntax
2. **Transformation Failures**: Regex compilation or execution errors
3. **Memory Limits**: Content size exceeding configured limits
4. **Cache Corruption**: Invalid cache entries or storage failures
5. **Security Violations**: Malicious URL patterns or injection attempts

**Fallback Mechanisms**:

- Graceful degradation to original content on transformation failure
- Configurable fallback behavior per content type
- Error logging with detailed context for debugging
- Automatic cache clearing for corrupted entries
- Circuit breaker pattern for repeated failures

#### 5. Monitoring and Observability

**Metrics Collection**:

- `url_transform_attempts_total{content_type, domain}`: Total transformation attempts
- `url_transform_cache_hits_total{cache_type}`: Cache hit statistics
- `url_transform_duration_seconds{content_type}`: Transformation latency
- `url_transform_errors_total{error_type, content_type}`: Transformation failures
- `url_transform_urls_processed_total{url_type}`: URL processing statistics

**Health Indicators**:

- URL transformation success rate > 98%
- Average transformation time < 100ms
- Cache hit rate > 90%
- Error rate < 2%

**Debug Information**:

- Detailed transformation logs with URL patterns
- Cache performance analysis and optimization suggestions
- Content size and complexity metrics
- Security event logging and analysis

### URL Transformation Implementation Requirements

#### 1. Testing and Validation

**Unit Test Coverage**:

- URL detection patterns: 100%
- Transformation logic: 100%
- Error handling: 100%
- Security validation: 100%

**Integration Test Scenarios**:

- End-to-end content transformation with various content types
- Cache performance under load conditions
- Security validation with malicious input
- Fallback behavior during failure conditions

**Performance Test Benchmarks**:

- Transformation latency under concurrent load
- Memory usage with large content and cache sizes
- Cache efficiency with various content patterns
- Scalability with increasing transformation volume

#### 2. Documentation Requirements

**User Documentation**:

- Configuration guide with examples for common scenarios
- Troubleshooting guide for transformation issues
- Performance tuning recommendations
- Security best practices and considerations

**Developer Documentation**:

- URL transformation system architecture and design
- Integration patterns and extension points
- Testing and validation procedures
- Performance optimization techniques

### URL Transformation Success Criteria

1. **Functionality**: Complete URL masking with 100% domain obscuration
2. **Performance**: < 100ms transformation overhead for typical content
3. **Reliability**: > 98% transformation success rate
4. **Security**: Zero successful URL-based attacks or injections
5. **Compatibility**: Support for all major content types and URL patterns

## Enhanced Cache Management System

### Cache Management Overview

The Advanced CDN application implements a comprehensive multi-tier cache management system that provides specialized caching for different types of operations, including response caching, URL transformation caching, and file resolution caching. The system includes advanced features such as nuclear cache clearing, detailed performance monitoring, and enhanced error handling.

### Core Cache Management Requirements

#### 1. Multi-Tier Cache Architecture

**Requirement**: The system must support multiple specialized cache types with independent management capabilities.

**Cache Types**:

- **Main Response Cache**: HTTP response caching with domain-aware keys
- **URL Transformation Cache**: Caching of URL transformation results for performance
- **File Resolution Cache**: Specialized caching for file resolution operations with dual TTL support

**Cache Isolation**:

- Each cache type must operate independently
- Cache failures in one type must not affect others
- Separate configuration and management for each cache type

#### 2. File Resolution Cache Management

**Requirement**: The system must provide specialized cache management for file resolution operations with dual TTL support for positive and negative results.

**API Endpoints**:

- `DELETE /api/cache/file-resolution` - Clear file resolution cache
- `GET /api/cache/file-resolution/stats` - Get file resolution cache statistics

**Features**:

- **Dual TTL System**: Different TTL for positive vs negative results
- **LRU Eviction**: Automatic cleanup when cache reaches capacity
- **Statistics Tracking**: Comprehensive metrics for positive/negative hit rates
- **Memory Management**: Detailed memory usage tracking and optimization

**Performance Requirements**:

- Cache hit rate: > 90% for optimal performance
- Memory usage: < 100MB for file resolution cache
- Cache lookup time: < 1ms for cached entries
- Statistics generation: < 10ms for comprehensive stats

#### 3. Nuclear Cache Clear System

**Requirement**: The system must provide system-wide cache clearing capabilities that coordinate across all cache types with comprehensive error handling and detailed feedback.

**API Endpoint**:

- `DELETE /api/cache/nuke` - Clear ALL caches system-wide

**Features**:

- **Multi-Cache Coordination**: Clears all cache types in a single operation
- **Error Isolation**: Individual cache failures don't prevent other caches from clearing
- **Comprehensive Logging**: Detailed operation logging for each cache type
- **Status Aggregation**: Multi-status response handling for partial failures

**Response Format**:

```javascript
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
```

#### 4. Enhanced Dashboard Integration

**Requirement**: The system must provide enhanced dashboard integration with comprehensive error handling and graceful degradation capabilities.

**Error Handling Features**:

- **Initialization Error Recovery**: Application continues if dashboard fails to initialize
- **Resource Cleanup**: Proper cleanup of intervals and resources during shutdown
- **Error Isolation**: Dashboard errors don't affect core CDN functionality
- **Comprehensive Logging**: Detailed error logging with context and stack traces
- **Graceful Degradation**: System remains functional without dashboard features

**Dashboard Integration Process**:

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

#### 5. Parameter Handling and User Feedback

**Requirement**: The system must provide detailed parameter validation and comprehensive user feedback for all cache management operations.

**Parameter Validation Features**:

- **Input Validation**: Comprehensive validation of all API parameters
- **Error Messages**: Clear, actionable error messages with context
- **Request Tracking**: Detailed logging of request processing steps
- **Response Metadata**: Additional context in API responses for debugging

**User Feedback Improvements**:

- **Detailed Error Responses**: Comprehensive error information with context
- **Operation Status**: Clear indication of operation success/failure
- **Timing Information**: Response time and processing duration
- **Resource Information**: Cache sizes, hit rates, and performance metrics

### Cache Management Technical Specifications

#### 1. Cache Architecture

**Cache Key Strategies**:

- **Main Cache**: `{method}:{domain}:{transformedPath}:{varyHeaders}`
- **URL Transformation Cache**: `{url}:{proxyHost}:{pathTransformation.target}`
- **File Resolution Cache**: `file-resolution:{domain}:{path}`

**Performance Targets**:

- Cache lookup time: < 1ms for all cache types
- Cache clearing time: < 100ms for individual caches
- Nuclear cache clear time: < 500ms for all caches
- Memory usage: < 250MB total for all caches combined

#### 2. Security and Access Control

**Security Requirements**:

- **Local Access Only**: All cache management APIs restricted to localhost
- **Comprehensive Audit Trail**: All cache operations logged with detailed context
- **Error Handling**: Graceful handling of unavailable cache modules
- **Rate Limiting**: Protection against cache management API abuse

#### 3. Monitoring and Observability

**Metrics Collection**:

- Cache hit/miss ratios for all cache types
- Memory usage and performance statistics
- Operation timing and success rates
- Error rates and debugging information

**Health Indicators**:

- Overall cache system health > 95%
- Individual cache performance within targets
- Error rates < 1% for all cache operations
- Memory usage within configured limits

### URL Transformation Cache Management

The URL transformation system implements comprehensive cache management with multiple clearing mechanisms and performance optimization features.</search>
</search_and_replace>

#### Cache Clearing Requirements

**API Endpoints**:

- The system must provide REST API endpoints for cache management
- `DELETE /api/cache/url-transform` - Clear entire URL transformation cache
- `GET /api/cache/url-transform/stats` - Retrieve cache performance statistics
- All cache management APIs must be restricted to localhost access only

**Automatic Cache Management**:

- The system must implement LRU (Least Recently Used) eviction policy
- Default maximum cache size: 10,000 entries (configurable via environment variables)
- Automatic removal of oldest entries when cache reaches capacity
- Graceful cache clearing during application shutdown

**Performance Monitoring**:

- The system must track cache hit/miss ratios for performance optimization
- Memory usage monitoring with configurable limits
- Transformation timing metrics for performance analysis
- Error rate tracking and debugging information

#### Cache Key Strategy

**Cache Key Format**:

```bash
{url}:{proxyHost}:{pathTransformation.target}
```

**Cache Isolation**:

- URL transformation cache must be separate from main application cache
- Cache keys must include context for proper domain isolation
- No cross-contamination between different transformation contexts

#### Security Requirements

**Access Control**:

- Cache management APIs must be restricted to localhost (127.0.0.1, ::1)
- Comprehensive error handling and logging for cache operations
- Audit trail for cache clearing operations
- Rate limiting protection for cache management endpoints

#### Performance Requirements

**Cache Performance Targets**:

- Cache hit rate: > 90% for optimal performance
- Memory usage: < 50MB for transformation cache
- Cache lookup time: < 1ms for cached entries
- Cache clearing time: < 100ms for complete cache clear

**Scalability Requirements**:

- Support for 10,000+ cached transformation results
- Efficient memory management with automatic cleanup
- Configurable cache size limits based on available memory
- Performance degradation protection through size limits

**Maintainability**: Clear code organization and comprehensive documentation

- Content Security Policy (CSP) generation and enforcement

**Monitoring and Observability**
    - Distributed tracing with OpenTelemetry
    - Real-time alerting with custom thresholds
    - Performance profiling with flame graphs
    - Capacity planning with predictive analytics

## Appendices

### A. Glossary

- **CDN**: Content Delivery Network
- **TTL**: Time To Live
- **Origin Server**: The source server that hosts the original content
- **Edge Server**: The CDN server that caches and serves content to users
- **Cache Hit**: When requested content is found in the cache
- **Cache Miss**: When requested content is not in the cache and must be fetched from origin
- **Purge**: The process of removing content from the cache
- **CORS**: Cross-Origin Resource Sharing
- **File Resolution**: The process of automatically discovering files with extensions for extensionless requests
- **Cascading Resolution**: Checking for files with multiple extensions in priority order
- **Transformer**: A plugin that converts content from one format to another (e.g., Markdown to HTML)
- **Circuit Breaker**: A protection mechanism that prevents repeated requests to failing services
- **Path Rewriting**: The process of transforming request paths based on domain-specific rules
- **Domain Mapping**: Configuration that maps incoming domains to specific backend paths or servers
- **Negative Cache**: Caching of failed resolution attempts to avoid repeated checks
- **HEAD Request**: An HTTP method used to check file existence without downloading content

### B. References

1. CDN Best Practices Documentation
2. Node.js Documentation: <https://nodejs.org/en/docs/>
3. Express.js Documentation: <https://expressjs.com/>
4. HTTP Caching Standards: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching>
