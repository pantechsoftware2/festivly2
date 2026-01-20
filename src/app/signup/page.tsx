'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      // Create user profile using API endpoint
      try {
        console.log('💾 Creating user profile for:', userId)
        const profileResponse = await fetch('/api/profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: userId,
            email: email,
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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Using SimpleSignUpModal instead - redirect to home */}
      <div className="text-center text-white">
        <h1 className="text-3xl font-bold mb-4">Welcome to Festivly</h1>
        <p className="text-gray-400 mb-8">Redirecting to signup...</p>
        <a href="/" className="text-blue-400 hover:text-blue-300 underline">
          Go to Home
        </a>
      </div>
    </div>
  )

  /* OLD EMAIL/PASSWORD SIGNUP - COMMENTED OUT (using SimpleSignUpModal instead)
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
              try {
                setLoading(true)
                setError(null)
                // Mark this as a new signup (not an existing user login)
                if (typeof window !== 'undefined') {
                  console.log('🔐 Google signup: Marking as new signup')
                  sessionStorage.setItem('is_new_signup', 'true')
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
  */
}