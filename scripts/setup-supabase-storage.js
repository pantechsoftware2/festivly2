#!/usr/bin/env node
/**
 * Setup Supabase Storage Bucket
 * Creates the 'images' bucket for storing generated images
 */

const { createClient } = require('@supabase/supabase-js')

async function setupStorage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    console.error('   Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('🔧 Setting up Supabase Storage...')
  console.log(`   URL: ${supabaseUrl}`)

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError.message)
    process.exit(1)
  }

  console.log(`📦 Existing buckets: ${buckets.map(b => b.name).join(', ') || 'none'}`)

  const imagesBucket = buckets.find(b => b.name === 'images')
  const logosBucket = buckets.find(b => b.name === 'brand-logos')

  if (imagesBucket) {
    console.log('✅ Bucket "images" already exists')
  } else {
    console.log('📦 Creating "images" bucket...')
    
    const { data, error } = await supabase.storage.createBucket('images', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'],
    })

    if (error) {
      console.error('❌ Error creating bucket:', error.message)
      process.exit(1)
    }

    console.log('✅ Bucket "images" created successfully')
  }

  if (logosBucket) {
    console.log('✅ Bucket "brand-logos" already exists')
  } else {
    console.log('📦 Creating "brand-logos" bucket...')
    
    const { data, error } = await supabase.storage.createBucket('brand-logos', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'],
    })

    if (error) {
      console.error('❌ Error creating bucket:', error.message)
      process.exit(1)
    }

    console.log('✅ Bucket "brand-logos" created successfully')
  }

  console.log('\n✨ Supabase storage setup complete!')
  console.log('   You can now upload generated images to the "images" bucket')
  console.log('   And brand logos to the "brand-logos" bucket')
}

// Load .env.local
require('dotenv').config({ path: '.env.local' })

setupStorage().catch(error => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})