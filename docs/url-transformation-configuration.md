# URL Transformation Configuration and Logging Guide

## Overview

The Advanced CDN includes a comprehensive URL transformation system that automatically detects and rewrites all URLs in HTML responses to route through the proxy server, completely obscuring the original server's domain from end users.

## Configuration

### Environment Variables

Add these settings to your `.env` file:

```bash
# URL transformation configuration
URL_TRANSFORM_ENABLED=true              # Enable/disable URL transformation
URL_TRANSFORM_HTML=true                 # Transform URLs in HTML content
URL_TRANSFORM_JS=true                   # Transform URLs in JavaScript content
URL_TRANSFORM_CSS=true                  # Transform URLs in CSS content
URL_TRANSFORM_INLINE_STYLES=true        # Transform URLs in inline styles
URL_TRANSFORM_DATA_ATTRS=true           # Transform URLs in data-* attributes
URL_PRESERVE_FRAGMENTS=true             # Preserve URL fragments (#section)
URL_PRESERVE_QUERY=true                 # Preserve query parameters (?param=value)
URL_TRANSFORM_MAX_SIZE=52428800         # Max content size to transform (50MB)
URL_TRANSFORM_CACHE_SIZE=10000          # Cache size for transformation results
URL_TRANSFORM_DEBUG=true                # Enable detailed debug logging
```

### Content Types

The system transforms URLs in these content types by default:
- `text/html`
- `application/xhtml+xml`
- `text/javascript`
- `application/javascript`
- `application/x-javascript`
- `text/css`

## How It Works

### URL Detection Patterns

The system detects URLs in multiple contexts:

**HTML Attributes:**
- `href` attributes in links
- `src` attributes in images, scripts, iframes
- `action` attributes in forms
- `data-*` attributes containing URLs
- `style` attributes with `url()` functions

**Text Content:**
- URLs appearing as text content within HTML elements

**JavaScript:**
- `fetch()` calls
- `import()` statements
- `new URL()` constructors
- Location assignments
- AJAX library calls

**CSS:**
- `url()` functions
- `@import` statements
- Background images and fonts

### Transformation Logic

1. **Domain Analysis**: Checks if the URL's domain should be proxied
2. **URL Classification**: Identifies URL type (absolute, relative, protocol-relative)
3. **Proxy URL Construction**: Builds new URL routing through the proxy host
4. **Context Preservation**: Maintains query parameters and fragments as configured

### Example Transformation

**Original HTML:**
```html
<p>My Blog is here <a href="https://allabout.network/blogs/ddt/">https://allabout.network/blogs/ddt/</a></p>
```

**Transformed HTML:**
```html
<p>My Blog is here <a href="https://your-proxy-domain.com/blogs/ddt/">https://your-proxy-domain.com/blogs/ddt/</a></p>
```

## Logging and Debugging

### Startup Logging

When the server starts, you'll see comprehensive configuration logging:

```
🔧 URL Transformation Configuration:
   - Status: ✅ ENABLED (URL_TRANSFORM_ENABLED=true)
   - HTML transformation: ✅ ENABLED
   - JavaScript transformation: ✅ ENABLED
   - CSS transformation: ✅ ENABLED
   - Debug mode: ✅ ENABLED
   - Origin domain: allabout.network
   - Target domain: main--allaboutv2--ddttom.hlx.live
   - Max content size: 50.0MB
   - Cache size: 10,000 entries
```

### Request-Level Logging

With debug mode enabled, you'll see detailed logs for each request:

```
🔍 [URL-TRANSFORM] Processing request: GET /blogs/ddt/
   - Content-Type: text/html; charset=utf-8
   - Content size: 15,432 bytes
   - Proxy host: your-domain.com

🔗 [URL-TRANSFORM] URL transformed in html:href
   - Original: https://allabout.network/blogs/ddt/
   - Transformed: https://your-proxy-domain.com/blogs/ddt/

✅ [URL-TRANSFORM] Applied to /blogs/ddt/
   - URLs transformed: 5
   - Original size: 382 bytes
   - Transformed size: 407 bytes
```

### Log Levels

- **INFO**: Startup configuration, transformation summaries
- **DEBUG**: Detailed transformation steps, URL analysis, cache operations
- **WARN**: Skipped content, performance issues
- **ERROR**: Transformation failures, configuration errors

## Performance Considerations

### Caching

- **Transformation Cache**: Results are cached using LRU eviction
- **Pattern Cache**: Compiled regex patterns are cached
- **Content Size Limits**: Large content (>50MB by default) is skipped

### Optimization

- **Selective Processing**: Only processes relevant content types
- **Batch Processing**: Multiple URLs processed in single pass
- **Circuit Breaker**: Protects against failing transformations

## Troubleshooting

### Common Issues

1. **URLs Not Being Transformed**
   - Check `URL_TRANSFORM_ENABLED=true` in `.env`
   - Verify the domain is configured for transformation
   - Check content type is in the transformable list

2. **Performance Issues**
   - Reduce `URL_TRANSFORM_MAX_SIZE` if needed
   - Monitor cache hit rates
   - Check for large content being processed

3. **Debug Information**
   - Set `URL_TRANSFORM_DEBUG=true` for detailed logging
   - Check startup logs for configuration status
   - Monitor request-level transformation logs

### Testing

Run the URL transformation test:

```bash
node tests/test-allabout-network-transformation.js
```

This will test the exact HTML from your use case and show detailed transformation results.

## Security

### URL Validation

- **Protocol Validation**: Only allows safe protocols (http/https)
- **Domain Validation**: Ensures transformed URLs are valid
- **Encoding Safety**: Proper URL encoding prevents XSS
- **Malicious URL Detection**: Skips javascript:, data:, mailto: URLs

### Content Integrity

- **Transformation Verification**: Validates transformed content
- **Fallback Mechanisms**: Serves original content if transformation fails
- **Error Logging**: Comprehensive error tracking for security analysis

## API Endpoints

- `GET /api/cache/url-transform/stats` - Get transformation statistics
- `DELETE /api/cache/url-transform` - Clear transformation cache

## Integration

The URL transformation system integrates seamlessly with:
- **Proxy Manager**: Transforms content during response processing
- **Cache Manager**: Caches transformed content
- **Domain Manager**: Uses domain routing logic
- **Metrics Manager**: Tracks transformation performance