# DDT Domain Debug Command

A comprehensive Node.js CLI tool for testing and debugging ddt.com domain functionality through the Advanced CDN application. This tool makes HTTP requests to the running CDN application with proper Host headers to trigger domain mapping and fetch data from the configured backend endpoints.

## Overview

The DDT Debug Command (`debug-ddt.js`) is designed to test the CDN's domain-to-path mapping functionality specifically for `.ddt.com` domains. It validates domain formats, makes HTTP requests with appropriate headers, handles retries with exponential backoff, and provides detailed debugging information.

### Key Features

- **Domain Validation**: Validates `.ddt.com` domain format and extracts subdomains
- **HTTP Client**: Makes requests to CDN with proper Host headers for domain mapping
- **Retry Logic**: Implements exponential backoff for failed requests
- **Comprehensive Logging**: Detailed request/response debugging information
- **Multiple Output Formats**: Human-readable and JSON output options
- **Execution Modes**: Both synchronous and asynchronous execution
- **Error Handling**: Graceful handling of network errors and timeouts
- **Performance Monitoring**: Response time tracking and metrics

## Installation and Setup

The debug command is included with the CDN application. No additional installation is required.

### Prerequisites

1. **CDN Application Running**: The CDN application must be running (typically on `http://localhost:3000`)
2. **Domain Configuration**: The CDN must be configured with ddt.com domain mapping
3. **Node.js**: Node.js 16+ is required

### Environment Configuration

Ensure your CDN application is configured with ddt.com domain mapping in your `.env` file:

```bash
# Enable path rewriting
PATH_REWRITE_ENABLED=true

# Configure ddt.com domain mapping
DOMAIN_PATH_MAPPING=ddt.com:/ddt

# Or use complex routing rules
DOMAIN_ROUTING_RULES={"ddt.com": {"target": "allabout.network", "pathPrefix": "/blogs/ddt"}}
```

## Usage

### Basic Usage

```bash
# Test a ddt.com domain
node debug-ddt.js example.ddt.com

# Or use npm script
npm run debug-ddt example.ddt.com
```

### Command Syntax

```bash
node debug-ddt.js <domain> [options]
```

### Arguments

- **`domain`** (required): The ddt.com domain to test (e.g., `example.ddt.com`)

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--async` | Use asynchronous execution mode | `true` |
| `--sync` | Use synchronous execution mode | `false` |
| `--verbose`, `-v` | Enable verbose logging | `false` |
| `--timeout <ms>` | Request timeout in milliseconds | `30000` |
| `--retries <n>` | Number of retry attempts | `3` |
| `--cdn-url <url>` | CDN server URL | `http://localhost:3000` |
| `--format <format>` | Output format: `human` or `json` | `human` |
| `--path <path>` | Request path | `/` |
| `--help`, `-h` | Show help message | - |

## Examples

### Basic Domain Testing

```bash
# Test basic domain functionality
node debug-ddt.js example.ddt.com
```

**Expected Output:**
```
=== DDT Domain Debug Results ===

Domain: example.ddt.com
Subdomain: example
Status: SUCCESS
HTTP Status: 200 OK
Response Time: 245ms
```

### Verbose Debugging

```bash
# Enable verbose logging for detailed debugging
node debug-ddt.js api.ddt.com --verbose
```

**Expected Output:**
```
[2024-01-15T10:30:45.123Z] INFO: Making request to http://localhost:3000/
[2024-01-15T10:30:45.124Z] DEBUG: Request headers:
{
  "Host": "api.ddt.com",
  "User-Agent": "DDT-Debug-Tool/1.0",
  "Accept": "*/*",
  "Connection": "close"
}
[2024-01-15T10:30:45.367Z] INFO: Response received: 200 OK (243ms)

=== DDT Domain Debug Results ===

Domain: api.ddt.com
Subdomain: api
Status: SUCCESS
HTTP Status: 200 OK
Response Time: 243ms

Request Details:
  URL: http://localhost:3000/
  Method: GET
  Headers:
    Host: api.ddt.com
    User-Agent: DDT-Debug-Tool/1.0
    Accept: */*
    Connection: close

Response Headers:
  content-type: text/html; charset=utf-8
  x-cache: HIT
  x-response-time: 243ms
  content-length: 1234
```

### JSON Output

```bash
# Get structured JSON output for programmatic use
node debug-ddt.js blog.ddt.com --format json
```

**Expected Output:**
```json
{
  "success": true,
  "domain": "blog.ddt.com",
  "subdomain": "blog",
  "statusCode": 200,
  "statusMessage": "OK",
  "responseTime": 189,
  "headers": {
    "content-type": "text/html; charset=utf-8",
    "x-cache": "HIT",
    "x-response-time": "189ms"
  },
  "requestDetails": {
    "url": "http://localhost:3000/",
    "method": "GET",
    "headers": {
      "Host": "blog.ddt.com",
      "User-Agent": "DDT-Debug-Tool/1.0"
    }
  },
  "executionMode": "async"
}
```

### Custom Configuration

```bash
# Test with custom CDN URL and increased retries
node debug-ddt.js test.ddt.com --cdn-url http://localhost:8080 --retries 5 --timeout 10000
```

### Specific Path Testing

```bash
# Test specific path on the domain
node debug-ddt.js docs.ddt.com --path /api/v1/status --verbose
```

### Error Scenarios

```bash
# Test with invalid domain (will show validation error)
node debug-ddt.js invalid-domain.com

# Test with CDN not running (will show connection error)
node debug-ddt.js test.ddt.com --cdn-url http://localhost:9999
```

## Output Formats

### Human-Readable Format (Default)

The human-readable format provides a clear, colored output suitable for manual debugging:

- **Success Status**: Green checkmarks and success indicators
- **Error Status**: Red error messages and failure indicators
- **Request Details**: Formatted request information
- **Response Details**: Structured response data
- **Performance Metrics**: Response times and retry counts

### JSON Format

The JSON format provides structured data suitable for:

- **Automated Testing**: Parse results programmatically
- **Monitoring Systems**: Integrate with monitoring tools
- **Log Analysis**: Store results in structured logs
- **API Integration**: Use results in other applications

## Error Handling

The debug command handles various error scenarios gracefully:

### Domain Validation Errors

```bash
node debug-ddt.js invalid.com
# Error: Invalid domain format
# Details: Domain must be in format: subdomain.ddt.com
```

### Network Errors

```bash
node debug-ddt.js test.ddt.com --cdn-url http://localhost:9999
# Error: Connection refused
# Details: ECONNREFUSED - CDN server not running on specified URL
```

### Timeout Errors

```bash
node debug-ddt.js slow.ddt.com --timeout 1000
# Error: Request timeout
# Details: Request exceeded 1000ms timeout limit
```

### HTTP Errors

```bash
node debug-ddt.js notfound.ddt.com
# Status: FAILED
# HTTP Status: 404 Not Found
# Error: Resource not found
```

## Integration with CDN Application

### Domain Mapping Flow

1. **Request Initiation**: Debug command makes HTTP request to CDN
2. **Host Header Processing**: CDN reads `Host: domain.ddt.com` header
3. **Domain Mapping**: CDN applies path rewriting rules for ddt.com
4. **Backend Request**: CDN fetches from configured backend (e.g., allabout.network/blogs/ddt)
5. **Response Processing**: CDN processes and returns response
6. **Debug Analysis**: Debug command analyzes and reports results

### Configuration Dependencies

The debug command relies on proper CDN configuration:

```javascript
// config.js - Domain mapping configuration
pathRewriting: {
  enabled: true,
  domainPathMapping: {
    'ddt.com': '/ddt'
  },
  domainTargets: {
    'ddt.com': 'allabout.network'
  }
}
```

## Testing and Validation

### Running Tests

```bash
# Run comprehensive test suite
npm run test-debug-ddt

# Or run directly
node test-debug-ddt.js
```

### Test Coverage

The test suite covers:

- **Domain Validation**: All validation scenarios and edge cases
- **HTTP Client**: Request construction and header handling
- **Retry Logic**: Exponential backoff and failure scenarios
- **Output Formatting**: Both human and JSON formats
- **Error Handling**: Network errors, timeouts, and validation failures
- **Performance**: Speed and efficiency testing
- **Security**: Malicious input validation
- **Integration**: End-to-end workflow testing

### Example Test Output

```
🧪 Running DDT Debug Command Test Suite

✅ DomainValidator - Valid domain
✅ DomainValidator - Valid domain with hyphens
✅ DomainValidator - Invalid domain - no subdomain
✅ HttpClient - Constructor with default options
✅ RetryHandler - Execute with retry - success on first attempt
✅ OutputFormatter - Format result as JSON
✅ Integration - Valid domain processing workflow
✅ Performance - Domain validation speed
✅ Security - Reject malicious domain patterns

📊 Test Results: 45 passed, 0 failed
```

## Troubleshooting

### Common Issues

#### 1. CDN Not Running

**Problem**: `Error: Connection refused (ECONNREFUSED)`

**Solution**:
```bash
# Start the CDN application first
npm start
# Or in development mode
npm run dev

# Then run debug command
node debug-ddt.js test.ddt.com
```

#### 2. Domain Not Configured

**Problem**: `HTTP Status: 404 Not Found`

**Solution**: Ensure ddt.com domain mapping is configured in your `.env` file:
```bash
PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING=ddt.com:/ddt
```

#### 3. Invalid Domain Format

**Problem**: `Error: Invalid domain format`

**Solution**: Ensure domain follows the pattern `subdomain.ddt.com`:
```bash
# Correct format
node debug-ddt.js example.ddt.com

# Incorrect formats
node debug-ddt.js example.com        # Missing .ddt
node debug-ddt.js .ddt.com          # Missing subdomain
node debug-ddt.js -test.ddt.com     # Invalid subdomain
```

#### 4. Timeout Issues

**Problem**: `Error: Request timeout`

**Solutions**:
```bash
# Increase timeout
node debug-ddt.js slow.ddt.com --timeout 60000

# Check CDN performance
node debug-ddt.js test.ddt.com --verbose

# Verify backend connectivity
curl -H "Host: test.ddt.com" http://localhost:3000/
```

### Debug Workflow

1. **Verify CDN Status**: Ensure CDN application is running
2. **Check Configuration**: Verify domain mapping configuration
3. **Test Basic Domain**: Start with simple domain test
4. **Enable Verbose Mode**: Use `--verbose` for detailed logging
5. **Check Backend**: Verify backend server accessibility
6. **Analyze Logs**: Review CDN application logs for errors

## Performance Considerations

### Optimization Tips

1. **Use Appropriate Timeouts**: Set reasonable timeout values based on expected response times
2. **Configure Retry Logic**: Adjust retry attempts based on network reliability
3. **Monitor Response Times**: Track performance trends over time
4. **Cache Considerations**: Understand CDN caching behavior impact on results

### Performance Metrics

The debug command tracks several performance metrics:

- **Response Time**: Total request-response time
- **Retry Count**: Number of retry attempts made
- **Connection Time**: Time to establish connection
- **DNS Resolution**: Domain resolution time (if applicable)

## Security Considerations

### Input Validation

The debug command implements strict input validation:

- **Domain Format**: Only allows valid `.ddt.com` domains
- **Subdomain Rules**: Prevents malicious subdomain patterns
- **Path Validation**: Sanitizes request paths
- **URL Construction**: Prevents URL injection attacks

### Safe Usage

- **Local Testing Only**: Designed for local development and testing
- **No Sensitive Data**: Avoid passing sensitive information in domains or paths
- **Network Security**: Use only on trusted networks
- **Access Control**: Restrict access to debug tools in production environments

## Advanced Usage

### Scripting and Automation

```bash
#!/bin/bash
# Test multiple domains
domains=("api.ddt.com" "blog.ddt.com" "docs.ddt.com")

for domain in "${domains[@]}"; do
    echo "Testing $domain..."
    node debug-ddt.js "$domain" --format json > "results-$domain.json"
done
```

### Monitoring Integration

```javascript
// monitoring-script.js
const { DebugCommand } = require('./debug-ddt.js');

async function monitorDomains() {
    const domains = ['api.ddt.com', 'blog.ddt.com'];
    
    for (const domain of domains) {
        const command = new DebugCommand();
        command.options = { domain, format: 'json' };
        
        const result = await command.executeDebug({ domain, valid: true });
        
        if (!result.success) {
            console.error(`Domain ${domain} failed: ${result.error}`);
            // Send alert to monitoring system
        }
    }
}
```

## API Reference

### Classes

#### `DebugCommand`
Main orchestrator class for the debug process.

#### `DomainValidator`
Validates ddt.com domain format and extracts subdomains.

**Methods:**
- `static validate(domain)`: Validates domain format

#### `HttpClient`
Handles HTTP requests with proper headers and timeout management.

**Constructor Options:**
- `cdnUrl`: CDN server URL
- `timeout`: Request timeout in milliseconds
- `verbose`: Enable verbose logging

#### `RetryHandler`
Implements exponential backoff retry logic.

**Constructor Options:**
- `maxRetries`: Maximum retry attempts
- `baseDelay`: Base delay for exponential backoff
- `verbose`: Enable verbose logging

#### `OutputFormatter`
Formats and displays results in various formats.

**Methods:**
- `static formatResult(result, options)`: Format result for display
- `static displayError(message, details)`: Display error messages
- `static displayUsage()`: Show usage information

## Contributing

### Development Setup

1. **Clone Repository**: Get the latest code
2. **Install Dependencies**: Run `npm install`
3. **Run Tests**: Execute `npm run test-debug-ddt`
4. **Test Functionality**: Try various debug scenarios

### Code Style

- **ES6+ Features**: Use modern JavaScript features
- **Error Handling**: Comprehensive error handling
- **Documentation**: Clear code comments and documentation
- **Testing**: Maintain high test coverage

### Submitting Changes

1. **Run Tests**: Ensure all tests pass
2. **Update Documentation**: Update this documentation if needed
3. **Test Integration**: Verify integration with CDN application
4. **Performance Testing**: Ensure no performance regressions

## Changelog

### Version 1.0.0
- Initial release with comprehensive domain testing functionality
- Support for ddt.com domain validation and testing
- HTTP client with retry logic and timeout handling
- Multiple output formats (human-readable and JSON)
- Comprehensive test suite with 45+ test cases
- Full integration with CDN application domain mapping

---

For additional support or questions, refer to the main CDN application documentation or the troubleshooting guide.
