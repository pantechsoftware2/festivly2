/**
 * Health Check Endpoint
 * Tests if Google Cloud credentials are properly configured
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const region = process.env.GOOGLE_CLOUD_REGION
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('🔍 Health check starting...')

    // Check Google Cloud configuration
    const googleStatus = {
      projectId: projectId ? '✅ Set' : '❌ Missing',
      region: region ? '✅ Set' : '❌ Missing',
      serviceAccountKey: serviceAccountKey ? '✅ Set' : '❌ Missing',
      credentialsStatus: 'checking...',
    }

    // Check Supabase configuration
    const supabaseStatus = {
      url: supabaseUrl ? '✅ Set' : '❌ Missing',
      serviceRoleKey: supabaseKey ? '✅ Set' : '❌ Missing',
    }

    // Try to parse service account key
    let serviceAccountParsed = false
    try {
      if (serviceAccountKey) {
        const credentials = typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey
        serviceAccountParsed = !!credentials?.project_id
        googleStatus.credentialsStatus = `✅ Valid (project: ${credentials?.project_id})`
      } else {
        googleStatus.credentialsStatus = '❌ No service account key'
      }
    } catch (e: any) {
      googleStatus.credentialsStatus = `❌ Invalid JSON: ${e.message}`
    }

    if (!projectId) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'GOOGLE_CLOUD_PROJECT_ID not configured',
          googleStatus,
          supabaseStatus,
        },
        { status: 400 }
      )
    }

    // Try to initialize Vertex AI
    let vertexStatus = 'checking...'
    try {
      const { VertexAI } = await import('@google-cloud/vertexai')
      const vertexAI = new VertexAI({
        project: projectId,
        location: region || 'us-central1',
      })
      vertexStatus = '✅ Initialized'
      console.log('✅ Vertex AI SDK initialized successfully')
    } catch (error: any) {
      vertexStatus = `❌ ${error?.message || 'Unknown error'}`
      console.error('❌ Failed to initialize Vertex AI SDK:', error?.message)
    }

    return NextResponse.json({
      status: 'ok',
      environment: {
        google: {
          projectId: googleStatus.projectId,
          region: googleStatus.region,
          serviceAccountKey: googleStatus.serviceAccountKey,
          credentialsStatus: googleStatus.credentialsStatus,
          vertexStatus,
        },
        supabase: supabaseStatus,
      },
      message: 'Server is running. Check all status fields.',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error?.message || 'Health check failed',
      },
      { status: 500 }
    )
  }
}