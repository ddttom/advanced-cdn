#!/usr/bin/env node

/**
 * DDT Domain Debug Command
 * 
 * A Node.js CLI tool that tests ddt.com domain functionality by making HTTP requests
 * to the running CDN application with proper Host headers to trigger domain mapping.
 * 
 * Usage: node debug-ddt.js <domain> [options]
 * Example: node debug-ddt.js example.ddt.com --verbose --async
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { performance } = require('perf_hooks');

// Configuration constants
const DEFAULT_CDN_URL = 'http://localhost:3000';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Domain Validator
 * Validates ddt.com domain format and extracts subdomain
 */
class DomainValidator {
  static DDT_DOMAIN_REGEX = /^([a-zA-Z0-9-]+)\.ddt\.com$/;

  static validate(domain) {
    if (!domain || typeof domain !== 'string') {
      return {
        valid: false,
        error: 'Domain must be a non-empty string'
      };
    }

    const match = domain.match(this.DDT_DOMAIN_REGEX);
    if (!match) {
      return {
        valid: false,
        error: 'Domain must be in format: subdomain.ddt.com'
      };
    }

    const subdomain = match[1];
    if (subdomain.length === 0) {
      return {
        valid: false,
        error: 'Subdomain cannot be empty'
      };
    }

    if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
      return {
        valid: false,
        error: 'Subdomain cannot start or end with hyphen'
      };
    }

    return {
      valid: true,
      domain: domain,
      subdomain: subdomain
    };
  }
}

/**
 * HTTP Client
 * Handles HTTP requests with proper headers and timeout management
 */
class HttpClient {
  constructor(options = {}) {
    this.cdnUrl = options.cdnUrl || DEFAULT_CDN_URL;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.verbose = options.verbose || false;
  }

  async makeRequest(domain, path = '/') {
    const startTime = performance.now();
    const url = new URL(this.cdnUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: path,
      method: 'GET',
      headers: {
        'Host': domain,
        'User-Agent': 'DDT-Debug-Tool/1.0',
        'Accept': '*/*',
        'Connection': 'close'
      },
      timeout: this.timeout
    };

    if (this.verbose) {
      this.log('info', `Making request to ${this.cdnUrl}${path}`);
      this.log('debug', `Request headers:`, requestOptions.headers);
    }

    return new Promise((resolve, reject) => {
      const req = httpModule.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = Math.round(endTime - startTime);

          const result = {
            success: true,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: data,
            responseTime: responseTime,
            requestDetails: {
              url: `${this.cdnUrl}${path}`,
              method: 'GET',
              headers: requestOptions.headers
            }
          };

          if (this.verbose) {
            this.log('info', `Response received: ${res.statusCode} ${res.statusMessage} (${responseTime}ms)`);
            this.log('debug', `Response headers:`, res.headers);
          }

          resolve(result);
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        reject({
          success: false,
          error: error.message,
          code: error.code,
          responseTime: responseTime,
          requestDetails: {
            url: `${this.cdnUrl}${path}`,
            method: 'GET',
            headers: requestOptions.headers
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        reject({
          success: false,
          error: 'Request timeout',
          code: 'ETIMEDOUT',
          responseTime: responseTime,
          requestDetails: {
            url: `${this.cdnUrl}${path}`,
            method: 'GET',
            headers: requestOptions.headers
          }
        });
      });

      req.end();
    });
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelColors = {
      error: colors.red,
      warn: colors.yellow,
      info: colors.blue,
      debug: colors.cyan
    };

    const color = levelColors[level] || colors.reset;
    console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
    
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

/**
 * Retry Handler
 * Implements exponential backoff retry logic for failed requests
 */
class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || DEFAULT_RETRIES;
    this.baseDelay = options.baseDelay || DEFAULT_RETRY_DELAY;
    this.verbose = options.verbose || false;
  }

  async executeWithRetry(operation, context = '') {
    let lastError = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0 && this.verbose) {
          console.log(`${colors.yellow}Retry attempt ${attempt}/${this.maxRetries} for ${context}${colors.reset}`);
        }

        const result = await operation();
        
        if (attempt > 0 && this.verbose) {
          console.log(`${colors.green}Request succeeded on attempt ${attempt + 1}${colors.reset}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          
          if (this.verbose) {
            console.log(`${colors.yellow}Request failed (attempt ${attempt + 1}): ${error.error || error.message}${colors.reset}`);
            console.log(`${colors.yellow}Waiting ${delay}ms before retry...${colors.reset}`);
          }
          
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    if (this.verbose) {
      console.log(`${colors.red}All retry attempts exhausted for ${context}${colors.reset}`);
    }
    
    throw lastError;
  }

  calculateDelay(attempt) {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.round(exponentialDelay + jitter);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Output Formatter
 * Formats and displays results in various formats
 */
class OutputFormatter {
  static formatResult(result, options = {}) {
    const { format = 'human', verbose = false } = options;

    if (format === 'json') {
      return JSON.stringify(result, null, 2);
    }

    return this.formatHumanReadable(result, verbose);
  }

  static formatHumanReadable(result, verbose = false) {
    const lines = [];
    
    // Header
    lines.push(`${colors.bright}=== DDT Domain Debug Results ===${colors.reset}`);
    lines.push('');

    // Domain info
    if (result.domain) {
      lines.push(`${colors.cyan}Domain:${colors.reset} ${result.domain}`);
      if (result.subdomain) {
        lines.push(`${colors.cyan}Subdomain:${colors.reset} ${result.subdomain}`);
      }
    }

    // Request status
    if (result.success) {
      lines.push(`${colors.green}Status:${colors.reset} SUCCESS`);
      lines.push(`${colors.cyan}HTTP Status:${colors.reset} ${result.statusCode} ${result.statusMessage}`);
      lines.push(`${colors.cyan}Response Time:${colors.reset} ${result.responseTime}ms`);
    } else {
      lines.push(`${colors.red}Status:${colors.reset} FAILED`);
      lines.push(`${colors.red}Error:${colors.reset} ${result.error}`);
      if (result.code) {
        lines.push(`${colors.red}Error Code:${colors.reset} ${result.code}`);
      }
      if (result.responseTime) {
        lines.push(`${colors.cyan}Response Time:${colors.reset} ${result.responseTime}ms`);
      }
    }

    // Request details
    if (verbose && result.requestDetails) {
      lines.push('');
      lines.push(`${colors.bright}Request Details:${colors.reset}`);
      lines.push(`  URL: ${result.requestDetails.url}`);
      lines.push(`  Method: ${result.requestDetails.method}`);
      lines.push(`  Headers:`);
      for (const [key, value] of Object.entries(result.requestDetails.headers)) {
        lines.push(`    ${key}: ${value}`);
      }
    }

    // Response details
    if (verbose && result.success && result.headers) {
      lines.push('');
      lines.push(`${colors.bright}Response Headers:${colors.reset}`);
      for (const [key, value] of Object.entries(result.headers)) {
        lines.push(`  ${key}: ${value}`);
      }
    }

    // Response body preview
    if (verbose && result.success && result.body) {
      lines.push('');
      lines.push(`${colors.bright}Response Body Preview:${colors.reset}`);
      const preview = result.body.length > 500 
        ? result.body.substring(0, 500) + '...' 
        : result.body;
      lines.push(preview);
    }

    return lines.join('\n');
  }

  static displayError(message, details = null) {
    console.error(`${colors.red}Error: ${message}${colors.reset}`);
    if (details) {
      console.error(`${colors.red}Details: ${details}${colors.reset}`);
    }
  }

  static displayUsage() {
    const usage = `
${colors.bright}DDT Domain Debug Tool${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node debug-ddt.js <domain> [options]

${colors.cyan}Arguments:${colors.reset}
  domain              DDT domain to test (e.g., example.ddt.com)

${colors.cyan}Options:${colors.reset}
  --async             Use asynchronous execution mode (default)
  --sync              Use synchronous execution mode
  --verbose, -v       Enable verbose logging
  --timeout <ms>      Request timeout in milliseconds (default: 30000)
  --retries <n>       Number of retry attempts (default: 3)
  --cdn-url <url>     CDN server URL (default: http://localhost:3000)
  --format <format>   Output format: human|json (default: human)
  --path <path>       Request path (default: /)
  --help, -h          Show this help message

${colors.cyan}Examples:${colors.reset}
  node debug-ddt.js example.ddt.com
  node debug-ddt.js test.ddt.com --verbose --timeout 10000
  node debug-ddt.js api.ddt.com --format json --retries 5
  node debug-ddt.js blog.ddt.com --path /posts --cdn-url http://localhost:8080
`;
    console.log(usage);
  }
}

/**
 * Main Debug Command Class
 * Orchestrates the entire debug process
 */
class DebugCommand {
  constructor() {
    this.options = this.parseArguments();
  }

  parseArguments() {
    const args = process.argv.slice(2);
    const options = {
      domain: null,
      async: true,
      verbose: false,
      timeout: DEFAULT_TIMEOUT,
      retries: DEFAULT_RETRIES,
      cdnUrl: DEFAULT_CDN_URL,
      format: 'human',
      path: '/',
      help: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--help' || arg === '-h') {
        options.help = true;
      } else if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      } else if (arg === '--async') {
        options.async = true;
      } else if (arg === '--sync') {
        options.async = false;
      } else if (arg === '--timeout') {
        options.timeout = parseInt(args[++i], 10) || DEFAULT_TIMEOUT;
      } else if (arg === '--retries') {
        options.retries = parseInt(args[++i], 10) || DEFAULT_RETRIES;
      } else if (arg === '--cdn-url') {
        options.cdnUrl = args[++i] || DEFAULT_CDN_URL;
      } else if (arg === '--format') {
        options.format = args[++i] || 'human';
      } else if (arg === '--path') {
        options.path = args[++i] || '/';
      } else if (!arg.startsWith('--') && !options.domain) {
        options.domain = arg;
      }
    }

    return options;
  }

  async run() {
    try {
      // Show help if requested
      if (this.options.help) {
        OutputFormatter.displayUsage();
        process.exit(0);
      }

      // Validate domain argument
      if (!this.options.domain) {
        OutputFormatter.displayError('Domain argument is required');
        OutputFormatter.displayUsage();
        process.exit(1);
      }

      // Validate domain format
      const validation = DomainValidator.validate(this.options.domain);
      if (!validation.valid) {
        OutputFormatter.displayError('Invalid domain format', validation.error);
        process.exit(1);
      }

      // Execute debug command
      const result = await this.executeDebug(validation);
      
      // Display results
      const output = OutputFormatter.formatResult(result, {
        format: this.options.format,
        verbose: this.options.verbose
      });
      
      console.log(output);
      
      // Exit with appropriate code
      process.exit(result.success ? 0 : 1);

    } catch (error) {
      OutputFormatter.displayError('Unexpected error occurred', error.message);
      if (this.options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  async executeDebug(validation) {
    const httpClient = new HttpClient({
      cdnUrl: this.options.cdnUrl,
      timeout: this.options.timeout,
      verbose: this.options.verbose
    });

    const retryHandler = new RetryHandler({
      maxRetries: this.options.retries,
      verbose: this.options.verbose
    });

    const context = `${validation.domain}${this.options.path}`;

    try {
      const result = await retryHandler.executeWithRetry(
        () => httpClient.makeRequest(validation.domain, this.options.path),
        context
      );

      return {
        ...result,
        domain: validation.domain,
        subdomain: validation.subdomain,
        executionMode: this.options.async ? 'async' : 'sync'
      };

    } catch (error) {
      return {
        success: false,
        domain: validation.domain,
        subdomain: validation.subdomain,
        error: error.error || error.message,
        code: error.code,
        responseTime: error.responseTime,
        requestDetails: error.requestDetails,
        executionMode: this.options.async ? 'async' : 'sync'
      };
    }
  }
}

// Execute the command if this file is run directly
if (require.main === module) {
  const debugCommand = new DebugCommand();
  
  if (debugCommand.options.async) {
    // Asynchronous execution
    debugCommand.run().catch(error => {
      OutputFormatter.displayError('Fatal error', error.message);
      process.exit(1);
    });
  } else {
    // Synchronous execution (using async/await but blocking)
    (async () => {
      await debugCommand.run();
    })().catch(error => {
      OutputFormatter.displayError('Fatal error', error.message);
      process.exit(1);
    });
  }
}

module.exports = {
  DebugCommand,
  DomainValidator,
  HttpClient,
  RetryHandler,
  OutputFormatter
};
