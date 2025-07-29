// simple-http-test.js - Simple HTTP client test with detailed error reporting
const http = require('http');
const config = require('./config');

/**
 * Make a simple HTTP request with detailed error reporting
 */
function makeSimpleRequest(path, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: config.server.port || 3000,
            path: path,
            method: 'GET',
            headers: {
                'Accept': '*/*',
                ...headers
            }
        };
        
        console.log(`🔍 Making request to: ${options.hostname}:${options.port}${options.path}`);
        console.log(`📋 Headers: ${JSON.stringify(options.headers, null, 2)}`);
        
        const req = http.request(options, (res) => {
            console.log(`📥 Response received: ${res.statusCode} ${res.statusMessage}`);
            console.log(`📋 Response headers: ${JSON.stringify(res.headers, null, 2)}`);
            
            let data = '';
            let chunkCount = 0;
            
            res.on('data', (chunk) => {
                chunkCount++;
                console.log(`📦 Chunk ${chunkCount}: ${chunk.length} bytes`);
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`✅ Response complete: ${data.length} total bytes`);
                resolve({
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    headers: res.headers,
                    data: data,
                    chunkCount: chunkCount
                });
            });
            
            res.on('error', (error) => {
                console.log(`❌ Response stream error: ${error.message}`);
                reject(error);
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ Request error: ${error.message}`);
            console.log(`❌ Error code: ${error.code}`);
            console.log(`❌ Error stack: ${error.stack}`);
            reject(error);
        });
        
        req.on('timeout', () => {
            console.log(`⏰ Request timeout`);
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.setTimeout(5000);
        req.end();
    });
}

/**
 * Test different scenarios
 */
async function runSimpleTests() {
    console.log('🧪 Running simple HTTP tests...\n');
    
    // Test 1: Health check
    console.log('=== Test 1: Health Check ===');
    try {
        const result = await makeSimpleRequest('/health');
        console.log(`✅ Health check successful: ${result.statusCode}`);
    } catch (error) {
        console.log(`❌ Health check failed: ${error.message}`);
    }
    
    console.log('\n=== Test 2: Proxy Request ===');
    try {
        const result = await makeSimpleRequest('/test.js', {
            'Host': 'example.ddt.com:3000',
            'Accept-Encoding': 'gzip'
        });
        console.log(`✅ Proxy request successful: ${result.statusCode}`);
    } catch (error) {
        console.log(`❌ Proxy request failed: ${error.message}`);
        console.log(`❌ Error details: ${JSON.stringify(error, null, 2)}`);
    }
    
    console.log('\n🎉 Simple HTTP tests completed!');
}

// Run tests if called directly
if (require.main === module) {
    runSimpleTests().catch(console.error);
}

module.exports = { makeSimpleRequest, runSimpleTests };
