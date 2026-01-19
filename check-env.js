#!/usr/bin/env node

/**
 * Check and report on server-side environment variables
 * Run this on your server to verify Google Cloud credentials are set
 */

const vars = {
  'GOOGLE_CLOUD_PROJECT_ID': process.env.GOOGLE_CLOUD_PROJECT_ID || '❌ NOT SET',
  'GOOGLE_CLOUD_REGION': process.env.GOOGLE_CLOUD_REGION || '❌ NOT SET',
  'GOOGLE_SERVICE_ACCOUNT_KEY': process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? '✅ SET' : '❌ NOT SET',
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ NOT SET',
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ NOT SET',
}

console.log('\n🔍 Environment Variables Status:\n')

Object.entries(vars).forEach(([key, value]) => {
  console.log(`${key}: ${value}`)
})

console.log('\n')

if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    console.log('✅ GOOGLE_SERVICE_ACCOUNT_KEY is valid JSON')
    console.log(`   Project: ${creds.project_id}`)
    console.log(`   Email: ${creds.client_email}`)
  } catch (e) {
    console.log('❌ GOOGLE_SERVICE_ACCOUNT_KEY is NOT valid JSON')
  }
} else {
  console.log('❌ GOOGLE_SERVICE_ACCOUNT_KEY is missing')
  console.log('\n📝 To fix image generation issues:')
  console.log('   1. Copy your service account JSON from Google Cloud')
  console.log('   2. Add to Vercel Environment Variables')
  console.log('   3. Redeploy')
}

console.log('\n')
