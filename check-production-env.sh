#!/bin/bash
# Production Environment Check for Festivly Image Generation
# Run this to verify all environment variables are set correctly in production

echo "🔍 Checking Production Environment Variables..."
echo ""

# Check Google Cloud vars
echo "📊 Google Cloud Configuration:"
if [ -z "$GOOGLE_CLOUD_PROJECT_ID" ]; then
  echo "  ❌ GOOGLE_CLOUD_PROJECT_ID not set"
else
  echo "  ✅ GOOGLE_CLOUD_PROJECT_ID: $GOOGLE_CLOUD_PROJECT_ID"
fi

if [ -z "$GOOGLE_CLOUD_REGION" ]; then
  echo "  ⚠️  GOOGLE_CLOUD_REGION not set (defaults to us-central1)"
else
  echo "  ✅ GOOGLE_CLOUD_REGION: $GOOGLE_CLOUD_REGION"
fi

if [ -z "$GOOGLE_SERVICE_ACCOUNT_KEY" ]; then
  echo "  ❌ GOOGLE_SERVICE_ACCOUNT_KEY not set"
else
  echo "  ✅ GOOGLE_SERVICE_ACCOUNT_KEY: Set ($(echo $GOOGLE_SERVICE_ACCOUNT_KEY | wc -c) chars)"
  # Try to parse it
  if echo "$GOOGLE_SERVICE_ACCOUNT_KEY" | node -e 'try { JSON.parse(require("fs").readFileSync(0, "utf-8")); console.log("  ✅ Service account key is valid JSON"); } catch (e) { console.log("  ❌ Service account key is NOT valid JSON"); }' 2>/dev/null; then
    :
  fi
fi

echo ""
echo "📊 Supabase Configuration:"
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "  ❌ NEXT_PUBLIC_SUPABASE_URL not set"
else
  echo "  ✅ NEXT_PUBLIC_SUPABASE_URL: Set"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "  ❌ SUPABASE_SERVICE_ROLE_KEY not set"
else
  echo "  ✅ SUPABASE_SERVICE_ROLE_KEY: Set"
fi

echo ""
echo "📊 Image Generation Test:"
echo "  URL: https://festivly.vercel.app/api/health"
echo "  Run this to check if all env vars are properly loaded in production"
