# Query Parameter Sanitization Guide

## Overview

The Advanced CDN application implements comprehensive query parameter sanitization to prevent injection attacks, malformed input, and potential security vulnerabilities. All user-provided query parameters are validated and sanitized before processing.

## Security Features

### Automatic Sanitization

All API endpoints that accept query parameters automatically sanitize input:

- **Cache Management APIs** (`/api/cache/*`)
- **Health Check API** (`/health`)
- **Logging APIs** (`/api/logs/*`)
- **Domain Management APIs** (`/api/domains/*`)

### What Gets Sanitized

1. **Character Validation**: Only allowed characters pass through
2. **Length Validation**: Parameters exceeding maximum length are rejected
3. **Pattern Matching**: Values must match expected patterns
4. **Type Validation**: Values must be of expected type (string, number, boolean)
5. **Array Handling**: Array parameters are validated element-by-element

## Validation Rules by Parameter Type

### Domain Parameters

Used in: `/health?domain=...`, domain-specific API calls

**Rules:**
- Maximum length: 253 characters (DNS name limit)
- Allowed characters: `a-z`, `A-Z`, `0-9`, `.`, `-`
- Automatically converted to lowercase
- Must be valid DNS name format

**Examples:**
```bash
# Valid
curl "http://localhost:8080/health?domain=example.com"
curl "http://localhost:8080/health?domain=sub.example.com"
curl "http://localhost:8080/health?domain=api-staging.example.com"

# Invalid - returns 400
curl "http://localhost:8080/health?domain=example.com<script>"
curl "http://localhost:8080/health?domain=../../../etc/passwd"
curl "http://localhost:8080/health?domain=example@malicious.com"
```

### Path Parameters

Used in: `/health?testPath=...`, file resolution testing

**Rules:**
- Maximum length: 2000 characters
- Allowed characters: `a-z`, `A-Z`, `0-9`, `/`, `-`, `_`, `.`
- Must start with `/` or alphanumeric
- No directory traversal patterns allowed

**Examples:**
```bash
# Valid
curl "http://localhost:8080/health?testPath=/api/users"
curl "http://localhost:8080/health?testPath=/content/about-us.html"
curl "http://localhost:8080/health?testPath=/images/logo_v2.png"

# Invalid - returns 400
curl "http://localhost:8080/health?testPath=../../etc/passwd"
curl "http://localhost:8080/health?testPath=/api/<script>alert(1)</script>"
curl "http://localhost:8080/health?testPath=/path?query=value"  # No query strings
```

### Cache Pattern Parameters

Used in: `/api/cache?pattern=...`, `/api/cache/keys?pattern=...`

**Rules:**
- Maximum length: 500 characters
- Allowed characters: `a-z`, `A-Z`, `0-9`, `*`, `/`, `-`, `_`, `.`
- Supports wildcards (`*`)
- No shell metacharacters allowed

**Examples:**
```bash
# Valid
curl -X DELETE "http://localhost:8080/api/cache?pattern=*.css"
curl -X DELETE "http://localhost:8080/api/cache?pattern=/images/*"
curl -X DELETE "http://localhost:8080/api/cache?pattern=*.js"
curl -X DELETE "http://localhost:8080/api/cache?pattern=/api/v1/*"

# Invalid - returns 400
curl -X DELETE "http://localhost:8080/api/cache?pattern=../../../*"
curl -X DELETE "http://localhost:8080/api/cache?pattern=$(whoami)"
curl -X DELETE "http://localhost:8080/api/cache?pattern=*;rm -rf /"
```

### General Query Parameters

Used in: Various endpoints for filters, options, etc.

**Rules:**
- Maximum length: 1000 characters (default)
- Allowed characters: `a-z`, `A-Z`, `0-9`, `_`, `-`, `.`, `*`, space, `,`, `/`, `:`
- Maximum 50 parameters per request
- No HTML/JavaScript injection patterns

**Examples:**
```bash
# Valid
curl "http://localhost:8080/api/logs?limit=100&offset=0"
curl "http://localhost:8080/api/logs?period=day"
curl "http://localhost:8080/api/cache/keys?pattern=*.js"

# Invalid - returns 400
curl "http://localhost:8080/api/logs?limit=<script>alert(1)</script>"
curl "http://localhost:8080/api/logs?limit=' OR '1'='1"
```

### Numeric Parameters

Used in: `limit`, `offset`, `port`, etc.

**Rules:**
- Must be valid integers
- Maximum value: 2147483647 (32-bit int max)
- No negative values (unless specifically allowed)
- Maximum length: 10 digits

**Examples:**
```bash
# Valid
curl "http://localhost:8080/api/logs?limit=100"
curl "http://localhost:8080/api/logs?offset=0"
curl "http://localhost:8080/api/logs?limit=50&offset=100"

# Invalid - returns 400
curl "http://localhost:8080/api/logs?limit=abc"
curl "http://localhost:8080/api/logs?limit=-1"
curl "http://localhost:8080/api/logs?limit=999999999999999"
```

### Date Parameters

Used in: `startDate`, `endDate`, logging queries

**Rules:**
- Must be valid ISO 8601 format
- Maximum length: 30 characters
- Allowed characters: `0-9`, `-`, `T`, `:`, `.`, `Z`
- Validated as parseable date

**Examples:**
```bash
# Valid
curl "http://localhost:8080/api/logs?startDate=2024-01-01T00:00:00Z"
curl "http://localhost:8080/api/logs?startDate=2024-01-01T00:00:00.000Z"
curl "http://localhost:8080/api/logs?endDate=2024-12-31T23:59:59Z"

# Invalid - returns 400
curl "http://localhost:8080/api/logs?startDate=<script>alert(1)</script>"
curl "http://localhost:8080/api/logs?startDate=2024-13-45"  # Invalid date
curl "http://localhost:8080/api/logs?startDate=' OR '1'='1"
```

## Error Responses

### 400 Bad Request - Invalid Parameters

When sanitization fails, the API returns a 400 status code with details:

**Invalid Domain:**
```json
{
  "error": "Invalid domain parameter",
  "message": "Domain parameter contains invalid characters or is malformed"
}
```

**Invalid Path:**
```json
{
  "error": "Invalid path parameter",
  "message": "Path parameter contains invalid characters"
}
```

**Invalid Cache Pattern:**
```json
{
  "error": "Invalid cache pattern",
  "message": "Cache pattern contains invalid characters or is too long"
}
```

**Invalid Query Parameters (General):**
```json
{
  "error": "Invalid query parameters",
  "message": "Query parameters contain invalid or potentially malicious content"
}
```

## Implementation Details

### Sanitization Module

Location: `src/proxy/query-sanitizer.js`

**Available Functions:**

```javascript
// Sanitize all query parameters
sanitizeQueryParams(queryParams, options)

// Validate a single value
validateQueryValue(value, options)

// Sanitize specific parameter types
sanitizeCachePattern(pattern)
sanitizeDomain(domain)
sanitizePath(path)

// Express middleware for automatic sanitization
sanitizeQueryMiddleware(options)
```

### Custom Validation Patterns

You can customize validation patterns when calling sanitization functions:

```javascript
const { validateQueryValue } = require('./proxy/query-sanitizer');

// Custom pattern for email
const isValidEmail = validateQueryValue(email, {
  pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  maxLength: 255
});

// Custom pattern for alphanumeric only
const isValidUsername = validateQueryValue(username, {
  pattern: /^[a-zA-Z0-9]+$/,
  maxLength: 50
});
```

### Protected Endpoints

All endpoints that accept query parameters are automatically protected:

**Cache Management:**
- `DELETE /api/cache?pattern=...`
- `GET /api/cache/keys?pattern=...`
- All cache-related endpoints

**Health Checks:**
- `GET /health?domain=...&testPath=...`
- `GET /health?detailed=true`

**Logging APIs:**
- `GET /api/logs?limit=...&offset=...`
- `GET /api/logs/subsystem/:name?startDate=...&endDate=...`

**Domain Management:**
- All `/api/domains/*` endpoints with query parameters

## Best Practices

### For API Users

1. **Always URL-encode parameters:**
   ```bash
   # Bad
   curl "http://localhost:8080/api/cache?pattern=/path with spaces/"

   # Good
   curl "http://localhost:8080/api/cache?pattern=%2Fpath%20with%20spaces%2F"

   # Better - use curl's built-in encoding
   curl -G "http://localhost:8080/api/cache" \
     --data-urlencode "pattern=/path with spaces/"
   ```

2. **Validate on client side first:**
   - Check parameter lengths before sending
   - Use appropriate data types
   - Validate format (dates, domains, etc.)

3. **Handle 400 errors gracefully:**
   ```javascript
   try {
     const response = await fetch('/api/cache?pattern=' + encodeURIComponent(pattern));
     if (response.status === 400) {
       const error = await response.json();
       console.error('Invalid parameter:', error.message);
       // Show user-friendly error message
     }
   } catch (error) {
     console.error('Request failed:', error);
   }
   ```

### For Developers

1. **Use sanitization functions:**
   ```javascript
   const { sanitizeDomain } = require('./proxy/query-sanitizer');

   app.get('/api/custom', (req, res) => {
     const domain = sanitizeDomain(req.query.domain);
     if (domain === null) {
       return res.status(400).json({
         error: 'Invalid domain parameter'
       });
     }
     // Use sanitized domain safely
   });
   ```

2. **Add custom validation:**
   ```javascript
   const { validateQueryValue } = require('./proxy/query-sanitizer');

   if (!validateQueryValue(req.query.customParam, {
     pattern: /^[a-z0-9-]+$/,
     maxLength: 100
   })) {
     return res.status(400).json({
       error: 'Invalid custom parameter'
     });
   }
   ```

3. **Use middleware for automatic protection:**
   ```javascript
   const { sanitizeQueryMiddleware } = require('./proxy/query-sanitizer');

   // Apply to all routes
   app.use(sanitizeQueryMiddleware({
     maxParams: 50,
     maxKeyLength: 100,
     maxValueLength: 1000
   }));
   ```

## Security Considerations

### What's Protected

✅ SQL injection attempts
✅ XSS/JavaScript injection
✅ Command injection
✅ Path traversal attacks
✅ LDAP injection
✅ XML/XXE injection
✅ Template injection
✅ SSRF attempts

### What's Not Protected

This sanitization layer does NOT protect against:

❌ **Authentication bypass** - Use proper auth middleware
❌ **Authorization issues** - Implement RBAC/permissions
❌ **Rate limiting** - Use rate limiter middleware
❌ **CSRF attacks** - Use CSRF tokens
❌ **Business logic flaws** - Implement proper validation

### Defense in Depth

Query parameter sanitization is ONE layer of defense. Also implement:

1. **Input validation** at application level
2. **Output encoding** when rendering data
3. **Parameterized queries** for database access
4. **Content Security Policy** headers
5. **Rate limiting** for API endpoints
6. **Authentication and authorization**

## Testing Sanitization

### Manual Testing

```bash
# Test injection attempts
curl "http://localhost:8080/api/cache?pattern=<script>alert(1)</script>"
curl "http://localhost:8080/api/cache?pattern='; DROP TABLE users; --"
curl "http://localhost:8080/health?domain=../../etc/passwd"

# Test length limits
curl "http://localhost:8080/api/cache?pattern=$(python3 -c 'print("A"*1000)')"

# Test special characters
curl "http://localhost:8080/health?domain=test!@#$%^&*()"

# All should return 400 Bad Request
```

### Automated Testing

```javascript
const request = require('supertest');
const app = require('./src/app');

describe('Query Parameter Sanitization', () => {
  it('should reject XSS attempts', async () => {
    const response = await request(app)
      .get('/api/cache?pattern=<script>alert(1)</script>');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid');
  });

  it('should reject path traversal', async () => {
    const response = await request(app)
      .get('/health?domain=../../etc/passwd');

    expect(response.status).toBe(400);
  });

  it('should accept valid parameters', async () => {
    const response = await request(app)
      .get('/api/cache/stats');

    expect(response.status).toBe(200);
  });
});
```

## Troubleshooting

### Common Issues

**Issue: Valid parameter rejected**
```bash
# Check for special characters
curl "http://localhost:8080/api/cache?pattern=/my-path"  # OK
curl "http://localhost:8080/api/cache?pattern=/my path"  # FAIL - space

# Solution: URL encode
curl "http://localhost:8080/api/cache?pattern=%2Fmy%20path"  # OK
```

**Issue: Parameter too long**
```bash
# Check maximum lengths in error message
# Reduce parameter length or split into multiple requests
```

**Issue: Unexpected 400 error**
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Check application logs
tail -f logs/app.log | grep "sanitiz"

# Look for specific error messages
```

## Configuration

### Environment Variables

```bash
# Currently no specific environment variables for sanitization
# All validation rules are hardcoded for security

# However, you can adjust related settings:
LOG_LEVEL=debug  # See sanitization decisions in logs
```

### Future Enhancements

Potential future configuration options:

- `SANITIZE_STRICT_MODE` - Reject any suspicious input
- `SANITIZE_ALLOW_PATTERNS` - Custom allowed patterns
- `SANITIZE_MAX_PARAM_COUNT` - Max parameters per request
- `SANITIZE_WHITELIST_IPS` - Skip sanitization for trusted IPs

## Related Documentation

- [API Documentation](./api-documentation.md) - API endpoint details
- [Configuration Guide](./configuration.md) - Application configuration
- [Troubleshooting Guide](./troubleshooting-guide.md) - Common issues
- [Security Best Practices](./security-best-practices.md) - Security guidelines

## Summary

Query parameter sanitization provides automatic protection against common injection attacks and malformed input. All query parameters are validated before processing, with clear error messages when validation fails. This is one layer in a comprehensive security strategy that includes input validation, output encoding, and proper authentication/authorization.
