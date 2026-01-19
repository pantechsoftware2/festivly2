/**
 * Test Imagen-4 API Response Structure
 * Run this to see what the actual API returns
 */

const { GoogleAuth } = require('google-auth-library');

async function testImagenAPI() {
  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY not set');
      process.exit(1);
    }
    
    const credentials = JSON.parse(serviceAccountKey);
    const project = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
    
    console.log(`Testing Imagen-4 API...`);
    console.log(`Project: ${project}`);
    console.log(`Location: ${location}`);
    
    const auth = new GoogleAuth({
      credentials,
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      console.error('❌ Failed to get access token');
      process.exit(1);
    }
    
    console.log(`✅ Got access token`);
    
    // Try different model names
    const models = [
      'imagen-4.0-generate-001',
      'imagen-4-generate-001',
      'imagen-3.0-generate-001',
    ];
    
    for (const modelId of models) {
      console.log(`\n🧪 Testing model: ${modelId}`);
      
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${modelId}:predict`;
      
      const requestBody = {
        instances: [
          {
            prompt: "A professional social media image for Republic Day with Indian flag and celebration theme",
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "3:4",
          safetyFilterLevel: "block_some",
          personGeneration: "allow_adult",
        },
      };
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log(`   Status: ${response.status}`);
        
        const data = await response.json();
        
        if (response.ok) {
          console.log(`✅ SUCCESS`);
          console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
          
          if (data.predictions) {
            console.log(`   Predictions count: ${data.predictions.length}`);
            if (data.predictions[0]) {
              console.log(`   Prediction[0] keys: ${Object.keys(data.predictions[0]).join(', ')}`);
              console.log(`   Prediction[0] types: ${Object.entries(data.predictions[0]).map(([k, v]) => `${k}:${typeof v}(${typeof v === 'string' ? v.length : 'N/A'})`).join(', ')}`);
              
              // Check for image field
              for (const [key, value] of Object.entries(data.predictions[0])) {
                if (typeof value === 'string' && value.length > 1000) {
                  console.log(`   ✅ Found potential image data in field "${key}" (${(value.length / 1024).toFixed(2)} KB)`);
                }
              }
            }
          }
        } else {
          console.log(`❌ FAILED`);
          console.log(`   Error: ${data.error?.message || JSON.stringify(data).substring(0, 200)}`);
        }
      } catch (e) {
        console.log(`❌ ERROR: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error?.message || error);
    process.exit(1);
  }
}

testImagenAPI();
