# API Documentation

This document provides comprehensive documentation for all API endpoints available in the Advanced CDN application, with special focus on domain-to-path prefix management functionality.

## Base URL

All API endpoints are relative to your application's base URL:

```bash
https://your-cdn-domain.com
```

## Authentication

Most management endpoints require local access only (requests from localhost/127.0.0.1) for security purposes. Production deployments should implement proper authentication mechanisms.

## Health Check Endpoints

### GET /health

Returns the current health status of the application including domain routing information.

**Request:**

```bash
curl -X GET https://your-cdn-domain.com/health
```

**Response (Basic):**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Response (Detailed - when HEALTH_CHECK_DETAILED=true):**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "system": {
    "memory": {
      "used": 134217728,
      "total": 8589934592,
      "percentage": 1.56
    },
    "cpu": {
      "usage": 15.2
    }
  },
  "pathRewriting": {
    "enabled": true,
    "domainsConfigured": 5,
    "rulesCompiled": true,
    "cacheHitRate": 0.95,
    "transformationsPerformed": 1250
  },
  "domainRouting": {
    "ddt.com": {
      "status": "healthy",
      "prefix": "/ddt",
      "lastCheck": "2024-01-15T10:29:45.000Z",
      "responseTime": 45
    },
    "blog.allabout.network": {
      "status": "healthy",
      "prefix": "/blog",
      "lastCheck": "2024-01-15T10:29:45.000Z",
      "responseTime": 32
    }
  },
  "cache": {
    "enabled": true,
    "hitRate": 0.87,
    "items": 450,
    "maxItems": 1000
  }
}
```

## Metrics Endpoints

### GET /metrics

Returns Prometheus-compatible metrics including domain-to-path prefix rewriting statistics.

**Request:**

```bash
curl -X GET https://your-cdn-domain.com/metrics
```

**Response:**

```bash
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200",domain="ddt.com"} 1250
http_requests_total{method="GET",status="200",domain="allabout.network"} 890

# HELP path_rewrite_transformations_total Total number of path transformations
# TYPE path_rewrite_transformations_total counter
path_rewrite_transformations_total{domain="ddt.com",prefix="/ddt"} 1250
path_rewrite_transformations_total{domain="blog.allabout.network",prefix="/blog"} 340

# HELP path_rewrite_duration_seconds Time spent on path transformations
# TYPE path_rewrite_duration_seconds histogram
path_rewrite_duration_seconds_bucket{domain="ddt.com",le="0.001"} 1200
path_rewrite_duration_seconds_bucket{domain="ddt.com",le="0.005"} 1250
path_rewrite_duration_seconds_bucket{domain="ddt.com",le="+Inf"} 1250

# HELP cache_operations_total Total cache operations
# TYPE cache_operations_total counter
cache_operations_total{operation="hit",domain="ddt.com"} 1087
cache_operations_total{operation="miss",domain="ddt.com"} 163

# HELP domain_routing_health Domain routing health status
# TYPE domain_routing_health gauge
domain_routing_health{domain="ddt.com"} 1
domain_routing_health{domain="blog.allabout.network"} 1
```

## Cache Management Endpoints

### GET /api/cache/stats

Returns detailed cache statistics including domain-specific information.

**Request:**

```bash
curl -X GET http://localhost:3000/api/cache/stats
```

**Response:**

```json
{
  "enabled": true,
  "totalItems": 450,
  "maxItems": 1000,
  "hitRate": 0.87,
  "missRate": 0.13,
  "totalHits": 3915,
  "totalMisses": 585,
  "totalRequests": 4500,
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
    },
    "allabout.network": {
      "items": 175,
      "hits": 2531,
      "misses": 379,
      "hitRate": 0.87,
      "prefix": null
    }
  },
  "pathPrefixStats": {
    "/ddt": {
      "items": 180,
      "hits": 1087,
      "misses": 163
    },
    "/blog": {
      "items": 95,
      "hits": 297,
      "misses": 43
    }
  }
}
```

### GET /api/cache/keys

Returns all cache keys from each of the application's caches with optional pattern filtering.

**Request (All Keys):**

```bash
curl -X GET http://localhost:3000/api/cache/keys
```

**Request (With Pattern Filter):**

```bash
curl -X GET "http://localhost:3000/api/cache/keys?pattern=*ddt.com*"
```

**Request (With Wildcard Pattern):**

```bash
curl -X GET "http://localhost:3000/api/cache/keys?pattern=GET:*:/images/*"
```

**Response:**

```json
{
  "success": true,
  "message": "Cache keys retrieved successfully",
  "data": {
    "caches": {
      "main": [
        "GET:ddt.com:/about:transformed=/ddt/about:target=main--allaboutv2--ddttom.hlx.live",
        "GET:blog.allabout.network:/posts:transformed=/blog/posts:target=main--allaboutv2--ddttom.hlx.live",
        "GET:allabout.network:/images/logo.png"
      ],
      "urlTransform": [
        "transform:ddt.com:https://main--allaboutv2--ddttom.hlx.live/ddt/about",
        "transform:blog.allabout.network:https://main--allaboutv2--ddttom.hlx.live/blog/posts"
      ],
      "fileResolution": [
        "file:docs.example.com:/getting-started:md,html,txt",
        "file:api.example.com:/v1/users:json,xml"
      ]
    },
    "summary": {
      "main": 3,
      "urlTransform": 2,
      "fileResolution": 2,
      "total": 7
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (With Pattern Filter):**

```json
{
  "success": true,
  "message": "Cache keys retrieved successfully",
  "data": {
    "caches": {
      "main": [
        "GET:ddt.com:/about:transformed=/ddt/about:target=main--allaboutv2--ddttom.hlx.live"
      ],
      "urlTransform": [
        "transform:ddt.com:https://main--allaboutv2--ddttom.hlx.live/ddt/about"
      ],
      "fileResolution": []
    },
    "summary": {
      "main": 1,
      "urlTransform": 1,
      "fileResolution": 0,
      "total": 2
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Query Parameters:**

- `pattern` (optional): Pattern to filter cache keys. Supports wildcards (`*`) and exact matches.

**Cache Types:**

- `main`: General response cache with domain and path transformation information
- `urlTransform`: URL transformation cache for rewritten URLs
- `fileResolution`: File resolution cache for extensionless file lookups

### DELETE /api/cache

Purges cache entries with optional pattern matching and domain filtering.

**Request (Purge All):**

```bash
curl -X DELETE http://localhost:3000/api/cache
```

**Request (Purge by Pattern):**

```bash
curl -X DELETE "http://localhost:3000/api/cache?pattern=*.css"
```

**Request (Purge by Domain):**

```bash
curl -X DELETE "http://localhost:3000/api/cache?domain=ddt.com"
```

**Request (Purge by Domain and Pattern):**

```bash
curl -X DELETE "http://localhost:3000/api/cache?domain=ddt.com&pattern=/images/*"
```

**Response:**

```json
{
  "success": true,
  "message": "Cache purged successfully",
  "itemsRemoved": 45,
  "domainsAffected": ["ddt.com"],
  "prefixesAffected": ["/ddt"]
}
```

## Domain Management Endpoints

### GET /api/domains

Returns information about configured domains and their path mappings.

**Request:**

```bash
curl -X GET http://localhost:3000/api/domains
```

**Response:**

```json
{
  "pathRewritingEnabled": true,
  "totalDomains": 5,
  "originDomain": "allabout.network",
  "targetDomain": "main--allaboutv2--ddttom.hlx.live",
  "domains": {
    "allabout.network": {
      "type": "origin",
      "pathPrefix": null,
      "target": "main--allaboutv2--ddttom.hlx.live",
      "https": true,
      "status": "active"
    },
    "ddt.com": {
      "type": "mapped",
      "pathPrefix": "/ddt",
      "target": "main--allaboutv2--ddttom.hlx.live",
      "https": true,
      "status": "active",
      "transformationRule": "simple_prefix"
    },
    "blog.allabout.network": {
      "type": "mapped",
      "pathPrefix": "/blog",
      "target": "main--allaboutv2--ddttom.hlx.live",
      "https": true,
      "status": "active",
      "transformationRule": "simple_prefix"
    },
    "api.example.com": {
      "type": "mapped",
      "pathPrefix": "/api",
      "target": "api-backend.example.com",
      "https": true,
      "status": "active",
      "transformationRule": "regex",
      "regexRules": [
        {
          "pattern": "^/v1/(.*)",
          "replacement": "/api/v1/$1"
        },
        {
          "pattern": "^/v2/(.*)",
          "replacement": "/api/v2/$1"
        }
      ]
    }
  },
  "fallbackConfig": {
    "enabled": true,
    "prefix": "/default",
    "target": "main--allaboutv2--ddttom.hlx.live"
  },
  "cacheConfig": {
    "enabled": true,
    "domainAware": true,
    "pathPrefixAware": true
  }
}
```

### POST /api/domains/reload

Reloads domain configuration from environment variables without restarting the application.

**Request:**

```bash
curl -X POST http://localhost:3000/api/domains/reload
```

**Response:**

```json
{
  "success": true,
  "message": "Domain configuration reloaded successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "changes": {
    "domainsAdded": ["new-domain.com"],
    "domainsRemoved": [],
    "domainsModified": ["ddt.com"],
    "rulesRecompiled": 5
  },
  "newConfiguration": {
    "totalDomains": 6,
    "pathRewritingEnabled": true,
    "cacheCleared": false
  }
}
```

### GET /api/domains/{domain}

Returns detailed information about a specific domain configuration.

**Request:**

```bash
curl -X GET http://localhost:3000/api/domains/ddt.com
```

**Response:**

```json
{
  "domain": "ddt.com",
  "type": "mapped",
  "pathPrefix": "/ddt",
  "target": "main--allaboutv2--ddttom.hlx.live",
  "https": true,
  "status": "active",
  "transformationRule": "simple_prefix",
  "statistics": {
    "totalRequests": 1250,
    "transformationsPerformed": 1250,
    "cacheHits": 1087,
    "cacheMisses": 163,
    "averageResponseTime": 45,
    "lastRequest": "2024-01-15T10:29:45.000Z"
  },
  "healthCheck": {
    "status": "healthy",
    "lastCheck": "2024-01-15T10:29:45.000Z",
    "responseTime": 45,
    "consecutiveFailures": 0
  },
  "exampleTransformations": [
    {
      "input": "ddt.com/about",
      "output": "main--allaboutv2--ddttom.hlx.live/ddt/about"
    },
    {
      "input": "ddt.com/projects/web",
      "output": "main--allaboutv2--ddttom.hlx.live/ddt/projects/web"
    }
  ]
}
```

## Path Rewriting Test Endpoints

### POST /api/domains/test-transformation

Tests path transformation for a given domain and path without making actual requests.

**Request:**

```bash
curl -X POST http://localhost:3000/api/domains/test-transformation \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "ddt.com",
    "path": "/about/team"
  }'
```

**Response:**

```json
{
  "success": true,
  "input": {
    "domain": "ddt.com",
    "path": "/about/team"
  },
  "transformation": {
    "applied": true,
    "rule": "simple_prefix",
    "originalPath": "/about/team",
    "transformedPath": "/ddt/about/team",
    "target": "main--allaboutv2--ddttom.hlx.live",
    "fullUrl": "https://main--allaboutv2--ddttom.hlx.live/ddt/about/team"
  },
  "cacheKey": "GET:ddt.com:/ddt/about/team",
  "timing": {
    "transformationTime": 0.0012,
    "cacheKeyGenerationTime": 0.0003
  }
}
```

### POST /api/domains/test-regex

Tests regex-based path transformations for complex routing rules.

**Request:**

```bash
curl -X POST http://localhost:3000/api/domains/test-regex \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "api.example.com",
    "path": "/v1/users/123",
    "rules": [
      {
        "pattern": "^/v1/(.*)",
        "replacement": "/api/v1/$1"
      }
    ]
  }'
```

**Response:**

```json
{
  "success": true,
  "input": {
    "domain": "api.example.com",
    "path": "/v1/users/123"
  },
  "transformations": [
    {
      "rule": {
        "pattern": "^/v1/(.*)",
        "replacement": "/api/v1/$1"
      },
      "matched": true,
      "originalPath": "/v1/users/123",
      "transformedPath": "/api/v1/users/123",
      "captureGroups": ["users/123"]
    }
  ],
  "finalTransformation": {
    "originalPath": "/v1/users/123",
    "transformedPath": "/api/v1/users/123",
    "target": "api-backend.example.com",
    "fullUrl": "https://api-backend.example.com/api/v1/users/123"
  }
}
```

## Nuclear Cache Management

### DELETE /api/cache/nuke

Clears ALL caches system-wide including general cache, URL transformation cache, and file resolution cache. This is a nuclear option that should be used with caution.

**Request:**

```bash
curl -X DELETE http://localhost:3000/api/cache/nuke
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Nuclear cache clear completed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "clearedCaches": [
    {
      "name": "general",
      "itemsCleared": 450,
      "status": "success"
    },
    {
      "name": "urlTransformation",
      "itemsCleared": 1200,
      "status": "success"
    },
    {
      "name": "fileResolution",
      "itemsCleared": 85,
      "status": "success"
    }
  ],
  "totalItemsCleared": 1735
}
```

**Response (Partial Failure):**

```json
{
  "success": false,
  "message": "Nuclear cache clear completed with errors",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "clearedCaches": [
    {
      "name": "general",
      "itemsCleared": 450,
      "status": "success"
    },
    {
      "name": "urlTransformation",
      "itemsCleared": 0,
      "status": "error",
      "error": "Cache not available"
    }
  ],
  "totalItemsCleared": 450,
  "errors": 1
}
```

## Dashboard API Endpoints

### GET /api/discovery/endpoints

Returns all discovered API endpoints in the application.

**Request:**

```bash
curl -X GET http://localhost:3000/api/discovery/endpoints
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "path": "/health",
      "method": "GET",
      "category": "monitoring",
      "description": "Health check endpoint"
    },
    {
      "path": "/api/cache",
      "method": "DELETE",
      "category": "cache",
      "description": "Cache purge endpoint"
    }
  ],
  "meta": {
    "total": 15,
    "lastScan": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /api/discovery/categories

Returns available API endpoint categories.

**Request:**

```bash
curl -X GET http://localhost:3000/api/discovery/categories
```

**Response:**

```json
{
  "success": true,
  "categories": [
    {
      "name": "monitoring",
      "count": 3,
      "endpoints": ["/health", "/metrics"]
    },
    {
      "name": "cache",
      "count": 5,
      "endpoints": ["/api/cache", "/api/cache/stats"]
    },
    {
      "name": "dashboard",
      "count": 4,
      "endpoints": ["/api/dashboard/status", "/api/dashboard/config"]
    }
  ]
}
```

### POST /api/discovery/scan

Triggers a rescan of available API endpoints.

**Request:**

```bash
curl -X POST http://localhost:3000/api/discovery/scan
```

**Response:**

```json
{
  "success": true,
  "message": "API endpoint scan completed",
  "discovered": 15,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/docs/openapi.json

Returns the OpenAPI specification for the API.

**Request:**

```bash
curl -X GET http://localhost:3000/api/docs/openapi.json
```

**Response:**

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Advanced CDN API",
    "version": "1.0.0",
    "description": "API for managing the Advanced CDN application"
  },
  "paths": {
    "/health": {
      "get": {
        "summary": "Health check",
        "responses": {
          "200": {
            "description": "Application is healthy"
          }
        }
      }
    }
  }
}
```

### POST /api/test/endpoint

Tests a specific API endpoint for functionality.

**Request:**

```bash
curl -X POST http://localhost:3000/api/test/endpoint \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/health",
    "method": "GET"
  }'
```

**Response:**

```json
{
  "success": true,
  "endpoint": "/health",
  "method": "GET",
  "status": 200,
  "responseTime": 45,
  "result": "healthy"
}
```

### GET /api/dashboard/status

Returns the current status of the dashboard system.

**Request:**

```bash
curl -X GET http://localhost:3000/api/dashboard/status
```

**Response:**

```json
{
  "success": true,
  "status": "active",
  "uptime": 3600,
  "version": "1.0.0",
  "features": {
    "apiDiscovery": true,
    "realTimeMetrics": true,
    "endpointTesting": true
  }
}
```

### GET /api/dashboard/config

Returns the dashboard configuration.

**Request:**

```bash
curl -X GET http://localhost:3000/api/dashboard/config
```

**Response:**

```json
{
  "success": true,
  "config": {
    "refreshInterval": 5000,
    "maxLogEntries": 1000,
    "enableNotifications": true,
    "theme": "light"
  }
}
```

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid domain format",
  "code": "INVALID_DOMAIN",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Access denied. Management endpoints require local access.",
  "code": "ACCESS_DENIED",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Domain 'unknown.com' not found in configuration",
  "code": "DOMAIN_NOT_FOUND",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "Failed to reload domain configuration",
  "code": "CONFIG_RELOAD_FAILED",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "details": "Configuration file parsing error"
}
```

## Rate Limiting

When rate limiting is enabled, responses include rate limit headers:

```bash
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

Rate limit exceeded response:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## WebSocket Support

The application supports WebSocket connections for real-time monitoring:

### /ws/metrics

Real-time metrics streaming for monitoring dashboards.

**Connection:**

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/metrics');

ws.onmessage = function(event) {
  const metrics = JSON.parse(event.data);
  console.log('Real-time metrics:', metrics);
};
```

**Message Format:**

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "type": "metrics_update",
  "data": {
    "requests": {
      "total": 4500,
      "perSecond": 12.5
    },
    "pathRewriting": {
      "transformations": 1250,
      "averageTime": 0.0012
    },
    "domains": {
      "ddt.com": {
        "requests": 1250,
        "transformations": 1250
      }
    }
  }
}
```

## SDK Examples

### Node.js SDK Example

```javascript
import axios from 'axios';

class CDNApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 5000
    });
  }

  async getHealth() {
    const response = await this.client.get('/health');
    return response.data;
  }

  async getDomains() {
    const response = await this.client.get('/api/domains');
    return response.data;
  }

  async testTransformation(domain, path) {
    const response = await this.client.post('/api/domains/test-transformation', {
      domain,
      path
    });
    return response.data;
  }

  async purgeCache(options = {}) {
    const params = new URLSearchParams();
    if (options.pattern) params.append('pattern', options.pattern);
    if (options.domain) params.append('domain', options.domain);
    
    const response = await this.client.delete(`/api/cache?${params}`);
    return response.data;
  }
}

// Usage
const cdn = new CDNApiClient('http://localhost:3000');

// Test domain transformation
const result = await cdn.testTransformation('ddt.com', '/about');
console.log('Transformation result:', result);

// Purge cache for specific domain
await cdn.purgeCache({ domain: 'ddt.com', pattern: '/images/*' });
```

### Python SDK Example

```python
import requests
import json

class CDNApiClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.timeout = 5

    def get_health(self):
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()

    def get_domains(self):
        response = self.session.get(f"{self.base_url}/api/domains")
        response.raise_for_status()
        return response.json()

    def test_transformation(self, domain, path):
        data = {"domain": domain, "path": path}
        response = self.session.post(
            f"{self.base_url}/api/domains/test-transformation",
            json=data
        )
        response.raise_for_status()
        return response.json()

    def purge_cache(self, pattern=None, domain=None):
        params = {}
        if pattern:
            params['pattern'] = pattern
        if domain:
            params['domain'] = domain
        
        response = self.session.delete(
            f"{self.base_url}/api/cache",
            params=params
        )
        response.raise_for_status()
        return response.json()

# Usage
cdn = CDNApiClient('http://localhost:3000')

# Test domain transformation
result = cdn.test_transformation('ddt.com', '/about')
print('Transformation result:', result)

# Purge cache for specific domain
cdn.purge_cache(domain='ddt.com', pattern='/images/*')
```

## Monitoring Integration

### Prometheus Configuration

Add this job to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'advanced-cdn'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboard

Import the provided Grafana dashboard configuration to visualize:

- Request rates by domain
- Path transformation performance
- Cache hit rates by domain prefix
- Domain routing health status
- Response time distributions

## Security Considerations

1. **Local Access Only**: Management endpoints are restricted to localhost by default
2. **Rate Limiting**: Enable rate limiting in production environments
3. **HTTPS**: Use HTTPS for all production deployments
4. **Authentication**: Implement proper authentication for management endpoints
5. **Input Validation**: All inputs are validated and sanitized
6. **CORS**: Configure CORS appropriately for your use case

## File Resolution Management Endpoints

The application includes a sophisticated file resolution system that automatically searches for files with different extensions when extensionless requests are made. These endpoints allow you to manage and monitor the file resolution system.

### GET /api/file-resolution/status

Returns the current status and configuration of the file resolution system.

**Request:**

```bash
curl -X GET http://localhost:3000/api/file-resolution/status
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

### GET /api/file-resolution/stats

Returns detailed statistics about file resolution operations.

**Request:**

```bash
curl -X GET http://localhost:3000/api/file-resolution/stats
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

### GET /api/file-resolution/cache

Returns information about the file resolution cache.

**Request:**

```bash
curl -X GET http://localhost:3000/api/file-resolution/cache
```

**Response:**

```json
{
  "enabled": true,
  "maxSize": 1000,
  "currentSize": 245,
  "hitRate": 0.87,
  "positiveTtl": 300,
  "negativeTtl": 60,
  "entries": [
    {
      "key": "file:docs.example.com:/getting-started",
      "type": "positive",
      "extension": "md",
      "size": 2048,
      "ttl": 287,
      "hits": 15,
      "lastAccess": "2024-01-15T10:29:45.000Z"
    },
    {
      "key": "file:api.example.com:/nonexistent",
      "type": "negative",
      "ttl": 45,
      "hits": 3,
      "lastAccess": "2024-01-15T10:29:30.000Z"
    }
  ],
  "statistics": {
    "totalHits": 892,
    "totalMisses": 358,
    "positiveEntries": 189,
    "negativeEntries": 56,
    "averageEntrySize": 1024,
    "memoryUsage": "245KB"
  }
}
```

### DELETE /api/file-resolution/cache

Clears the file resolution cache with optional filtering.

**Request (Clear All):**

```bash
curl -X DELETE http://localhost:3000/api/file-resolution/cache
```

**Request (Clear by Domain):**

```bash
curl -X DELETE "http://localhost:3000/api/file-resolution/cache?domain=docs.example.com"
```

**Request (Clear by Extension):**

```bash
curl -X DELETE "http://localhost:3000/api/file-resolution/cache?extension=md"
```

**Request (Clear by Type):**

```bash
curl -X DELETE "http://localhost:3000/api/file-resolution/cache?type=negative"
```

**Response:**

```json
{
  "success": true,
  "message": "File resolution cache cleared successfully",
  "entriesRemoved": 45,
  "domainsAffected": ["docs.example.com"],
  "extensionsAffected": ["md", "html"],
  "memoryFreed": "45KB"
}
```

### POST /api/file-resolution/test

Tests file resolution for a specific domain and path without caching the result.

**Request:**

```bash
curl -X POST http://localhost:3000/api/file-resolution/test \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "docs.example.com",
    "path": "/getting-started"
  }'
```

**Response (Successful Resolution):**

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

**Response (Failed Resolution):**

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

### POST /api/file-resolution/transform

Tests content transformation without performing file resolution.

**Request:**

```bash
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

### GET /api/file-resolution/domains/{domain}

Returns file resolution configuration and statistics for a specific domain.

**Request:**

```bash
curl -X GET http://localhost:3000/api/file-resolution/domains/docs.example.com
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

### POST /api/file-resolution/domains/{domain}/reload

Reloads file resolution configuration for a specific domain.

**Request:**

```bash
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

### GET /api/file-resolution/circuit-breaker

Returns circuit breaker status for all domains.

**Request:**

```bash
curl -X GET http://localhost:3000/api/file-resolution/circuit-breaker
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

### POST /api/file-resolution/circuit-breaker/{domain}/reset

Manually resets the circuit breaker for a specific domain.

**Request:**

```bash
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

### GET /api/file-resolution/transformers

Returns information about available content transformers.

**Request:**

```bash
curl -X GET http://localhost:3000/api/file-resolution/transformers
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

## File Resolution Error Responses

File resolution endpoints return specific error responses:

### 400 Bad Request - Invalid Configuration

```json
{
  "error": "Bad Request",
  "message": "Invalid file resolution configuration",
  "code": "INVALID_FILE_RESOLUTION_CONFIG",
  "details": {
    "field": "extensions",
    "reason": "Extensions array cannot be empty"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 404 Not Found - Domain Not Configured

```json
{
  "error": "Not Found",
  "message": "Domain 'unknown.com' not configured for file resolution",
  "code": "DOMAIN_NOT_CONFIGURED",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 503 Service Unavailable - Circuit Breaker Open

```json
{
  "error": "Service Unavailable",
  "message": "File resolution temporarily unavailable for domain",
  "code": "CIRCUIT_BREAKER_OPEN",
  "details": {
    "domain": "unreliable.example.com",
    "nextAttempt": "2024-01-15T10:35:00.000Z",
    "reason": "Consecutive failures exceeded threshold"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 422 Unprocessable Entity - Transformation Failed

```json
{
  "error": "Unprocessable Entity",
  "message": "Content transformation failed",
  "code": "TRANSFORMATION_FAILED",
  "details": {
    "transformer": "markdown",
    "reason": "Invalid markdown syntax",
    "line": 15,
    "column": 8
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Performance Optimization

1. **Rule Caching**: Compiled regex patterns are cached for optimal performance
2. **Connection Pooling**: HTTP connections to backends are pooled and reused
3. **Compression**: Enable gzip compression for better bandwidth utilization
4. **Clustering**: Use multiple worker processes for better CPU utilization
5. **Monitoring**: Use metrics to identify performance bottlenecks
6. **File Resolution Caching**: Both positive and negative file resolution results are cached
7. **Circuit Breaker Protection**: Failing domains are temporarily bypassed to maintain performance
8. **Content Transformation Optimization**: Transformers are optimized for speed and memory usage
