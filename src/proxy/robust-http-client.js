// robust-http-client.js - Improved HTTP client with better error handling
const http = require('http');
const config = require('../config');
const logger = require('../logger').getModuleLogger('robust-http-client');

/**
 * Make HTTP request with robust error handling and connection management
 */
function makeRobustRequest(path, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: config.server.port || 3000,
            path: path,
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'Connection': 'close', // Force connection close to avoid keep-alive issues
                ...headers
            }
        };
        
        logger.debug('Making robust request', {
            url: `${options.hostname}:${options.port}${options.path}`,
            headers: options.headers
        });

        const req = http.request(options, (res) => {
            logger.debug('Response received', {
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                headers: res.headers
            });
            
            let data = Buffer.alloc(0);
            let chunkCount = 0;
            
            res.on('data', (chunk) => {
                chunkCount++;
                logger.debug(`Chunk received`, { chunkNumber: chunkCount, bytes: chunk.length });
                data = Buffer.concat([data, chunk]);
            });
            
            res.on('end', () => {
                logger.debug('Response complete', { totalBytes: data.length });
                
                // Convert buffer to string for text responses
                let responseData = data;
                const contentType = res.headers['content-type'] || '';
                if (contentType.includes('text') || contentType.includes('json') || contentType.includes('html')) {
                    responseData = data.toString('utf8');
                }
                
                resolve({
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    headers: res.headers,
                    data: responseData,
                    rawData: data,
                    chunkCount: chunkCount
                });
            });
            
            res.on('error', (error) => {
                logger.error('Response stream error', { error: error.message });
                reject(error);
            });
            
            // Handle aborted responses
            res.on('aborted', () => {
                logger.warn('Response aborted');
                reject(new Error('Response aborted'));
            });
        });
        
        req.on('error', (error) => {
            logger.error('Request error', {
                error: error.message,
                code: error.code
            });

            // Provide more specific error information
            if (error.code === 'HPE_INVALID_CONSTANT') {
                logger.error('HTTP Parse Error - malformed HTTP response data', {
                    bytesParsed: error.bytesParsed || 'unknown'
                });
            }

            reject(error);
        });
        
        req.on('timeout', () => {
            logger.warn('Request timeout');
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        // Handle socket errors
        req.on('socket', (socket) => {
            socket.on('error', (error) => {
                logger.error('Socket error', { error: error.message });
                reject(error);
            });
        });
        
        req.setTimeout(10000);
        req.end();
    });
}

/**
 * Test the robust HTTP client
 */
async function testRobustClient() {
    logger.info('Testing robust HTTP client...');

    // Test 1: Health check
    logger.info('=== Test 1: Health Check ===');
    try {
        const result = await makeRobustRequest('/health');
        logger.info('Health check successful', {
            statusCode: result.statusCode,
            responseSize: result.rawData.length
        });
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
    }

    logger.info('=== Test 2: Proxy Request (with Connection: close) ===');
    try {
        const result = await makeRobustRequest('/test.js', {
            'Host': 'example.ddt.com:3000',
            'Accept-Encoding': 'gzip'
        });
        logger.info('Proxy request successful', {
            statusCode: result.statusCode,
            responseSize: result.rawData.length
        });
    } catch (error) {
        logger.error('Proxy request failed', { error: error.message });
    }

    logger.info('=== Test 3: Simple Proxy Request ===');
    try {
        const result = await makeRobustRequest('/test-path', {
            'Host': 'example.ddt.com:3000'
        });
        logger.info('Simple proxy request successful', {
            statusCode: result.statusCode,
            responseSize: result.rawData.length
        });
    } catch (error) {
        logger.error('Simple proxy request failed', { error: error.message });
    }

    logger.info('Robust HTTP client testing completed!');
}

// Run tests if called directly
if (require.main === module) {
    testRobustClient().catch(console.error);
}

module.exports = { makeRobustRequest, testRobustClient };
