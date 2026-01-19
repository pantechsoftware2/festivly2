#!/usr/bin/env node
/**
 * Test Script: Image Generation with Timeout
 * Verifies that image generation has proper timeout handling
 */

console.log('🧪 Testing Image Generation Timeout...\n')

// Simulate the timeout logic from vertex-ai.ts
async function testTimeout() {
  try {
    console.log('1️⃣ Creating AbortController with 60s timeout...')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log('⏱️  TIMEOUT TRIGGERED - Aborting fetch')
      controller.abort()
    }, 5000) // 5 seconds for testing

    try {
      console.log('2️⃣ Simulating fetch request...')
      // This will abort after 5 seconds due to timeout
      await fetch('https://httpbin.org/delay/20', {
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      console.log('✅ Fetch completed')
    } catch (error) {
      console.log(`3️⃣ Fetch error caught:`, error.name)
      if (error.name === 'AbortError') {
        console.log('✅ AbortError handled correctly!')
        throw new Error('Image generation timed out (60 seconds). Please try again.')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
      console.log('4️⃣ Cleanup: timeout cleared')
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    return false
  }
  
  return true
}

// Run test
testTimeout().then(success => {
  if (success) {
    console.log('\n✅ Timeout handling test PASSED!')
  } else {
    console.log('\n❌ Timeout handling test FAILED!')
  }
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('Test error:', error)
  process.exit(1)
})
