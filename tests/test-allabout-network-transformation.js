// test-allabout-network-transformation.js
const URLTransformer = require('../src/transform/url-transformer');
const assert = require('assert');

/**
 * Test URL transformation specifically for allabout.network domain
 */
async function testAllAboutNetworkTransformation() {
  console.log('🚀 Testing allabout.network URL Transformation...\n');

  const transformer = new URLTransformer({
    enabled: true,
    debugMode: true
  });

  const requestContext = {
    originalUrl: '/blogs/ddt/',
    proxyHost: 'your-proxy-domain.com',
    pathTransformation: {
      target: 'main--allaboutv2--ddttom.hlx.live',
      matched: true
    },
    protocol: 'https'
  };

  // Test the exact HTML from the user's question
  const testHTML = `
    <p>My Blog is here <a href="https://allabout.network/blogs/ddt/">https://allabout.network/blogs/ddt/</a></p>
    <p>Knowledge hub here <a href="https://allabout.network/blogs/ddt/edge-delivery-services-knowledge-hub">Edge Delivery Services Knowledge Hub</a></p>
    <p>Ai Pages: <a href="https://allabout.network/blogs/ddt/ai/">https://allabout.network/blogs/ddt/ai/</a></p>
  `;

  console.log('📝 Original HTML:');
  console.log(testHTML);
  console.log('\n🔄 Processing...\n');

  try {
    const result = await transformer.transformContent(testHTML, 'text/html', requestContext);
    
    console.log('📊 Transformation Results:');
    console.log(`   - Transformed: ${result.transformed}`);
    console.log(`   - URLs transformed: ${result.urlsTransformed || 0}`);
    console.log(`   - Original size: ${result.originalSize || 0} bytes`);
    console.log(`   - Transformed size: ${result.transformedSize || 0} bytes`);
    
    if (result.error) {
      console.log(`   - Error: ${result.error}`);
    }
    
    if (result.reason) {
      console.log(`   - Reason: ${result.reason}`);
    }

    console.log('\n📝 Transformed HTML:');
    console.log(result.content);

    // Test assertions
    if (result.transformed) {
      console.log('\n✅ SUCCESS: URLs were transformed!');
      
      // Check if allabout.network URLs were replaced with proxy host
      const containsOriginalDomain = result.content.includes('allabout.network');
      const containsProxyHost = result.content.includes(requestContext.proxyHost);
      
      console.log(`   - Contains original domain (allabout.network): ${containsOriginalDomain ? '❌ YES (should be NO)' : '✅ NO'}`);
      console.log(`   - Contains proxy host (${requestContext.proxyHost}): ${containsProxyHost ? '✅ YES' : '❌ NO (should be YES)'}`);
      
      if (!containsOriginalDomain && containsProxyHost) {
        console.log('\n🎉 PERFECT: All allabout.network URLs were successfully transformed to proxy host!');
        return true;
      } else {
        console.log('\n⚠️  PARTIAL: Transformation occurred but URLs may not be correctly routed');
        return false;
      }
    } else {
      console.log('\n❌ FAILED: No URLs were transformed');
      console.log('   This means the shouldProxyDomain logic is not recognizing allabout.network');
      return false;
    }

  } catch (error) {
    console.error('\n💥 ERROR during transformation:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testAllAboutNetworkTransformation()
    .then(success => {
      console.log('\n' + '='.repeat(60));
      if (success) {
        console.log('🏆 allabout.network URL Transformation: SUCCESS');
        process.exit(0);
      } else {
        console.log('💥 allabout.network URL Transformation: FAILED');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = testAllAboutNetworkTransformation;