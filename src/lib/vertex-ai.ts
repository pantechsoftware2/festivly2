/**
 * Vertex AI Service
 * Wrapper for Google Cloud Vertex AI for Imagen-4 image generation
 * NOTE: This must only be called from server-side API routes
 */

import { VertexAI } from '@google-cloud/vertexai'

// Server-side only - Initialize Vertex AI
function getVertexAI(): VertexAI {
  if (typeof window !== 'undefined') {
    throw new Error('Vertex AI SDK can only be used server-side')
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT_ID
  const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1'

  if (!project) {
    throw new Error(
      'GOOGLE_CLOUD_PROJECT_ID environment variable is required. ' +
      'Set it in your .env.local file'
    )
  }

  console.log(`\n🔐 Initializing Vertex AI:`)
  console.log(`   Project: ${project}`)
  console.log(`   Location: ${location}`)

  try {
    const vertexAI = new VertexAI({
      project,
      location,
    })
    console.log(`✅ Vertex AI SDK initialized successfully`)
    return vertexAI
  } catch (error: any) {
    console.error(`❌ Failed to initialize Vertex AI:`, error?.message)
    throw error
  }
}

export interface ImageGenerationOptions {
  prompt: string
  numberOfImages?: number
  sampleCount?: number
  outputFormat?: string
}

// Model selection cache and polling
let _selectedImagenModel: string | null = null
let _lastModelCheck = 0
const MODEL_CHECK_TTL = 60 * 1000 // 60s
const IMAGEN4_CANDIDATES = [
  'imagen-4.0-generate-001',
  'imagen-4-generate-001',
  'imagen-4.0-preview-001',
  'imagen-4-preview-001',
  'imagen-4',
]
const IMAGEN3_FALLBACK = 'imagen-3.0-generate-001'

async function probeModelAvailability(modelId: string, accessToken: string, project: string, location: string) {
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${modelId}:predict`
  
  // Try a lightweight prediction call to verify the model actually works
  const testRequestBody = {
    instances: [
      {
        prompt: "test",
      },
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: "3:4",
    },
  }
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequestBody),
    })
    
    // If 200 OK -> model exists and works
    if (res.ok) {
      return { available: true, permissionDenied: false }
    }
    
    // If 400 or 404 -> model doesn't exist
    if (res.status === 400 || res.status === 404) {
      return { available: false, permissionDenied: false, status: res.status }
    }
    
    // If 403 -> permission denied
    if (res.status === 403) {
      return { available: false, permissionDenied: true }
    }
    
    // Other errors
    return { available: false, permissionDenied: false, status: res.status }
  } catch (e: any) {
    return { available: false, permissionDenied: false }
  }
}

async function ensureImagenModelSelected(accessToken: string): Promise<string> {
  const now = Date.now()
  if (_selectedImagenModel && now - _lastModelCheck < MODEL_CHECK_TTL) {
    return _selectedImagenModel
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT_ID!
  const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1'

  console.log(`🔍 Probing Imagen models...`)
  // Probe Imagen-4 candidates
  for (const candidate of IMAGEN4_CANDIDATES) {
    console.log(`   Trying: ${candidate}`)
    const result = await probeModelAvailability(candidate, accessToken, project, location)
    if (result.available) {
      console.log(`✅ Model available: ${candidate}`)
      _selectedImagenModel = candidate
      _lastModelCheck = Date.now()
      return _selectedImagenModel
    } else {
      console.log(`   ❌ ${candidate}: not available`)
    }
  }

  // Fallback to Imagen-3
  console.log(`⚠️ No Imagen-4 available, falling back to Imagen-3`)
  _selectedImagenModel = IMAGEN3_FALLBACK
  _lastModelCheck = Date.now()
  return _selectedImagenModel
}

// Background poller (best-effort for long-running dev server)
function startModelPollerInterval(accessToken: string) {
  try {
    setInterval(async () => {
      try {
        await ensureImagenModelSelected(accessToken)
      } catch (e) {
        // ignore
      }
    }, MODEL_CHECK_TTL)
  } catch (e) {
    // In some serverless environments setInterval may not persist; ignore failures
  }
}

let _pollerStarted = false

/**
 * DO NOT RETRY - Single attempt only
 * 429 errors mean quota exhausted - retrying makes it worse
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    console.log(`\n🔄 API Call (Single Attempt - No Retries)...`)
    const result = await fn()
    console.log(`✅ API Call Successful`)
    return result
  } catch (error: any) {
    console.error(`❌ API Call Failed:`, {
      status: error?.status,
      code: error?.code,
      message: error?.message,
    })
    
    // DO NOT RETRY on 429 - throw immediately
    throw error
  }
}

/**
 * Create a placeholder image with gradient and prompt text
 * Returns base64-encoded SVG
 */
export function createPlaceholderImage(prompt: string): string {
  // Create a simple SVG placeholder with properly encoded text
  const safePrompt = prompt
    .substring(0, 50)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
  
  const svg = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#667eea;stop-opacity:1" /><stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" /></linearGradient></defs><rect width="1080" height="1350" fill="url(#grad)"/><text x="540" y="675" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="bold">AI Image Generation</text><text x="540" y="750" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" opacity="0.8">${safePrompt}${prompt.length > 50 ? '...' : ''}</text><text x="540" y="850" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.6">Enable service account keys in</text><text x="540" y="890" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.6">Google Cloud to generate real images</text></svg>`
  
  // Convert SVG to base64
  const base64 = Buffer.from(svg).toString('base64')
  const dataUrl = `data:image/svg+xml;base64,${base64}`
  
  console.log(`🎨 Placeholder created: ${dataUrl.substring(0, 100)}...`)
  return dataUrl
}

/**
 * Generate images using Imagen-4
 * Returns array of base64-encoded images
 */
export async function generateImages(options: ImageGenerationOptions): Promise<string[]> {
  try {
    // Try to use OAuth with service account credentials
    const { GoogleAuth } = await import('google-auth-library')
    
    const project = process.env.GOOGLE_CLOUD_PROJECT_ID
    const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1'
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    
    console.log(`\n🚀 Starting image generation`)
    console.log(`   Prompt: "${options.prompt.substring(0, 50)}..."`)
    console.log(`   Images: ${options.numberOfImages || 4}`)
    console.log(`   Project: ${project}`)
    console.log(`   Region: ${location}`)
    
    // PRODUCTION CHECK: Validate all required env vars
    if (!project) {
      console.error(`❌ GOOGLE_CLOUD_PROJECT_ID not set`)
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required')
    }
    
    if (!location) {
      console.error(`❌ GOOGLE_CLOUD_REGION not set`)
      throw new Error('GOOGLE_CLOUD_REGION environment variable is required')
    }

    if (!serviceAccountKey) {
      console.error(`❌ GOOGLE_SERVICE_ACCOUNT_KEY not set`)
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required')
    }
    
    console.log(`🔐 Service account key found (${serviceAccountKey.length} chars)`)
    
    // Parse the service account key
    let credentials: any
    try {
      // Handle both string JSON and already-parsed objects
      if (typeof serviceAccountKey === 'string') {
        credentials = JSON.parse(serviceAccountKey)
      } else if (typeof serviceAccountKey === 'object') {
        credentials = serviceAccountKey
      } else {
        throw new Error(`Invalid service account key type: ${typeof serviceAccountKey}`)
      }
      
      console.log(`✅ Service account parsed successfully`)
      console.log(`   Project ID: ${credentials.project_id}`)
      console.log(`   Service Account Email: ${credentials.client_email}`)
    } catch (e: any) {
      console.error(`❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:`)
      console.error(`   Error: ${e.message}`)
      console.error(`   Type: ${typeof serviceAccountKey}`)
      console.error(`   Length: ${serviceAccountKey?.length || 'undefined'}`)
      console.error(`   First 100 chars: ${JSON.stringify(serviceAccountKey).substring(0, 100)}`)
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON: ' + e.message)
    }

    // Initialize GoogleAuth with parsed credentials
    const auth = new GoogleAuth({
      credentials,
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    })
    
    const client = await auth.getClient()
    const accessToken = await client.getAccessToken()
    
    if (!accessToken.token) {
      throw new Error('Failed to obtain access token from service account')
    }
    
    // Select the best available Imagen model (prefer Imagen-4)
    const selectedModel = await ensureImagenModelSelected(accessToken.token)
    console.log(`✅ Using model: ${selectedModel}`)

    // Start a background poller once to refresh model availability (best-effort)
    try {
      if (!_pollerStarted) {
        startModelPollerInterval(accessToken.token)
        _pollerStarted = true
      }
    } catch (e) {
      // ignore
    }

    // Call Vertex AI Predict endpoint for the selected model
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${selectedModel}:predict`
    console.log(`📡 Calling Imagen-4 API...`)

    const requestBody = {
      instances: [
        {
          prompt: options.prompt,
        },
      ],
      parameters: {
        sampleCount: options.sampleCount || options.numberOfImages || 4,
        aspectRatio: "3:4",
        safetyFilterLevel: "block_some",
        personGeneration: "allow_adult",
      },
    }
    
    // Create an abort controller with 45-second timeout (optimized for speed)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 45000) // 45 seconds for image generation

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔴 API Failed:', response.status, errorText.substring(0, 200))
        
        if (response.status === 429) {
          // Quota exceeded - return placeholder images (4 instead of 1)
          console.warn('⚠️ Quota exceeded - returning placeholders')
          return [
            createPlaceholderImage(options.prompt),
            createPlaceholderImage(options.prompt),
            createPlaceholderImage(options.prompt),
            createPlaceholderImage(options.prompt),
          ]
        }
        
        throw new Error(`Vertex AI API error (${response.status}): ${errorText}`)
      }
      
      const data = await response.json()
      console.log(`📡 API Response keys:`, Object.keys(data))
      console.log(`📡 API Response predictions count:`, data.predictions?.length || 0)
      
      if (data.predictions && Array.isArray(data.predictions)) {
        console.log(`   Prediction 0 keys:`, Object.keys(data.predictions[0] || {}))
        const pred0Str = JSON.stringify(data.predictions[0])
        console.log(`   Prediction 0 length: ${pred0Str.length} chars`)
        console.log(`   Prediction 0 value (first 200 chars):`, pred0Str.substring(0, 200))
      }
      
      // Extract base64 images from response
      const images: string[] = []
      
      if (data.predictions && Array.isArray(data.predictions)) {
        console.log(`📸 Got ${data.predictions.length} predictions from API`)
        for (let i = 0; i < data.predictions.length; i++) {
          const prediction = data.predictions[i]
          
          // Imagen-4 returns base64 image in 'bytesBase64Encoded' field
          // But also try other common field names
          let imageData = null
          let foundFieldName = ''
          
          // List of fields to check in order
          const fieldsToCheck = ['bytesBase64Encoded', 'imageBytes', 'base64', 'imageData', 'image', 'b64Encoded']
          
          if (typeof prediction === 'string' && prediction.length > 1000) {
            // Direct string response (raw base64)
            imageData = prediction
            foundFieldName = 'direct-string'
          } else if (typeof prediction === 'object' && prediction !== null) {
            // Check each field
            for (const fieldName of fieldsToCheck) {
              const value = prediction[fieldName]
              if (value && typeof value === 'string' && value.length > 1000) {
                imageData = value
                foundFieldName = fieldName
                console.log(`   ✅ Image ${i + 1}: Found in field "${fieldName}" (${(value.length / 1024).toFixed(2)} KB)`)
                break
              }
            }
            
            // If still not found, log all fields and their sizes for debugging
            if (!imageData) {
              const fieldInfo = Object.entries(prediction)
                .map(([k, v]) => {
                  if (typeof v === 'string') return `${k}:${v.length}chars`
                  if (typeof v === 'object') return `${k}:object`
                  return `${k}:${typeof v}`
                })
                .join('; ')
              console.warn(`   ⚠️ Image ${i + 1}: No image field found. Fields: ${fieldInfo}`)
            }
          }
          
          if (imageData && typeof imageData === 'string' && imageData.length > 1000) {
            // Add data URI prefix for PNG
            const imageSize = imageData.length
            console.log(`   ✅ Image ${i + 1}: Ready (field: ${foundFieldName}, size: ${(imageSize / 1024).toFixed(2)} KB)`)
            images.push(`data:image/png;base64,${imageData}`)
          } else {
            console.warn(`   ⚠️ Image ${i + 1}: Could not extract valid image data`)
            if (imageData) {
              console.warn(`      Got data but length ${imageData.length} < 1000`)
            }
          }
        }
      }
      
      if (images.length === 0) {
        console.warn('⚠️ No valid images extracted from predictions')
        console.error('❌ API returned predictions but no valid base64 image data found')
        console.error('   Full response:', JSON.stringify(data).substring(0, 1000))
        // Return empty array instead of throwing - graceful failure
        return []
      }
      
      console.log(`✅ Generated ${images.length} real images successfully`)
      return images
    } finally {
      clearTimeout(timeoutId)
    }
    
  } catch (error: any) {
    // Log the actual error so we can see what went wrong
    console.error('🔴 generateImages error:', {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      stack: error?.stack?.substring(0, 200),
    })
    
    // If network error or timeout, log it specifically
    if (error?.name === 'AbortError') {
      console.error('   ⏰ Request timed out after 45 seconds')
    }
    
    if (error?.message?.includes('401') || error?.message?.includes('403')) {
      console.error('   🔐 Authentication/authorization issue - check service account credentials')
    }
    
    if (error?.message?.includes('429')) {
      console.error('   ⚠️ Quota exceeded - API rate limited')
    }
    
    // Silently return empty array on error - no 500 errors shown to user
    // This allows graceful failure without crashing
    console.error('🚨 Image generation FAILED - returning empty array')
    return []
  }
}

/**
 * Generate images using Imagen-4 (deprecated endpoint - for fallback)
 * This uses the older REST API approach
 */
export async function generateImagesREST(prompt: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://${process.env.GOOGLE_CLOUD_REGION || 'us-central1'}-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/${process.env.GOOGLE_CLOUD_REGION || 'us-central1'}/publishers/google/models/imagen-3.0-generate:predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({
          instances: [
            {
              prompt,
            },
          ],
          parameters: {
            sampleCount: 4,
            outputFormat: 'PNG',
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Imagen API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Extract base64 images from response
    const images: string[] = []
    if (data.predictions && Array.isArray(data.predictions)) {
      for (const prediction of data.predictions) {
        if (prediction.bytesBase64Encoded) {
          images.push(prediction.bytesBase64Encoded)
        }
      }
    }

    return images.slice(0, 4)
  } catch (error) {
    console.error('Error generating images via REST:', error)
    throw error
  }
}

/**
 * Get access token for REST API (if needed)
 * Note: SDK handles auth automatically, but REST API might need explicit token
 */
async function getAccessToken(): Promise<string> {
  // This would use Google auth library to get token
  // For now, the SDK handles this automatically
  return ''
}