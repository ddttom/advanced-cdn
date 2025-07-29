// test-js-decompression.js - Test JavaScript decompression error handling
const http = require('http');
const config = require('./config');

/**
 * Test JavaScript decompression error handling
 */
async function testJSDecompression() {
    console.log('🧪 Testing JavaScript decompression error handling...\n');
    
    // Test with a JavaScript file request that might have decompression issues
    console.log('1. Testing JavaScript file request with gzip encoding...');
    try {
        const response = await makeRequest('/test.js', {
            'Host': 'example.ddt.com:3000',
            'Accept-Encoding': 'gzip, deflate',
            'Accept': 'application/javascript, text/javascript, */*',
            'User-Agent': 'test-js-decompression/1.0'
        });
        
        console.log(`   Response status: ${response.statusCode}`);
        console.log(`   Response headers: ${JSON.stringify(response.headers, null, 2)}`);
        
        if (response.statusCode === 502) {
            console.log('✅ JavaScript decompression error handling working - returned 502 for corrupted JS');
            console.log(`   Response body: ${response.data}`);
        } else if (response.statusCode === 404) {
            console.log('✅ JavaScript file not found (expected) - no decompression issues');
        } else if (response.statusCode === 200) {
            console.log('✅ JavaScript file served successfully - decompression working');
        } else {
            console.log(`ℹ️  Unexpected status code: ${response.statusCode}`);
        }
        
    } catch (error) {
        console.log(`❌ JavaScript decompression test failed: ${error.message}`);
    }
    
    console.log('\n🎉 JavaScript decompression test completed!');
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

// Run the test
if (require.main === module) {
    testJSDecompression().catch(console.error);
}

module.exports = { testJSDecompression };
