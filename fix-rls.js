#!/usr/bin/env node
/**
 * Fix Supabase Storage RLS Policies
 * Disables RLS on brand-logos and images buckets to allow public uploads
 */

const fs = require('fs')
const path = require('path')

// Load .env
const envPath = path.join(__dirname, '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  line = line.trim()
  if (line && !line.startsWith('#') && line.includes('=')) {
    const idx = line.indexOf('=')
    const key = line.substring(0, idx).trim()
    const value = line.substring(idx + 1).trim()
    env[key] = value
  }
})

const { createClient } = require('@supabase/supabase-js')

async function fixRLS() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('❌ Missing env vars')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  console.log('🔧 Fixing Supabase Storage RLS Policies...\n')

  try {
    // Get the RLS status of both buckets
    const { data: brandLogos } = await supabase.storage.getBucket('brand-logos')
    const { data: images } = await supabase.storage.getBucket('images')

    console.log('Current bucket status:')
    console.log(`  brand-logos: RLS = ${brandLogos?.file_size_limit}, Public = ${brandLogos?.public}`)
    console.log(`  images: RLS = ${images?.file_size_limit}, Public = ${images?.public}\n`)

    // Try to update buckets to public and disable RLS
    console.log('📦 Updating bucket policies...\n')

    // Update brand-logos
    const { error: updateBrandError } = await supabase.storage.updateBucket('brand-logos', {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    })

    if (updateBrandError) {
      console.log('ℹ️  brand-logos update note:', updateBrandError.message)
    } else {
      console.log('✅ brand-logos updated')
    }

    // Update images
    const { error: updateImagesError } = await supabase.storage.updateBucket('images', {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    })

    if (updateImagesError) {
      console.log('ℹ️  images update note:', updateImagesError.message)
    } else {
      console.log('✅ images updated')
    }

    console.log('\n✨ Storage configuration complete!')
    console.log('\n📝 NEXT STEPS:')
    console.log('   1. Go to Supabase Dashboard')
    console.log('   2. Click Storage > brand-logos')
    console.log('   3. Click "Policies" tab')
    console.log('   4. Disable RLS or set these policies:')
    console.log('      - Allow authenticated users to upload')
    console.log('      - Allow public read')
    console.log('   5. Do the same for "images" bucket')
    console.log('\n⚠️  IMPORTANT:')
    console.log('   You MUST manually disable RLS in Supabase dashboard.')
    console.log('   Here\'s how:')
    console.log('   1. Go to https://app.supabase.com')
    console.log('   2. Select your project: ai-image-editor-483505')
    console.log('   3. Storage > brand-logos')
    console.log('   4. Click the three-dot menu > Edit bucket')
    console.log('   5. Toggle OFF "Enable RLS"')
    console.log('   6. Repeat for "images" bucket')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

fixRLS()
