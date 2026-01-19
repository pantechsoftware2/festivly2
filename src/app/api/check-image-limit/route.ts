import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // Get current user
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('free_images_generated, subscription_plan')
      .eq('id', userId)
      .single()

    if (profileError) {
      throw profileError
    }

    const subscription = profile?.subscription_plan || 'free'
    const imagesGenerated = profile?.free_images_generated || 0
    const imagesRemaining = Math.max(0, 1 - imagesGenerated) // Free users get 1 generation

    // Check if user has exceeded free limit (can generate 1 time only)
    const hasExceededLimit = subscription === 'free' && imagesGenerated >= 1

    if (hasExceededLimit) {
      return NextResponse.json({
        canGenerate: false,
        message: 'Free trial limit reached. Please upgrade to continue.',
        imagesGenerated,
        imagesRemaining: 0,
        subscription,
        limitExceeded: true,
      })
    }

    // User can generate, return info about remaining images
    return NextResponse.json({
      canGenerate: true,
      imagesGenerated,
      imagesRemaining,
      subscription,
      limitExceeded: false,
    })
  } catch (error: any) {
    console.error('Check limit error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check image limit' },
      { status: 500 }
    )
  }
}
