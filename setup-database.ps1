# PowerShell script to apply database migrations to Supabase
# This script provides instructions for running the migration

Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "Supabase Database Migration Script" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host ""

# Check if .env exists
if (!(Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found" -ForegroundColor Red
    Write-Host "Please create a .env file with Supabase credentials"
    exit 1
}

Write-Host "✅ .env file found" -ForegroundColor Green
Write-Host ""

Write-Host "📋 To apply the database migration:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to your Supabase Dashboard: https://app.supabase.com" -ForegroundColor White
Write-Host "2. Select your project" -ForegroundColor White
Write-Host "3. Click on 'SQL Editor' in the left sidebar" -ForegroundColor White
Write-Host "4. Click 'New Query'" -ForegroundColor White
Write-Host "5. Open the file: docs/migration-add-columns.sql" -ForegroundColor White
Write-Host "6. Copy all the contents" -ForegroundColor White
Write-Host "7. Paste into the Supabase SQL Editor" -ForegroundColor White
Write-Host "8. Click 'Run' to execute the migration" -ForegroundColor White
Write-Host ""

Write-Host "✅ Your database will be updated with the new columns:" -ForegroundColor Green
Write-Host ""
Write-Host "  • headline     - Project headline text" -ForegroundColor Cyan
Write-Host "  • subtitle     - Project subtitle text" -ForegroundColor Cyan
Write-Host "  • prompt       - AI generation prompt" -ForegroundColor Cyan
Write-Host "  • tier         - Tier information" -ForegroundColor Cyan
Write-Host "  • image_urls   - Array of image URLs" -ForegroundColor Cyan
Write-Host "  • storage_paths - Array of storage paths" -ForegroundColor Cyan
Write-Host "  • canvas_state - Canvas state data" -ForegroundColor Cyan
Write-Host ""

Write-Host "📄 Migration file location: docs/migration-add-columns.sql" -ForegroundColor Yellow
Write-Host ""
