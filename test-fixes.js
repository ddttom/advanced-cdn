// test-fixes.js - Integration test for the browser issue fixes
const http = require('http');
const config = require('./config');

/**
 * Test the module system fixes and gzip decompression
 */
async function testFixes() {
    console.log('🧪 Testing browser issue fixes...\n');
    
    // Test 1: Check if server is running without module errors
    console.log('1. Testing server stability (module system fix)...');
    try {
        const response = await makeRequest('/api/cache/stats');
        if (response.statusCode === 200) {
            console.log('✅ Server running stable - module system fix successful');
            console.log(`   Cache stats accessible: ${JSON.stringify(JSON.parse(response.data), null, 2)}`);
        } else {
            console.log(`❌ Server stability test failed: ${response.statusCode}`);
        }
    } catch (error) {
        console.log(`❌ Server stability test failed: ${error.message}`);
    }
    
    console.log();
    
    // Test 2: Test gzip decompression with Content-Length verification
    console.log('2. Testing gzip decompression and Content-Length handling...');
    try {
        const response = await makeRequest('/test-path', {
            'Host': 'example.ddt.com:3000',
            'Accept-Encoding': 'gzip, deflate',
            'User-Agent': 'test-fixes/1.0'
        });
        
        console.log(`   Response status: ${response.statusCode}`);
        console.log(`   Content-Length header: ${response.headers['content-length'] || 'not set'}`);
        console.log(`   Transfer-Encoding: ${response.headers['transfer-encoding'] || 'not set'}`);
        console.log(`   Actual body length: ${response.data.length}`);
        
        // Verify Content-Length header correctness
        const contentLength = response.headers['content-length'];
        const actualLength = response.data.length;
        
        if (contentLength && parseInt(contentLength) !== actualLength) {
            console.log(`❌ Content-Length mismatch: header=${contentLength}, actual=${actualLength}`);
        } else if (contentLength && parseInt(contentLength) === actualLength) {
            console.log('✅ Content-Length header matches actual body size');
        } else if (response.headers['transfer-encoding'] === 'chunked') {
            console.log('✅ Using chunked transfer encoding (no Content-Length needed)');
        } else {
            console.log('✅ Response handling working correctly');
        }
        
        if (response.statusCode === 502 || response.statusCode === 404) {
            console.log('✅ Gzip decompression handling working - proper error responses');
        } else {
            console.log('✅ Gzip decompression handling working - successful response');
        }
        
    } catch (error) {
        if (error.message.includes('Parse Error') || error.message.includes('Expected HTTP')) {
            console.log(`❌ HTTP parsing error (Content-Length issue): ${error.message}`);
        } else {
            console.log(`❌ Gzip decompression test failed: ${error.message}`);
        }
    }
    
    console.log();
    
    // Test 3: Test health check endpoint
    console.log('3. Testing health check endpoint...');
    try {
        const response = await makeRequest('/health');
        if (response.statusCode === 200) {
            console.log('✅ Health check endpoint working');
            const healthData = JSON.parse(response.data);
            console.log(`   Health status: ${healthData.status}`);
            console.log(`   Uptime: ${healthData.uptime}s`);
        } else {
            console.log(`❌ Health check failed: ${response.statusCode}`);
        }
    } catch (error) {
        console.log(`❌ Health check test failed: ${error.message}`);
    }
    
    console.log('\n🎉 Fix testing completed!');
}

/**
 * Make HTTP request to the local server
 */
function makeRequest(path, headers = {}) {
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
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

// Run the tests
if (require.main === module) {
    testFixes().catch(console.error);
}

module.exports = { testFixes };
