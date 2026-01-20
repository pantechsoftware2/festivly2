// 'use client'

// export const dynamic = 'force-dynamic'

// import { useState, useEffect, useMemo } from 'react'
// import { useRouter, useSearchParams } from 'next/navigation'
// import { useAuth } from '@/lib/auth-context'
// import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
// import { Card } from '@/components/ui/card'
// import { Suspense } from 'react'
// import { createClient } from '@/lib/supabase'

// export default function SignUp() {
//   return (
//     <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
//       <SignUpContent />
//     </Suspense>
//   );
// }

// function SignUpContent() {
//   const router = useRouter()

//   // Auto-redirect to home - SimpleSignUpModal is now used everywhere
//   useEffect(() => {
//     router.push('/')
//   }, [router])
  
//   // If no prompt in URL, check sessionStorage (for users returning from Google Sign-In)
//   if (!prompt && typeof window !== 'undefined') {
//     prompt = sessionStorage.getItem('pending_prompt')
//   }
  
//   const { signUpWithEmail, signInWithGoogle, user, loading: authLoading } = useAuth()
//   // Memoize createClient to prevent multiple instances
//   const supabase = useMemo(() => createClient(), [])

//   // Auto-redirect if already logged in (but not during signup process)
//   useEffect(() => {
//     if (!authLoading && user && !loading) {
//       router.push('/')
//     }
//   }, [user, authLoading, router, loading])

//   const handleSignUp = async (e: React.FormEvent) => {
//     e.preventDefault()

//     if (!email || !password) {
//       setError('Please enter email and password')
//       return
//     }

//     if (password.length < 6) {
//       setError('Password must be at least 6 characters')
//       return
//     }

//     try {
//       setLoading(true)
//       setError(null)
      
//       // Sign up user
//       const { data: authData, error: signUpError } = await supabase.auth.signUp({
//         email,
//         password
//       })

//       if (signUpError) throw signUpError
//       if (!authData.user) throw new Error('User creation failed')

//       const userId = authData.user.id

//       // Create user profile using API endpoint
//       try {
//         console.log('💾 Creating user profile for:', userId)
//         const profileResponse = await fetch('/api/profiles', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             id: userId,
//             email: email,
//             subscription_plan: 'free', // CRITICAL: Default for new signups
//             free_images_generated: 0,  // CRITICAL: Initialize counter
//           }),
//         })

//         if (!profileResponse.ok) {
//           const profileError = await profileResponse.json()
//           console.error('❌ Profile save error:', profileError)
//           throw new Error(profileError.error || 'Failed to save profile')
//         }

//         const profileResult = await profileResponse.json()
//         console.log('✅ Profile saved successfully:', profileResult)
//       } catch (profileError: any) {
//         throw new Error(profileError.message || 'Failed to save profile')
//       }

//       // After signup, redirect to dashboard
//       if (prompt) {
//         sessionStorage.removeItem('pending_prompt')
//         router.push(`/editor?prompt=${encodeURIComponent(prompt)}`)
//       } else {
//         router.push('/dashboard')
//       }
//     } catch (err: any) {
//       const message = err?.message ?? 'Signup failed'
      
//       // Check if user already exists
//       if (message.includes('User already registered') || message.includes('already exists')) {
//         // Redirect to login with message
//         router.push(`/login?signup=exists&email=${encodeURIComponent(email)}`)
//         return
//       }
      
//       // Check if it's a schema/table error
//       if (message.includes('could not find the table') || message.includes('profiles')) {
//         setError('Database setup required. Please check documentation and run: setup-profiles-table.sql')
//       } else if (message.includes('RLS')) {
//         setError('Storage access error. Please check Supabase storage RLS settings.')
//       } else {
//         setError(message)
//       }
      
//       console.error('Signup error:', err)
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen bg-black flex items-center justify-center">
//       <div className="text-center text-white">
//         <div className="text-4xl mb-4 animate-spin">⏳</div>
//         <p className="text-gray-400">Redirecting...</p>
//       </div>
//     </div>
//   )
// }