'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
   
        const supabase = createClient()

        const { data, error } = await supabase.auth.getSession()

        if (error) throw error

        if (data.session) {
          const user = data.session.user
          // Read all sessionStorage values immediately
          const pendingIndustry = typeof window !== 'undefined' 
            ? sessionStorage.getItem('pending_industry') 
            : null
          const pendingLogoBase64 = typeof window !== 'undefined' 
            ? sessionStorage.getItem('pending_logo_base64') 
            : null
          const pendingLogoName = typeof window !== 'undefined' 
            ? sessionStorage.getItem('pending_logo_name') 
            : null
          const pendingLogoType = typeof window !== 'undefined' 
            ? sessionStorage.getItem('pending_logo_type') 
            : null
          const isNewSignup = typeof window !== 'undefined' 
            ? sessionStorage.getItem('is_new_signup') === 'true'
            : false

          console.log('🔍 Auth Callback - Google User Session:', {
            userId: user?.id,
            email: user?.email,
            userProvider: user?.app_metadata?.provider,
            hasPendingLogo: !!pendingLogoBase64,
            pendingLogoName,
            pendingIndustry,
            hasPendingIndustry: !!pendingIndustry,
            isNewSignup
          })
          console.log('📦 SessionStorage contents:', {
            'pending_industry': pendingIndustry,
            'pending_logo_base64': pendingLogoBase64 ? 'EXISTS' : 'MISSING',
            'pending_logo_name': pendingLogoName,
            'is_new_signup': isNewSignup
          })
          console.log('🔍 Detailed value check:', {
            'pendingIndustry is null?': pendingIndustry === null,
            'pendingIndustry is empty string?': pendingIndustry === '',
            'pendingIndustry actual value': JSON.stringify(pendingIndustry),
            'hasPendingIndustry': !!pendingIndustry
          })

          // Check if user already has a profile in the database
          let existingProfile = null
          if (user?.id) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle()
              existingProfile = profile
              console.log('🔎 Profile check result:', { exists: !!existingProfile })
            } catch (checkError: any) {
              console.log('Profile check error:', checkError.code)
            }
          }

          // If this is a NEW signup, always update the profile with industry and logo
          if (user?.id && isNewSignup) {
            console.log('✨ Processing new Google signup for user:', user.id)
            let logoUrl: string | null = null

            // Upload logo if provided
            if (pendingLogoBase64 && pendingLogoName) {
              try {
                console.log('🔷 Starting logo upload for user:', user.id)
                // Convert base64 to blob
                const byteCharacters = atob(pendingLogoBase64.split(',')[1])
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const mimeType = pendingLogoType || 'image/jpeg'
                const blob = new Blob([byteArray], { type: mimeType })
                const logoFile = new File([blob], pendingLogoName, { type: mimeType })

                console.log('📦 Logo file prepared:', { name: logoFile.name, size: logoFile.size, type: logoFile.type })

                // Upload logo
                const formData = new FormData()
                formData.append('logo', logoFile)
                formData.append('userId', user.id)

                const uploadResponse = await fetch('/api/signup/upload-logo', {
                  method: 'POST',
                  body: formData,
                })

                console.log('📤 Upload response status:', uploadResponse.status)

                if (uploadResponse.ok) {
                  const uploadResult = await uploadResponse.json()
                  logoUrl = uploadResult.logoUrl
                  console.log('✅ Logo uploaded successfully:', logoUrl)
                } else {
                  const errorText = await uploadResponse.text()
                  console.error('❌ Logo upload failed:', uploadResponse.status, errorText)
                }
              } catch (logoError: any) {
                console.error('❌ Logo upload error:', logoError.message)
                // Logo upload failed - continue without logo
              }
            }

            // Create or update user profile with industry and logo
            try {
              const profileData: any = {
                id: user.id,
                email: user.email || null,
                subscription_plan: 'free', // CRITICAL: Default for new signups
                free_images_generated: 0,  // CRITICAL: Initialize counter
                industry_type: pendingIndustry || null,  // Always include
                brand_logo_url: logoUrl || null,  // Always include (even if null)
              }

              console.log('💾 CALLBACK - Upserting Google profile with:', {
                id: user.id,
                email: user.email,
                industry_type: pendingIndustry || null,
                brand_logo_url: logoUrl || null,
                subscription_plan: 'free',
                free_images_generated: 0
              })

              // Use the same profiles endpoint for consistency
              const profileResponse = await fetch('/api/profiles', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData),
              })

              console.log('📤 Profile API response status:', profileResponse.status)

              if (!profileResponse.ok) {
                const profileError = await profileResponse.json()
                console.error('❌ Profile save error:', profileError)
              } else {
                const profileResult = await profileResponse.json()
                console.log('✅ Profile created/updated successfully:', {
                  id: profileResult.profile?.id,
                  industry_type: profileResult.profile?.industry_type,
                  brand_logo_url: profileResult.profile?.brand_logo_url
                })
              }
            } catch (profileError: any) {
              console.error('❌ Profile creation exception:', profileError)
              // Continue anyway - profile creation failure shouldn't block login
            }
          } else if (user?.id && !isNewSignup && !existingProfile) {
            // For existing logins without profiles, create a minimal profile
            console.log('👤 Creating minimal profile for existing user (non-signup login):', user.id)
            try {
              const profileData = {
                id: user.id,
                email: user.email || null,
              }

              const profileResponse = await fetch('/api/profiles', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData),
              })

              if (!profileResponse.ok) {
                const profileError = await profileResponse.json()
                console.error('❌ Profile save error:', profileError)
              } else {
                const profileResult = await profileResponse.json()
                console.log('✅ Minimal profile created:', profileResult.profile?.id)
              }
            } catch (profileError: any) {
              console.error('❌ Profile creation exception:', profileError)
            }
          } else if (user?.id && existingProfile) {
            console.log('👤 User already has profile:', existingProfile.id)
          }

          // ✅ CLEAR sessionStorage AFTER all async operations are complete
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('pending_industry')
            sessionStorage.removeItem('pending_logo_base64')
            sessionStorage.removeItem('pending_logo_name')
            sessionStorage.removeItem('pending_logo_type')
            sessionStorage.removeItem('is_new_signup')
            console.log('✅ Cleared all pending data from sessionStorage')
          }

          router.push('/')
        } else {
          router.push('/login')
        }
      } catch (error) {
        router.push('/login')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-white">Authenticating...</div>
    </div>
  )
}
