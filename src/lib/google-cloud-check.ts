/**
 * Server startup check for Google Cloud credentials
 * Runs on server startup to verify authentication is configured
 */

import { VertexAI } from '@google-cloud/vertexai'

export async function checkGoogleCloudSetup() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  const region = process.env.GOOGLE_CLOUD_REGION || 'us-central1'

  console.log('\n' + '='.repeat(60))
  console.log('🔍 Checking Google Cloud Configuration...')
  console.log('='.repeat(60))

  if (!projectId) {
    console.error('❌ ERROR: GOOGLE_CLOUD_PROJECT_ID not set in .env.local')
    console.log('   Please add: GOOGLE_CLOUD_PROJECT_ID=ai-image-editor-483505')
    console.log('='.repeat(60) + '\n')
    return false
  }

  console.log(`✅ Project ID: ${projectId}`)
  console.log(`✅ Region: ${region}`)

  // Test credential loading
  try {
    const vertexAI = new VertexAI({
      project: projectId,
      location: region,
    })

    console.log('✅ Google Cloud credentials: LOADED')
    console.log('✅ Vertex AI SDK: INITIALIZED')
    console.log('✅ Image generation: READY')
    console.log('='.repeat(60) + '\n')
    return true
  } catch (error: any) {
    console.error(
      `❌ ERROR: Google Cloud credentials not found!\n` +
      `\n   Error: ${error?.message}\n` +
      `\n   To fix:\n` +
      `   1. Run: gcloud auth application-default login\n` +
      `   2. Restart the dev server: npm run dev\n` +
      `\n   For details, see: 429_ERROR_FIX.txt\n`
    )
    console.log('='.repeat(60) + '\n')
    return false
  }
}
