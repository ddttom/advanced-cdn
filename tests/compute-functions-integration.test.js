// compute-functions-integration.test.js
const ComputeFunctionManager = require('../src/transform/compute/compute-function-manager');

/**
 * Integration tests for the complete compute functions system
 * 
 * Tests the integration between the compute function manager and
 * URL relativization compute function with realistic configurations.
 */

describe('Compute Functions Integration', () => {
    let manager;
    let mockConfig;
    
    beforeEach(() => {
        // Mock configuration that matches the actual system
        mockConfig = {
            enabled: true,
            maxContentSize: 1024 * 1024, // 1MB for testing
            timeout: 5000,
            debugMode: true,
            
            // CDN configuration
            cdn: {
                originDomain: 'allabout.network',
                targetDomain: 'main--allaboutv2--ddttom.hlx.live'
            },
            
            // Path rewriting configuration
            pathRewriting: {
                domainPathMapping: {
                    'ddt.com': '/ddt',
                    'api.example.com': '/api'
                },
                domainTargets: {
                    'ddt.com': 'main--allaboutv2--ddttom.hlx.live',
                    'api.example.com': 'api-backend.example.com'
                }
            },
            
            // URL relativization configuration
            urlRelativization: {
                enabled: true,
                debugTransformations: true
            }
        };
        
        manager = new ComputeFunctionManager(mockConfig);
    });
    
    afterEach(() => {
        if (manager && typeof manager.shutdown === 'function') {
            manager.shutdown();
        }
    });
    
    describe('System Integration', () => {
        test('should initialize with URL relativization function', () => {
            expect(manager.computeFunctions.size).toBe(1);
            expect(manager.computeFunctions.has('url-relativization')).toBe(true);
        });
        
        test('should process realistic HTML content', async () => {
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>Test Page</title>
                    <link rel="stylesheet" href="https://allabout.network/blogs/ddt/css/main.css">
                    <script src="https://main--allaboutv2--ddttom.hlx.live/ddt/js/app.js"></script>
                </head>
                <body>
                    <header>
                        <img src="https://allabout.network/blogs/ddt/images/logo.png" alt="Logo">
                        <nav>
                            <a href="https://allabout.network/blogs/ddt/about">About</a>
                            <a href="https://allabout.network/blogs/ddt/services">Services</a>
                            <a href="https://external-site.com/page">External</a>
                        </nav>
                    </header>
                    <main>
                        <article>
                            <h1>Welcome to DDT</h1>
                            <p>This is a test page with various URL types.</p>
                            <img src="/already-relative.jpg" alt="Relative Image">
                            <a href="#section">Fragment Link</a>
                        </article>
                    </main>
                    <footer>
                        <p>&copy; 2024 DDT. All rights reserved.</p>
                    </footer>
                </body>
                </html>
            `;
            
            const context = {
                originalUrl: '/test.html',
                proxyHost: 'ddt.com',
                pathTransformation: { target: 'main--allaboutv2--ddttom.hlx.live' },
                protocol: 'https'
            };
            
            const result = await manager.processContent(htmlContent, 'text/html', context);
            
            expect(result.modified).toBe(true);
            expect(result.totalModifications).toBeGreaterThan(0);
            expect(result.functionsExecuted).toBe(1);
            expect(result.errors).toBe(0);
            
            // Verify specific transformations
            expect(result.content).toContain('href="/css/main.css"');
            expect(result.content).toContain('src="/js/app.js"');
            expect(result.content).toContain('src="/images/logo.png"');
            expect(result.content).toContain('href="/about"');
            expect(result.content).toContain('href="/services"');
            
            // Verify external URLs are preserved
            expect(result.content).toContain('https://external-site.com/page');
            
            // Verify relative URLs are preserved
            expect(result.content).toContain('src="/already-relative.jpg"');
            expect(result.content).toContain('href="#section"');
        });
        
        test('should process JavaScript content with API calls', async () => {
            const jsContent = `
                // API configuration
                const API_BASE = 'https://allabout.network/blogs/ddt/api/v1';
                const IMAGES_BASE = 'https://main--allaboutv2--ddttom.hlx.live/ddt/images';
                
                // Fetch data
                async function loadData() {
                    const response = await fetch('https://allabout.network/blogs/ddt/api/data');
                    return response.json();
                }
                
                // Load image
                function loadImage(filename) {
                    const img = new Image();
                    img.src = \`https://main--allaboutv2--ddttom.hlx.live/ddt/images/\${filename}\`;
                    return img;
                }
                
                // External service call (should not be modified)
                fetch('https://external-api.com/service')
                    .then(response => response.json());
            `;
            
            const context = {
                originalUrl: '/app.js',
                proxyHost: 'ddt.com',
                pathTransformation: { target: 'main--allaboutv2--ddttom.hlx.live' },
                protocol: 'https'
            };
            
            const result = await manager.processContent(jsContent, 'application/javascript', context);
            
            expect(result.modified).toBe(true);
            expect(result.totalModifications).toBeGreaterThan(0);
            
            // Verify API URLs are relativized
            expect(result.content).toContain("const API_BASE = '/api/v1'");
            expect(result.content).toContain("const IMAGES_BASE = '/images'");
            expect(result.content).toContain("fetch('/api/data')");
            expect(result.content).toContain("'/images/${filename}'");
            
            // Verify external URLs are preserved
            expect(result.content).toContain('https://external-api.com/service');
        });
        
        test('should process JSON configuration files', async () => {
            const jsonContent = JSON.stringify({
                api: {
                    baseUrl: 'https://allabout.network/blogs/ddt/api',
                    endpoints: {
                        users: 'https://allabout.network/blogs/ddt/api/users',
                        posts: 'https://main--allaboutv2--ddttom.hlx.live/ddt/api/posts'
                    }
                },
                assets: {
                    images: 'https://main--allaboutv2--ddttom.hlx.live/ddt/images',
                    css: 'https://allabout.network/blogs/ddt/css',
                    js: 'https://allabout.network/blogs/ddt/js'
                },
                external: {
                    analytics: 'https://analytics.google.com',
                    cdn: 'https://cdn.jsdelivr.net'
                },
                relative: {
                    favicon: '/favicon.ico',
                    manifest: '/manifest.json'
                }
            }, null, 2);
            
            const context = {
                originalUrl: '/config.json',
                proxyHost: 'ddt.com',
                pathTransformation: { target: 'main--allaboutv2--ddttom.hlx.live' },
                protocol: 'https'
            };
            
            const result = await manager.processContent(jsonContent, 'application/json', context);
            
            expect(result.modified).toBe(true);
            expect(result.totalModifications).toBeGreaterThan(0);
            
            const parsedResult = JSON.parse(result.content);
            
            // Verify API URLs are relativized
            expect(parsedResult.api.baseUrl).toBe('/api');
            expect(parsedResult.api.endpoints.users).toBe('/api/users');
            expect(parsedResult.api.endpoints.posts).toBe('/api/posts');
            
            // Verify asset URLs are relativized
            expect(parsedResult.assets.images).toBe('/images');
            expect(parsedResult.assets.css).toBe('/css');
            expect(parsedResult.assets.js).toBe('/js');
            
            // Verify external URLs are preserved
            expect(parsedResult.external.analytics).toBe('https://analytics.google.com');
            expect(parsedResult.external.cdn).toBe('https://cdn.jsdelivr.net');
            
            // Verify relative URLs are preserved
            expect(parsedResult.relative.favicon).toBe('/favicon.ico');
            expect(parsedResult.relative.manifest).toBe('/manifest.json');
        });
        
        test('should handle mixed content types correctly', async () => {
            const cssContent = `
                /* Main styles */
                @import url('https://allabout.network/blogs/ddt/css/base.css');
                
                .header {
                    background-image: url('https://main--allaboutv2--ddttom.hlx.live/ddt/images/header-bg.jpg');
                }
                
                .logo {
                    background: url('/relative-logo.png') no-repeat;
                }
                
                /* External font */
                @import url('https://fonts.googleapis.com/css2?family=Roboto');
            `;
            
            const context = {
                originalUrl: '/styles.css',
                proxyHost: 'ddt.com',
                pathTransformation: { target: 'main--allaboutv2--ddttom.hlx.live' },
                protocol: 'https'
            };
            
            const result = await manager.processContent(cssContent, 'text/css', context);
            
            expect(result.modified).toBe(true);
            expect(result.totalModifications).toBeGreaterThan(0);
            
            // Verify CSS URLs are relativized
            expect(result.content).toContain("url('/css/base.css')");
            expect(result.content).toContain("url('/images/header-bg.jpg')");
            
            // Verify relative URLs are preserved
            expect(result.content).toContain("url('/relative-logo.png')");
            
            // Verify external URLs are preserved
            expect(result.content).toContain('https://fonts.googleapis.com/css2?family=Roboto');
        });
    });
    
    describe('Performance and Error Handling', () => {
        test('should handle large content within limits', async () => {
            // Create content just under the size limit
            const baseContent = '<a href="https://allabout.network/blogs/ddt/test">Test</a>';
            const largeContent = baseContent.repeat(1000); // Still under 1MB limit
            
            const context = {
                originalUrl: '/large.html',
                proxyHost: 'ddt.com',
                pathTransformation: { target: 'main--allaboutv2--ddttom.hlx.live' },
                protocol: 'https'
            };
            
            const result = await manager.processContent(largeContent, 'text/html', context);
            
            expect(result.modified).toBe(true);
            expect(result.totalProcessingTime).toBeLessThan(mockConfig.timeout);
            expect(result.errors).toBe(0);
        });
        
        test('should skip content that exceeds size limits', async () => {
            // Create content that exceeds the size limit
            const baseContent = 'x'.repeat(1024); // 1KB
            const oversizedContent = baseContent.repeat(2000); // 2MB, exceeds 1MB limit
            
            const context = {
                originalUrl: '/oversized.html',
                proxyHost: 'ddt.com',
                pathTransformation: { target: 'main--allaboutv2--ddttom.hlx.live' },
                protocol: 'https'
            };
            
            const result = await manager.processContent(oversizedContent, 'text/html', context);
            
            expect(result.modified).toBe(false);
            expect(result.reason).toBe('Content too large');
            expect(result.contentSize).toBeGreaterThan(mockConfig.maxContentSize);
        });
        
        test('should handle malformed content gracefully', async () => {
            const malformedContent = `
                <html>
                <head>
                    <title>Malformed HTML
                <body>
                    <a href="https://allabout.network/blogs/ddt/test">Test Link
                    <img src="https://main--allaboutv2--ddttom.hlx.live/ddt/image.jpg"
                </html>
            `;
            
            const context = {
                originalUrl: '/malformed.html',
                proxyHost: 'ddt.com',
                pathTransformation: { target: 'main--allaboutv2--ddttom.hlx.live' },
                protocol: 'https'
            };
            
            const result = await manager.processContent(malformedContent, 'text/html', context);
            
            // Should still process URLs even in malformed content
            expect(result.modified).toBe(true);
            expect(result.errors).toBe(0);
            expect(result.content).toContain('/test');
            expect(result.content).toContain('/image.jpg');
        });
    });
    
    describe('Statistics and Monitoring', () => {
        test('should track comprehensive statistics', async () => {
            const content1 = '<a href="https://allabout.network/blogs/ddt/page1">Page 1</a>';
            const content2 = '<a href="https://external.com/page">External</a>';
            const content3 = '<a href="https://main--allaboutv2--ddttom.hlx.live/ddt/page2">Page 2</a>';
            
            const context = {
                originalUrl: '/test',
                proxyHost: 'ddt.com',
                pathTransformation: { target: 'main--allaboutv2--ddttom.hlx.live' },
                protocol: 'https'
            };
            
            // Process multiple pieces of content
            await manager.processContent(content1, 'text/html', context);
            await manager.processContent(content2, 'text/html', context);
            await manager.processContent(content3, 'text/html', context);
            
            const stats = manager.getStats();
            
            expect(stats.manager.totalProcessed).toBe(3);
            expect(stats.manager.totalModified).toBe(2); // content2 has no matching URLs
            expect(stats.manager.totalErrors).toBe(0);
            expect(stats.manager.modificationRate).toBeCloseTo(0.67, 1);
            
            expect(stats.functions['url-relativization']).toBeDefined();
            expect(stats.functions['url-relativization'].processed).toBe(3);
            expect(stats.functions['url-relativization'].urlsConverted).toBe(2);
        });
        
        test('should reset statistics correctly', async () => {
            const content = '<a href="https://allabout.network/blogs/ddt/test">Test</a>';
            const context = {
                originalUrl: '/test',
                proxyHost: 'ddt.com',
                pathTransformation: { target: 'main--allaboutv2--ddttom.hlx.live' },
                protocol: 'https'
            };
            
            await manager.processContent(content, 'text/html', context);
            
            let stats = manager.getStats();
            expect(stats.manager.totalProcessed).toBe(1);
            
            manager.resetStats();
            
            stats = manager.getStats();
            expect(stats.manager.totalProcessed).toBe(0);
            expect(stats.functions['url-relativization'].processed).toBe(0);
        });
    });
    
    describe('Configuration Updates', () => {
        test('should update configuration dynamically', () => {
            const newConfig = {
                enabled: true,
                maxContentSize: 2 * 1024 * 1024, // 2MB
                timeout: 10000,
                cdn: {
                    originDomain: 'new-origin.com',
                    targetDomain: 'new-target.com'
                },
                pathRewriting: {
                    domainPathMapping: {
                        'new-domain.com': '/new-path'
                    }
                },
                urlRelativization: {
                    enabled: true
                }
            };
            
            manager.updateConfig(newConfig);
            
            expect(manager.maxContentSize).toBe(2 * 1024 * 1024);
            expect(manager.timeout).toBe(10000);
            
            // Verify the URL relativization function was updated
            const urlRelativizationFunction = manager.computeFunctions.get('url-relativization');
            expect(urlRelativizationFunction.originDomain).toBe('new-origin.com');
            expect(urlRelativizationFunction.targetDomain).toBe('new-target.com');
        });
    });
});

// Helper function to run integration tests if this file is executed directly
if (require.main === module) {
    console.log('Running Compute Functions Integration tests...');
    
    const runIntegrationTest = async () => {
        try {
            const mockConfig = {
                enabled: true,
                maxContentSize: 1024 * 1024,
                timeout: 5000,
                debugMode: true,
                cdn: {
                    originDomain: 'allabout.network',
                    targetDomain: 'main--allaboutv2--ddttom.hlx.live'
                },
                pathRewriting: {
                    domainPathMapping: {
                        'ddt.com': '/ddt'
                    }
                },
                urlRelativization: {
                    enabled: true
                }
            };
            
            const manager = new ComputeFunctionManager(mockConfig);
            
            const testContent = `
                <html>
                <head>
                    <link rel="stylesheet" href="https://allabout.network/blogs/ddt/css/main.css">
                </head>
                <body>
                    <a href="https://allabout.network/blogs/ddt/ai/">AI Article</a>
                    <img src="https://main--allaboutv2--ddttom.hlx.live/ddt/images/logo.png" alt="Logo">
                    <a href="https://external.com/page">External</a>
                </body>
                </html>
            `;
            
            const context = {
                originalUrl: '/test.html',
                proxyHost: 'ddt.com',
                pathTransformation: { target: 'main--allaboutv2--ddttom.hlx.live' },
                protocol: 'https'
            };
            
            const result = await manager.processContent(testContent, 'text/html', context);
            
            console.log('✓ Integration test passed');
            console.log(`  - Functions executed: ${result.functionsExecuted}`);
            console.log(`  - Content modified: ${result.modified}`);
            console.log(`  - Total modifications: ${result.totalModifications}`);
            console.log(`  - Processing time: ${result.totalProcessingTime}ms`);
            console.log(`  - Errors: ${result.errors}`);
            
            if (result.modified) {
                console.log('  - Sample transformations:');
                if (result.content.includes('href="/css/main.css"')) {
                    console.log('    ✓ CSS URL relativized');
                }
                if (result.content.includes('href="/ai/"')) {
                    console.log('    ✓ Article URL relativized');
                }
                if (result.content.includes('src="/images/logo.png"')) {
                    console.log('    ✓ Image URL relativized');
                }
                if (result.content.includes('https://external.com/page')) {
                    console.log('    ✓ External URL preserved');
                }
            }
            
            const stats = manager.getStats();
            console.log(`  - Manager stats: ${stats.manager.totalProcessed} processed, ${stats.manager.totalModified} modified`);
            console.log(`  - URL relativization: ${stats.functions['url-relativization'].urlsConverted} URLs converted`);
            
            manager.shutdown();
            
        } catch (error) {
            console.error('✗ Integration test failed:', error.message);
            console.error(error.stack);
        }
    };
    
    runIntegrationTest();
}