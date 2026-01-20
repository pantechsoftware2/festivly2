'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { checkImageLimit } from '@/lib/image-limit'
import { createClient } from '@/lib/supabase'
import { FaWhatsapp, FaInstagram } from "react-icons/fa";


interface GeneratedImage {
  id: string
  url: string
  storagePath: string
  createdAt: string
}

interface Result {
  images: GeneratedImage[]
  eventName: string
  industry: string
  prompt: string
  brandLogoUrl?: string
}

export default function ResultPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [userLogo, setUserLogo] = useState<string | null>(null)
  const [imagesWithLogo, setImagesWithLogo] = useState<Record<string, string>>({})
  const [logoPosition, setLogoPosition] = useState<'left' | 'right'>('right')
  const [testOverlay, setTestOverlay] = useState(false)
  const [copiedCaption, setCopiedCaption] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Redirect to home if no images or only placeholder images (quota error)
  useEffect(() => {
    if (!loading && (!result || !result.images || result.images.length === 0)) {
      router.push('/home')
    }
  }, [result, loading, router])

  // DISABLED: Attempt counting removed - all users get unlimited free generations
  // useEffect(() => {
  //   if (!user?.id) return
  //   const incrementCount = async () => {
  //     try {
  //       const supabase = createClient()
  //       const limitInfo = await checkImageLimit(user.id, supabase)
  //       if (limitInfo.subscription === 'free') {
  //         console.log(`✅ Image generation recorded. Total: ${limitInfo.imagesGenerated}/1`)
  //       }
  //     } catch (err) {
  //       console.error('Error checking image count:', err)
  //     }
  //   }
  //   incrementCount()
  // }, [user?.id, result])

  // Default anonymous logo URL for users without custom logo
  const DEFAULT_LOGO_URL = 'https://adzndcsprxemlpgvcmsg.supabase.co/storage/v1/object/public/brand-logos/default-logo.png'

  // Fetch user logo and overlay it on images
  useEffect(() => {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🏷️ LOGO FETCHING PROCESS STARTED`)
    console.log(`${'='.repeat(60)}`)
    
    let resultData: Result | null = null
    const stored = sessionStorage.getItem('generatedResult')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        resultData = data
        setResult(data)
        // Also save to localStorage for persistence when returning from projects
        localStorage.setItem('lastGeneratedResult', JSON.stringify(data))
        console.log('📊 Result loaded from sessionStorage:', { 
          hasImages: !!data?.images?.length,
          hasBrandLogo: !!data?.brandLogoUrl,
          brandLogoUrl: data?.brandLogoUrl?.substring(0, 80) || 'UNDEFINED'
        })
      } catch (err) {
        console.error('❌ Failed to parse result from sessionStorage:', err)
        // Try loading from localStorage if sessionStorage fails
        const lastResult = localStorage.getItem('lastGeneratedResult')
        if (lastResult) {
          try {
            resultData = JSON.parse(lastResult)
            setResult(resultData)
            console.log('📊 Result loaded from localStorage (fallback)')
          } catch (e) {
            console.error('❌ Failed to parse last result:', e)
          }
        }
      }
    } else {
      // If no session storage, try to load from localStorage (user returned from projects)
      const lastResult = localStorage.getItem('lastGeneratedResult')
      if (lastResult) {
        try {
          resultData = JSON.parse(lastResult)
          setResult(resultData)
          console.log('📊 Result loaded from localStorage:', { 
            hasImages: !!resultData?.images?.length,
            hasBrandLogo: !!resultData?.brandLogoUrl,
          })
        } catch (e) {
          console.error('❌ Failed to parse last result:', e)
        }
      }
    }
    setLoading(false)

    // Use logo from API response first, fallback to user profile
    const logoFromResult = resultData?.brandLogoUrl
    console.log(`\n📌 Step 1: Checking for brandLogoUrl in result data`)
    console.log(`   - Field exists: ${'brandLogoUrl' in (resultData || {})}`)
    console.log(`   - Value: ${logoFromResult || 'UNDEFINED'}`)
    console.log(`   - Type: ${typeof logoFromResult}`)
    console.log(`   - Length: ${logoFromResult?.length || 0} chars`)
    
    if (logoFromResult && logoFromResult.length > 10 && (logoFromResult.startsWith('http://') || logoFromResult.startsWith('https://'))) {
      const trimmedLogo = logoFromResult.trim()
      console.log(`\n✅ SUCCESS: Logo found in API response!`)
      console.log(`   URL: ${trimmedLogo.substring(0, 100)}...`)
      console.log(`${'='.repeat(60)}\n`)
      setUserLogo(trimmedLogo)
      return
    }

    console.log(`\n⚠️ No valid logo in API response. Fetching from profile API...`)

    // Fetch user's logo from profile as fallback
    if (user?.id) {
      const fetchUserLogoEagerly = async () => {
        const cacheKey = `logo_${user.id}`
        console.log(`\n📌 Step 2: Attempting to fetch logo from profile API`)
        console.log(`   - User ID: ${user.id}`)
        console.log(`   - Cache key: ${cacheKey}`)
        
        // Check cache immediately (5 minute TTL)
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          try {
            const { url, timestamp } = JSON.parse(cached)
            const age = Date.now() - timestamp
            console.log(`   📦 Cache found (age: ${(age / 1000).toFixed(0)}s)`)
            if (age < 5 * 60 * 1000) {
              if (url && typeof url === 'string' && url.length > 10) {
                console.log(`   ✅ Using cached logo: ${url.substring(0, 100)}...`)
                console.log(`${'='.repeat(60)}\n`)
                setUserLogo(url)
              }
              return // Don't fetch if cache is fresh
            } else {
              console.log(`   ⏰ Cache expired, fetching fresh data...`)
            }
          } catch (e) {
            console.warn(`   ⚠️ Cache parse error, clearing cache`)
            localStorage.removeItem(cacheKey)
          }
        } else {
          console.log(`   📭 No cache found, fetching fresh data...`)
        }

        // Fetch fresh logo with timeout
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
          
          console.log(`   🔄 Fetching from /api/profiles/${user.id}...`)
          const res = await fetch(`/api/profiles/${user.id}`, { signal: controller.signal })
          clearTimeout(timeoutId)
          
          if (!res.ok) {
            console.warn(`   ❌ Profile API error: HTTP ${res.status}`)
            return
          }
          
          const data = await res.json()
          console.log(`   📥 Profile API response received`)
          console.log(`      - Has logo field: ${!!data?.brand_logo_url}`)
          console.log(`      - Logo length: ${data?.brand_logo_url?.length || 0} chars`)
          
          if (!data?.brand_logo_url) {
            console.warn(`   ⚠️ No brand_logo_url in profile`)
            console.log(`${'='.repeat(60)}\n`)
            return
          }
          
          const url = (data.brand_logo_url as string).trim()
          console.log(`   📋 Logo URL from profile: ${url.substring(0, 100)}...`)
          
          // Validate the URL before using it
          if (url.length > 10 && (url.startsWith('http://') || url.startsWith('https://'))) {
            console.log(`   ✅ URL is valid!`)
            // Cache valid logo
            try {
              localStorage.setItem(cacheKey, JSON.stringify({
                url,
                timestamp: Date.now(),
              }))
              console.log(`   💾 Cached for future use`)
            } catch (e) {
              console.warn(`   ⚠️ Cache save failed (localStorage full?)`)
            }
            setUserLogo(url)
            console.log(`   ✅ Logo set successfully`)
            console.log(`${'='.repeat(60)}\n`)
          } else {
            console.warn(`   ❌ Invalid URL format:`)
            console.warn(`      - Length: ${url.length}`)
            console.warn(`      - Starts with http: ${url.startsWith('http')}`)
            console.log(`${'='.repeat(60)}\n`)
          }
        } catch (err) {
          if (err instanceof Error) {
            if (err.name === 'AbortError') {
              console.warn(`   ⏱️ Profile fetch timeout (5s)`)
            } else {
              console.warn(`   ❌ Profile fetch error: ${err.message}`)
            }
          }
          console.log(`${'='.repeat(60)}\n`)
        }
      }
      
      // Start fetching immediately (don't wait for anything)
      fetchUserLogoEagerly()
    } else {
      console.warn(`   ❌ No user ID available`)
      console.log(`${'='.repeat(60)}\n`)
      setUserLogo(null)
    }
  }, [user, authLoading])

  // Apply logo overlay to images - SIMPLIFIED AND DIRECT
  useEffect(() => {
    if (!result?.images || result.images.length === 0) {
      console.log('No images to overlay')
      setImagesWithLogo({})
      return
    }

    const applyLogoToImage = async (imageUrl: string, logoUrl: string | null, imageId: string) => {
      try {
        console.log(`\n🎨 Processing image ${imageId}`)
        
        // Load main image with proper CORS
        const mainImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.referrerPolicy = 'no-referrer'
          const timeout = setTimeout(() => reject(new Error('timeout')), 30000)
          img.onload = () => { clearTimeout(timeout); resolve(img) }
          img.onerror = () => { clearTimeout(timeout); reject(new Error('load failed')) }
          img.src = imageUrl
        })

        console.log(`✅ Image loaded: ${mainImg.width}x${mainImg.height}`)

        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = mainImg.width
        canvas.height = mainImg.height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('No canvas context')

        // Draw main image
        ctx.drawImage(mainImg, 0, 0)
        console.log(`✅ Canvas created and image drawn`)

        // Draw test overlay if enabled (red square in corner for debugging)
        if (testOverlay) {
          console.log(`🧪 Test overlay enabled - drawing red square`)
          ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
          ctx.fillRect(canvas.width - 60, canvas.height - 60, 50, 50)
        }

        // Draw logo if available
        if (logoUrl && typeof logoUrl === 'string' && logoUrl.length > 10 && logoUrl.startsWith('http')) {
          try {
            console.log(`🏷️ Loading logo from: ${logoUrl.substring(0, 60)}...`)
            
            const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image()
              img.crossOrigin = 'anonymous'
              img.referrerPolicy = 'no-referrer'
              const timeout = setTimeout(() => reject(new Error('timeout')), 20000)
              img.onload = () => { clearTimeout(timeout); resolve(img) }
              img.onerror = () => { clearTimeout(timeout); reject(new Error('load failed')) }
              img.src = logoUrl
            })

            console.log(`✅ Logo loaded: ${logoImg.width}x${logoImg.height}`)

            // Calculate logo size maintaining aspect ratio
            const MAX_WIDTH = 200
            const MAX_HEIGHT = 150
            const padding = 20  // 20px padding from edges
            
            const originalW = logoImg.width
            const originalH = logoImg.height

            // Scale factor that fits BOTH constraints
            const scale = Math.min(
              MAX_WIDTH / originalW,
              MAX_HEIGHT / originalH,
              1 // never upscale small logos
            )

            const logoW = Math.round(originalW * scale)
            const logoH = Math.round(originalH * scale)
            
            console.log(`📐 Logo resized safely: ${originalW}x${originalH} → ${logoW}x${logoH}`)

            // Position logo in bottom-right corner with 20px padding
            let logoX: number
            let logoY: number

            if (logoPosition === 'left') {
              // Left corner: 20px from left edge
              logoX = padding
            } else {
              // Right corner: 20px from right edge
              logoX = canvas.width - logoW - padding
            }

            // Bottom corner: 20px from bottom edge
            logoY = canvas.height - logoH - padding

            // Ensure logo doesn't go off-screen (failsafe)
            logoX = Math.max(0, Math.min(logoX, canvas.width - logoW))
            logoY = Math.max(0, Math.min(logoY, canvas.height - logoH))

            console.log(`📍 Position: (${logoX.toFixed(0)}, ${logoY.toFixed(0)}), Size: ${logoW.toFixed(0)}x${logoH.toFixed(0)} - 100% VISIBLE`)

            // Draw logo directly on canvas
            ctx.drawImage(logoImg, logoX, logoY, logoW, logoH)
            console.log(`✅ Logo drawn on canvas (size: ${logoW}x${logoH}) - 100% VISIBLE`)
          } catch (err) {
            console.warn(`⚠️ Logo load failed, showing image without logo: ${err}`)
          }
        } else {
          console.log(`⚠️ No logo URL provided`)
        }

        // Convert canvas to blob (handles cross-origin images better than toDataURL)
        const finalUrl = await new Promise<string>((resolve, reject) => {
          try {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  console.warn(`⚠️ toBlob returned null, falling back to toDataURL`)
                  // Fallback to toDataURL
                  try {
                    const dataUrl = canvas.toDataURL('image/png', 0.9)
                    resolve(dataUrl)
                  } catch (e) {
                    console.warn(`⚠️ toDataURL also failed: ${e}`)
                    resolve(imageUrl) // Use original image
                  }
                  return
                }
                const url = URL.createObjectURL(blob)
                console.log(`✅ Blob created: ${(blob.size / 1024).toFixed(2)}KB`)
                resolve(url)
              },
              'image/png',
              0.9
            )
          } catch (e) {
            console.warn(`⚠️ toBlob error: ${e}, using original image`)
            resolve(imageUrl)
          }
        })

        setImagesWithLogo(prev => ({ ...prev, [imageId]: finalUrl }))
        console.log(`✅ Image ${imageId} complete - stored in state`)
      } catch (err) {
        console.error(`❌ Error processing image ${imageId}:`, err)
        console.warn(`⚠️ Falling back to original image without logo overlay`)
        // Show original image if overlay fails
        setImagesWithLogo(prev => ({ ...prev, [imageId]: imageUrl }))
      }
    }

    // Process ALL 4 images in parallel for faster results
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🎨 OVERLAY: Processing ${result.images.length} images for user (PARALLEL)`)
    console.log(`📌 Logo available: ${!!userLogo}`)
    console.log(`📍 Logo position: ${logoPosition}`)
    console.log(`🧪 Test mode: ${testOverlay}`)
    console.log(`${'='.repeat(60)}`)

    // Apply overlay to ALL images in parallel
    const overlayPromises = result.images.map((img, idx) => {
      console.log(`⏳ Starting image ${idx + 1}/4 (${img.id})`)
      return applyLogoToImage(img.url, userLogo || null, img.id)
    })
    
    // Wait for all to complete (but don't fail on individual errors)
    Promise.allSettled(overlayPromises).then((results) => {
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      console.log(`✅ Overlay processing complete: ${succeeded} succeeded, ${failed} fell back to original`)
    })
  }, [userLogo, result, logoPosition, testOverlay])

  const handleDownloadImage = async (imageUrl: string, imageId: string, index: number) => {
    try {
      setDownloading(true)
      const finalUrl = imagesWithLogo[imageId] || imageUrl

      let blob: Blob

      if (finalUrl.startsWith('data:')) {
        // Convert data URL to blob
        const parts = finalUrl.split(',') 
        const match = parts[0].match(/:(.*?);/)
        const mime = match ? match[1] : 'image/png'
        const bstr = atob(parts[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) u8arr[n] = bstr.charCodeAt(n)
        blob = new Blob([u8arr], { type: mime })
      } else {
        const response = await fetch(finalUrl)
        if (!response.ok) throw new Error('Failed to fetch image')
        blob = await response.blob()
      }

      const url = window.URL.createObjectURL(blob)
      const mimeType = blob.type || 'image/png'
      const ext = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png'
      const link = document.createElement('a')
      link.href = url
      // Format: [Event_Name]_Festivly.jpg (remove spaces and special chars)
      const eventNameFormatted = (result?.eventName || 'image').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      link.download = `${eventNameFormatted}_Festivly.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const generateCaption = (): string => {
    if (!result) return ''
    const eventName = result.eventName
    const industry = result.industry
    const eventHashtag = eventName.replace(/\s+/g, '')
    const industryHashtag = industry.replace(/\s+/g, '')
    return `Happy ${eventName}! Wishing you joy and success. #${eventHashtag} #${industryHashtag}`
  }

  const handleCopyCaption = async () => {
    const caption = generateCaption()
    try {
      await navigator.clipboard.writeText(caption)
      setCopiedCaption(true)
      setTimeout(() => setCopiedCaption(false), 2000)
    } catch (err) {
      console.error('Failed to copy caption:', err)
      alert('Failed to copy caption')
    }
  }

  const handleShareImage = async (imageUrl: string, index: number) => {
    const caption = generateCaption()
    
    try {
      console.log('🔄 Share initiated...')
      console.log('📱 Checking native share support...')
      console.log(`User agent: ${navigator.userAgent}`)
      
      // Check if navigator.share is available (mobile/newer browsers)
      const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
      console.log(`Native share available: ${hasNativeShare}`)
      
      if (!hasNativeShare) {
        // Desktop fallback
        console.log(`⚠️ Native share not available. Using desktop fallback...`)
        await handleDownloadImage(imageUrl, '', index - 1)
        
        // Copy caption to clipboard
        try {
          await navigator.clipboard.writeText(caption)
          setCopiedCaption(true)
          setTimeout(() => setCopiedCaption(false), 2000)
        } catch (clipErr) {
          console.warn('Could not copy caption:', clipErr)
        }
        
        alert(`📱 Image Downloaded!\n\n📲 On Desktop:\n1. Open WhatsApp Web (web.whatsapp.com)\n2. Or Open Instagram.com\n3. Upload the image\n4. Paste caption below:\n\n${caption}`)
        return
      }
      
      // Try to fetch and share with file
      console.log(`Fetching image from: ${imageUrl.substring(0, 50)}...`)
      
      let file: File | null = null
      try {
        const response = await fetch(imageUrl, {
          headers: {
            'Accept': 'image/*'
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const blob = await response.blob()
        console.log(`✅ Image fetched: ${(blob.size / 1024).toFixed(2)}KB`)
        file = new File([blob], `${result?.eventName || 'image'}-${index}.png`, { type: 'image/png' })
      } catch (fetchErr) {
        console.warn(`⚠️ Could not fetch image (CORS?): ${fetchErr}`)
        file = null
      }
      
      // Try native share with file if available
      if (file) {
        try {
          console.log(`Attempting to share with file...`)
          await navigator.share({
            files: [file],
            title: result?.eventName || 'Festival Image',
            text: caption,
          })
          console.log(`✅ Share successful`)
          return
        } catch (shareErr: any) {
          console.warn(`File share failed: ${shareErr?.message}. Trying text-only share...`)
        }
      }
      
      // Fallback: Share caption text only
      console.log(`Attempting text-only share...`)
      await navigator.share({
        title: result?.eventName || 'Festival Image',
        text: caption,
      })
      console.log(`✅ Text share successful`)
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('ℹ️ Share cancelled by user')
      } else if (err.name === 'NotSupported' || err.message?.includes('NotSupported')) {
        console.log('ℹ️ Share not supported')
        // Show desktop fallback
        await handleDownloadImage(imageUrl, '', index - 1)
        
        try {
          await navigator.clipboard.writeText(caption)
          setCopiedCaption(true)
          setTimeout(() => setCopiedCaption(false), 2000)
        } catch (clipErr) {
          console.warn('Could not copy caption:', clipErr)
        }
        
        alert(`📱 Image Downloaded!\n\n📲 Desktop Instructions:\n1. Open WhatsApp Web (web.whatsapp.com)\n2. Or Open Instagram.com\n3. Upload the image\n4. Paste caption:\n\n${caption}`)
      } else {
        console.error(`❌ Share error: ${err?.message}`)
        alert(`⚠️ Share error: ${err?.message || 'Unknown error'}\n\nTrying download fallback...`)
        
        try {
          await handleDownloadImage(imageUrl, '', index - 1)
          await navigator.clipboard.writeText(caption)
          setCopiedCaption(true)
          setTimeout(() => setCopiedCaption(false), 2000)
          alert(`✅ Image downloaded!\n📋 Caption copied to clipboard!\n\n${caption}`)
        } catch (fallbackErr) {
          console.error('Fallback failed:', fallbackErr)
        }
      }
    }
  }

  const handleSaveImage = async (imageUrl: string, imageId: string, index: number) => {
    if (!user?.id) {
      alert('Please log in to save images')
      return
    }

    setSaving(imageId)
    try {
      const finalUrl = imagesWithLogo[imageId] || imageUrl
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          imageUrl: finalUrl,
          storagePath: imageUrl,
          eventName: result?.eventName,
          industry: result?.industry,
          prompt: result?.prompt,
          title: `${result?.eventName} - Image ${index + 1}`,
          index: index,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await response.json()
      
      // Small delay to ensure database is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 500))
        
      alert('✅ Image saved to My Projects!')
      router.push('/projects')
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert(`Error: ${(err as any)?.message || 'Failed to save'}`)
    } finally {
      setSaving(null)
    }
  }

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

  if (!result || !result.images || result.images.length === 0) {
    // No images - silently redirect to home
    return null
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <Header />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">
              ✨ Your {result.eventName} Images
            </h1>
            <div className="flex items-center justify-center gap-4 text-purple-200/70 flex-col sm:flex-row">
              <div className="flex items-center gap-3">
                {userLogo ? (
                  <span className="text-green-400">✅ Logo overlay applied</span>
                ) : (
                  <span className="text-yellow-400">⚠️ No logo to overlay</span>
                )}
                <span>Generated for your {result.industry} business</span>
              </div>

              {/* Logo position controls */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-purple-300/80">Logo Position:</span>
                <div className="flex gap-2 rounded-md overflow-hidden bg-white/5 p-0.5">
                  <button
                    onClick={() => setLogoPosition('left')}
                    className={`px-3 py-1 text-sm transition ${logoPosition === 'left' ? 'bg-white/10 text-white' : 'text-purple-200/60'}`}
                  >
                    Left
                  </button>
                  <button
                    onClick={() => setLogoPosition('right')}
                    className={`px-3 py-1 text-sm transition ${logoPosition === 'right' ? 'bg-white/10 text-white' : 'text-purple-200/60'}`}
                  >
                    Right
                  </button>
                </div>

                {/* Test overlay: draw a visible red square to confirm overlay works */}
                <button
                  onClick={() => setTestOverlay((v) => !v)}
                  className={`ml-2 px-3 py-1 text-sm rounded ${testOverlay ? 'bg-red-600 text-white' : 'bg-transparent text-purple-200/60'}`}
                >
                  {testOverlay ? 'Test: ON' : 'Test: OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Generated Images Grid with Captions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {result.images.map((image, index) => (
              <div key={image.id} className="w-full flex flex-col h-full">
                {/* Card Container - Image + Caption + Buttons */}
                <div className="bg-slate-800/30 backdrop-blur border border-purple-500/20 rounded-xl overflow-hidden flex flex-col h-full">
                  
                  {/* Image Container */}
                  <div className="aspect-square relative group w-full" style={{border: 'none', outline: 'none', boxShadow: 'none'}}>
                    {/* Show overlaid image if available, otherwise show original */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagesWithLogo[image.id] || image.url}
                      alt={`Generated image ${index + 1}`}
                      className="w-full h-full object-cover"
                      style={{border: 'none', outline: 'none', boxShadow: 'none', margin: '0', padding: '0'}}
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-center opacity-0 group-hover:opacity-100 p-4 gap-2 flex-col">
                      <Button
                        onClick={() => handleSaveImage(image.url, image.id, index + 1)}
                        disabled={saving === image.id || downloading}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {saving === image.id ? '💾 Saving...' : '💾 Save to Projects'}
                      </Button>
                      <Button
                        onClick={() => handleDownloadImage(image.url, image.id, index)}
                        disabled={downloading || saving === image.id}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        ⬇️ Download
                      </Button>
                    </div>
                  </div>
                  
                  {/* Content Section - Caption + Buttons */}
                  <div className="flex flex-col gap-4 p-5 flex-1">
                    
                    {/* Suggested Caption */}
                    <div className="bg-gradient-to-br from-purple-900/40 via-slate-800/60 to-slate-900/40 backdrop-blur-md border border-purple-500/50 rounded-lg p-4">
                      <p className="text-xs font-bold text-purple-400 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11 15H9v2h2v-2zm4-4H9v2h6v-2zm3-7H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2zm-1 16H7V5h10v15z"/>
                        </svg>
                        Suggested Caption
                      </p>
                      <div className="flex items-start gap-2">
                        {/* Caption Box */}
                        <div className="flex-1 bg-slate-950/80 border-2 border-purple-500/60 rounded-lg p-3">
                          <p className="text-xs text-white leading-relaxed whitespace-pre-wrap break-words font-medium">
                            {generateCaption()}
                          </p>
                        </div>

                        {/* Copy Button with Official Clipboard Icon */}
                        <button
                          onClick={handleCopyCaption}
                          className={`shrink-0 px-3 py-3 font-semibold rounded-lg transition-all duration-200 text-xs shadow-lg hover:shadow-xl active:scale-95 whitespace-nowrap flex items-center justify-center ${
                            copiedCaption
                              ? 'bg-green-600 text-white border border-green-400/50'
                              : 'bg-purple-600 hover:bg-purple-700 text-white border border-purple-400/50'
                          }`}
                          title="Copy caption to clipboard"
                        >
                          {copiedCaption ? (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Social Sharing Buttons */}
              
<div className="grid grid-cols-2 gap-3">

  {/* WhatsApp Button */}
  <button
    type="button"
    onClick={() =>
      handleShareImage(
        imagesWithLogo[image.id] || image.url,
        index + 1
      )
    }
    title="Share to WhatsApp"
    className="
      flex items-center justify-center gap-2
      border border-green-500
      text-green-600
      bg-transparent
      rounded-lg
      py-3 px-3
      text-sm font-semibold
      transition-all duration-200
      hover:bg-green-500 hover:text-white
      active:scale-95
    "
  >
    <FaWhatsapp className="w-5 h-5" />
    WhatsApp
  </button>

  {/* Instagram Button */}
  <button
    type="button"
    onClick={() =>
      handleShareImage(
        imagesWithLogo[image.id] || image.url,
        index + 1
      )
    }
    title="Share to Instagram"
    className="
      flex items-center justify-center gap-2
      border border-pink-500
      text-pink-600
      bg-transparent
      rounded-lg
      py-3 px-3
      text-sm font-semibold
      transition-all duration-200
      hover:bg-gradient-to-r hover:from-pink-500 hover:to-rose-600 hover:text-white
      active:scale-95
    "
  >
    <FaInstagram className="w-5 h-5" />
    Instagram
  </button>

</div>

                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              onClick={() => router.push('/home')}
              className="bg-slate-700 hover:bg-slate-600"
            >
              ← Generate More
            </Button>
            <Button
              onClick={() => router.push('/projects')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              📁 My Projects
            </Button>
            <Button
              onClick={() => {
                const allUrls = result.images.map(img => img.url).join('\n')
                const text = `Festival: ${result.eventName}\nIndustry: ${result.industry}\n\n${allUrls}`
                navigator.clipboard.writeText(text)
                alert('Image URLs copied to clipboard!')
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Copy URLs
            </Button>
          </div>

          {/* Info Section */}
          <div className="mt-12 bg-slate-800/30 backdrop-blur border border-purple-500/20 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-white mb-4">Generation Details</h3>
            <div className="grid grid-cols-2 gap-6 text-purple-200/70 text-sm">
              <div>
                <p className="font-semibold text-white">Event</p>
                <p>{result.eventName}</p>
              </div>
              <div>
                <p className="font-semibold text-white">Industry</p>
                <p>{result.industry}</p>
              </div>
              <div className="col-span-2">
                <p className="font-semibold text-white mb-2">Prompt Used</p>
                <p className="text-xs bg-slate-900/50 p-3 rounded border border-purple-500/20 max-h-24 overflow-y-auto">
                  {result.prompt}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}