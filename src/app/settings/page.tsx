'use client'

export const dynamic = 'force-dynamic'

import { Header } from '@/components/header'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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

interface BrandSettings {
  brand_logo_url: string | null
  industry_type: string
}

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [settings, setSettings] = useState<BrandSettings>({
    brand_logo_url: null,
    industry_type: 'Education',
  })
  const [selectedIndustry, setSelectedIndustry] = useState<string>('Education')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (!loading && user) {
      // Load user profile with brand settings
      const loadProfile = async () => {
        try {
          const response = await fetch(`/api/profiles/${user.id}`)
          if (response.ok) {
            const profile = await response.json()
            setSettings({
              brand_logo_url: profile.brand_logo_url || null,
              industry_type: profile.industry_type || 'Education',
            })
            if (profile.brand_logo_url) {
              setLogoPreview(profile.brand_logo_url)
            }
          }
        } catch (error) {
          console.error('Failed to load profile:', error)
        }
      }
      loadProfile()
    }
  }, [user, loading, router])

  useEffect(() => {
    if (settings.industry_type) {
      setSelectedIndustry(settings.industry_type)
    }
  }, [settings.industry_type])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    try {
      setUploading(true)
      // Convert unsupported formats to JPEG
      const convertedFile = await convertImageIfNeeded(file)
      setLogoFile(convertedFile)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(convertedFile)
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(`Failed to process image: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    alert('Logo and industry type are set during signup and cannot be changed.')
  }

  const handleSaveLogo = async () => {
    try {
      if (!user?.id) {
        throw new Error('User not found')
      }

      if (!logoFile) {
        alert('Please select a logo file first')
        return
      }

      setSaving(true)

      const supabase = createClient()
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in again.')
      }

      const formData = new FormData()
      formData.append('logo', logoFile)

      const response = await fetch('/api/auth/upload-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      
      // API already updated Supabase, just update local state with the returned URL
      setSettings(prev => ({
        ...prev,
        brand_logo_url: result.logoUrl,
      }))
      
      setLogoFile(null)
      setLogoPreview(null)
      alert('Logo saved successfully!')
    } catch (error: any) {
      console.error('Failed to save logo:', error)
      alert(error.message || 'Failed to save logo. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateIndustryType = async (industry: string) => {
    try {
      if (!user?.id) {
        throw new Error('User not found')
      }

      const supabase = createClient()

      const { error } = await supabase
        .from('profiles')
        .update({
          industry_type: industry,
        })
        .match({ id: user.id })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Update local state
      setSettings(prev => ({
        ...prev,
        industry_type: industry,
      }))
    } catch (error: any) {
      console.error('Failed to update industry type:', error)
      alert('Failed to update industry type. Please try again.')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <Header />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
            <p className="text-purple-200/70">Customize your brand profile and generation preferences</p>
          </div>

          {/* Brand Profile */}
          <Card className="bg-slate-800/50 border-purple-500/30 p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">Brand Profile</h2>
            
            <div className="space-y-6">
              {/* Brand Logo */}
              <div>
                <label className="block text-sm font-semibold text-purple-200 mb-2">
                  Brand Logo
                </label>
                {logoPreview && (
                  <div className="mb-4">
                    <img 
                      src={logoPreview} 
                      alt="Brand logo preview" 
                      className="h-24 w-24 object-contain rounded-lg border border-purple-500/30 p-2"
                    />
                  </div>
                )}
                {!logoPreview && settings.brand_logo_url && (
                  <div className="mb-4">
                    <img 
                      src={settings.brand_logo_url} 
                      alt="Current brand logo" 
                      className="h-24 w-24 object-contain rounded-lg border border-purple-500/30 p-2"
                    />
                  </div>
                )}
                {!logoPreview && !settings.brand_logo_url && (
                  <p className="text-sm text-purple-200/70 mb-4">No logo set</p>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 disabled:opacity-50"
                />
                <p className="text-xs text-purple-200/50 mt-2">PNG, JPG or other image formats, max 5MB. Will appear as watermark on generated images.</p>
              </div>

              {/* Industry Type */}
              <div>
                <label className="block text-sm font-semibold text-purple-200 mb-2">
                  Industry Type
                </label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => {
                    const newIndustry = e.target.value
                    setSelectedIndustry(newIndustry)
                    updateIndustryType(newIndustry)
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-purple-500/30 text-white focus:outline-none focus:border-purple-500"
                >
                  {INDUSTRY_OPTIONS.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-purple-200/50 mt-2">Select your business industry for better AI generation</p>
              </div>
            </div>
          </Card>
          {/* Account */}
          <Card className="bg-slate-800/50 border-purple-500/30 p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Account Information</h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-purple-200/70">Email Address</p>
                <p className="text-white font-semibold">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-purple-200/70">Member Since</p>
                <p className="text-white font-semibold">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex gap-3">
            {logoFile && (
              <Button
                onClick={handleSaveLogo}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Logo'}
              </Button>
            )}
            <Button
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
