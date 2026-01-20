'use client'

import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { SimpleSignUpModal } from '@/components/simple-signup-modal'

export function Header() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showSignUpModal, setShowSignUpModal] = useState(false)

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await signOut()
      router.push('/')
      setMobileMenuOpen(false)
    } catch (error) {
      console.error('Sign out error caught:', error)
      router.push('/')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="fixed w-full top-0 z-50 border-b border-white/10 bg-[#0d1224] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 ">
          <Image
            src="/festivly.png"
            alt="Festivly Logo"
            width={40}
            height={40}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover"
            priority
            unoptimized
          />
         <span className="font-bold text-base sm:text-xl hidden sm:inline">
  <span className="text-[#FF9933]">Fes</span>
  <span className="text-white">ti</span>
  <span className="text-[#1A73E8]">vly</span>
</span>

        </Link>


        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          {!loading && user ? (
            <>
              <Link href="/projects">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm">
                  My Projects
                </Button>
              </Link>
              {/* <Link href="/editor">
                <Button size="sm" className="bg-white hover:bg-white/90 text-black font-semibold text-xs sm:text-sm">
                  Editor
                </Button>
              </Link> */}
              <Button
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                className="bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 text-xs sm:text-sm"
              >
                {signingOut ? 'Signing out...' : 'Sign Out'}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs sm:text-sm">
                  Sign In
                </Button>
              </Link>
              {/* OLD: Link to /signup page - now using SimpleSignUpModal instead */}
              <Button 
                size="sm" 
                onClick={() => setShowSignUpModal(true)}
                className="bg-white hover:bg-white/90 text-black font-semibold text-xs sm:text-sm"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <Menu className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0d1224]">
          <div className="px-4 py-4 space-y-3">
            {!loading && user ? (
              <>
                <Link href="/projects" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold justify-start">
                    My Projects
                  </Button>
                </Link>
                {/* <Link href="/editor" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-white hover:bg-white/90 text-black font-semibold justify-start">
                    Editor
                  </Button>
                </Link> */}
                <Button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 justify-start"
                >
                  {signingOut ? 'Signing out...' : 'Sign Out'}
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-blue-600 text-white hover:bg-blue-700 transition-colors justify-start">
                    Sign In
                  </Button>
                </Link>
                {/* OLD: Link to /signup page - now using SimpleSignUpModal instead */}
                <Button 
                  onClick={() => {
                    setShowSignUpModal(true)
                    setMobileMenuOpen(false)
                  }}
                  className="w-full bg-white hover:bg-white/90 text-black font-semibold justify-start"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* SIGN UP MODAL - Using SimpleSignUpModal for all signups */}
      <SimpleSignUpModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        onSuccess={() => {
          setShowSignUpModal(false)
          setMobileMenuOpen(false)
        }}
      />
    </header>
  )
}
