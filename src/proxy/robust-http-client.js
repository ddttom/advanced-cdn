// robust-http-client.js - Improved HTTP client with better error handling
const http = require('http');
const config = require('../config');

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
        
        console.log(`🔍 Making robust request to: ${options.hostname}:${options.port}${options.path}`);
        console.log(`📋 Headers: ${JSON.stringify(options.headers, null, 2)}`);
        
        const req = http.request(options, (res) => {
            console.log(`📥 Response received: ${res.statusCode} ${res.statusMessage}`);
            console.log(`📋 Response headers: ${JSON.stringify(res.headers, null, 2)}`);
            
            let data = Buffer.alloc(0);
            let chunkCount = 0;
            
            res.on('data', (chunk) => {
                chunkCount++;
                console.log(`📦 Chunk ${chunkCount}: ${chunk.length} bytes`);
                data = Buffer.concat([data, chunk]);
            });
            
            res.on('end', () => {
                console.log(`✅ Response complete: ${data.length} total bytes`);
                
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
                console.log(`❌ Response stream error: ${error.message}`);
                reject(error);
            });
            
            // Handle aborted responses
            res.on('aborted', () => {
                console.log(`⚠️ Response aborted`);
                reject(new Error('Response aborted'));
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ Request error: ${error.message}`);
            console.log(`❌ Error code: ${error.code}`);
            
            // Provide more specific error information
            if (error.code === 'HPE_INVALID_CONSTANT') {
                console.log(`❌ HTTP Parse Error: This usually indicates malformed HTTP response data`);
                console.log(`❌ Bytes parsed: ${error.bytesParsed || 'unknown'}`);
            }
            
            reject(error);
        });
        
        req.on('timeout', () => {
            console.log(`⏰ Request timeout`);
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        // Handle socket errors
        req.on('socket', (socket) => {
            socket.on('error', (error) => {
                console.log(`❌ Socket error: ${error.message}`);
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
    console.log('🧪 Testing robust HTTP client...\n');
    
    // Test 1: Health check
    console.log('=== Test 1: Health Check ===');
    try {
        const result = await makeRobustRequest('/health');
        console.log(`✅ Health check successful: ${result.statusCode}`);
        console.log(`📊 Response size: ${result.rawData.length} bytes`);
    } catch (error) {
        console.log(`❌ Health check failed: ${error.message}`);
    }
    
    console.log('\n=== Test 2: Proxy Request (with Connection: close) ===');
    try {
        const result = await makeRobustRequest('/test.js', {
            'Host': 'example.ddt.com:3000',
            'Accept-Encoding': 'gzip'
        });
        console.log(`✅ Proxy request successful: ${result.statusCode}`);
        console.log(`📊 Response size: ${result.rawData.length} bytes`);
    } catch (error) {
        console.log(`❌ Proxy request failed: ${error.message}`);
    }
    
    console.log('\n=== Test 3: Simple Proxy Request ===');
    try {
        const result = await makeRobustRequest('/test-path', {
            'Host': 'example.ddt.com:3000'
        });
        console.log(`✅ Simple proxy request successful: ${result.statusCode}`);
        console.log(`📊 Response size: ${result.rawData.length} bytes`);
    } catch (error) {
        console.log(`❌ Simple proxy request failed: ${error.message}`);
    }
    
    console.log('\n🎉 Robust HTTP client testing completed!');
}

// Run tests if called directly
if (require.main === module) {
    testRobustClient().catch(console.error);
}

module.exports = { makeRobustRequest, testRobustClient };
