'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

function ForgotPasswordContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get the origin dynamically - this will be localhost:3000 for dev, festivly.vercel.app for prod
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const redirectUrl = `${origin}/auth/reset-password`
      
      console.log('📧 Requesting password reset with redirect URL:', redirectUrl)
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (resetError) {
        console.error('Reset password error:', resetError)
        setError('Unable to send reset email. Please try again later.')
      } else {
        setSuccess(true)
        setEmail('')
      }
    } catch (err: any) {
      console.error('Catch error:', err)
      setError(err?.message ?? 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 pt-24 sm:pt-20">
      <Card className="w-full max-w-sm sm:max-w-md bg-white border-0 shadow-lg">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-1 sm:mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
            Enter your email to receive a password reset link
          </p>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-3 sm:py-4 rounded-lg mb-6 text-xs sm:text-sm">
              <p className="font-semibold mb-1">✅ Check Your Email</p>
              <p>A password reset link has been sent to your email. Click the link to create a new password.</p>
              <p className="mt-2 text-xs">If you don't see it, check your spam folder.</p>
            </div>
          )}
  
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 text-xs sm:text-sm">
              <p>{error}</p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-5">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="text-sm sm:text-base"
              />

              <Button
                type="submit"
                className="w-full bg-black hover:bg-gray-900 text-white text-sm sm:text-base"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          )}

          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 text-xs sm:text-sm">
              Remember your password?{' '}
              <a
                href="/login"
                className="text-black hover:underline font-semibold"
              >
                Sign In
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function ForgotPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white text-sm sm:text-base">Loading...</div></div>}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
