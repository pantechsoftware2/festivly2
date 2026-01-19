/**
 * Setup Supabase Storage for image generation
 * Creates and configures the 'images' bucket with public access
 */

const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://adzndcsprxemlpgvcmsg.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkem5kY3NwcnhlbWxwZ3ZjbXNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY3MjY2NSwiZXhwIjoyMDgzMjQ4NjY1fQ.Ij2EwbTs4UcL7rGOt4wJQLCW0a2MLo8_fp9YIyqBN2I'

if (!url || !key) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(url, key)

async function setupStorage() {
  console.log('🔧 Setting up Supabase Storage...\n')

  try {
    // List existing buckets
    console.log('📦 Checking existing buckets...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
      return
    }

    console.log(`Found ${buckets.length} buckets:`)
    buckets.forEach(b => console.log(`  ✓ ${b.name} (public: ${b.public})`))

    // Check if 'images' bucket exists
    const imagesBucket = buckets.find(b => b.name === 'images')

    if (imagesBucket) {
      console.log(`\n✅ 'images' bucket already exists`)
      
      if (!imagesBucket.public) {
        console.log('⚠️  Bucket is NOT public. Updating...')
        const { error: updateError } = await supabase.storage.updateBucket('images', {
          public: true,
        })
        
        if (updateError) {
          console.error('   ❌ Failed to update bucket:', updateError.message)
        } else {
          console.log('   ✅ Bucket is now PUBLIC')
        }
      } else {
        console.log('   ✅ Bucket is already PUBLIC')
      }
    } else {
      console.log(`\n❌ 'images' bucket not found. Creating...`)
      
      const { data, error: createError } = await supabase.storage.createBucket('images', {
        public: true,
      })

      if (createError) {
        console.error('   ❌ Failed to create bucket:', createError.message)
        console.error('   Details:', createError)
      } else {
        console.log('   ✅ Bucket created successfully as PUBLIC')
      }
    }

    // Set CORS policy (if possible)
    console.log('\n🔐 Storage setup complete!\n')
    console.log('📋 Storage Configuration:')
    console.log(`   URL: ${url}`)
    console.log(`   Bucket: images`)
    console.log(`   Public: Yes`)
    console.log(`   Base Path: images/generated/{userId}/{timestamp}-{index}.jpg`)

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    console.error(err)
  }
}

setupStorage()
