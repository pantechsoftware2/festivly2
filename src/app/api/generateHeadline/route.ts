/**
 * API Route: /api/generateHeadline
 * Generates a short marketing headline using Gemini AI
 * Supports:
 * 1. Initial generation: { subject: string }
 * 2. Regeneration: { originalText: string, imagePrompt: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

interface GenerateHeadlineRequest {
  subject?: string
  originalText?: string
  imagePrompt?: string
}

interface GenerateHeadlineResponse {
  success: boolean
  headline?: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateHeadlineResponse>> {
  try {
    const body: GenerateHeadlineRequest = await request.json()
    const { subject, originalText, imagePrompt } = body

    // Determine if this is regeneration or initial generation
    const isRegeneration = !!originalText
    const context = subject || imagePrompt

    if (!context || !context.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: isRegeneration ? 'Image prompt is required for regeneration' : 'Subject is required',
        },
        { status: 400 }
      )
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.warn('⚠️ GOOGLE_GENERATIVE_AI_API_KEY not set, skipping headline generation')
      return NextResponse.json(
        {
          success: true,
          headline: context.charAt(0).toUpperCase() + context.slice(1),
        }
      )
    }

    console.log(isRegeneration ? '🔄 Regenerating headline...' : '💭 Generating headline...')
    console.log('Context:', context)

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    let prompt: string
    if (isRegeneration) {
      prompt = `I have an image about "${context}" with the current headline: "${originalText}"
Please regenerate a DIFFERENT, fresh marketing headline (5 words max) that would work well with this image.
Be creative, punchy, and compelling. The headline will be displayed as an overlay on the image.
Return ONLY the new headline text, nothing else. No quotation marks, no explanation.`
    } else {
      prompt = `Generate a single, short marketing headline (5 words max) for a design image about "${context}". 
Be creative, punchy, and compelling. 
The headline will be displayed as an overlay on the generated image.
Return ONLY the headline text, nothing else. No quotation marks, no explanation.`
    }

    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()

    // Clean up the response (remove quotes if present)
    const headline = responseText
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .split('\n')[0] // Take first line only
      .trim()

    console.log('✨ Generated headline:', headline)

    return NextResponse.json({
      success: true,
      headline,
    })
  } catch (error: any) {
    console.error('❌ Headline generation error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate headline',
      },
      { status: 500 }
    )
  }
}