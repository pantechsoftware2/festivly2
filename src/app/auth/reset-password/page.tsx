'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Check if user has valid session from reset link using PASSWORD_RECOVERY event
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setIsValidToken(true)
        } else {
          setIsValidToken(false)
        }
      } catch (err) {
        console.error('Session check error:', err)
        setIsValidToken(false)
      }
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      console.log('Auth event:', event)
      if (event === 'PASSWORD_RECOVERY') {
        // Password recovery link clicked - session is established
        if (session?.user) {
          setIsValidToken(true)
        } else {
          setIsValidToken(false)
        }
      }
    })

    // Give Supabase time to process the hash
    const timer = setTimeout(checkSession, 500)
    
    return () => {
      clearTimeout(timer)
      if (subscription?.unsubscribe) {
        subscription.unsubscribe()
      }
    }
  }, [supabase.auth])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err: any) {
      setError(err?.message ?? 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-sm sm:max-w-md bg-white border-0 shadow-lg">
          <div className="p-6 sm:p-8">
            <div className="text-center">
              <p className="text-gray-600 text-sm sm:text-base">Verifying your reset link...</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 pt-24 sm:pt-20">
        <Card className="w-full max-w-sm sm:max-w-md bg-white border-0 shadow-lg">
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-4 sm:mb-6">
              Invalid Link
            </h1>
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 sm:py-4 rounded-lg mb-6 text-xs sm:text-sm">
              This password reset link has expired or is invalid. Please request a new one.
            </div>
            <Button
              onClick={() => router.push('/auth/forgotpassword')}
              className="w-full bg-black hover:bg-gray-900 text-white text-sm sm:text-base"
            >
              Request New Link
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 pt-24 sm:pt-20">
      <Card className="w-full max-w-sm sm:max-w-md bg-white border-0 shadow-lg">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-1 sm:mb-2">
            Create New Password
          </h1>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
            Enter your new password below
          </p>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-3 sm:py-4 rounded-lg mb-6 text-xs sm:text-sm">
              <p className="font-semibold">✅ Password Reset Successfully</p>
              <p>Redirecting to sign in page...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 text-xs sm:text-sm">
              {error}
            </div>
          )}

          {!success && (
            <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-5">
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                className="text-sm sm:text-base"
              />

              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                className="text-sm sm:text-base"
              />

              <div className="text-xs text-gray-600">
                <p>Password must be at least 6 characters long</p>
              </div>

              <Button
                type="submit"
                className="w-full bg-black hover:bg-gray-900 text-white text-sm sm:text-base"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}

          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 text-xs sm:text-sm">
              <a
                href="/login"
                className="text-black hover:underline font-semibold"
              >
                Back to Sign In
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white text-sm sm:text-base">Loading...</div></div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
