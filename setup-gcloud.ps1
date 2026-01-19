#!/usr/bin/env pwsh
# Google Cloud Authentication Setup for Vertex AI
# Run as: powershell -ExecutionPolicy Bypass -File setup-gcloud.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Google Cloud SDK Setup for Vertex AI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudPath) {
    Write-Host "[!] Google Cloud SDK not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Options to install:" -ForegroundColor Yellow
    Write-Host "  1. Download installer: https://cloud.google.com/sdk/docs/install-gcloud"
    Write-Host "  2. Or use Chocolatey: choco install google-cloud-sdk"
    Write-Host "  3. Or run: " -ForegroundColor Yellow -NoNewline
    Write-Host "(New-Object System.Net.WebClient).DownloadFile('https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe', 'GoogleCloudSDKInstaller.exe')" -ForegroundColor Green
    Write-Host ""
    Read-Host "Press Enter after installation is complete"
    exit 1
} else {
    Write-Host "[✓] Google Cloud SDK found" -ForegroundColor Green
    gcloud --version
    Write-Host ""
}

# Check authentication
Write-Host "[*] Checking authentication..." -ForegroundColor Yellow
try {
    $token = gcloud auth application-default print-access-token 2>$null
    if ($token) {
        Write-Host "[✓] Already authenticated" -ForegroundColor Green
    } else {
        throw "Not authenticated"
    }
} catch {
    Write-Host "[!] Not authenticated - logging in..." -ForegroundColor Red
    Write-Host ""
    gcloud auth application-default login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] Authentication failed" -ForegroundColor Red
        exit 1
    }
}

# Verify project
Write-Host ""
Write-Host "[*] Verifying Google Cloud project..." -ForegroundColor Yellow
$currentProject = gcloud config get-value project 2>$null
if (-not $currentProject) {
    Write-Host "[!] No project set - setting to ai-image-editor-483505" -ForegroundColor Red
    gcloud config set project ai-image-editor-483505 | Out-Null
    $currentProject = "ai-image-editor-483505"
}
Write-Host "[✓] Project: $currentProject" -ForegroundColor Green

# Check environment variables
Write-Host ""
Write-Host "[*] Checking environment variables..." -ForegroundColor Yellow
$envFile = "C:\Users\pante\Downloads\ai-image-editor\.env.local"
if (Test-Path $envFile) {
    Write-Host "[✓] .env.local exists" -ForegroundColor Green
    $content = Get-Content $envFile
    if ($content -match "GOOGLE_CLOUD_PROJECT_ID") {
        Write-Host "[✓] GOOGLE_CLOUD_PROJECT_ID is set" -ForegroundColor Green
    }
} else {
    Write-Host "[!] .env.local not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[✓] Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your configuration:" -ForegroundColor Cyan
Write-Host "  - Google Cloud Project: $currentProject" -ForegroundColor Green
Write-Host "  - Vertex AI Region: us-central1" -ForegroundColor Green
Write-Host "  - Auth Method: Application Default Credentials" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. cd C:\Users\pante\Downloads\ai-image-editor" -ForegroundColor Yellow
Write-Host "  2. npm run dev" -ForegroundColor Yellow
Write-Host "  3. Go to http://localhost:3000" -ForegroundColor Yellow
Write-Host "  4. Test: Extract brand (google.com) → Generate image (coffee)" -ForegroundColor Yellow
Write-Host ""
Write-Host "If image generation still fails:" -ForegroundColor Red
Write-Host "  - Check browser console (F12) for error messages" -ForegroundColor Red
Write-Host "  - Verify APIs are enabled: gcloud services enable aiplatform.googleapis.com" -ForegroundColor Red
Write-Host ""
Read-Host "Press Enter to continue"
