#!/usr/bin/env node

/**
 * Test Script: Image Generation Test
 * Tests if the Vertex AI integration works
 */

const http = require('http');

async function testImageGeneration() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 IMAGE GENERATION TEST');
  console.log('='.repeat(60) + '\n');

  // Test 1: Health Check
  console.log('📋 TEST 1: Health Check Endpoint');
  console.log('─'.repeat(60));
  
  try {
    const healthResponse = await new Promise((resolve, reject) => {
      http.get('http://localhost:3000/api/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data
            });
          }
        });
      }).on('error', reject);
    });

    console.log(`Status: ${healthResponse.status}`);
    console.log(`Response:`, JSON.stringify(healthResponse.data, null, 2));
    
    if (healthResponse.status === 200 && healthResponse.data.environment?.credentialsStatus === 'credentials loaded') {
      console.log('✅ PASS: Credentials are loaded\n');
    } else if (healthResponse.data.environment?.credentialsStatus?.includes('error')) {
      console.log('❌ FAIL: Credentials not loaded');
      console.log('   Fix: Run gcloud auth application-default login\n');
    } else {
      console.log('⚠️  WARNING: Unexpected response\n');
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    console.log('Make sure dev server is running: npm run dev\n');
    return false;
  }

  // Test 2: Generate Image (if credentials loaded)
  console.log('📋 TEST 2: Generate Image');
  console.log('─'.repeat(60));
  
  const requestData = JSON.stringify({
    prompt: 'a beautiful sunset over mountains',
    template: 'full-image',
    primaryColor: '#FF6B6B',
    userId: 'test-user-' + Date.now()
  });

  try {
    const generateResponse = await new Promise((resolve, reject) => {
      const postOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/generateImage',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData)
        }
      };

      const req = http.request(postOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data
            });
          }
        });
      });

      req.on('error', reject);
      req.write(requestData);
      req.end();
    });

    console.log(`Status: ${generateResponse.status}`);
    
    if (generateResponse.status === 200 && generateResponse.data.success) {
      console.log(`✅ PASS: Generated ${generateResponse.data.images.length} images`);
      console.log(`   Images: ${generateResponse.data.images.map((img, i) => `${i+1}. ${img.id.substring(0, 8)}`).join(', ')}\n`);
      return true;
    } else if (generateResponse.status === 429) {
      console.log('❌ FAIL: Rate limited (429)');
      console.log('   Message:', generateResponse.data.error);
      console.log('   Fix: Run gcloud auth application-default login\n');
      return false;
    } else {
      console.log(`Error (${generateResponse.status}):`, generateResponse.data.error || generateResponse.data);
      console.log();
      return false;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    return false;
  }
}

// Run tests
testImageGeneration().then(success => {
  console.log('='.repeat(60));
  if (success) {
    console.log('✅ ALL TESTS PASSED - Image generation is working!');
  } else {
    console.log('❌ TESTS FAILED - See details above');
  }
  console.log('='.repeat(60) + '\n');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});
