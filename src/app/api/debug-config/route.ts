import { NextResponse } from 'next/server'

/**
 * DEBUG ENDPOINT: Check configuration and authentication
 * GET /api/debug-config
 */
export async function GET() {
  console.log(`\n🔍 DEBUG: Checking configuration`)

  const checks = {
    envVars: {
      GOOGLE_CLOUD_PROJECT_ID: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
      GOOGLE_CLOUD_REGION: !!process.env.GOOGLE_CLOUD_REGION,
      GOOGLE_SERVICE_ACCOUNT_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    },
    project: process.env.GOOGLE_CLOUD_PROJECT_ID || 'NOT SET',
    region: process.env.GOOGLE_CLOUD_REGION || 'us-central1 (default)',
  }

  console.log('✅ Configuration check:', JSON.stringify(checks, null, 2))

  // Try to parse service account key
  let credentialsValid = false
  let credentialsError = ''

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
      credentialsValid = !!(creds.type && creds.project_id && creds.private_key)
      if (!credentialsValid) {
        credentialsError = 'Missing required fields: type, project_id, or private_key'
      }
    } catch (e: any) {
      credentialsError = `JSON Parse error: ${e.message}`
    }
  } else {
    credentialsError = 'GOOGLE_SERVICE_ACCOUNT_KEY not set'
  }

  console.log(`Credentials valid: ${credentialsValid}`)
  if (credentialsError) {
    console.error(`Credentials error: ${credentialsError}`)
  }

  return NextResponse.json({
    status: 'ok',
    checks: {
      ...checks,
      credentialsValid,
      credentialsError: credentialsError || null,
    },
  })
}
