# Compute Functions Configuration Guide

This guide explains how to configure and use the compute functions system in the Advanced CDN. Compute functions process content after transformation but before URL transformation in the pipeline, allowing for global content modifications.

## Overview

The compute functions system provides a plugin-based architecture for processing extracted content objects. It includes built-in functions like URL relativization and supports custom compute functions.

### Key Features

- **Rule-based processing**: Uses existing domain configuration for intelligent transformations
- **Plugin architecture**: Easy to add new compute functions
- **Performance optimized**: Content size limits and timeout protection
- **Comprehensive logging**: Detailed statistics and monitoring
- **Error resilient**: Individual function failures don't break the pipeline

## Configuration

### Environment Variables

Add these environment variables to your `.env` file to enable and configure compute functions:

```bash
# Enable compute function system
COMPUTE_FUNCTIONS_ENABLED=true

# Performance settings
COMPUTE_MAX_CONTENT_SIZE=10485760  # 10MB default
COMPUTE_TIMEOUT=5000               # 5 seconds default
COMPUTE_DEBUG=false                # Enable debug logging

# URL Relativization compute function
URL_RELATIVIZATION_ENABLED=true
URL_RELATIVIZATION_DEBUG=false

# Additional URL patterns (JSON format)
URL_RELATIVIZATION_PATTERNS='[{"pattern": "https://example.com/path/", "replacement": "/", "description": "Convert example URLs"}]'

# Content types to process (comma-separated)
URL_RELATIVIZATION_CONTENT_TYPES='text/html,application/xhtml+xml,text/javascript,application/javascript,text/css,application/json'
```

### Configuration Structure

The compute functions configuration is automatically integrated with your existing domain configuration:

```javascript
// config.js structure
{
  computeFunctions: {
    enabled: true,
    maxContentSize: 10485760,
    timeout: 5000,
    debugMode: false,
    
    urlRelativization: {
      enabled: true,
      additionalPatterns: [],
      processableContentTypes: [...],
      debugTransformations: false
    }
  }
}
```

## URL Relativization Compute Function

The URL relativization compute function converts absolute URLs to relative paths using your existing domain configuration.

### How It Works

The function automatically builds transformation rules from your existing configuration:

1. **Origin Domain URLs**: `https://allabout.network/blogs/ddt/ai/` → `/ai/`
2. **Target Domain URLs**: `https://main--allaboutv2--ddttom.hlx.live/ddt/edge-services` → `/edge-services`
3. **Domain-specific Targets**: Custom backend URLs → relative paths
4. **Generic Origin URLs**: Any origin domain URL → relative path

### Configuration Examples

#### Basic Setup

```bash
# .env file
ORIGIN_DOMAIN=allabout.network
TARGET_DOMAIN=main--allaboutv2--ddttom.hlx.live
DOMAIN_PATH_MAPPING={"ddt.com": "/ddt"}

# Enable compute functions
COMPUTE_FUNCTIONS_ENABLED=true
URL_RELATIVIZATION_ENABLED=true
```

#### Advanced Configuration

```bash
# Multiple domain mappings
DOMAIN_PATH_MAPPING={"ddt.com": "/ddt", "api.example.com": "/api"}
DOMAIN_TARGETS={"ddt.com": "main--allaboutv2--ddttom.hlx.live", "api.example.com": "api-backend.example.com"}

# Custom URL patterns
URL_RELATIVIZATION_PATTERNS='[
  {
    "pattern": "https://legacy-site.com/content/",
    "replacement": "/",
    "description": "Convert legacy site URLs"
  },
  {
    "pattern": "https://cdn.example.com/assets/",
    "replacement": "/assets/",
    "description": "Convert CDN asset URLs"
  }
]'

# Debug mode for development
URL_RELATIVIZATION_DEBUG=true
COMPUTE_DEBUG=true
```

### Transformation Examples

#### HTML Content

**Input:**

```html
<a href="https://allabout.network/blogs/ddt/ai/">AI Article</a>
<img src="https://main--allaboutv2--ddttom.hlx.live/ddt/images/logo.png" alt="Logo">
<link rel="stylesheet" href="https://allabout.network/css/styles.css">
```

**Output:**

```html
<a href="/ai/">AI Article</a>
<img src="/images/logo.png" alt="Logo">
<link rel="stylesheet" href="/css/styles.css">
```

#### JavaScript Content

**Input:**

```javascript
fetch('https://allabout.network/blogs/ddt/api/data')
  .then(response => response.json());

const imageUrl = "https://main--allaboutv2--ddttom.hlx.live/ddt/images/banner.jpg";
```

**Output:**

```javascript
fetch('/api/data')
  .then(response => response.json());

const imageUrl = "/images/banner.jpg";
```

#### JSON Configuration

**Input:**

```json
{
  "apiEndpoint": "https://allabout.network/blogs/ddt/api/v1",
  "imageUrl": "https://main--allaboutv2--ddttom.hlx.live/ddt/images/logo.png",
  "externalService": "https://external-api.com/service"
}
```

**Output:**

```json
{
  "apiEndpoint": "/api/v1",
  "imageUrl": "/images/logo.png",
  "externalService": "https://external-api.com/service"
}
```

Note: External URLs are preserved unchanged.

## Monitoring and Statistics

### API Endpoints

Access compute function statistics through the management API:

```bash
# Get compute function statistics
curl http://localhost:3000/api/compute-functions/stats

# Reset compute function statistics
curl -X POST http://localhost:3000/api/compute-functions/reset-stats
```

### Statistics Response

```json
{
  "manager": {
    "enabled": true,
    "functionsRegistered": 1,
    "totalProcessed": 150,
    "totalModified": 45,
    "totalErrors": 0,
    "averageProcessingTime": 12.5,
    "modificationRate": 0.3,
    "errorRate": 0
  },
  "functions": {
    "url-relativization": {
      "name": "url-relativization",
      "enabled": true,
      "processed": 150,
      "modified": 45,
      "errors": 0,
      "urlsFound": 320,
      "urlsConverted": 180,
      "conversionRate": 0.5625,
      "rulesCount": 4
    }
  }
}
```

### Log Output

When debug mode is enabled, you'll see detailed logs:

```bash
[INFO] Compute functions applied: url=/test.html, totalModifications=3, functionsExecuted=1, processingTime=15ms
[DEBUG] Applied URL transformation rule: ruleType=origin-path-prefix, matches=2, url=/test.html
[DEBUG] URL relativization completed: urlsConverted=3, rulesMatched=2, processingTime=15ms
```

## Performance Considerations

### Content Size Limits

- Default maximum content size: 10MB
- Large content is automatically skipped
- Configurable via `COMPUTE_MAX_CONTENT_SIZE`

### Timeout Protection

- Default timeout: 5 seconds per compute function
- Prevents hanging on complex content
- Configurable via `COMPUTE_TIMEOUT`

### Caching Integration

Compute functions run after content transformation but before URL transformation, ensuring:

- Transformed content is cached with compute function modifications
- No duplicate processing on cache hits
- Optimal performance for repeated requests

## Troubleshooting

### Common Issues

#### Compute Functions Not Running

1. Check if enabled: `COMPUTE_FUNCTIONS_ENABLED=true`
2. Verify URL relativization is enabled: `URL_RELATIVIZATION_ENABLED=true`
3. Check logs for initialization errors

#### URLs Not Being Converted

1. Verify domain configuration in `ORIGIN_DOMAIN` and `TARGET_DOMAIN`
2. Check `DOMAIN_PATH_MAPPING` for correct path prefixes
3. Enable debug mode: `URL_RELATIVIZATION_DEBUG=true`
4. Review content type compatibility

#### Performance Issues

1. Check content size limits: `COMPUTE_MAX_CONTENT_SIZE`
2. Monitor processing times in logs
3. Adjust timeout if needed: `COMPUTE_TIMEOUT`
4. Review statistics for error rates

### Debug Mode

Enable comprehensive debugging:

```bash
COMPUTE_DEBUG=true
URL_RELATIVIZATION_DEBUG=true
LOG_LEVEL=debug
```

This provides detailed logs for:

- Function initialization
- Rule building process
- URL transformation details
- Performance metrics
- Error diagnostics

## Integration with Existing Features

### Domain Management

Compute functions automatically integrate with:

- Domain path mapping (`DOMAIN_PATH_MAPPING`)
- Domain targets (`DOMAIN_TARGETS`)
- Domain routing rules (`DOMAIN_ROUTING_RULES`)

### File Resolution

Works seamlessly with:

- File extension resolution
- Content transformers (Markdown, JSON, etc.)
- Cache management

### URL Transformation

Compute functions run before URL transformation:

1. Content transformation (Markdown → HTML, etc.)
2. **Compute functions** (URL relativization, etc.)
3. URL transformation (proxy URL rewriting)
4. Response caching

## Custom Compute Functions

### Creating Custom Functions

Extend the base compute function class:

```javascript
const BaseComputeFunction = require('./base-compute-function');

class CustomCompute extends BaseComputeFunction {
  constructor(config = {}) {
    super('custom-function', config);
  }
  
  canProcess(content, contentType, context) {
    return this.enabled && typeof content === 'string';
  }
  
  async compute(content, contentType, context) {
    // Your custom processing logic
    return {
      content: modifiedContent,
      modified: true,
      computeFunction: this.name
    };
  }
}
```

### Registration

Add to the compute function manager:

```javascript
// In compute-function-manager.js
if (this.config.customFunction?.enabled) {
  this.register(new CustomCompute(this.config.customFunction));
}
```

## Best Practices

### Configuration Best Practices

1. **Start with defaults**: Enable basic URL relativization first
2. **Test thoroughly**: Use debug mode during development
3. **Monitor performance**: Watch processing times and error rates
4. **Gradual rollout**: Enable for specific domains first

### Development

1. **Use debug mode**: Enable detailed logging during development
2. **Test edge cases**: Malformed content, large files, mixed content
3. **Monitor statistics**: Track conversion rates and performance
4. **Error handling**: Ensure graceful degradation on failures

### Production

1. **Disable debug mode**: Reduce log volume in production
2. **Set appropriate limits**: Content size and timeout limits
3. **Monitor metrics**: Regular statistics review
4. **Performance tuning**: Adjust based on actual usage patterns

## Migration Guide

### From Manual URL Management

If you're currently manually managing URL transformations:

1. **Audit existing URLs**: Identify patterns in your content
2. **Configure domain mapping**: Set up `DOMAIN_PATH_MAPPING`
3. **Enable compute functions**: Start with URL relativization
4. **Test thoroughly**: Verify all URL types are handled correctly
5. **Remove manual code**: Clean up custom URL transformation code

### Gradual Deployment

1. **Development environment**: Enable and test all features
2. **Staging environment**: Test with production-like content
3. **Production rollout**: Enable for specific domains first
4. **Full deployment**: Enable for all domains after validation

## Support and Resources

### Documentation

- [Architecture Guide](./for-ai/architecture.md)
- [Configuration Guide](./configuration.md)
- [API Documentation](./api-documentation.md)

### Monitoring

- Health check endpoint: `/health`
- Metrics endpoint: `/metrics`
- Statistics API: `/api/compute-functions/stats`

### Quick Troubleshooting Reference

- Enable debug logging for detailed diagnostics
- Check statistics for performance and error metrics
- Review transformation rules in debug output
- Monitor content size and processing times
