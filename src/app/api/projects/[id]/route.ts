/**
 * API Route: /api/projects/[id]
 * Get or delete a specific project
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

function getSupabaseAdminClient() {
  return createServiceRoleClient()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdminClient()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authorization' },
        { status: 401 }
      )
    }

    // Await the params Promise
    const { id } = await params

    // Fetch project
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      project: data,
    })
  } catch (error: any) {
    console.error('❌ Error in /api/projects/[id] GET:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdminClient()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authorization' },
        { status: 401 }
      )
    }

    // Await the params Promise
    const { id } = await params

    // First, fetch the project to get thumbnail URL
    const { data: projectData, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !projectData) {
      console.error('Project not found:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Delete image from storage if thumbnail_url exists
    if (projectData.thumbnail_url) {
      try {
        // Extract the storage path from the thumbnail URL
        // URL format: https://adzndcsprxemlpgvcmsg.supabase.co/storage/v1/object/public/generated-images/user_id/filename
        const urlParts = projectData.thumbnail_url.split('/generated-images/')
        if (urlParts.length === 2) {
          const imagePath = `generated-images/${urlParts[1]}`
          console.log('🗑️ Deleting image from storage:', imagePath)
          
          const { error: deleteImageError } = await supabase.storage
            .from('generated-images')
            .remove([imagePath.replace('generated-images/', '')])

          if (deleteImageError) {
            console.warn('⚠️ Warning: Failed to delete image from storage:', deleteImageError)
            // Don't fail the entire delete - continue with database deletion
          } else {
            console.log('✅ Image deleted from storage')
          }
        }
      } catch (storageError) {
        console.warn('⚠️ Warning: Error deleting image:', storageError)
        // Don't fail the entire delete - continue with database deletion
      }
    }

    // Delete project from database
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Failed to delete project:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete project' },
        { status: 500 }
      )
    }

    console.log(`✅ Project and images deleted: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    })
  } catch (error: any) {
    console.error('❌ Error in /api/projects/[id] DELETE:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete project' },
      { status: 500 }
    )
  }
}