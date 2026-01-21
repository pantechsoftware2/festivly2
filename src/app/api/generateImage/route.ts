/**
 * API Route: /api/generateImage
 * Generates 4 image variants using Imagen-4 with event + industry context
 * Uses the Desi Prompt Engine to combine industry keywords + event keywords
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateImages } from '@/lib/vertex-ai'
import { generateSmartPrompt } from '@/lib/prompt-engine'
import { getEventName, UPCOMING_EVENTS } from '@/lib/festival-data'
import { createServiceRoleClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// Prevent duplicate concurrent requests with Promise-based queue
const requestInProgress = new Map<string, Promise<any>>()
const requestResults = new Map<string, any>()
const processedRequestIds = new Set<string>() // Track recently processed request IDs
const requestIdTimestamps = new Map<string, number>() // Track when each requestId was processed

// Clean up old requestIds every 5 minutes (to prevent memory leak)
setInterval(() => {
  const now = Date.now()
  const CLEANUP_AGE = 3 * 60 * 1000 // 3 minutes
  
  for (const [requestId, timestamp] of requestIdTimestamps.entries()) {
    if (now - timestamp > CLEANUP_AGE) {
      processedRequestIds.delete(requestId)
      requestIdTimestamps.delete(requestId)
      console.log(`🧹 Cleaned up old requestId: ${requestId}`)
    }
  }
}, 5 * 60 * 1000)

/**
 * Add logo overlay to base64 image (using Canvas API via jimp or simple approach)
 * Simple implementation: Convert to PNG, merge on client side instead
 */
async function addLogoToBase64Image(
  imageBase64: string,
  logoUrl: string,
  logoSize: number = 150
): Promise<string> {
  try {
    console.log(`🏷️ Starting logo overlay process...`)
    
    // For server-side, we need a simpler approach
    // Fetch logo and convert to base64
    const logoResponse = await fetch(logoUrl)
    if (!logoResponse.ok) {
      console.warn(`⚠️ Could not fetch logo from URL: ${logoUrl.substring(0, 50)}`)
      return imageBase64
    }
    
    // Get logo as buffer
    const logoBuffer = await logoResponse.arrayBuffer()
    const logoBase64 = Buffer.from(logoBuffer).toString('base64')
    
    console.log(`✅ Logo fetched successfully, size: ${logoBuffer.byteLength} bytes`)
    
    // Return both image and logo base64 for client-side composite
    // Store in a special format that client can detect
    return JSON.stringify({
      imageBase64,
      logoBase64,
      logoUrl,
      logoSize,
      shouldComposite: true
    })
  } catch (err: any) {
    console.warn(`⚠️ Logo preparation failed: ${err.message}`)
    return imageBase64
  }
}

function getCacheKey(userId: string, prompt: string): string {
  return `${userId}:${prompt.substring(0, 50)}`
}

function getSupabaseClient() {
  return createServiceRoleClient()
}

/**
 * Enhance prompt for Pro and Pro Plus users with better quality directives
 */
function enhancePromptForPremium(basePrompt: string, subscription: string): string {
  let enhancement = ''
  
  if (subscription === 'pro') {
    enhancement = `\n\nPREMIUM QUALITY ENHANCEMENTS:
- Use HD quality rendering with enhanced details
- Add more sophisticated color grading and lighting effects
- Include advanced visual effects and depth of field
- Enhance texture quality and material realism
- Use professional photography standards`
  } else if (subscription === 'pro plus') {
    enhancement = `\n\nPROFESSIONAL 4K QUALITY ENHANCEMENTS:
- Generate in 4K-ready quality with ultra-detailed rendering
- Apply professional cinematography techniques
- Use cinematic color grading and advanced lighting
- Include dynamic depth of field with professional bokeh
- Apply cutting-edge AI enhancement for photorealistic quality
- Add volumetric lighting and atmospheric effects
- Use professional visual effects and motion-ready composition
- Maximum detail, clarity, and visual sophistication`
  }
  
  return basePrompt + enhancement
}

interface GenerateImageRequest {
  eventId?: string
  prompt?: string
  userId?: string
  requestId?: string
}

interface GeneratedImage {
  id: string
  url: string
  storagePath: string
  createdAt: string
}

interface GenerateImageResponse {
  success: boolean
  images: GeneratedImage[]
  prompt: string
  eventName?: string
  industry?: string
  showPricingModal?: boolean
  error?: string
  brandLogoUrl?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateImageResponse>> {
  return handleGenerateImage(request)
}

async function handleGenerateImage(request: NextRequest): Promise<NextResponse<GenerateImageResponse>> {
  try {
    // Log environment variable status for debugging production issues
    const hasProjectId = !!process.env.GOOGLE_CLOUD_PROJECT_ID
    const hasServiceKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log(`\n📋 API REQUEST - Environment Status:`)
    console.log(`   Google Project ID: ${hasProjectId ? '✅' : '❌'} ${process.env.GOOGLE_CLOUD_PROJECT_ID || ''}`)
    console.log(`   Google Service Key: ${hasServiceKey ? '✅' : '❌'} (${process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length || 0} chars)`)
    console.log(`   Supabase URL: ${hasSupabaseUrl ? '✅' : '❌'} ${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) || ''}`)
    console.log(`   Supabase Service Key: ${hasSupabaseKey ? '✅' : '❌'} (${process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0} chars)`)
    console.log(`   Node Environment: ${process.env.NODE_ENV}`)
    console.log(`   Vercel Environment: ${process.env.VERCEL_ENV}`)
    
    if (!hasProjectId || !hasServiceKey) {
      console.error(`🚨 PRODUCTION CONFIG ERROR: Missing Google Cloud credentials`)
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: '',
        },
        { status: 200 } // Return 200 OK - graceful failure
      )
    }
    
    if (!hasSupabaseUrl || !hasSupabaseKey) {
      console.error(`🚨 PRODUCTION CONFIG ERROR: Missing Supabase credentials`)
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: '',
        },
        { status: 200 } // Return 200 OK - graceful failure
      )
    }

    const body: GenerateImageRequest = await request.json()
    const { eventId, prompt: userPrompt, userId, requestId } = body

    // NEW: Check for duplicate requestId (indicates duplicate submission from client)
    if (requestId) {
      if (processedRequestIds.has(requestId)) {
        console.log(`🚫 DUPLICATE DETECTED: RequestId ${requestId} already processed. REJECTING.`)
        return NextResponse.json(
          {
            success: false,
            images: [],
            prompt: '',
            error: 'Duplicate request detected - this request was already submitted',
          },
          { status: 400 }
        )
      }
      console.log(`✅ RequestId validated: ${requestId}`)
    } else {
      console.warn(`⚠️ No requestId provided - cannot detect duplicates`)
    }

    // GOOGLE AUTH DEBUG: Log userId presence
    console.log(`🔍 REQUEST DEBUG - userId: ${userId || 'MISSING'}, hasEventId: ${!!eventId}, hasPrompt: ${!!userPrompt}`)

    if (!eventId && !userPrompt) {
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: '',
          error: 'Either eventId or prompt is required',
        },
        { status: 400 }
      )
    }

    // Deduplicate concurrent requests using requestId (most reliable)
    const cacheKey = getCacheKey(userId || 'anon', userPrompt || eventId || '')
    console.log(`🔑 Cache key: ${cacheKey}`)
    
    // PRIORITY 1: Use requestId for deduplication (each client request is unique)
    if (requestId && requestInProgress.has(requestId)) {
      console.log(`♻️ DEDUP (requestId): Duplicate submission detected for requestId: ${requestId}`)
      const cachedResult = requestResults.get(requestId)
      if (cachedResult) {
        console.log(`♻️ DEDUP: Returning cached result with ${cachedResult.data.images?.length || 0} images`)
        return NextResponse.json(cachedResult.data, { status: cachedResult.status })
      }
    }
    
    // PRIORITY 2: Fall back to cache key for old clients without requestId
    if (!requestId && requestInProgress.has(cacheKey)) {
      console.log(`♻️ DEDUP (cacheKey): Waiting for in-progress request with key: ${cacheKey}`)
      await requestInProgress.get(cacheKey)!
      const cachedResult = requestResults.get(cacheKey)
      if (cachedResult) {
        console.log(`♻️ DEDUP: Returning cached result with ${cachedResult.data.images?.length || 0} images`)
        return NextResponse.json(cachedResult.data, { status: cachedResult.status })
      }
    }

    // Mark this request as in-progress using requestId if available, otherwise cacheKey
    const dedupeKey = requestId || cacheKey
    const requestPromise = processGenerationRequest(body)
    requestInProgress.set(dedupeKey, requestPromise)

    try {
      const result = await requestPromise
      
      // NEW: Mark requestId as processed to prevent future duplicates
      if (requestId) {
        processedRequestIds.add(requestId)
        requestIdTimestamps.set(requestId, Date.now())
        console.log(`✅ RequestId marked as processed: ${requestId}`)
      }
      
      // Cache the result data (not the response object)
      const responseClone = result.clone()
      const resultData = await responseClone.json()
      requestResults.set(dedupeKey, { 
        data: resultData, 
        status: result.status 
      })
      return result
    } finally {
      // Clean up after 1 second to allow time for duplicate checks
      setTimeout(() => {
        requestInProgress.delete(dedupeKey)
        requestResults.delete(dedupeKey)
      }, 1000)
    }
  } catch (error: any) {
    console.error('Handler error:', error?.message)

    return NextResponse.json(
      {
        success: false,
        images: [],
        prompt: '',
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

async function processGenerationRequest(body: GenerateImageRequest): Promise<NextResponse<GenerateImageResponse>> {
  try {
    const { eventId, prompt: userPrompt, userId } = body

    // VALIDATION: Ensure userId is provided (especially critical for Google auth)
    if (!userId) {
      console.warn(`⚠️ CRITICAL: userId is missing/undefined. This may be a Google auth issue.`)
      console.warn(`   Request body: eventId=${eventId}, hasPrompt=${!!userPrompt}, userId=${userId}`)
    }

    // Get user industry and subscription from database
    let userIndustry = 'Education' // Default fallback
    let userSubscription = 'free' // Default fallback
    // let imagesGenerated = 0 // DISABLED: All users get unlimited free - no need to track
    let userHasIndustry = false // Track if industry was explicitly set
    
    let brandStyleContext: string | null = null // Store user's brand style guide
    
    if (userId) {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('industry_type, subscription_plan, free_images_generated, brand_style_context, generations_today, last_reset_date')
          .eq('id', userId)
          .single()

        if (!error && data) {
          // CRITICAL: Check if industry_type was explicitly set
          if (data.industry_type && data.industry_type.trim().length > 0) {
            userIndustry = data.industry_type
            userHasIndustry = true
          } else {
            console.warn(`⚠️ PRODUCTION ISSUE: User ${userId} has NO industry_type set (likely Google signup without industry selection)`)
            userIndustry = 'Education' // Use default
            userHasIndustry = false
          }
          
          userSubscription = data.subscription_plan || 'free'
          brandStyleContext = data.brand_style_context || null
          
          // ========== DAILY GENERATION LIMIT CHECK (STEP A & B) ==========
          console.log(`\n📊 DAILY LIMIT CHECK:`)
          console.log(`   Subscription: ${userSubscription}`)
          console.log(`   Current generations today: ${data.generations_today || 0}`)
          console.log(`   Last reset date: ${data.last_reset_date}`)
          
          // Only enforce limit for FREE users
          if (userSubscription === 'free') {
            const lastResetDate = data.last_reset_date ? new Date(data.last_reset_date) : null
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            // STEP A: Check if last_reset_date is today
            const isToday = lastResetDate && 
              lastResetDate.getFullYear() === today.getFullYear() &&
              lastResetDate.getMonth() === today.getMonth() &&
              lastResetDate.getDate() === today.getDate()
            
            console.log(`   Is today: ${isToday}`)
            
            let generationsToday = data.generations_today || 0
            
            // STEP A: If NOT today, reset counter and update date
            if (!isToday) {
              console.log(`   ✅ Date change detected. Resetting counter to 0 and updating date.`)
              generationsToday = 0
              await supabase
                .from('profiles')
                .update({
                  generations_today: 0,
                  last_reset_date: new Date().toISOString(),
                })
                .eq('id', userId)
            }
            
            // STEP B: Check if user hit the 5 generation limit
            console.log(`   Checking limit: ${generationsToday} / 5`)
            if (generationsToday >= 5) {
              console.warn(`🚫 BLOCKED: User ${userId} reached daily limit (${generationsToday}/5 generations done today)`)
              return NextResponse.json(
                {
                  success: false,
                  images: [],
                  prompt: '',
                  error: 'DAILY_LIMIT_REACHED',
                  showPricingModal: true,
                },
                { status: 429 } // Too Many Requests
              )
            }
            console.log(`   ✅ User has ${5 - generationsToday} generation(s) remaining today`)
          }
          // ========== END DAILY GENERATION LIMIT CHECK ==========
          
          console.log(`📊 User profile loaded: subscription=${userSubscription}, industry=${userIndustry}, hasIndustry=${userHasIndustry}, hasBrandStyle=${!!brandStyleContext}`)
          if (brandStyleContext) {
            console.log(`🎨 Brand style context loaded: ${brandStyleContext.substring(0, 100)}...`)
          }
        } else if (error) {
          console.warn(`⚠️ Profile lookup failed: ${error.message}. Using defaults.`)
        }
      } catch (err) {
        console.log('Could not fetch user data, using defaults')
      }
    }

    // SERVER-SIDE LIMIT CHECK: Hard block free users who exceeded limit (DISABLED FOR NOW)
    // Free users get ONE free generation (4 images per generation), then must upgrade
    // if (userId && userSubscription === 'free' && imagesGenerated >= 1) {
    //   console.warn(`🚫 BLOCKED: User ${userId} attempted generation but already used free quota (${imagesGenerated} generation(s) done)`)
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       images: [],
    //       prompt: '',
    //       error: 'UPGRADE_REQUIRED',
    //     },
    //     { status: 402 } // Payment Required
    //   )
    // }

    // Generate prompt based on event or user input
    let finalPrompt = userPrompt
    let eventName = 'Custom'

    if (eventId) {
      // Find the event and generate dynamic prompt
      const event = UPCOMING_EVENTS.find(e => e.id === eventId)
      if (!event) {
        return NextResponse.json(
          {
            success: false,
            images: [],
            prompt: '',
            error: 'Invalid event ID',
          },
          { status: 400 }
        )
      }

      eventName = event.name
      // Use Desi Prompt Engine - generate CLEAN version (no text) for part of the hybrid batch
      finalPrompt = await generateSmartPrompt(event.name, userIndustry, brandStyleContext, false)
      
      // WARN if using default industry (Google signup without selection)
      if (!userHasIndustry) {
        console.warn(`⚠️ PRODUCTION QUALITY: Generating with DEFAULT industry "${userIndustry}" - User may need to set industry_type in profile`)
      }
      
      // Enhance prompt for Pro and Pro Plus users
      if (userSubscription === 'pro' || userSubscription === 'pro plus') {
        finalPrompt = enhancePromptForPremium(finalPrompt, userSubscription)
      }
      
      console.log(`\n🎉 EVENT-BASED GENERATION:`)
      console.log(`  Event: ${eventName}`)
      console.log(`  Industry: ${userIndustry}${!userHasIndustry ? ' (DEFAULT - user should set)' : ' (explicit)'}`)
      console.log(`  Subscription: ${userSubscription}`)
      console.log(`  Generated Prompt: ${finalPrompt.substring(0, 100)}...`)
    }

    if (!finalPrompt || !finalPrompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: '',
          error: 'Could not generate prompt',
        },
        { status: 400 }
      )
    }

    console.log(`\n🚀 REQUEST #${Math.random().toString(36).substring(7).toUpperCase()} - Generating 4 images`)
    console.log(`   userId: ${userId || 'UNDEFINED'}, subscription: ${userSubscription}, industry: ${userIndustry}${!userHasIndustry ? ' (DEFAULT)' : ''}`)
    console.log(`   NOTE: All users get unlimited free generations with all 4 images`)
    console.log(`\n🔐 ABOUT TO CALL IMAGEN API:`)
    console.log(`   Environment confirmed - Project: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`)
    console.log(`   Service key ready: ${!!process.env.GOOGLE_SERVICE_ACCOUNT_KEY}`)
    console.log(`   Region: ${process.env.GOOGLE_CLOUD_REGION || 'us-central1'}`)
    
    // LOG FULL PROMPT TEXT FOR DEBUGGING
    console.log(`\n📝 FULL PROMPT TEXT (${finalPrompt.length} chars):`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(finalPrompt)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

    // Generate 4 images using HYBRID BATCH (2 clean + 2 text)
    let base64Images: string[] = []

    try {
      console.log(`\n🎬 HYBRID BATCH GENERATION: 2 Clean Images + 2 Text Images`)
      
      // Step 1: Get the two prompts (one clean, one with text)
      // For clean: use the finalPrompt we already generated (which has NO text if eventId provided)
      // For text: regenerate with includeText=true flag
      const cleanPrompt = finalPrompt
      let textPrompt = await generateSmartPrompt(eventName, userIndustry, brandStyleContext, true)
      
      // Also enhance text prompt for premium users
      if (userSubscription === 'pro' || userSubscription === 'pro plus') {
        textPrompt = enhancePromptForPremium(textPrompt, userSubscription)
      }
      
      console.log(`\n📄 CLEAN PROMPT (for 2 images, no text):`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(cleanPrompt)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      
      console.log(`\n✍️  TEXT PROMPT (for 2 images, with text):`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(textPrompt)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      
      // Step 2: Launch 2 PARALLEL requests to Imagen API
      console.log(`\n⚡ Launching 2 PARALLEL requests to Imagen API...`)
      console.log(`   Request A: Clean images (sampleCount: 2)`)
      console.log(`   Request B: Text images (sampleCount: 2)`)
      console.log(`   Expected total: 4 images (2 + 2)`)
      
      const cleanImagesPromise = generateImages({
        prompt: cleanPrompt,
        sampleCount: 2,  // CRITICAL: Only 2 images, NOT more
      })
      
      const textImagesPromise = generateImages({
        prompt: textPrompt,
        sampleCount: 2,  // CRITICAL: Only 2 images, NOT more
      })
      
      // Step 3: Wait for both to complete
      const [cleanImages, textImages] = await Promise.all([cleanImagesPromise, textImagesPromise])
      
      console.log(`✅ Batch complete: ${cleanImages.length} clean + ${textImages.length} text images`)
      
      // CRITICAL: Ensure exactly 2 images from each request
      console.log(`\n🔍 Validating image counts:`)
      console.log(`   Clean images received: ${cleanImages.length} (expected: 2)`)
      console.log(`   Text images received: ${textImages.length} (expected: 2)`)
      
      // If we got more than 2 from either, truncate to exactly 2
      const cleanTrimmed = cleanImages.slice(0, 2)
      const textTrimmed = textImages.slice(0, 2)
      
      if (cleanTrimmed.length !== cleanImages.length) {
        console.warn(`⚠️  TRIM: Clean images truncated from ${cleanImages.length} to ${cleanTrimmed.length}`)
      }
      if (textTrimmed.length !== textImages.length) {
        console.warn(`⚠️  TRIM: Text images truncated from ${textImages.length} to ${textTrimmed.length}`)
      }
      
      // Step 4: Combine into one array of 4 images (GUARANTEED 4)
      base64Images = [...cleanTrimmed, ...textTrimmed]
      
      console.log(`\n✅ FINAL IMAGE COUNT: ${base64Images.length} images (2 clean + 2 text)`)

      console.log(`🎨 API returned ${base64Images.length} base64 images`)
      
      // CHECK IF THESE ARE PLACEHOLDER IMAGES
      const realImageCount = base64Images.filter(img => !img.startsWith('data:image/svg+xml')).length
      const placeholderCount = base64Images.filter(img => img.startsWith('data:image/svg+xml')).length
      
      console.log(`   Real images: ${realImageCount}`)
      console.log(`   Placeholder SVG images: ${placeholderCount}`)
      
      if (placeholderCount > 0 && realImageCount === 0) {
        // ALL images are placeholders - API failed silently
        // Return empty images gracefully - no error shown to user
        return NextResponse.json(
          {
            success: false,
            images: [],
            prompt: finalPrompt,
          },
          { status: 200 } // Return 200 OK even on failure - graceful
        )
      }
      
      if (placeholderCount > 0) {
        console.warn(`⚠️ PARTIAL FAILURE: ${realImageCount} real + ${placeholderCount} placeholder images`)
        console.warn(`   This indicates the Vertex AI API partially failed`)
        console.warn(`   Returning what we have (${realImageCount} real images)`)
      }
      
      // CRITICAL CHECK: Detect if only 1 image returned (may be placeholder/fallback)
      if (base64Images.length === 1) {
        console.warn(`⚠️ WARNING: Only 1 image returned instead of 4`)
        console.warn(`   This could indicate: Vertex AI API failed, quota exceeded, or network error`)
      }

      if (base64Images.length === 0) {
        throw new Error('No images generated - API returned empty array')
      }

      // Verify each image is valid base64
      base64Images.forEach((img, idx) => {
        if (!img || img.length === 0) {
          throw new Error(`Image ${idx} is empty or invalid`)
        }
        const sizeKB = (img.length / 1024).toFixed(2)
        console.log(`   Image ${idx + 1}: ${sizeKB} KB`)
      })
    } catch (genError: any) {
      console.error('❌ Image generation error:', genError?.message)
      console.error('   Stack:', genError?.stack)
      
      // Return empty images gracefully - no 500 error
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: finalPrompt,
        },
        { status: 200 } // Return 200 OK even on failure - graceful
      )
    }

    // Upload to Supabase Storage
    const supabase = getSupabaseClient()
    const generatedImages: GeneratedImage[] = []

    console.log(`\n📦 UPLOADING ${base64Images.length} IMAGES TO STORAGE`)

    // Fetch user's brand logo if available (OPTIONAL)
    // If no logo is found, images will be generated without branding overlay
    let userBrandLogo: string | null = null
    if (userId) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('brand_logo_url')
          .eq('id', userId)
          .maybeSingle()

        console.log(`🏷️ Profile query result:`, { 
          hasData: !!profile, 
          hasLogo: !!profile?.brand_logo_url,
          logoType: typeof profile?.brand_logo_url,
          logoLength: (profile?.brand_logo_url as string)?.length || 0
        })

        if (!error && profile?.brand_logo_url) {
          userBrandLogo = profile.brand_logo_url
          if (typeof userBrandLogo === 'string' && userBrandLogo.length > 10) {
            userBrandLogo = userBrandLogo.trim()
            console.log(`✅ Found user brand logo: ${userBrandLogo.substring(0, 70)}`)
          } else {
            console.warn(`⚠️ Invalid brand logo format: ${typeof userBrandLogo} - continuing without logo`)
            userBrandLogo = null
          }
        } else if (error) {
          console.warn(`⚠️ Profile fetch error: ${error.message} - continuing without logo`)
        } else {
          console.log(`ℹ️ No brand logo set for user - images will be generated without branding`)
        }
      } catch (err: any) {
        console.warn(`⚠️ Could not fetch user brand logo: ${err.message} - continuing without logo`)
        userBrandLogo = null
      }
    }

    for (let i = 0; i < base64Images.length; i++) {
      try {
        let base64 = base64Images[i]
        const imageId = uuidv4()
        const timestamp = new Date().toISOString()

        // Check if this is a placeholder image (SVG data URL, not PNG)
        if (base64.startsWith('data:image/svg+xml')) {
          console.log(`   📌 Image ${i + 1} is a placeholder (SVG)`)
          generatedImages.push({
            id: imageId,
            url: base64, // Use data URL directly
            storagePath: `placeholder-${timestamp}-${i}`,
            createdAt: timestamp,
          })
          continue
        }

        // OPTIONAL: Add user's brand logo to image if available
        // NOTE: Logo overlay is client-side only (in result/page.tsx)
        // This is more reliable and doesn't require additional server dependencies
        // If no logo is available, the image will be returned without branding
        if (userBrandLogo && userBrandLogo.length > 10) {
          console.log(`   🏷️ Logo URL available: ${userBrandLogo.substring(0, 50)}... (will be applied client-side)`)
        } else {
          console.log(`   📌 No logo overlay - generating clean image without branding`)
        }

        const fileName = `generated/${userId || 'anonymous'}/${timestamp}-${i}.jpg`

        // Convert base64 to buffer
        const buffer = Buffer.from(base64.split(',')[1] || base64, 'base64')

        console.log(`   📤 Uploading image ${i + 1}/${base64Images.length}...`)
        console.log(`      Path: ${fileName}`)
        console.log(`      Size: ${buffer.length} bytes`)

        // Upload to Supabase Storage
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('images')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: false,
          })

        if (uploadError) {
          console.error(`   ❌ Upload error for image ${i}:`, uploadError.message)
          continue
        }

        console.log(`   ✅ Upload successful for image ${i}`)

        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from('images')
          .getPublicUrl(fileName)

        console.log(`      Public URL: ${publicUrl.publicUrl.substring(0, 80)}...`)

        generatedImages.push({
          id: imageId,
          url: publicUrl.publicUrl,
          storagePath: fileName,
          createdAt: timestamp,
        })
      } catch (err: any) {
        console.error(`   ❌ Error uploading image ${i}:`, err?.message)
        console.error(`      Stack: ${err?.stack}`)
      }
    }

    if (generatedImages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: finalPrompt,
          error: 'Failed to upload generated images',
        },
        { status: 500 }
      )
    }

    console.log(`\n✅ FINAL RESULT: ${generatedImages.length} images successfully generated and uploaded`)
    generatedImages.forEach((img, idx) => {
      const type = img.url.startsWith('data:') ? '📌 PLACEHOLDER' : '✨ REAL'
      console.log(`   ${idx + 1}. ${type}: ${img.url.substring(0, 80)}...`)
    })

    // INCREMENT COUNTER: Increment free user's generation count after successful generation
    // This uses atomic increment to prevent race conditions in production
    if (userId && userSubscription === 'free') {
      try {
        const supabase = getSupabaseClient()
        
        console.log(`\n📊 INCREMENTING GENERATION COUNT:`)
        console.log(`   User ID: ${userId}`)
        
        // Use atomic increment to ensure no race conditions
        const { error: updateError } = await supabase
          .rpc('increment_daily_generations', {
            user_id: userId
          })
        
        if (updateError) {
          // Fallback to direct update if RPC doesn't exist yet
          console.warn(`⚠️ RPC not available, using direct update: ${updateError.message}`)
          
          // Get current value
          const { data: currentData } = await supabase
            .from('profiles')
            .select('generations_today')
            .eq('id', userId)
            .single()
          
          const currentCount = (currentData?.generations_today || 0) + 1
          
          const { error: fallbackError } = await supabase
            .from('profiles')
            .update({ 
              generations_today: currentCount
            })
            .eq('id', userId)
          
          if (fallbackError) {
            console.error(`❌ Failed to increment generation count: ${fallbackError.message}`)
          } else {
            console.log(`✅ Generation count incremented successfully (direct update)`)
          }
        } else {
          console.log(`✅ Generation count incremented successfully (atomic RPC)`)
        }
      } catch (err: any) {
        console.error(`❌ Failed to increment generation count: ${err?.message}`)
        // Don't block the response if increment fails - images already generated successfully
      }
    }

    // Check if free user - show pricing modal after 1st generation (DISABLED FOR NOW)
    // const showPricingModal = userSubscription === 'free' && imagesGenerated === 0

    // Return response with optional brandLogoUrl
    // If brandLogoUrl is null/undefined, client will skip logo compositing
    const response: GenerateImageResponse = {
      success: true,
      images: generatedImages,
      prompt: finalPrompt,
      eventName: eventName,
      industry: userIndustry,
      // showPricingModal: showPricingModal,
    }
    
    // Only include brandLogoUrl if it's valid - allows clean images without branding
    if (userBrandLogo && userBrandLogo.length > 0) {
      response.brandLogoUrl = userBrandLogo
      console.log(`✅ Response includes brand logo URL for client-side compositing`)
    } else {
      console.log(`✅ Response without brand logo - clean images will be delivered`)
    }
    
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Generation error:', error?.message)
    console.error('Error stack:', error?.stack)

    // Always return 200 with graceful error for JSON parsing
    return NextResponse.json(
      {
        success: false,
        images: [],
        prompt: '',
        error: 'Image generation failed. Please try again.',
      },
      { status: 200 } // Return 200 OK to avoid HTML error responses
    )
  }
} 