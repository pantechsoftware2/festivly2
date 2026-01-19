#!/usr/bin/env node
/**
 * Quick Supabase Bucket Setup
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

async function setupBuckets() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const client = createClient(url, key)

  console.log('🔧 Setting up Supabase buckets...\n')

  // Setup brand-logos bucket
  try {
    const { data: buckets } = await client.storage.listBuckets()
    const hasBrandLogos = buckets?.some(b => b.name === 'brand-logos')

    if (!hasBrandLogos) {
      console.log('📦 Creating "brand-logos" bucket...')
      const { data, error } = await client.storage.createBucket('brand-logos', {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      })

      if (error) {
        console.error('❌ Error creating brand-logos:', error.message)
      } else {
        console.log('✅ brand-logos bucket created\n')
      }
    } else {
      console.log('✅ brand-logos bucket already exists\n')
    }

    // Setup images bucket
    const hasImages = buckets?.some(b => b.name === 'images')
    if (!hasImages) {
      console.log('📦 Creating "images" bucket...')
      const { data, error } = await client.storage.createBucket('images', {
        public: true,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      })

      if (error) {
        console.error('❌ Error creating images:', error.message)
      } else {
        console.log('✅ images bucket created\n')
      }
    } else {
      console.log('✅ images bucket already exists\n')
    }

    console.log('✨ Setup complete!')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

setupBuckets()
