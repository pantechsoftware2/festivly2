import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    // Create client for auth verification with anon key
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey || '')
    // Create admin client with service role key for uploads and database updates
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify user with token
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    const fileName = `${user.id}/logo-${Date.now()}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    console.log('🔷 Uploading logo:', { fileName, fileSize: buffer.length, contentType: file.type })
    
    // Upload to Supabase storage using service role key
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('brand-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload logo: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Upload successful:', { path: uploadData.path })

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('brand-logos')
      .getPublicUrl(uploadData?.path || fileName)

    console.log('🔗 Public URL:', publicUrl.publicUrl)

    let finalUrl = publicUrl?.publicUrl || ''
    
    if (!finalUrl) {
      console.error('❌ No public URL returned')
      return NextResponse.json(
        { error: 'Failed to generate public URL' },
        { status: 500 }
      )
    }

    // Update user profile with logo URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ brand_logo_url: finalUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json(
        { error: `Failed to save logo URL: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Profile updated with logo URL')

    return NextResponse.json({
      success: true,
      logoUrl: finalUrl,
      message: 'Logo uploaded successfully'
    })
  } catch (error: any) {
    console.error('❌ Upload endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process upload' },
      { status: 500 }
    )
  }
}
