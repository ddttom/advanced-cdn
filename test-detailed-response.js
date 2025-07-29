// test-detailed-response.js - Detailed response analysis
const http = require('http');
const config = require('./config');

/**
 * Test detailed response handling
 */
async function testDetailedResponse() {
    console.log('🔍 Analyzing detailed response handling...\n');
    
    // Test with a simple request to see the actual response structure
    console.log('1. Testing simple request to understand response structure...');
    try {
        const response = await makeDetailedRequest('/health');
        
        console.log(`   Response status: ${response.statusCode}`);
        console.log(`   Response headers: ${JSON.stringify(response.headers, null, 2)}`);
        console.log(`   Response body length: ${response.data.length}`);
        console.log(`   Response body preview: ${response.data.substring(0, 200)}`);
        
    } catch (error) {
        console.log(`❌ Simple request failed: ${error.message}`);
        console.log(`   Error details: ${error.stack}`);
    }
    
    console.log('\n2. Testing proxy request to understand proxy response...');
    try {
        const response = await makeDetailedRequest('/test-path', {
            'Host': 'example.ddt.com:3000',
            'Accept-Encoding': 'gzip, deflate',
            'User-Agent': 'test-detailed/1.0'
        });
        
        console.log(`   Response status: ${response.statusCode}`);
        console.log(`   Response headers: ${JSON.stringify(response.headers, null, 2)}`);
        console.log(`   Response body length: ${response.data.length}`);
        console.log(`   Response body preview: ${response.data.substring(0, 200)}`);
        
    } catch (error) {
        console.log(`❌ Proxy request failed: ${error.message}`);
        console.log(`   Error details: ${error.stack}`);
        console.log(`   Error code: ${error.code}`);
    }
    
    console.log('\n🎉 Detailed response analysis completed!');
}

/**
 * Make HTTP request with detailed error handling
 */
function makeDetailedRequest(path, headers = {}) {
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
        
        console.log(`   Making request to: ${options.hostname}:${options.port}${options.path}`);
        console.log(`   Headers: ${JSON.stringify(options.headers, null, 2)}`);
        
        const req = http.request(options, (res) => {
            console.log(`   Received response with status: ${res.statusCode}`);
            
            let data = '';
            
            res.on('data', (chunk) => {
                console.log(`   Received chunk of size: ${chunk.length}`);
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   Response completed, total size: ${data.length}`);
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });
        
        req.on('error', (error) => {
            console.log(`   Request error: ${error.message}`);
            reject(error);
        });
        
        req.on('timeout', () => {
            console.log(`   Request timeout`);
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.setTimeout(10000);
        req.end();
    });
}

// Run the test
if (require.main === module) {
    testDetailedResponse().catch(console.error);
}

module.exports = { testDetailedResponse };
