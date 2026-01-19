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

    // Get current count
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('free_images_generated, subscription_plan')
      .eq('id', userId)
      .single()

    if (profileError) {
      throw profileError
    }

    const subscription = profile?.subscription_plan || 'free'
    const currentCount = profile?.free_images_generated || 0

    // Only increment if free plan and haven't generated yet
    if (subscription === 'free' && currentCount === 0) {
      const newCount = 1 // Set to 1 (they've used their free generation)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          free_images_generated: newCount,
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        newCount,
        remaining: Math.max(0, 5 - newCount),
      })
    } else if (subscription !== 'free') {
      // Pro users have unlimited, just return success
      return NextResponse.json({
        success: true,
        newCount: currentCount,
        remaining: 'unlimited',
      })
    } else {
      // Exceeded limit
      return NextResponse.json({
        success: false,
        message: 'Image limit exceeded',
        newCount: currentCount,
        remaining: 0,
      }, { status: 403 })
    }
  } catch (error: any) {
    console.error('Increment count error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to increment image count' },
      { status: 500 }
    )
  }
}
