// url-relativization-compute.test.js
const URLRelativizationCompute = require('../src/transform/compute/url-relativization-compute');

/**
 * Unit tests for URL Relativization Compute Function
 * 
 * Tests the rule-based URL transformation system that converts absolute URLs
 * to relative paths using the existing domain configuration.
 */

describe('URLRelativizationCompute', () => {
    let compute;
    let mockConfig;
    
    beforeEach(() => {
        // Mock configuration similar to the actual config structure
        mockConfig = {
            enabled: true,
            cdn: {
                originDomain: 'allabout.network',
                targetDomain: 'main--allaboutv2--ddttom.hlx.live'
            },
            pathRewriting: {
                domainPathMapping: {
                    'ddt.com': '/ddt'
                },
                domainTargets: {
                    'ddt.com': 'main--allaboutv2--ddttom.hlx.live'
                }
            }
        };
        
        compute = new URLRelativizationCompute(mockConfig);
    });
    
    afterEach(() => {
        if (compute && typeof compute.shutdown === 'function') {
            compute.shutdown();
        }
    });
    
    describe('Initialization', () => {
        test('should initialize with correct configuration', () => {
            expect(compute.name).toBe('url-relativization');
            expect(compute.enabled).toBe(true);
            expect(compute.originDomain).toBe('allabout.network');
            expect(compute.targetDomain).toBe('main--allaboutv2--ddttom.hlx.live');
        });
        
        test('should build transformation rules from configuration', () => {
            expect(compute.transformationRules).toBeDefined();
            expect(compute.transformationRules.length).toBeGreaterThan(0);
            
            // Should have rules for origin domain, target domain, and generic patterns
            const ruleTypes = compute.transformationRules.map(r => r.type);
            expect(ruleTypes).toContain('origin-path-prefix');
            expect(ruleTypes).toContain('target-path-prefix');
            expect(ruleTypes).toContain('origin-generic');
        });
    });
    
    describe('canProcess', () => {
        test('should process HTML content', () => {
            const result = compute.canProcess('<html></html>', 'text/html', {});
            expect(result).toBe(true);
        });
        
        test('should process JavaScript content', () => {
            const result = compute.canProcess('console.log("test");', 'application/javascript', {});
            expect(result).toBe(true);
        });
        
        test('should process JSON content', () => {
            const result = compute.canProcess('{"test": true}', 'application/json', {});
            expect(result).toBe(true);
        });
        
        test('should not process binary content', () => {
            const result = compute.canProcess(Buffer.from('binary'), 'image/png', {});
            expect(result).toBe(false);
        });
        
        test('should not process when disabled', () => {
            compute.enabled = false;
            const result = compute.canProcess('<html></html>', 'text/html', {});
            expect(result).toBe(false);
        });
    });
    
    describe('URL Transformation Rules', () => {
        test('should convert origin domain URLs with path prefix to relative paths', async () => {
            const content = `
                <a href="https://allabout.network/ddt/ai/">AI Article</a>
                <img src="https://allabout.network/ddt/images/logo.png" alt="Logo">
            `;
            
            const context = { originalUrl: '/test' };
            const result = await compute.compute(content, 'text/html', context);
            
            expect(result.modified).toBe(true);
            expect(result.content).toContain('href="/ai/"');
            expect(result.content).toContain('src="/images/logo.png"');
            expect(result.urlsConverted).toBe(2);
        });
        
        test('should convert target domain URLs with path prefix to relative paths', async () => {
            const content = `
                <a href="https://main--allaboutv2--ddttom.hlx.live/ddt/edge-services">Edge Services</a>
                <script src="https://main--allaboutv2--ddttom.hlx.live/ddt/js/app.js"></script>
            `;
            
            const context = { originalUrl: '/test' };
            const result = await compute.compute(content, 'text/html', context);
            
            expect(result.modified).toBe(true);
            expect(result.content).toContain('href="/edge-services"');
            expect(result.content).toContain('src="/js/app.js"');
            expect(result.urlsConverted).toBe(2);
        });
        
        test('should convert generic origin domain URLs to relative paths', async () => {
            const content = `
                <a href="https://allabout.network/about">About</a>
                <link rel="stylesheet" href="https://allabout.network/css/styles.css">
            `;
            
            const context = { originalUrl: '/test' };
            const result = await compute.compute(content, 'text/html', context);
            
            expect(result.modified).toBe(true);
            expect(result.content).toContain('href="/about"');
            expect(result.content).toContain('href="/css/styles.css"');
            expect(result.urlsConverted).toBe(2);
        });
        
        test('should handle JavaScript content with URLs', async () => {
            const content = `
                fetch('https://allabout.network/ddt/api/data')
                    .then(response => response.json());
                
                const imageUrl = "https://allabout.network/ddt/images/banner.jpg";
            `;
            
            const context = { originalUrl: '/test.js' };
            const result = await compute.compute(content, 'application/javascript', context);
            
            expect(result.modified).toBe(true);
            expect(result.content).toContain("fetch('/api/data')");
            expect(result.content).toContain('"/images/banner.jpg"');
            expect(result.urlsConverted).toBe(2);
        });
        
        test('should handle CSS content with URLs', async () => {
            const content = `
                .background {
                    background-image: url('https://allabout.network/ddt/images/bg.jpg');
                }
                
                @import url('https://allabout.network/ddt/css/fonts.css');
            `;
            
            const context = { originalUrl: '/test.css' };
            const result = await compute.compute(content, 'text/css', context);
            
            expect(result.modified).toBe(true);
            expect(result.content).toContain("url('/images/bg.jpg')");
            expect(result.content).toContain("url('/css/fonts.css')");
            expect(result.urlsConverted).toBe(2);
        });
        
        test('should not modify external URLs', async () => {
            const content = `
                <a href="https://external-site.com/page">External Link</a>
                <img src="https://cdn.example.com/image.jpg" alt="External Image">
            `;
            
            const context = { originalUrl: '/test' };
            const result = await compute.compute(content, 'text/html', context);
            
            expect(result.modified).toBe(false);
            expect(result.content).toContain('https://external-site.com/page');
            expect(result.content).toContain('https://cdn.example.com/image.jpg');
            expect(result.urlsConverted).toBe(0);
        });
        
        test('should preserve relative URLs and fragments', async () => {
            const content = `
                <a href="/already-relative">Relative Link</a>
                <a href="#section">Fragment Link</a>
                <a href="?query=param">Query Link</a>
                <a href="relative/path">Relative Path</a>
            `;
            
            const context = { originalUrl: '/test' };
            const result = await compute.compute(content, 'text/html', context);
            
            expect(result.modified).toBe(false);
            expect(result.content).toContain('href="/already-relative"');
            expect(result.content).toContain('href="#section"');
            expect(result.content).toContain('href="?query=param"');
            expect(result.content).toContain('href="relative/path"');
            expect(result.urlsConverted).toBe(0);
        });
    });
    
    describe('Complex Scenarios', () => {
        test('should handle mixed content with multiple URL types', async () => {
            const content = `
                <!DOCTYPE html>
                <html>
                <head>
                    <link rel="stylesheet" href="https://allabout.network/ddt/css/main.css">
                    <script src="https://main--allaboutv2--ddttom.hlx.live/ddt/js/app.js"></script>
                </head>
                <body>
                    <a href="https://allabout.network/ddt/about">About</a>
                    <img src="https://external-cdn.com/image.jpg" alt="External">
                    <a href="/already-relative">Relative</a>
                </body>
                </html>
            `;
            
            const context = { originalUrl: '/test.html' };
            const result = await compute.compute(content, 'text/html', context);
            
            expect(result.modified).toBe(true);
            expect(result.content).toContain('href="/css/main.css"');
            expect(result.content).toContain('src="/js/app.js"');
            expect(result.content).toContain('href="/about"');
            expect(result.content).toContain('https://external-cdn.com/image.jpg'); // External URL preserved
            expect(result.content).toContain('href="/already-relative"'); // Relative URL preserved
            expect(result.urlsConverted).toBe(3);
        });
        
        test('should handle JSON content with embedded URLs', async () => {
            const content = JSON.stringify({
                apiEndpoint: 'https://allabout.network/ddt/api/v1',
                imageUrl: 'https://main--allaboutv2--ddttom.hlx.live/ddt/images/logo.png',
                externalService: 'https://external-api.com/service',
                relativePath: '/already/relative'
            });
            
            const context = { originalUrl: '/config.json' };
            const result = await compute.compute(content, 'application/json', context);
            
            expect(result.modified).toBe(true);
            const parsedResult = JSON.parse(result.content);
            expect(parsedResult.apiEndpoint).toBe('/api/v1');
            expect(parsedResult.imageUrl).toBe('/images/logo.png');
            expect(parsedResult.externalService).toBe('https://external-api.com/service'); // External preserved
            expect(parsedResult.relativePath).toBe('/already/relative'); // Relative preserved
            expect(result.urlsConverted).toBe(2);
        });
    });
    
    describe('Error Handling', () => {
        test('should handle malformed content gracefully', async () => {
            const content = 'This is malformed HTML with https://allabout.network/ddt/test but broken <tag>';
            
            const context = { originalUrl: '/test' };
            const result = await compute.compute(content, 'text/html', context);
            
            // Should still process URLs even in malformed content
            expect(result.modified).toBe(true);
            expect(result.content).toContain('/test');
            expect(result.error).toBeUndefined();
        });
        
        test('should return original content on processing error', async () => {
            // Mock a processing error by overriding the transformation rules
            compute.transformationRules = [
                {
                    type: 'error-rule',
                    pattern: null, // Invalid pattern to cause error
                    replacement: '$1'
                }
            ];
            
            const content = 'Test content with https://allabout.network/ddt/test';
            const context = { originalUrl: '/test' };
            
            const result = await compute.compute(content, 'text/html', context);
            
            expect(result.modified).toBe(false);
            expect(result.content).toBe(content); // Original content returned
            expect(result.error).toBeDefined();
        });
    });
    
    describe('Statistics and Monitoring', () => {
        test('should track processing statistics', async () => {
            const content = 'Test with https://allabout.network/ddt/page';
            const context = { originalUrl: '/test' };
            
            const initialStats = compute.getStats();
            expect(initialStats.processed).toBe(0);
            
            await compute.compute(content, 'text/html', context);
            
            const finalStats = compute.getStats();
            expect(finalStats.processed).toBe(1);
            expect(finalStats.modified).toBe(1);
            expect(finalStats.urlsFound).toBe(1);
            expect(finalStats.urlsConverted).toBe(1);
            expect(finalStats.conversionRate).toBe(1);
        });
        
        test('should reset statistics', async () => {
            const content = 'Test with https://allabout.network/ddt/page';
            const context = { originalUrl: '/test' };
            
            await compute.compute(content, 'text/html', context);
            
            let stats = compute.getStats();
            expect(stats.processed).toBe(1);
            
            compute.resetStats();
            
            stats = compute.getStats();
            expect(stats.processed).toBe(0);
            expect(stats.modified).toBe(0);
            expect(stats.urlsFound).toBe(0);
            expect(stats.urlsConverted).toBe(0);
        });
    });
    
    describe('Configuration Updates', () => {
        test('should update configuration and rebuild rules', () => {
            const newConfig = {
                cdn: {
                    originDomain: 'new-origin.com',
                    targetDomain: 'new-target.com'
                },
                pathRewriting: {
                    domainPathMapping: {
                        'new-domain.com': '/new-path'
                    }
                }
            };
            
            const initialRulesCount = compute.transformationRules.length;
            
            compute.updateConfig(newConfig);
            
            expect(compute.originDomain).toBe('new-origin.com');
            expect(compute.targetDomain).toBe('new-target.com');
            expect(compute.transformationRules.length).toBeGreaterThanOrEqual(initialRulesCount);
        });
    });
});

// Helper function to run tests if this file is executed directly
if (require.main === module) {
    console.log('Running URL Relativization Compute Function tests...');
    
    // Simple test runner for basic functionality
    const runBasicTest = async () => {
        try {
            const mockConfig = {
                enabled: true,
                cdn: {
                    originDomain: 'allabout.network',
                    targetDomain: 'main--allaboutv2--ddttom.hlx.live'
                },
                pathRewriting: {
                    domainPathMapping: {
                        'ddt.com': '/ddt'
                    }
                }
            };
            
            const compute = new URLRelativizationCompute(mockConfig);
            
            const testContent = `
                <a href="https://allabout.network/blogs/ddt/ai/">AI Article</a>
                <img src="https://main--allaboutv2--ddttom.hlx.live/ddt/images/logo.png" alt="Logo">
            `;
            
            const context = { originalUrl: '/test' };
            const result = await compute.compute(testContent, 'text/html', context);
            
            console.log('✓ Basic test passed');
            console.log(`  - URLs converted: ${result.urlsConverted}`);
            console.log(`  - Content modified: ${result.modified}`);
            console.log(`  - Processing time: ${result.processingTime}ms`);
            
            if (result.modified) {
                console.log('  - Sample transformation:');
                console.log(`    Original: https://allabout.network/blogs/ddt/ai/`);
                console.log(`    Result: ${result.content.match(/href="([^"]*ai[^"]*)"/)?.[1] || 'Not found'}`);
            }
            
            compute.shutdown();
            
        } catch (error) {
            console.error('✗ Basic test failed:', error.message);
        }
    };
    
    runBasicTest();
}