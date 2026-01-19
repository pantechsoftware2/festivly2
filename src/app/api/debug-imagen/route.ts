import { NextResponse } from 'next/server'
import { generateImages } from '@/lib/vertex-ai'

/**
 * DEBUG ENDPOINT: Test Imagen-4 API directly
 * GET /api/debug-imagen?prompt=test
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const prompt = searchParams.get('prompt') || 'a beautiful sunset on the beach'

  console.log(`\n🔍 DEBUG: Testing Imagen-4 API`)
  console.log(`   Prompt: "${prompt}"`)

  try {
    const images = await generateImages({
      prompt,
      numberOfImages: 4,
      sampleCount: 4,
    })

    console.log(`✅ Generated ${images.length} images`)

    // Analyze each image
    const analysis = images.map((img, idx) => {
      const isPlaceholder = img.startsWith('data:image/svg+xml')
      const isReal = img.startsWith('data:image/png')
      const size = img.length

      return {
        index: idx + 1,
        type: isPlaceholder ? 'PLACEHOLDER (SVG)' : isReal ? 'REAL (PNG)' : 'UNKNOWN',
        sizeKB: (size / 1024).toFixed(2),
        preview: img.substring(0, 100) + '...',
      }
    })

    return NextResponse.json({
      success: true,
      totalImages: images.length,
      analysis,
    })
  } catch (err: any) {
    console.error(`❌ Error:`, err?.message)
    return NextResponse.json({
      success: false,
      error: err?.message,
      stack: err?.stack,
    }, { status: 500 })
  }
}
