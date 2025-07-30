// test-javascript-string-literals-fix.js
const URLTransformer = require('../src/transform/url-transformer');

async function testJavaScriptStringLiteralsFix() {
  console.log('🚀 Testing JavaScript String Literals Fix...\n');

  // Initialize transformer
  const transformer = new URLTransformer({
    enabled: true,
    debugMode: true
  });

  const requestContext = {
    originalUrl: '/config/config.js',
    proxyHost: 'example.ddt.com:3000',
    pathTransformation: {
      target: 'allabout.network',
      matched: true
    },
    protocol: 'https'
  };

  // Test the specific case that was causing syntax errors
  const testCases = [
    {
      name: 'Original problematic case',
      content: `window.finalHost = 'https://allabout.network/';`,
      expected: `window.finalHost = 'https://example.ddt.com:3000/';`
    },
    {
      name: 'Double quotes',
      content: `window.apiUrl = "https://allabout.network/api";`,
      expected: `window.apiUrl = "https://example.ddt.com:3000/api";`
    },
    {
      name: 'Template literals',
      content: `const url = \`https://allabout.network/path\`;`,
      expected: `const url = \`https://example.ddt.com:3000/path\`;`
    },
    {
      name: 'Multiple URLs in one line',
      content: `const urls = ['https://allabout.network/a', 'https://allabout.network/b'];`,
      expected: `const urls = ['https://example.ddt.com:3000/a', 'https://example.ddt.com:3000/b'];`
    },
    {
      name: 'Mixed quotes',
      content: `fetch('https://allabout.network/api').then(() => console.log("https://allabout.network/done"));`,
      expected: `fetch('https://example.ddt.com:3000/api').then(() => console.log("https://example.ddt.com:3000/done"));`
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`   Input:    ${testCase.content}`);
    
    try {
      const result = await transformer.transformContent(testCase.content, 'application/javascript', requestContext);
      
      console.log(`   Output:   ${result.content}`);
      console.log(`   Expected: ${testCase.expected}`);
      
      if (result.content === testCase.expected) {
        console.log('   ✅ PASS\n');
        passed++;
      } else {
        console.log('   ❌ FAIL\n');
        failed++;
      }
    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}\n`);
      failed++;
    }
  }

  // Test the specific corruption that was happening
  console.log('🔍 Testing for URL corruption prevention...');
  const corruptionTest = `window.finalHost = 'https://allabout.network/';`;
  
  try {
    const result = await transformer.transformContent(corruptionTest, 'application/javascript', requestContext);

    console.log(`Input:  ${corruptionTest}`);
    console.log(`Output: ${result.content}`);

    // Check that we don't have the corrupted pattern
    const hasCorruption = result.content.includes('https://example.ddt.com:3000/https:');
    const hasCorrectFormat = result.content.includes('https://example.ddt.com:3000/');

    if (hasCorruption) {
      console.log('❌ CORRUPTION DETECTED: URL still being corrupted!');
      failed++;
    } else if (hasCorrectFormat) {
      console.log('✅ CORRUPTION PREVENTED: URL properly transformed!');
      passed++;
    } else {
      console.log('⚠️  UNEXPECTED: URL not transformed as expected');
      failed++;
    }
  } catch (error) {
    console.log(`💥 ERROR during corruption test: ${error.message}`);
    failed++;
  }

  return { passed, failed };
}

// Run the test
if (require.main === module) {
  testJavaScriptStringLiteralsFix()
    .then(({ passed, failed }) => {
      console.log('\n==================================================');
      console.log('🏁 JavaScript String Literals Fix Test Results');
      console.log('==================================================');
      console.log(`✅ Passed: ${passed}`);
      console.log(`❌ Failed: ${failed}`);
      console.log(`📊 Total: ${passed + failed}`);

      if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! JavaScript string literals fix is working correctly.');
        process.exit(0);
      } else {
        console.log(`\n🚨 ${failed} test(s) failed. Fix needs attention.`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = testJavaScriptStringLiteralsFix;