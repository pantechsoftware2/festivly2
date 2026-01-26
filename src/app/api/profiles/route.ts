import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, email, industry_type, brand_logo_url, subscription_plan, free_images_generated, brand_style_context } = body

    console.log('📨 Profile API received request with body:', { id, email, industry_type, brand_logo_url, subscription_plan, free_images_generated, brand_style_context })
    console.log('📊 Value types check:', {
      id_type: typeof id,
      email_type: typeof email,
      industry_type_type: typeof industry_type,
      industry_type_value: industry_type,
      brand_logo_url_type: typeof brand_logo_url,
      brand_logo_url_value: brand_logo_url,
      brand_style_context_type: typeof brand_style_context
    })

    if (!id) {
      console.error('❌ No ID provided in request')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (typeof id !== 'string') {
      console.error('❌ ID is not a string:', typeof id, id)
      return NextResponse.json(
        { error: 'User ID must be a string' },
        { status: 400 }
      )
    }

    // Use service role key to bypass RLS policies (for signup)
    const supabase = createServiceRoleClient()

    console.log('🔍 Checking if profile exists for ID:', id)

    // First check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, subscription_plan, free_images_generated')
      .eq('id', id)
      .maybeSingle()

    console.log('✅ Profile check result:', { exists: !!existingProfile, checkError, id })

    // Build the profile payload - only include fields that are explicitly provided
    const profilePayload: any = {
      id,
    }
    
    if (email !== undefined) profilePayload.email = email
    if (industry_type !== undefined) profilePayload.industry_type = industry_type
    if (brand_logo_url !== undefined) profilePayload.brand_logo_url = brand_logo_url
    if (subscription_plan !== undefined) profilePayload.subscription_plan = subscription_plan
    if (free_images_generated !== undefined) profilePayload.free_images_generated = free_images_generated
    if (brand_style_context !== undefined) profilePayload.brand_style_context = brand_style_context

    console.log('📝 Profile payload to upsert:', profilePayload)

    if (existingProfile) {
      // Profile exists - UPDATE it (only update provided fields)
      console.log('🔄 Profile exists, updating with new data...')
      const updatePayload: any = {}
      
      if (email !== undefined) updatePayload.email = email
      if (industry_type !== undefined) updatePayload.industry_type = industry_type
      if (brand_logo_url !== undefined) updatePayload.brand_logo_url = brand_logo_url
      if (subscription_plan !== undefined) updatePayload.subscription_plan = subscription_plan
      if (free_images_generated !== undefined) updatePayload.free_images_generated = free_images_generated
      if (brand_style_context !== undefined) updatePayload.brand_style_context = brand_style_context

      console.log('📝 UPDATE payload:', updatePayload)
      
      const { error: updateError, data: updateData } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', id)
        .select()
      
      if (updateError) {
        console.error('❌ Profile update failed:', updateError)
        return NextResponse.json(
          { error: 'Failed to update profile', details: updateError.message },
          { status: 500 }
        )
      }

      console.log('✅ Profile updated successfully:', updateData?.[0])
      
      // CRITICAL: Log production state after update
      console.log('🚀 PRODUCTION STATE AFTER UPDATE:', {
        userId: updateData?.[0]?.id,
        email: updateData?.[0]?.email,
        subscription_plan: updateData?.[0]?.subscription_plan || 'free',
        free_images_generated: updateData?.[0]?.free_images_generated || 0,
        industry_type: updateData?.[0]?.industry_type,
        has_logo: !!updateData?.[0]?.brand_logo_url,
      })

      return NextResponse.json({
        success: true,
        profile: updateData?.[0] || null
      })
    } else {
      // Profile doesn't exist - INSERT it
      console.log('➕ Creating new profile with ID:', id)
      const profileInsertPayload = {
        id,
        email: email || null,
        industry_type: industry_type || null,
        brand_logo_url: brand_logo_url || null,
        subscription_plan: subscription_plan || 'free', // DEFAULT: free tier for new users
        free_images_generated: free_images_generated !== undefined ? free_images_generated : 0, // DEFAULT: 0 generations
        brand_style_context: brand_style_context || null,
      }
      console.log('📝 INSERT payload being sent to Supabase:', profileInsertPayload)
      
      const { error: insertError, data: insertData } = await supabase
        .from('profiles')
        .insert(profileInsertPayload)
        .select()

      if (insertError) {
        console.error('❌ Profile insert failed:', {
          error: insertError,
          code: insertError.code,
          message: insertError.message
        })
        return NextResponse.json(
          { error: 'Failed to create profile', details: insertError.message },
          { status: 500 }
        )
      }

      console.log('✅ Profile created successfully:', {
        id: insertData?.[0]?.id,
        email: insertData?.[0]?.email,
        industry_type: insertData?.[0]?.industry_type,
        brand_logo_url: insertData?.[0]?.brand_logo_url,
        fullData: insertData?.[0]
      })

      // CRITICAL: Log production state after insert
      console.log('🚀 PRODUCTION STATE AFTER INSERT:', {
        userId: insertData?.[0]?.id,
        email: insertData?.[0]?.email,
        subscription_plan: insertData?.[0]?.subscription_plan || 'free',
        free_images_generated: insertData?.[0]?.free_images_generated || 0,
        industry_type: insertData?.[0]?.industry_type,
        has_logo: !!insertData?.[0]?.brand_logo_url,
      })

      return NextResponse.json({
        success: true,
        profile: insertData?.[0] || null
      })
    }
  } catch (error: any) {
    console.error('❌ Profile endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process profile' },
      { status: 500 }
    )
  }
}
