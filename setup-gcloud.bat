@echo off
REM Google Cloud Authentication Setup Script
REM Run this in PowerShell as Administrator

echo ========================================
echo Google Cloud SDK Setup for Vertex AI
echo ========================================
echo.

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Google Cloud SDK not found
    echo.
    echo Installing Google Cloud SDK...
    echo.
    
    REM Download SDK
    powershell -Command "(New-Object System.Net.WebClient).DownloadFile('https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe', 'GoogleCloudSDKInstaller.exe')"
    
    REM Run installer
    echo.
    echo [*] Running installer... (please complete the GUI installation)
    GoogleCloudSDKInstaller.exe
    
    REM Clean up
    del GoogleCloudSDKInstaller.exe
    
    echo [!] Please restart PowerShell after installation completes
    pause
    exit /b
) else (
    echo [✓] Google Cloud SDK found
    gcloud --version
    echo.
)

REM Check authentication
echo [*] Checking Google Cloud authentication...
gcloud auth application-default print-access-token >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Not authenticated
    echo.
    echo [*] Opening Google Cloud login...
    gcloud auth application-default login
    if %ERRORLEVEL% NEQ 0 (
        echo [!] Authentication failed
        pause
        exit /b 1
    )
) else (
    echo [✓] Already authenticated
)

REM Verify project
echo.
echo [*] Verifying Google Cloud project...
for /f "delims=" %%i in ('gcloud config get-value project') do set PROJECT=%%i
if "%PROJECT%"=="" (
    echo [!] No project set
    echo [*] Setting project to: ai-image-editor-483505
    gcloud config set project ai-image-editor-483505
) else (
    echo [✓] Current project: %PROJECT%
)

echo.
echo ========================================
echo [✓] Setup Complete!
echo ========================================
echo.
echo Your .env.local is configured with:
echo   - GOOGLE_CLOUD_PROJECT_ID=ai-image-editor-483505
echo   - GOOGLE_CLOUD_REGION=us-central1
echo.
echo Next steps:
echo   1. cd c:\Users\pante\Downloads\ai-image-editor
echo   2. npm run dev
echo   3. Go to http://localhost:3000
echo   4. Test image generation with "coffee" prompt
echo.
pause
