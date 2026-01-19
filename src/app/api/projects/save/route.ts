import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

interface SaveProjectRequest {
  userId: string
  imageUrl: string
  storagePath: string
  eventName: string
  industry: string
  prompt: string
  title: string
  index: number
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveProjectRequest = await request.json()
    const {
      userId,
      imageUrl,
      storagePath,
      eventName,
      industry,
      prompt,
      title,
      index,
    } = body

    if (!userId || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Create a new project
    const projectId = uuidv4()
    const now = new Date().toISOString()
    
    const { error: projectError, data: projectData } = await supabase
      .from('projects')
      .insert({
        id: projectId,
        user_id: userId,
        title: title,
        description: `${eventName} - ${industry} industry`,
        prompt: prompt,
        image_urls: [imageUrl],
        storage_paths: [storagePath],
        thumbnail_url: imageUrl,
        created_at: now,
        updated_at: now,
      })
      .select()

    if (projectError) {
      console.error('Project creation error:', projectError)
      throw projectError
    }

    // Also log to generations table
    await supabase.from('generations').insert({
      id: uuidv4(),
      user_id: userId,
      project_id: projectId,
      prompt: prompt,
      model: 'imagen-4',
      image_url: imageUrl,
      metadata: {
        event: eventName,
        industry: industry,
        index: index,
      },
      tokens_used: 0,
      created_at: now,
    })

    return NextResponse.json({
      success: true,
      projectId: projectId,
      project: {
        id: projectId,
        title: title,
        description: `${eventName} - ${industry} industry`,
        thumbnail_url: imageUrl,
        image_urls: [imageUrl],
        user_id: userId,
        created_at: now,
        updated_at: now,
      },
      message: 'Project saved successfully',
    })
  } catch (error: any) {
    console.error('Save project error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save project' },
      { status: 500 }
    )
  }
}
