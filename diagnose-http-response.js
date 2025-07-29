// diagnose-http-response.js - Raw socket diagnostic tool
const net = require('net');
const config = require('./config');

/**
 * Capture raw HTTP response bytes using a socket connection
 */
async function captureRawResponse(path, headers = {}) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        const port = config.server.port || 3000;
        
        console.log(`🔍 Connecting to localhost:${port} for raw HTTP capture...`);
        
        socket.connect(port, 'localhost', () => {
            console.log('✅ Socket connected, sending HTTP request...');
            
            // Build HTTP request manually
            const defaultHeaders = {
                'Host': 'localhost:' + port,
                'User-Agent': 'raw-socket-diagnostic/1.0',
                'Accept': '*/*',
                'Connection': 'close',
                ...headers
            };
            
            let request = `GET ${path} HTTP/1.1\r\n`;
            for (const [key, value] of Object.entries(defaultHeaders)) {
                request += `${key}: ${value}\r\n`;
            }
            request += '\r\n'; // End of headers
            
            console.log('📤 Sending request:');
            console.log(request.replace(/\r\n/g, '\\r\\n\n'));
            
            socket.write(request);
        });
        
        let rawData = Buffer.alloc(0);
        let responseStarted = false;
        
        socket.on('data', (chunk) => {
            if (!responseStarted) {
                console.log('📥 First chunk received, size:', chunk.length);
                responseStarted = true;
            }
            rawData = Buffer.concat([rawData, chunk]);
            console.log(`📥 Received chunk: ${chunk.length} bytes (total: ${rawData.length})`);
        });
        
        socket.on('end', () => {
            console.log('🔚 Socket connection ended');
            console.log(`📊 Total response size: ${rawData.length} bytes`);
            
            // Parse the response
            const responseStr = rawData.toString('utf8');
            const headerEndIndex = responseStr.indexOf('\r\n\r\n');
            
            if (headerEndIndex === -1) {
                console.log('❌ No proper header/body separator found');
                resolve({
                    raw: rawData,
                    headers: null,
                    body: null,
                    error: 'No header/body separator found'
                });
                return;
            }
            
            const headersStr = responseStr.substring(0, headerEndIndex);
            const bodyStr = responseStr.substring(headerEndIndex + 4);
            
            console.log('📋 Raw headers:');
            console.log(headersStr.replace(/\r\n/g, '\\r\\n\n'));
            
            console.log('📄 Body preview (first 200 chars):');
            console.log(bodyStr.substring(0, 200));
            
            resolve({
                raw: rawData,
                headers: headersStr,
                body: bodyStr,
                headerEndIndex: headerEndIndex
            });
        });
        
        socket.on('error', (error) => {
            console.log('❌ Socket error:', error.message);
            reject(error);
        });
        
        socket.on('timeout', () => {
            console.log('⏰ Socket timeout');
            socket.destroy();
            reject(new Error('Socket timeout'));
        });
        
        socket.setTimeout(10000);
    });
}

/**
 * Test different request scenarios
 */
async function runDiagnostics() {
    console.log('🧪 Starting HTTP response diagnostics...\n');
    
    // Test 1: Health check (should work)
    console.log('=== Test 1: Health Check ===');
    try {
        const result = await captureRawResponse('/health');
        console.log('✅ Health check completed');
        console.log(`Headers length: ${result.headers ? result.headers.length : 'null'}`);
        console.log(`Body length: ${result.body ? result.body.length : 'null'}`);
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
    }
    
    console.log('\n=== Test 2: Proxy Request ===');
    try {
        const result = await captureRawResponse('/test.js', {
            'Host': 'example.ddt.com:3000',
            'Accept-Encoding': 'gzip'
        });
        console.log('✅ Proxy request completed');
        console.log(`Headers length: ${result.headers ? result.headers.length : 'null'}`);
        console.log(`Body length: ${result.body ? result.body.length : 'null'}`);
    } catch (error) {
        console.log('❌ Proxy request failed:', error.message);
    }
    
    console.log('\n=== Test 3: Simple Proxy Request (no gzip) ===');
    try {
        const result = await captureRawResponse('/test-path', {
            'Host': 'example.ddt.com:3000'
        });
        console.log('✅ Simple proxy request completed');
        console.log(`Headers length: ${result.headers ? result.headers.length : 'null'}`);
        console.log(`Body length: ${result.body ? result.body.length : 'null'}`);
    } catch (error) {
        console.log('❌ Simple proxy request failed:', error.message);
    }
    
    console.log('\n🎉 HTTP response diagnostics completed!');
}

// Run diagnostics if called directly
if (require.main === module) {
    runDiagnostics().catch(console.error);
}

module.exports = { captureRawResponse, runDiagnostics };
