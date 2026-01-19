'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'

const INDUSTRY_OPTIONS = [
  'Education',
  'Real Estate',
  'Tech & Startup',
  'Manufacturing',
  'Retail & Fashion',
  'Food & Cafe'
]

// Supported MIME types by Supabase Storage
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
  'image/bmp'
]

// Convert unsupported formats to JPEG
const convertImageIfNeeded = async (file: File): Promise<File> => {
  if (SUPPORTED_MIME_TYPES.includes(file.type)) {
    return file
  }

  // For unsupported formats (like AVIF), convert to JPEG
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image'))
              return
            }
            const newFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '.jpg'),
              { type: 'image/jpeg' }
            )
            resolve(newFile)
          },
          'image/jpeg',
          0.9
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export default function SignUp() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}

function SignUpContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [industryType, setIndustryType] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  let prompt = searchParams.get('prompt')
  
  // If no prompt in URL, check sessionStorage (for users returning from Google Sign-In)
  if (!prompt && typeof window !== 'undefined') {
    prompt = sessionStorage.getItem('pending_prompt')
  }
  
  const { signUpWithEmail, signInWithGoogle, user, loading: authLoading } = useAuth()
  // Memoize createClient to prevent multiple instances
  const supabase = useMemo(() => createClient(), [])

  // Auto-redirect if already logged in (but not during signup process)
  useEffect(() => {
    if (!authLoading && user && !loading) {
      router.push('/')
    }
  }, [user, authLoading, router, loading])

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo file must be less than 5MB')
        return
      }
      
      // Convert unsupported formats to JPEG and create preview
      convertImageIfNeeded(file).then((convertedFile) => {
        setLogoFile(convertedFile)
        setError(null)
        // Create preview using a Promise-based FileReader to ensure it completes
        new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            resolve(result)
          }
          reader.onerror = () => {
            console.error('Failed to read file for preview')
            resolve('') // Resolve with empty string on error
          }
          reader.readAsDataURL(convertedFile)
        }).then((preview) => {
          if (preview) {
            setLogoPreview(preview)
            console.log('✅ Logo preview set successfully')
          }
        })
      }).catch((err) => {
        setError(`Failed to process image: ${err.message}`)
        console.error('Image processing error:', err)
      })
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!industryType) {
      setError('Please select your business industry')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Sign up user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('User creation failed')

      const userId = authData.user.id

      // Upload logo if provided
      let logoUrl: string | null = null
      if (logoFile) {
        try {
          // Use signup API endpoint (uses service role key, bypasses RLS)
          const formData = new FormData()
          formData.append('logo', logoFile)
          formData.append('userId', userId)

          console.log('📤 Uploading logo for user:', userId, 'File:', logoFile.name, 'Size:', logoFile.size)

          const response = await fetch('/api/signup/upload-logo', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error('❌ Logo upload failed:', errorData)
            setError(`Logo upload failed: ${errorData.error}. Continuing with signup.`)
            // Don't throw - continue with signup
          } else {
            const uploadResult = await response.json()
            logoUrl = uploadResult.logoUrl
            console.log('✅ Logo uploaded successfully:', logoUrl)
          }
        } catch (logoError: any) {
          console.error('❌ Logo upload error:', logoError.message)
          setError(`Logo upload error: ${logoError.message}. Continuing with signup.`)
          // Don't throw - continue with signup even if logo upload fails
        }
      }

      // Update user profile with industry and logo using API endpoint
      try {
        console.log('💾 Saving profile with logo URL:', logoUrl)
        const profileResponse = await fetch('/api/profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: userId,
            email: email,
            industry_type: industryType || null,  // Explicit null if empty
            brand_logo_url: logoUrl || null,  // Explicit null if upload failed
            subscription_plan: 'free', // CRITICAL: Default for new signups
            free_images_generated: 0,  // CRITICAL: Initialize counter
          }),
        })

        if (!profileResponse.ok) {
          const profileError = await profileResponse.json()
          console.error('❌ Profile save error:', profileError)
          throw new Error(profileError.error || 'Failed to save profile')
        }

        const profileResult = await profileResponse.json()
        console.log('✅ Profile saved successfully:', profileResult)
      } catch (profileError: any) {
        throw new Error(profileError.message || 'Failed to save profile')
      }

      // After signup, redirect to dashboard
      if (prompt) {
        sessionStorage.removeItem('pending_prompt')
        router.push(`/editor?prompt=${encodeURIComponent(prompt)}`)
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      const message = err?.message ?? 'Signup failed'
      
      // Check if user already exists
      if (message.includes('User already registered') || message.includes('already exists')) {
        // Redirect to login with message
        router.push(`/login?signup=exists&email=${encodeURIComponent(email)}`)
        return
      }
      
      // Check if it's a schema/table error
      if (message.includes('could not find the table') || message.includes('profiles')) {
        setError('Database setup required. Please check documentation and run: setup-profiles-table.sql')
      } else if (message.includes('RLS')) {
        setError('Storage access error. Please check Supabase storage RLS settings.')
      } else {
        setError(message)
      }
      
      console.error('Signup error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 pt-24 sm:pt-20">
      <Card className="w-full max-w-sm sm:max-w-md bg-white border-0 shadow-lg">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-1 sm:mb-2">Create Account</h1>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Sign up to start designing</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="bg-gray-50 border-gray-300 text-black placeholder-gray-400 text-sm sm:text-base"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Password
              </label>
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="bg-gray-50 border-gray-300 text-black placeholder-gray-400 text-sm sm:text-base"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Your Business Category *
              </label>
              <select
                value={industryType || ''}
                onChange={(e) => setIndustryType(e.target.value || null)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2 bg-gray-50 border border-gray-300 rounded-lg text-black text-sm sm:text-base placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                required
              >
                <option value="">-- Select Industry --</option>
                {INDUSTRY_OPTIONS.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Upload Your Logo (Optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoSelect}
                className="hidden"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 sm:px-4 py-2 sm:py-2 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 text-sm sm:text-base hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {logoFile ? `✓ Logo selected: ${logoFile.name}` : '📷 Choose Logo (PNG, JPG)'}
              </button>
              {logoPreview && (
                <div className="mt-2 sm:mt-3 flex justify-center">
                  <img src={logoPreview} alt="Logo preview" className="h-16 sm:h-20 object-contain" />
                </div>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full bg-black hover:bg-gray-900 text-white font-semibold py-2 text-sm sm:text-base" 
              disabled={loading}
            >
              {loading ? 'Creating Account...' : '✨ Sign Up'}
            </Button>
          </form>



          <div className="relative mb-4 sm:mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <Button
            onClick={async () => {
              if (!industryType) {
                setError('Please select your business industry before signing in with Google')
                return
              }
              try {
                setLoading(true)
                setError(null)
                // Store industry in sessionStorage for after Google Sign-In callback
                if (typeof window !== 'undefined') {
                  console.log('🔐 Google signup: Storing pending data in sessionStorage')
                  sessionStorage.setItem('pending_industry', industryType)
                  console.log('✅ Industry stored:', industryType)
                  // Mark this as a new signup (not an existing user login)
                  sessionStorage.setItem('is_new_signup', 'true')
                  
                  // Also store logo file as base64 if selected
                  if (logoFile) {
                    console.log('📷 Google signup: Converting logo to base64 before OAuth...')
                    // IMPORTANT: Wait for FileReader to complete before redirecting!
                    await new Promise<void>((resolve) => {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        const base64 = reader.result as string
                        sessionStorage.setItem('pending_logo_base64', base64)
                        sessionStorage.setItem('pending_logo_name', logoFile.name)
                        sessionStorage.setItem('pending_logo_type', logoFile.type)
                        console.log('✅ Logo converted and stored in sessionStorage')
                        resolve()
                      }
                      reader.onerror = () => {
                        console.error('❌ FileReader error')
                        resolve() // Continue anyway
                      }
                      reader.readAsDataURL(logoFile)
                    })
                  } else {
                    console.log('⚠️ No logo file selected for Google signup')
                  }
                }
                console.log('🔑 Initiating Google Sign-In...')
                await signInWithGoogle()
              } catch (err: any) {
                // Check if it's user already registered error
                const errorMsg = err?.message ?? 'Failed to sign in with Google'
                console.error('❌ Google signup error:', errorMsg)
                if (errorMsg.includes('User already registered') || errorMsg.includes('already exists')) {
                  setError('Account already exists! Please sign in instead.')
                } else {
                  setError(errorMsg)
                }
                setLoading(false)
              }
            }}
            variant="outline"
            className="w-full border-gray-300 text-black hover:bg-gray-50 font-semibold py-2 flex items-center justify-center gap-2 text-sm sm:text-base"
            disabled={loading}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="hidden sm:inline">Continue with Google</span>
            <span className="sm:hidden">Google</span>
          </Button>

          <p className="text-center text-gray-600 mt-4 sm:mt-6 text-xs sm:text-sm">
            Already have an account?{' '}
            <a href="/login" className="text-black hover:underline font-semibold">
              Sign In
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}