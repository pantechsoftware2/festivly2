/**
 * API Route: /api/generateImage
 * Generates 1 image variant using Imagen-4 and stores in Supabase Storage
 * CRITICAL: 15-second cooldown between requests to prevent quota exhaustion
 * Implements Tier-based generation system for optimal performance
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateImages } from '@/lib/vertex-ai'
import { buildCompletPrompt, buildPromptWithTextRendering, TemplateType, detectTier, getTierRequirements, buildEnhancedPrompt } from '@/lib/prompt-engineering'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// ⏰ 15-SECOND COOLDOWN BETWEEN REQUESTS (NOTE: Actual generation takes 40-50s via Google API)
let lastRequestTime = 0
const COOLDOWN_MS = 15000 // 15 seconds between user requests

// Request queue to prevent concurrent API calls
// Only allow one image generation at a time
let isGenerating = false
const requestQueue: Array<{
  resolve: (value: any) => void
  reject: (error: any) => void
  fn: () => Promise<any>
}> = []

/**
 * Process the request queue - ensures only one request runs at a time
 */
async function processQueue() {
  if (isGenerating || requestQueue.length === 0) {
    return
  }

  isGenerating = true
  const queueSize = requestQueue.length
  console.log(`\n📤 Processing queue (${queueSize} requests waiting)`)
  
  const { resolve, reject, fn } = requestQueue.shift()!

  try {
    console.log(`⏳ Starting image generation (${requestQueue.length} still in queue)`)
    const result = await fn()
    console.log(`✅ Image generation completed successfully`)
    resolve(result)
  } catch (error: any) {
    console.error(`❌ Image generation failed:`, error?.message)
    reject(error)
  } finally {
    isGenerating = false
    // Process next request in queue
    if (requestQueue.length > 0) {
      console.log(`📤 Processing next request in queue...`)
      processQueue()
    }
  }
}

/**
 * Queue a request - ensures only one generation happens at a time
 */
function queueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, fn })
    processQueue()
  })
}

// Initialize Supabase client for storage (lazy initialization)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(url, key)
}

interface GenerateImageRequest {
  prompt: string
  template?: TemplateType
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  userId?: string
  useAIText?: boolean
  aiTextContent?: string
}

interface GeneratedImage {
  id: string
  url: string
  base64?: string
  storagePath: string
  createdAt: string
}

interface GenerateImageResponse {
  success: boolean
  images: GeneratedImage[]
  prompt: string
  error?: string
  tier?: number
  headline?: string
  subtitle?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateImageResponse>> {
  // Check 15-second cooldown BEFORE queueing
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < COOLDOWN_MS) {
    const waitMs = COOLDOWN_MS - timeSinceLastRequest
    console.log(`⏳ COOLDOWN: Please wait ${Math.ceil(waitMs / 1000)}s before next request`)
    
    return NextResponse.json(
      {
        success: false,
        images: [],
        prompt: '',
        error: `Please wait ${Math.ceil(waitMs / 1000)}s before generating another image (rate limit protection)`,
      },
      { status: 429 }
    )
  }

  // Update last request time
  lastRequestTime = now

  // Queue the request to prevent concurrent API calls
  return queueRequest(async () => {
    try {
      const body: GenerateImageRequest = await request.json()

      const { prompt: userPrompt, template: providedTemplate, primaryColor, secondaryColor, accentColor, userId, useAIText, aiTextContent } = body

      if (!userPrompt || !userPrompt.trim()) {
        return NextResponse.json(
          {
            success: false,
            images: [],
            prompt: '',
            error: 'Prompt is required',
          },
          { status: 400 }
        )
      }

      // 🧠 TIER DETECTION - The Brain analyzes the request
      console.log('\n' + '='.repeat(60))
      console.log('🧠 THE BRAIN: Analyzing Intent...')
      console.log('='.repeat(60))
      
      const tier = detectTier(userPrompt)
      const tierRequirements = getTierRequirements(tier)
      const template = providedTemplate || tierRequirements.template
      
      console.log(`📊 Request Tier: ${tier}`)
      console.log(`📋 Requirements:`)
      console.log(`   - Image: ${tierRequirements.image}`)
      console.log(`   - Headline: ${tierRequirements.headline}`)
      console.log(`   - Subtitle: ${tierRequirements.subtitle}`)
      console.log(`   - Colors: ${tierRequirements.colors}`)
      console.log(`🎨 Template: ${template}`)
      console.log('='.repeat(60) + '\n')

      // Build enhanced prompt with tier consideration
      const enhancedOutput = buildEnhancedPrompt(userPrompt.trim())
      
      const completePrompt = enhancedOutput.imagen_prompt
      const headline = enhancedOutput.headline_suggestion
      const subtitle = enhancedOutput.subheadline_suggestion

      console.log('📝 Final Imagen prompt:', completePrompt)
      console.log('📄 Headline:', headline || '(none)')
      console.log('📄 Subtitle:', subtitle || '(none)')
      console.log('🎨 Template:', template)

      // Generate images using Imagen-4
      console.log('\n' + '='.repeat(60))
      console.log('🚀 REQUEST TO GENERATE IMAGES')
      console.log('='.repeat(60))
      console.log(`📝 Prompt length: ${completePrompt.length} chars`)
      console.log(`🎨 Template: ${template}`)
      console.log(`👤 User ID: ${userId || 'anonymous'}`)
      console.log('⏱️  WARNING: Actual generation takes 40-50 seconds (Google API latency)')
      console.log('='.repeat(60) + '\n')
      
      let base64Images: string[] = []

      try {
        console.log('⏳ Starting API call... This will take 40-50 seconds')
        const startTime = Date.now()
        base64Images = await generateImages({
          prompt: completePrompt,
          numberOfImages: 1,
          sampleCount: 1,
        })
        const duration = Date.now() - startTime
        console.log(`✅ Image generation completed in ${(duration / 1000).toFixed(1)}s`)
      } catch (error: any) {
        console.error('🔴 Imagen-4 API error:', error)
        
        // Extract error message safely
        let errorMessage = 'Unknown error'
        if (error?.message) {
          errorMessage = error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        }
      
      console.error('🔴 Extracted error message:', errorMessage)
      
      // Handle quota/rate limit errors specifically
      if (
        errorMessage.includes('Quota exceeded') ||
        errorMessage.includes('429') ||
        errorMessage.includes('Too many requests') ||
        errorMessage.includes('RESOURCE_EXHAUSTED')
      ) {
        const quotaErrorResponse: GenerateImageResponse = {
          success: false,
          images: [],
          prompt: completePrompt,
          error: `Quota exceeded: Please wait a moment and try again. The image generation service has rate limits.`,
        }
        console.log('📤 Returning quota error response:', quotaErrorResponse)
        return NextResponse.json(quotaErrorResponse, { status: 429 })
      }
      
      const errorResponse: GenerateImageResponse = {
        success: false,
        images: [],
        prompt: completePrompt,
        error: `Image generation failed: ${errorMessage}`,
      }
      console.log('📤 Returning error response:', errorResponse)
      return NextResponse.json(errorResponse, { status: 500 })
    }

    if (base64Images.length === 0) {
      console.error('🔴 No images generated by Imagen-4')
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: completePrompt,
          error: 'No images generated by Imagen-4. Check your Google Cloud credentials.',
        },
        { status: 500 }
      )
    }

    console.log(`✨ Generated ${base64Images.length} images`)

    // Return base64 images immediately (fallback if Supabase upload fails)
    const generatedImages: GeneratedImage[] = []
    const batchId = uuidv4()

    for (let i = 0; i < base64Images.length; i++) {
      const base64Data = base64Images[i]
      const imageId = uuidv4()
      const timestamp = new Date().toISOString().split('T')[0]
      const userId_str = userId || 'anonymous'
      const storagePath = `generated-images/${userId_str}/${timestamp}/${batchId}/${imageId}.png`

      // Try to upload to Supabase, but don't block on failure
      try {
        console.log(`⬆️  Attempting to upload image ${i + 1} to Supabase Storage...`)
        const supabase = getSupabaseClient()

        // Convert base64 to buffer
        let imageBuffer: Buffer
        if (base64Data.startsWith('data:image')) {
          const base64String = base64Data.split(',')[1]
          imageBuffer = Buffer.from(base64String, 'base64')
        } else {
          imageBuffer = Buffer.from(base64Data, 'base64')
        }

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(storagePath, imageBuffer, {
            contentType: 'image/png',
            upsert: false,
          })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(storagePath)
          generatedImages.push({
            id: imageId,
            url: publicUrl,
            base64: base64Data,
            storagePath,
            createdAt: new Date().toISOString(),
          })
          console.log(`✅ Image ${i + 1} uploaded: ${publicUrl}`)
        } else {
          console.warn(`⚠️  Supabase upload failed for image ${i + 1}, using base64 fallback:`, uploadError?.message)
          // Fallback: use base64 URL directly
          generatedImages.push({
            id: imageId,
            url: `data:image/png;base64,${base64Data.split(',')[1] || base64Data}`,
            base64: base64Data,
            storagePath: `(base64-fallback)`,
            createdAt: new Date().toISOString(),
          })
        }
      } catch (error: any) {
        console.warn(`⚠️  Exception uploading image ${i + 1}:`, error?.message)
        // Fallback: use base64 URL directly
        generatedImages.push({
          id: imageId,
          url: `data:image/png;base64,${base64Data.split(',')[1] || base64Data}`,
          base64: base64Data,
          storagePath: `(base64-fallback)`,
          createdAt: new Date().toISOString(),
        })
      }
    }

    if (generatedImages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: completePrompt,
          error: 'Failed to generate any images',
        },
        { status: 500 }
      )
    }

    console.log(`🎉 Successfully generated and stored ${generatedImages.length} images`)

    return NextResponse.json({
      success: true,
      images: generatedImages,
      prompt: completePrompt,
      tier: tier,
      headline: headline || undefined,
      subtitle: subtitle || undefined,
    })
  } catch (error: any) {
    console.error('❌ Error in /api/generateImage:', error)

    return NextResponse.json(
      {
        success: false,
        images: [],
        prompt: '',
        error: error?.message || 'Failed to generate images',
      },
      { status: 500 }
    )
  }
  })
}
