'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { SimpleSignUpModal } from '@/components/simple-signup-modal'

function SignInContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSignUpModal, setShowSignUpModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { signInWithEmail, signInWithGoogle, user, loading: authLoading } = useAuth()

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Check if coming from signup
  useEffect(() => {
    const signupSuccess = searchParams.get('signup')
    const email = searchParams.get('email')
    if (signupSuccess === 'success') {
      setSuccess('Account created! You can now sign in.')
    }
    if (signupSuccess === 'exists') {
      setSuccess(`Account already exists for ${email}. Please sign in below.`)
    }
  }, [searchParams])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await signInWithEmail(email, password)
      // Check if there's a pending prompt in localStorage
      const pendingPrompt = typeof window !== 'undefined' ? localStorage.getItem('pending_prompt') : null
      if (pendingPrompt) {
        localStorage.removeItem('pending_prompt')
        router.push(`/editor?prompt=${encodeURIComponent(pendingPrompt)}`)
      } else {
        router.push('/')
      }
    } catch (err: any) {
      const errorMsg = err?.message ?? 'Failed to sign in. Please check your credentials.'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      await signInWithGoogle()
      // After Google Sign-In, redirect to home which will trigger redirect to editor if prompt exists
    } catch (err: any) {
      setError(
        err?.message ??
          'Failed to sign in with Google.'
      )
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 pt-24 sm:pt-20">
      <Card className="w-full max-w-sm sm:max-w-md bg-white border-0 shadow-lg">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-1 sm:mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
            Sign in to your Festivly account
          </p>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 text-xs sm:text-sm">
              ✅ {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              required
              className="text-sm sm:text-base"
            />

            <Input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
              className="text-sm sm:text-base"
            />

            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-900 text-white text-sm sm:text-base"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-right pt-2">
              <a
                href="/auth/forgotpassword"
                className="text-xs sm:text-sm text-gray-600 hover:text-black transition-colors"
              >
                Forgot password?
              </a>
            </div>
          </form>

          <div className="relative mb-4 sm:mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-2 bg-white text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 text-sm sm:text-base"
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
            Don&apos;t have an account?{' '}
            {/* OLD: Link to /signup page - now using SimpleSignUpModal instead */}
            <button
              onClick={() => setShowSignUpModal(true)}
              className="text-black hover:underline font-semibold bg-none border-none cursor-pointer"
            >
              Sign Up
            </button>
          </p>
        </div>
      </Card>

      {/* SIGN UP MODAL - Using SimpleSignUpModal for all signups */}
      <SimpleSignUpModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        onSuccess={() => {
          setShowSignUpModal(false)
          // Redirect to login after signup
          router.push('/login?signup=success')
        }}
      />
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white text-sm sm:text-base">Loading...</div></div>}>
      <SignInContent />
    </Suspense>
  )
}
