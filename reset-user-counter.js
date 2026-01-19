#!/usr/bin/env node
/**
 * Reset free_images_generated counter for test user
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load .env file
const envPath = path.join(__dirname, '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const envLines = envContent.split('\n')
const env = {}

envLines.forEach(line => {
  if (line.startsWith('#') || !line.trim()) return
  const eqIndex = line.indexOf('=')
  if (eqIndex > 0) {
    const key = line.substring(0, eqIndex).trim()
    const value = line.substring(eqIndex + 1).trim()
    env[key] = value
  }
})

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || 'https://adzndcsprxemlpgvcmsg.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

console.log(`📌 SUPABASE_URL: ${SUPABASE_URL}`)
console.log(`📌 SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✅ Loaded' : '❌ Not found'}`)

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function resetCounter(userId) {
  console.log(`🔄 Resetting counter for user: ${userId}`)
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ free_images_generated: 0 })
    .eq('id', userId)
    .select()
  
  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
  
  console.log('✅ Counter reset to 0')
  console.log('📊 Updated profile:', data)
}

// Get userId from command line args
const userId = process.argv[2]
if (!userId) {
  console.error('❌ Usage: node reset-user-counter.js <userId>')
  console.error('❌ Example: node reset-user-counter.js b9a43575-d421-4a9d-aa90-cc471016e589')
  process.exit(1)
}

resetCounter(userId).catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
