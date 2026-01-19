import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('🔍 Fetching profile for user:', id)
    
    // Use service role key to bypass RLS policies
    const supabase = createServiceRoleClient()

    console.log('📝 Querying profiles table for id:', id)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, brand_logo_url, industry_type, subscription_plan, free_images_generated, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error(`❌ Profile fetch error for ${id}:`, error.message)
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      console.warn(`⚠️ No profile found for ${id}, returning empty profile`)
      return NextResponse.json({
        id: id,
        email: null,
        industry_type: null,
        brand_logo_url: null,
        subscription_plan: 'free',
        free_images_generated: 0,
      })
    }

    console.log('✅ Profile found:', {
      id: data?.id,
      email: data?.email,
      industry_type: data?.industry_type,
      has_logo: !!data?.brand_logo_url,
      logo_url: data?.brand_logo_url?.substring(0, 50)
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('❌ Profile fetch exception:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}