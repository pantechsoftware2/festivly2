const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(url, key)

async function checkStorage() {
  console.log('🔍 Checking Supabase Storage buckets...\n')

  try {
    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error('❌ Error listing buckets:', error.message)
      return
    }

    console.log('📦 Available buckets:')
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (public: ${bucket.public})`)
    })

    // Check if 'images' bucket exists
    const imagesBucket = buckets.find(b => b.name === 'images')
    if (imagesBucket) {
      console.log(`\n✅ 'images' bucket exists`)
      console.log(`   Public: ${imagesBucket.public}`)
      if (!imagesBucket.public) {
        console.log(`   ⚠️  WARNING: Bucket is NOT public. Generated images won't be accessible!`)
      }
    } else {
      console.log(`\n❌ 'images' bucket NOT FOUND`)
      console.log('   Creating bucket...')

      const { data, error: createError } = await supabase.storage.createBucket('images', {
        public: true,
      })

      if (createError) {
        console.error('   ❌ Failed to create bucket:', createError.message)
      } else {
        console.log('   ✅ Bucket created successfully as PUBLIC')
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

checkStorage()
