'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event: string, newSession: any) => {
          if (isMounted) {
            setSession(newSession)
            setUser(newSession?.user ?? null)
          }
        })

        const { data, error } = await supabase.auth.getSession()
        if (isMounted) {
          if (!error) {
            setSession(data.session)
            setUser(data.session?.user ?? null)
          }
          setLoading(false)
        }

        return () => subscription.unsubscribe()
      } catch (error) {
        console.error('Auth init error:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const cleanup = initAuth()

    return () => {
      isMounted = false
      cleanup.then((fn) => fn?.())
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    try {
      // Check if there's an active session before signing out
      const { data } = await supabase.auth.getSession()
      
      // If no session, just clear local state
      if (!data.session) {
        console.log('No active session, clearing local state')
        setSession(null)
        setUser(null)
        return
      }

      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }
      
      console.log('Signed out successfully')
    } catch (error) {
      console.error('Sign out failed:', error)
      // Still clear local state even if signOut fails
      setSession(null)
      setUser(null)
    }
  }, [supabase])

  const getRedirectUrl = useCallback(() => {
    if (typeof window === 'undefined') return '/auth/callback'
    return `${window.location.origin}/auth/callback`
  }, [])

  const signInWithGoogle = useCallback(async () => {
    try {
      const redirectUrl = getRedirectUrl()
      console.log('Initiating Google OAuth with redirect:', redirectUrl)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      })

      if (error) {
        console.error('Google sign in error:', error)
        throw new Error(error.message || 'Failed to sign in with Google')
      }

      console.log('Google OAuth initiated:', data)
    } catch (error) {
      console.error('Google sign in failed:', error)
      throw error
    }
  }, [supabase, getRedirectUrl])

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        console.log('Signing up with email:', email)

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          console.error('Sign up error:', error)
          throw new Error(error.message || 'Failed to sign up')
        }

        console.log('Sign up successful:', data)
      } catch (error) {
        console.error('Sign up failed:', error)
        throw error
      }
    },
    [supabase]
  )

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        console.log('Signing in with email:', email)

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          console.error('Sign in error:', error)
          throw new Error(error.message || 'Failed to sign in')
        }

        console.log('Sign in successful:', data)
      } catch (error) {
        console.error('Sign in failed:', error)
        throw error
      }
    },
    [supabase]
  )

  const value: AuthContextType = {
    user,
    session,
    loading,
    signOut,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
