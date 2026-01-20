/**
 * API Route: /api/analyze-brand
 * Analyzes a brand image (from URL or base64) and extracts style description
 * Uses Gemini 2.0 Flash vision model for image analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Debug: Log if API key is loaded
console.log('🔑 API Key Status:', process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'LOADED' : 'NOT LOADED')

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

interface AnalyzeBrandRequest {
  websiteUrl?: string
  base64Image?: string
}

interface AnalyzeBrandResponse {
  success: boolean
  styleDescription?: string
  error?: string
}

/**
 * Fetch HTML and extract og:image meta tag
 */
async function extractOgImage(websiteUrl: string): Promise<string | null> {
  try {
    console.log(`🌐 Fetching HTML from: ${websiteUrl}`)
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FestivlyBot/1.0)',
      },
    })

    if (!response.ok) {
      console.error(`❌ Failed to fetch website: ${response.status}`)
      return null
    }

    const html = await response.text()
    
    // Extract og:image using regex
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    
    if (ogImageMatch && ogImageMatch[1]) {
      const ogImageUrl = ogImageMatch[1]
      console.log(`✅ Found og:image: ${ogImageUrl}`)
      return ogImageUrl
    }

    console.warn(`⚠️ No og:image found in HTML`)
    return null
  } catch (error: any) {
    console.error(`❌ Error fetching website:`, error.message)
    return null
  }
}

/**
 * Download image from URL and convert to base64
 */
async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    console.log(`📥 Downloading image from: ${imageUrl}`)
    const response = await fetch(imageUrl)

    if (!response.ok) {
      console.error(`❌ Failed to download image: ${response.status}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    
    // Detect MIME type from response headers or default to jpeg
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const dataUrl = `data:${contentType};base64,${base64}`
    
    console.log(`✅ Image downloaded (${buffer.length} bytes)`)
    return dataUrl
  } catch (error: any) {
    console.error(`❌ Error downloading image:`, error.message)
    return null
  }
}

/**
 * Analyze image using Gemini 2.0 Flash vision model
 */
async function analyzeImageWithGemini(imageData: string): Promise<string> {
  console.log(`🔍 Analyzing image with Gemini 2.0 Flash...`)
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  
  const systemPrompt = `You are an expert Creative Director. Analyze this image and extract a comma-separated style description focusing ONLY on: Color Palette (hex codes and names), Lighting Style (e.g., golden hour, studio, flat lay), and Vibe (e.g., corporate, playful, luxury, minimalist). Output raw text only.`
  
  // Parse base64 data
  let base64Data: string
  let mimeType: string
  
  if (imageData.startsWith('data:')) {
    // Extract mime type and base64 data from data URL
    const matches = imageData.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      throw new Error('Invalid data URL format')
    }
    mimeType = matches[1]
    base64Data = matches[2]
  } else {
    // Assume raw base64, default to jpeg
    mimeType = 'image/jpeg'
    base64Data = imageData
  }
  
  const result = await model.generateContent([
    systemPrompt,
    {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    },
  ])
  
  const responseText = result.response.text().trim()
  console.log(`✅ Analysis complete: ${responseText.substring(0, 100)}...`)
  
  return responseText
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeBrandResponse>> {
  try {
    const body: AnalyzeBrandRequest = await request.json()
    const { websiteUrl, base64Image } = body

    // Validate input
    if (!websiteUrl && !base64Image) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either websiteUrl or base64Image is required',
        },
        { status: 400 }
      )
    }

    // Check for API key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'GOOGLE_GENERATIVE_AI_API_KEY not configured',
        },
        { status: 500 }
      )
    }

    let imageToAnalyze: string | null = null

    // If websiteUrl provided, extract og:image and download it
    if (websiteUrl) {
      console.log(`🎯 Processing website URL: ${websiteUrl}`)
      
      const ogImageUrl = await extractOgImage(websiteUrl)
      if (!ogImageUrl) {
        return NextResponse.json(
          {
            success: false,
            error: 'Could not extract og:image from website',
          },
          { status: 400 }
        )
      }

      imageToAnalyze = await downloadImageAsBase64(ogImageUrl)
      if (!imageToAnalyze) {
        return NextResponse.json(
          {
            success: false,
            error: 'Could not download og:image',
          },
          { status: 400 }
        )
      }
     } else if (base64Image) {
  console.log(`🎯 Processing image input`)

  // If frontend sent a URL instead of base64
  if (base64Image.startsWith('http')) {
    imageToAnalyze = await downloadImageAsBase64(base64Image)

    if (!imageToAnalyze) {
      return NextResponse.json(
        { success: false, error: 'Failed to download image from URL' },
        { status: 400 }
      )
    }
  } else {
    // True base64 or data URL
    imageToAnalyze = base64Image
  }
}


    if (!imageToAnalyze) {
      return NextResponse.json(
        {
          success: false,
          error: 'No image to analyze',
        },
        { status: 400 }
      )
    }

    // Analyze image with Gemini
    const styleDescription = await analyzeImageWithGemini(imageToAnalyze)

    return NextResponse.json({
      success: true,
      styleDescription,
    })

  } catch (error: any) {
    console.error(`❌ Error in analyze-brand API:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to analyze brand image',
      },
      { status: 500 }
    )
  }
}
