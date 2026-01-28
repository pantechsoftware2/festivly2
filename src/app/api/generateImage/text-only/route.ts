
import { NextRequest, NextResponse } from 'next/server'
import { generateImages } from '@/lib/vertex-ai'
import { generateSmartPrompt } from '@/lib/prompt-engine'
import { UPCOMING_EVENTS } from '@/lib/festival-data'
import { createServiceRoleClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

interface TextOnlyRequest {
  userId: string
  eventName: string
  industry: string
  generateTextVariant: boolean
}

interface GeneratedImage {
  id: string
  url: string
  storagePath: string
  createdAt: string
}

interface TextOnlyResponse {
  success: boolean
  images: GeneratedImage[]
  prompt: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<TextOnlyResponse>> {
  try {
    const body: TextOnlyRequest = await request.json()
    const { userId, eventName, industry, generateTextVariant } = body

    // Validation
    if (!userId || !eventName || !industry || !generateTextVariant) {
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: '',
          error: 'Missing required fields',
        },
        { status: 400 }
      )
    }

    console.log(`\n📝 TEXT-ONLY GENERATION REQUEST:`)
    console.log(`   Event: ${eventName}`)
    console.log(`   Industry: ${industry}`)
    console.log(`   User ID: ${userId}`)

    // Get user subscription and brand style context
    let userSubscription = 'free'
    let brandStyleContext: string | null = null

    try {
      const supabase = createServiceRoleClient()
      const { data } = await supabase
        .from('profiles')
        .select('subscription_plan, brand_style_context, generations_today, last_reset_date')
        .eq('id', userId)
        .single()

      if (data) {
        userSubscription = data.subscription_plan || 'free'
        brandStyleContext = data.brand_style_context || null
        
        // ========== DAILY GENERATION LIMIT CHECK FOR FREE USERS ==========
        console.log(`\n📊 DAILY LIMIT CHECK (Text-Only):`)
        console.log(`   Subscription: ${userSubscription}`)
        console.log(`   Current generations today: ${data.generations_today || 0}`)
        
        // Only enforce limit for FREE users
        if (userSubscription === 'free') {
          const lastResetDate = data.last_reset_date ? new Date(data.last_reset_date) : null
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          // Check if last_reset_date is today
          const isToday = lastResetDate && 
            lastResetDate.getFullYear() === today.getFullYear() &&
            lastResetDate.getMonth() === today.getMonth() &&
            lastResetDate.getDate() === today.getDate()
          
          let generationsToday = data.generations_today || 0
          
          // If NOT today, reset counter
          if (!isToday) {
            console.log(`   ✅ Date change detected. Resetting counter to 0.`)
            generationsToday = 0
            await supabase
              .from('profiles')
              .update({
                generations_today: 0,
                last_reset_date: new Date().toISOString(),
              })
              .eq('id', userId)
          }
          
          // Check if user hit the 5 generation limit
          console.log(`   Checking limit: ${generationsToday} / 5`)
          if (generationsToday >= 5) {
            console.warn(`🚫 BLOCKED: User ${userId} reached daily limit (${generationsToday}/5 generations done today)`)
            return NextResponse.json(
              {
                success: false,
                images: [],
                prompt: '',
                error: 'DAILY_LIMIT_REACHED',
              },
              { status: 429 } // Too Many Requests
            )
          }
          console.log(`   ✅ User has ${5 - generationsToday} generation(s) remaining today`)
        }
        // ========== END DAILY GENERATION LIMIT CHECK ==========
      }
    } catch (err) {
      console.warn(`⚠️ Could not fetch user profile, using defaults`)
    }

    console.log(`   Subscription: ${userSubscription}`)

    let base64Images: string[] = []

    try {
      // Generate base prompt for text variant
      console.log(`\n📋 Generating TEXT VARIANT prompt...`)
      const basePrompt = await generateSmartPrompt(eventName, industry, brandStyleContext, false)

      // Enhanced text instructions: top-center headlines, event day, promotional text
      let textPrompt = basePrompt + `
INCLUDE TEXT RENDERING - CRITICAL:
- Add LARGE, BOLD HEADLINES at the TOP CENTER of the image
- Include event name/date prominently at top center
- Add promotional text, CTAs, and key messages throughout
- Use high contrast text for readability
- Include day/date information clearly
- Professional typography and layout`
      
      if (userSubscription === 'pro' || userSubscription === 'pro plus') {
        textPrompt = enhancePromptForPremium(textPrompt, userSubscription)
      }

      console.log(`📋 Text prompt (first 100 chars): ${textPrompt.substring(0, 100)}...`)

      // Generate 2 TEXT images
      console.log(`\n🚀 Generating 2 TEXT images...`)
      try {
        const textImages = await generateImages({
          prompt: textPrompt,
          sampleCount: 2,
        })

        const realTextImages = textImages.filter(img => !img.startsWith('data:image/svg+xml'))
        if (realTextImages.length === 0) {
          throw new Error('No real text images generated')
        }

        base64Images.push(...realTextImages)
        console.log(`✅ Generated ${realTextImages.length} text images`)
      } catch (err: any) {
        console.error(`❌ Text generation failed: ${err.message}`)
        throw err
      }

      // Ensure exactly 2 images
      base64Images = base64Images.slice(0, 2)

      if (base64Images.length < 2) {
        throw new Error(`Only generated ${base64Images.length} images, expected 2`)
      }

      console.log(`\n✅ SUCCESS: Generated 2 text variant images`)
    } catch (genError: any) {
      console.error('❌ Text image generation error:', genError?.message)

      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: '',
          error: 'Failed to generate text images',
        },
        { status: 200 }
      )
    }

    // Upload to Supabase Storage
    const supabase = createServiceRoleClient()
    const generatedImages: GeneratedImage[] = []

    console.log(`\n📦 UPLOADING ${base64Images.length} TEXT IMAGES TO STORAGE`)

    for (let i = 0; i < base64Images.length; i++) {
      try {
        let base64 = base64Images[i]
        const imageId = uuidv4()
        const timestamp = new Date().toISOString()

        const fileName = `generated/${userId || 'anonymous'}/${timestamp}-text-${i}.jpg`

        // Convert base64 to buffer
        const buffer = Buffer.from(base64.split(',')[1] || base64, 'base64')

        console.log(`   📤 Uploading text image ${i + 1}/2...`)
        console.log(`      Path: ${fileName}`)
        console.log(`      Size: ${buffer.length} bytes`)

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: false,
          })

        if (uploadError) {
          console.error(`   ❌ Upload error:`, uploadError.message)
          continue
        }

        console.log(`   ✅ Upload successful`)

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
        console.error(`   ❌ Error uploading text image ${i}:`, err?.message)
      }
    }

    if (generatedImages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: '',
          error: 'Failed to upload text images',
        },
        { status: 500 }
      )
    }

    console.log(`\n✅ FINAL RESULT: ${generatedImages.length} text images successfully generated and uploaded`)

    // Increment counter for free users (if text generation counts)
    if (userId && userSubscription === 'free') {
      try {
        console.log(`\n📊 Incrementing text generation count for free user...`)
        const { error } = await supabase
          .rpc('increment_daily_generations', {
            user_id: userId,
          })

        if (error) {
          console.warn(`⚠️ Could not increment counter: ${error.message}`)
        } else {
          console.log(`✅ Counter incremented`)
        }
      } catch (err: any) {
        console.warn(`⚠️ Counter increment failed: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      images: generatedImages,
      prompt: `${eventName} - Text Variant`,
    })
  } catch (error: any) {
    console.error('Text-only generation error:', error?.message)

    return NextResponse.json(
      {
        success: false,
        images: [],
        prompt: '',
        error: 'Text generation failed. Please try again.',
      },
      { status: 200 }
    )
  }
}

/**
 * Enhance prompt for Pro and Pro Plus users
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
