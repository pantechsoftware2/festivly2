/**
 * API Route: /api/generateImage
 * Generates 4 image variants using Imagen-4 with event + industry context
 * Uses the Desi Prompt Engine to combine industry keywords + event keywords
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateImages } from '@/lib/vertex-ai'
import { generatePrompt, getEventName, UPCOMING_EVENTS } from '@/lib/prompt-engine'
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
  const CLEANUP_AGE = 5 * 60 * 1000 // 5 minutes
  
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

    // Deduplicate concurrent requests - if same request is in progress, wait for it
    const cacheKey = getCacheKey(userId || 'anon', userPrompt || eventId || '')
    console.log(`🔑 Cache key: ${cacheKey}`)
    if (requestInProgress.has(cacheKey)) {
      console.log(`♻️ DEDUP: Waiting for in-progress request with key: ${cacheKey}`)
      await requestInProgress.get(cacheKey)!
      // Return a fresh response from cached result data instead of reusing the response object
      const cachedResult = requestResults.get(cacheKey)
      if (cachedResult) {
        console.log(`♻️ DEDUP: Returning cached result with ${cachedResult.data.images?.length || 0} images`)
        return NextResponse.json(cachedResult.data, { status: cachedResult.status })
      }
    }

    // Mark this request as in-progress
    const requestPromise = processGenerationRequest(body)
    requestInProgress.set(cacheKey, requestPromise)

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
      requestResults.set(cacheKey, { 
        data: resultData, 
        status: result.status 
      })
      return result
    } finally {
      // Clean up after 1 second to allow time for duplicate checks
      setTimeout(() => {
        requestInProgress.delete(cacheKey)
        requestResults.delete(cacheKey)
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
    
    if (userId) {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('industry_type, subscription_plan, free_images_generated')
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
          // imagesGenerated = DISABLED - all users unlimited
          
          console.log(`📊 User profile loaded: subscription=${userSubscription}, industry=${userIndustry}, hasIndustry=${userHasIndustry}`)
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
      // Use Desi Prompt Engine
      finalPrompt = generatePrompt(event.name, userIndustry)
      
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

    // Generate 4 images (or call multiple times)
    let base64Images: string[] = []

    try {
      // Request 4 images from API - all users free (no subscription limits)
      // Note: Google Cloud may return fewer than 4 if quota exceeded
      base64Images = await generateImages({
        prompt: finalPrompt,
        numberOfImages: 4,
        sampleCount: 4,
      })

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

    // Fetch user's brand logo if available
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
            console.warn(`⚠️ Invalid brand logo format: ${typeof userBrandLogo}`)
            userBrandLogo = null
          }
        } else if (error) {
          console.warn(`⚠️ Profile fetch error: ${error.message}`)
        }
      } catch (err: any) {
        console.warn(`⚠️ Could not fetch user brand logo: ${err.message}`)
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

        // Add user's brand logo to image if available
        // NOTE: Logo overlay is now client-side only (in result/page.tsx)
        // This is more reliable and doesn't require additional server dependencies
        if (userBrandLogo && userBrandLogo.length > 10) {
          console.log(`   🏷️ Logo URL available: ${userBrandLogo.substring(0, 50)}... (will be applied client-side)`)
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

    // INCREMENT COUNTER: Increment free user's generation count after successful generation (DISABLED FOR NOW)
    // This tracks how many times they've generated (not how many images)
    // CRITICAL: Use database-level atomic update to prevent race conditions in production
    // if (userId && userSubscription === 'free' && imagesGenerated === 0) {
    //   try {
    //     const supabase = getSupabaseClient()
    //     
    //     // Use RPC or direct update with WHERE clause to ensure atomicity
    //     // Only increment if still at 0 to prevent race condition
    //     const { error: updateError, data: updateData } = await supabase
    //       .from('profiles')
    //       .update({ free_images_generated: 1 })
    //       .eq('id', userId)
    //       .eq('free_images_generated', 0) // Only update if still at 0
    //       .select('free_images_generated')
    //     
    //     if (updateError) {
    //       console.error('❌ Failed to update generation count:', updateError?.message)
    //     } else if (updateData && updateData.length > 0) {
    //       console.log(`✅ Updated user ${userId} generation count: 0 → 1`)
    //     } else {
    //       // Update failed because free_images_generated was not 0 (someone else incremented)
    //       console.warn(`⚠️ Could not increment user ${userId} - already incremented by another request`)
    //     }
    //   } catch (err: any) {
    //     console.error('❌ Failed to update generation count:', err?.message)
    //     // Don't block the response if increment fails - images already generated
    //   }
    // }

    // Check if free user - show pricing modal after 1st generation (DISABLED FOR NOW)
    // const showPricingModal = userSubscription === 'free' && imagesGenerated === 0

    return NextResponse.json({
      success: true,
      images: generatedImages,
      prompt: finalPrompt,
      eventName: eventName,
      industry: userIndustry,
      brandLogoUrl: userBrandLogo || undefined,
      // showPricingModal: showPricingModal,
    })
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