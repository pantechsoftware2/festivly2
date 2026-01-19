/**
 * API Route: /api/check-industry
 * Checks if user has industry_type set, returns status and allows setting it
 * Critical for Google users who skip industry selection during signup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

interface CheckIndustryRequest {
  userId: string
}

interface CheckIndustryResponse {
  hasIndustry: boolean
  industry?: string
  message?: string
  error?: string
}

interface SetIndustryRequest {
  userId: string
  industryType: string
}

interface SetIndustryResponse {
  success: boolean
  industry?: string
  message?: string
  error?: string
}

/**
 * GET - Check if user has industry set
 */
export async function GET(request: NextRequest): Promise<NextResponse<CheckIndustryResponse>> {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { 
          hasIndustry: false,
          error: 'userId is required' 
        },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('industry_type')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn(`⚠️ Industry check failed for ${userId}: ${error.message}`)
      return NextResponse.json(
        { 
          hasIndustry: false,
          message: 'Could not check industry status'
        },
        { status: 200 }
      )
    }

    const hasIndustry = !!(data?.industry_type && data.industry_type.trim().length > 0)
    
    console.log(`📊 Industry check for ${userId}: hasIndustry=${hasIndustry}, industry=${data?.industry_type || 'NONE'}`)

    return NextResponse.json({
      hasIndustry,
      industry: data?.industry_type || undefined,
      message: !hasIndustry ? 'User needs to set industry_type' : 'User has industry set'
    })
  } catch (error: any) {
    console.error('Industry check error:', error?.message)
    return NextResponse.json(
      { 
        hasIndustry: false,
        error: error?.message || 'Failed to check industry'
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Set industry_type for user
 * Used when Google users need to set industry after signup
 */
export async function POST(request: NextRequest): Promise<NextResponse<SetIndustryResponse>> {
  try {
    const body: SetIndustryRequest = await request.json()
    const { userId, industryType } = body

    if (!userId || !industryType) {
      return NextResponse.json(
        { 
          success: false,
          error: 'userId and industryType are required'
        },
        { status: 400 }
      )
    }

    if (industryType.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'industryType cannot be empty'
        },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // Update industry_type for user
    const { data, error } = await supabase
      .from('profiles')
      .update({ industry_type: industryType })
      .eq('id', userId)
      .select('industry_type')
      .single()

    if (error) {
      console.error(`❌ Failed to set industry for ${userId}: ${error.message}`)
      return NextResponse.json(
        { 
          success: false,
          error: `Failed to set industry: ${error.message}`
        },
        { status: 400 }
      )
    }

    console.log(`✅ Industry updated for user ${userId}: ${industryType}`)

    return NextResponse.json({
      success: true,
      industry: data?.industry_type,
      message: `Industry set to ${industryType}`
    })
  } catch (error: any) {
    console.error('Set industry error:', error?.message)
    return NextResponse.json(
      { 
        success: false,
        error: error?.message || 'Failed to set industry'
      },
      { status: 500 }
    )
  }
}
