# Advanced CDN Logging Infrastructure

## Overview

The Advanced CDN Logging Infrastructure provides comprehensive request tracking, real-time monitoring, and analytics for all cache subsystems. This system captures detailed information about every operation, enabling deep insights into system performance, error patterns, and usage analytics.

## Architecture

### Core Components

1. **DetailedLogger** - Individual subsystem logger with buffering and rotation
2. **LogManager** - Centralized management with API key authentication
3. **LogStreamServer** - Real-time WebSocket streaming
4. **LogAPI** - RESTful API for log management and analytics
5. **SubsystemIntegration** - Proxy wrappers for existing cache systems

### Data Flow

```
Cache Operation → Subsystem Logger → Log Manager → [Stream Server, API Server, File Storage]
```

## Features

### Request Tracking
- **Unique Request IDs** - Every operation gets a UUID for tracing
- **Execution Timing** - Precise millisecond timing for performance analysis
- **Client Information** - IP addresses, user agents, and geographic data
- **Error Handling** - Stack traces and error context capture
- **Response Metadata** - Status codes, headers, and payload information

### Real-time Streaming
- **WebSocket Support** - Live log streaming to connected clients
- **Authentication** - API key-based access control
- **Filtering** - Client-side filtering by subsystem, status, IP, etc.
- **Rate Limiting** - Configurable message rate limits per client
- **Heartbeat** - Connection health monitoring

### Search and Analytics
- **Full-text Search** - Search across all log fields and metadata
- **Time Range Filtering** - Precise date/time range queries
- **Status Code Analysis** - Error rate tracking and distribution
- **Performance Metrics** - Response time analysis and trends
- **Client Analytics** - Top IPs, user agents, and geographic distribution

### Data Management
- **30-day Retention** - Automatic log rotation and cleanup
- **Compression** - Gzip compression for archived logs
- **Export Formats** - JSON, CSV, and plain text downloads
- **Selective Clearing** - Targeted log deletion with audit trails
- **Master Reset** - Complete log clearing with confirmation

## Configuration

### Environment Variables

```bash
# Logging Configuration
LOG_DIR=./logs
LOG_RETENTION_DAYS=30
LOG_COMPRESSION_ENABLED=true
LOG_DEBUG=true

# API Configuration
LOG_API_PORT=8080
LOG_STREAM_PORT=8081
LOG_API_ENABLED=true
LOG_STREAMING_ENABLED=true

# Performance
LOG_BUFFER_SIZE=1000
LOG_MAX_SEARCH_RESULTS=10000
LOG_RATE_LIMIT_PER_MINUTE=100
```

### Programmatic Configuration

```javascript
const { initializeLogging } = require('./src/logging');

await initializeLogging({
  logDir: './logs',
  apiPort: 8080,
  streamPort: 8081,
  retentionDays: 30,
  enableAPI: true,
  enableRealTimeStreaming: true,
  compressionEnabled: true,
  debugMode: true
});
```

## Integration

### Cache Manager Integration

```javascript
const { getLoggedCacheManager } = require('./src/logging');
const originalCacheManager = require('./src/cache/cache-manager');

// Wrap with logging
const cacheManager = getLoggedCacheManager(originalCacheManager);

// All operations are now logged
await cacheManager.get('key'); // Logged as CACHE operation
await cacheManager.set('key', 'value'); // Logged with timing
```

### URL Transformer Integration

```javascript
const { getLoggedUrlTransformer } = require('./src/logging');
const originalTransformer = require('./src/transform/url-transformer');

const urlTransformer = getLoggedUrlTransformer(originalTransformer);

// Transformation operations logged with URL counts
const result = await urlTransformer.transformContent(html, 'text/html');
```

### Proxy Manager Integration

```javascript
const { getLoggedProxyManager } = require('./src/logging');
const originalProxyManager = require('./src/proxy/proxy-manager');

const proxyManager = getLoggedProxyManager(originalProxyManager);

// HTTP requests logged with full context
app.use(proxyManager.handleRequest);
```

### Direct Logger Access

```javascript
const { getSubsystemLogger } = require('./src/logging');

const logger = getSubsystemLogger('custom-subsystem');
await logger.logRequest({
  method: 'CUSTOM',
  url: '/custom/operation',
  statusCode: 200,
  subsystemData: { operation: 'custom_task' }
});
```

## API Reference

### REST API Endpoints

#### Authentication
All API endpoints require authentication via `X-API-Key` header or `Authorization: Bearer <key>` header.

#### Subsystem Management

**GET /api/subsystems**
- Get all registered subsystems with statistics
- Response: `{ subsystems: [...], total: number }`

**GET /api/subsystems/:subsystem/stats**
- Get detailed statistics for specific subsystem
- Response: `{ totalRequests, totalErrors, averageResponseTime, ... }`

#### Log Search and Retrieval

**POST /api/logs/search**
```json
{
  "subsystems": ["cache-manager", "url-transformer"],
  "searchText": "error",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-02T00:00:00Z",
  "statusCodes": [500, 404],
  "methods": ["GET", "POST"],
  "clientIps": ["192.168.1.1"],
  "limit": 100,
  "offset": 0
}
```

**GET /api/logs/:subsystem**
- Get recent logs for specific subsystem
- Query params: `limit`, `offset`, `startDate`, `endDate`

#### Analytics

**GET /api/analytics/overview**
- Get system-wide analytics overview
- Response: `{ overview, recentActivity, timestamp }`

**GET /api/analytics/:subsystem?period=day**
- Get subsystem-specific analytics
- Periods: `hour`, `day`, `week`, `month`

#### Log Downloads

**POST /api/logs/download**
```json
{
  "subsystems": ["cache-manager"],
  "format": "json",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-02T00:00:00Z",
  "filters": { "statusCodes": [200] }
}
```
- Formats: `json`, `csv`, `txt`
- Returns file download

#### Log Management

**DELETE /api/logs/:subsystem**
```json
{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-02T00:00:00Z",
  "statusCodes": [404, 500],
  "force": false
}
```

**DELETE /api/logs**
```json
{
  "confirm": "MASTER_RESET"
}
```

#### API Key Management

**GET /api/keys**
- List all API keys (without revealing actual keys)

**POST /api/keys**
```json
{
  "name": "dashboard-access",
  "permissions": ["read", "write"]
}
```

**DELETE /api/keys/:keyId**
- Revoke API key by partial ID

#### System Information

**GET /api/health**
- Health check endpoint

**GET /api/stats**
- Comprehensive system statistics

**GET /api/stats/performance**
- Performance metrics (memory, CPU usage)

### WebSocket API

#### Connection
```javascript
const ws = new WebSocket('ws://localhost:8081');
```

#### Authentication
```javascript
ws.send(JSON.stringify({
  type: 'authenticate',
  apiKey: 'your-api-key-here'
}));
```

#### Subscription
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  subsystems: ['cache-manager', 'url-transformer']
}));
```

#### Filtering
```javascript
ws.send(JSON.stringify({
  type: 'setFilters',
  filters: {
    statusCodes: [500, 404],
    methods: ['GET'],
    searchText: 'error',
    minLevel: 'error'
  }
}));
```

#### History Request
```javascript
ws.send(JSON.stringify({
  type: 'getHistory',
  limit: 100,
  subsystems: ['cache-manager']
}));
```

#### Message Types

**Incoming Messages:**
- `welcome` - Connection established
- `authResult` - Authentication result
- `subscriptionResult` - Subscription confirmation
- `filtersSet` - Filter confirmation
- `logEntry` - Real-time log entry
- `history` - Historical log entries
- `systemError` - System-level errors
- `error` - Client-specific errors
- `pong` - Heartbeat response

## Log Entry Format

### Standard Fields
```json
{
  "id": "req_1234567890_abcdef",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "method": "GET",
  "url": "/api/resource",
  "path": "cache-manager.get",
  "statusCode": 200,
  "responseTime": 45,
  "clientIp": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "userAgentParsed": {
    "browser": "Chrome",
    "version": "120.0",
    "os": "Windows",
    "device": "Desktop"
  },
  "headers": {
    "host": "example.com",
    "accept": "application/json"
  },
  "error": {
    "message": "Resource not found",
    "stack": "Error: Resource not found\n    at..."
  },
  "subsystemData": {
    "operation": "cache_get",
    "cacheKey": "user:123",
    "hit": false,
    "ttl": 3600
  }
}
```

### Subsystem-Specific Data

#### Cache Manager
```json
{
  "subsystemData": {
    "operation": "get|set|delete|clear",
    "cacheKey": "string",
    "hit": boolean,
    "ttl": number,
    "size": number
  }
}
```

#### URL Transformer
```json
{
  "subsystemData": {
    "operation": "transform",
    "contentType": "text/html",
    "originalLength": 1024,
    "transformedLength": 1156,
    "originalUrls": 5,
    "transformedUrls": 3,
    "transformationCount": 2
  }
}
```

#### File Resolution Cache
```json
{
  "subsystemData": {
    "operation": "resolve",
    "filePath": "/path/to/file.js",
    "resolved": true,
    "resultPath": "/actual/path/file.js",
    "mimeType": "application/javascript"
  }
}
```

#### Proxy Manager
```json
{
  "subsystemData": {
    "operation": "proxy",
    "targetUrl": "https://example.com/api",
    "responseHeaders": {},
    "bytesTransferred": 2048,
    "upstream": "server1"
  }
}
```

## Performance Considerations

### Memory Usage
- **Buffer Management** - Configurable buffer sizes per subsystem
- **Memory Monitoring** - Automatic memory usage tracking
- **Garbage Collection** - Efficient cleanup of old log entries

### Disk Usage
- **Log Rotation** - Daily log file rotation
- **Compression** - Gzip compression for archived logs
- **Cleanup** - Automatic deletion after retention period

### Network Performance
- **Rate Limiting** - Configurable rate limits for API and WebSocket
- **Compression** - WebSocket message compression
- **Batching** - Efficient batching of log entries

### CPU Usage
- **Async Operations** - Non-blocking log operations
- **Worker Threads** - Background processing for heavy operations
- **Caching** - In-memory caching for frequent queries

## Monitoring and Alerts

### Health Checks
- **System Health** - `/api/health` endpoint
- **Component Status** - Individual component health monitoring
- **Performance Metrics** - Memory, CPU, and disk usage tracking

### Error Handling
- **Graceful Degradation** - System continues operating if logging fails
- **Error Recovery** - Automatic recovery from transient failures
- **Circuit Breaker** - Protection against cascading failures

### Alerts
- **High Error Rates** - Configurable error rate thresholds
- **Performance Degradation** - Response time monitoring
- **Disk Space** - Log directory space monitoring
- **Memory Usage** - Memory leak detection

## Security

### Authentication
- **API Keys** - Secure API key generation and management
- **Permissions** - Granular permission system (read, write, delete)
- **Key Rotation** - Support for key rotation and revocation

### Data Protection
- **Sensitive Data** - Automatic filtering of sensitive information
- **Encryption** - Optional encryption for log files
- **Access Logging** - Audit trail for all log access

### Network Security
- **CORS** - Configurable CORS policies
- **Rate Limiting** - Protection against abuse
- **IP Filtering** - Optional IP-based access control

## Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check buffer sizes
curl -H "X-API-Key: your-key" http://localhost:8080/api/stats/performance

# Reduce buffer sizes in configuration
LOG_BUFFER_SIZE=500
```

#### Slow Search Performance
```bash
# Check search index size
curl -H "X-API-Key: your-key" http://localhost:8080/api/stats

# Reduce retention period
LOG_RETENTION_DAYS=7
```

#### WebSocket Connection Issues
```bash
# Check stream server status
curl -H "X-API-Key: your-key" http://localhost:8080/api/stats

# Verify WebSocket port is accessible
telnet localhost 8081
```

### Debug Mode
Enable debug mode for detailed logging:
```bash
LOG_DEBUG=true
```

### Log Levels
- **ERROR** - System errors and failures
- **WARN** - Performance issues and warnings
- **INFO** - Normal operations and status
- **DEBUG** - Detailed debugging information

## Migration Guide

### From Basic Logging
1. Install new logging dependencies
2. Initialize logging system in main application
3. Replace direct logger calls with subsystem loggers
4. Update monitoring dashboards to use new API endpoints

### Configuration Migration
```javascript
// Old configuration
const winston = require('winston');
const logger = winston.createLogger({...});

// New configuration
const { initializeLogging } = require('./src/logging');
await initializeLogging({
  logDir: './logs',
  retentionDays: 30
});
```

## Best Practices

### Performance
- Use appropriate buffer sizes for your traffic volume
- Enable compression for archived logs
- Monitor memory usage regularly
- Use specific subsystem loggers instead of generic logging

### Security
- Rotate API keys regularly
- Use least-privilege permissions
- Monitor access logs for suspicious activity
- Enable rate limiting in production

### Monitoring
- Set up alerts for high error rates
- Monitor disk space usage
- Track response time trends
- Review log retention policies regularly

### Development
- Use debug mode during development
- Test with realistic data volumes
- Validate log entry formats
- Document custom subsystem data fields

## Support

For issues, questions, or feature requests:
- Check the troubleshooting section above
- Review the API documentation
- Monitor system health endpoints
- Enable debug mode for detailed diagnostics

## Version History

- **v1.0.0** - Initial release with core logging infrastructure
- **v1.1.0** - Added real-time streaming and WebSocket support
- **v1.2.0** - Enhanced analytics and search capabilities
- **v1.3.0** - Added comprehensive API management and documentation