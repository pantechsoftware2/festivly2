/**
 * Component: Brand Onboarding Modal
 * Shows for logged-in users who don't have industry_type or brand_logo_url
 * Collects business industry and optional logo upload
 */

'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'

const INDUSTRY_OPTIONS = [
  'Education',
  'Real Estate',
  'Tech & Startup',
  'Manufacturing',
  'Retail & Fashion',
  'Food & Cafe'
]

const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
]

interface BrandOnboardingModalProps {
  isOpen: boolean
  userId: string
  userEmail: string | null
  onComplete: () => void
}

export function BrandOnboardingModal({
  isOpen,
  userId,
  userEmail,
  onComplete,
}: BrandOnboardingModalProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [brandStyleContext, setBrandStyleContext] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showBrandAnalysis, setShowBrandAnalysis] = useState(false)
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      setError('Unsupported file type. Please upload a JPEG, PNG, GIF, WebP, SVG, or TIFF image.')
      return
    }

    // Validate file size (10MB max)
    const maxSizeInBytes = 10 * 1024 * 1024
    if (file.size > maxSizeInBytes) {
      setError('File size exceeds 10MB. Please upload a smaller image.')
      return
    }

    setLogoFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const analyzeBrand = async (logoUrl: string) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      console.log('🔍 Analyzing brand with logo:', logoUrl)
      
      const response = await fetch('/api/analyze-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image: logoUrl,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to analyze brand')
      }

      const data = await response.json()
      console.log('✅ Brand analysis complete:', data)

      if (data.styleDescription) {
        setBrandStyleContext(data.styleDescription)
        setShowBrandAnalysis(true)
      } else {
        console.warn('⚠️ No styleDescription in response')
      }
    } catch (err: any) {
      console.error('❌ Brand analysis failed:', err)
      setError(`Brand analysis failed: ${err.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const uploadLogoToSupabase = async (): Promise<string | null> => {
    if (!logoFile) return null

    const supabase = createClient()
    setUploadProgress('Uploading logo...')

    try {
      // Generate a unique filename
      const timestamp = Date.now()
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${userId}_${timestamp}.${fileExt}`
      const filePath = `${fileName}`

      console.log('📤 Uploading logo to Supabase storage:', filePath)

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Logo upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      console.log('✅ Logo uploaded successfully:', uploadData)

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(filePath)

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded logo')
      }

      console.log('🔗 Public URL generated:', urlData.publicUrl)
      setUploadProgress(null)
      setUploadedLogoUrl(urlData.publicUrl)
      return urlData.publicUrl

    } catch (err: any) {
      console.error('❌ Logo upload failed:', err)
      setUploadProgress(null)
      throw err
    }
  }

  const handleAnalyzeBrand = async () => {
    if (!logoFile) {
      setError('Please upload a logo first to analyze your brand')
      return
    }

    if (!selectedIndustry) {
      setError('Please select your business industry first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First upload the logo
      const logoUrl = await uploadLogoToSupabase()
      
      if (logoUrl) {
        // Then analyze the brand
        await analyzeBrand(logoUrl)
      }
    } catch (err: any) {
      console.error('❌ Error analyzing brand:', err)
      setError(err.message || 'Failed to analyze brand. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    console.log('🔍 DEBUG handleSave called with state:', {
      selectedIndustry,
      logoFile: !!logoFile,
      logoPreview: !!logoPreview,
      uploadedLogoUrl,
      brandStyleContext,
      userId,
      userEmail,
    })

    if (!selectedIndustry) {
      console.error('❌ No industry selected!')
      setError('Please select your business industry')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Upload logo if provided (and not already uploaded during analysis)
      let logoUrl: string | null = uploadedLogoUrl
      if (logoFile && !uploadedLogoUrl) {
        console.log('📤 Uploading logo before save...')
        logoUrl = await uploadLogoToSupabase()
        console.log('✅ Logo uploaded, URL:', logoUrl)
      }

      setUploadProgress('Saving profile...')

      const profileData = {
        id: userId,
        email: userEmail,
        industry_type: selectedIndustry,
        brand_logo_url: logoUrl,
        brand_style_context: brandStyleContext || null,
      }

      console.log('📝 Sending profile data to API:', profileData)

      // Update profile in database
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('❌ API error response:', data)
        throw new Error(data.error || 'Failed to save profile')
      }

      const data = await response.json()
      console.log('✅ Profile saved successfully:', data)
      console.log('✅ Returned profile data:', {
        id: data.profile?.id,
        industry_type: data.profile?.industry_type,
        brand_logo_url: data.profile?.brand_logo_url,
        brand_style_context: data.profile?.brand_style_context,
      })

      setUploadProgress(null)
      
      // Call completion callback
      onComplete()
    } catch (err: any) {
      console.error('❌ Error saving profile:', err)
      setError(err.message || 'Failed to save profile. Please try again.')
      setUploadProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <Card className="bg-white text-black p-4 sm:p-6 md:p-8 w-full max-w-sm sm:max-w-md md:max-w-lg shadow-2xl my-4">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome to Festivly! 🎉</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          Let's set up your brand profile to create personalized festival posts.
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 sm:p-3 rounded-lg mb-4 text-xs sm:text-sm border border-red-200">
            {error}
          </div>
        )}

        {uploadProgress && (
          <div className="bg-blue-100 text-blue-700 p-2 sm:p-3 rounded-lg mb-4 text-xs sm:text-sm border border-blue-200">
            {uploadProgress}
          </div>
        )}

        {/* Industry Selection */}
        <div className="mb-6">
          <label className="block text-xs sm:text-sm font-semibold mb-3">
            Business Industry <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INDUSTRY_OPTIONS.map((industry) => (
              <button
                key={industry}
                type="button"
                onClick={() => setSelectedIndustry(industry)}
                disabled={loading}
                className={`p-2 sm:p-3 text-left rounded-lg border-2 transition-all text-xs sm:text-sm font-medium ${
                  selectedIndustry === industry
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {industry}
              </button>
            ))}
          </div>
        </div>

        {/* Logo Upload */}
        <div className="mb-6">
          <label className="block text-xs sm:text-sm font-semibold mb-3">
            Business Logo <span className="text-gray-400">(Optional)</span>
          </label>
          
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_MIME_TYPES.join(',')}
            onChange={handleFileSelect}
            disabled={loading}
            className="hidden"
          />

          {logoPreview ? (
            <div className="relative border-2 border-gray-200 rounded-lg p-3 sm:p-4">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="max-h-24 sm:max-h-32 mx-auto object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setLogoFile(null)
                  setLogoPreview(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                disabled={loading}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs sm:text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={loading}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 hover:border-blue-400 hover:bg-blue-50 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-gray-500">
                <svg
                  className="mx-auto h-10 sm:h-12 w-10 sm:w-12 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-xs sm:text-sm font-medium">Click to upload logo</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
              </div>
            </button>
          )}
        </div>

        {/* Brand Analysis Section */}
        {logoFile && selectedIndustry && !showBrandAnalysis && (
          <div className="mb-6">
            <Button
              onClick={handleAnalyzeBrand}
              disabled={loading || isAnalyzing}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? 'Analyzing Brand...' : '✨ Analyze My Brand (Optional)'}
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              AI will analyze your logo and generate a brand style description
            </p>
          </div>
        )}

        {/* Brand Style Context Editor */}
        {showBrandAnalysis && (
          <div className="mb-6">
            <label className="block text-xs sm:text-sm font-semibold mb-2">
              Brand Style Description
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Edit this description to better match your brand identity. This will help personalize your creatives.
            </p>
            <textarea
              value={brandStyleContext}
              onChange={(e) => setBrandStyleContext(e.target.value)}
              disabled={loading}
              className="w-full border-2 border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm font-mono min-h-[100px] sm:min-h-[120px] focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Your brand style description will appear here..."
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-3">
          <Button
            onClick={handleSave}
            disabled={loading || !selectedIndustry}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-3 sm:mt-4 text-center">
          You can update these settings later from your profile settings.
        </p>
      </Card>
    </div>
  )
}
