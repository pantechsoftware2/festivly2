'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { GenerationSpinner } from '@/components/generation-spinner'
import { UpgradeModal } from '@/components/upgrade-modal'
import { SimpleSignUpModal } from '@/components/simple-signup-modal'
import { BrandOnboardingModal } from '@/components/brand-onboarding-modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { UPCOMING_EVENTS } from '@/lib/festival-data'

interface UserProfile {
  id: string
  email: string | null
  industry_type: string | null
  logo_url: string | null
}

export default function EditorPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { addToast } = useToast()
  const [generating, setGenerating] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showSignUpModal, setShowSignUpModal] = useState(false)
  const [showBrandOnboarding, setShowBrandOnboarding] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [imagesGenerated, setImagesGenerated] = useState(0)
  const [imagesRemaining, setImagesRemaining] = useState(5)
  const [pendingEventId, setPendingEventId] = useState<string | null>(null)
  
  // Consolidated loading state: true until both auth AND profile data are ready
  const isFullyLoaded = !loading && (!user || (user && !profileLoading))
  const isProfileReady = user && userProfile && userProfile.industry_type

  // Check for pending event generation from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pendingEvent = localStorage.getItem('pendingEventGeneration')
      if (pendingEvent) {
        console.log('🔄 Found pending event in localStorage:', pendingEvent)
        setPendingEventId(pendingEvent)
      }
    }
  }, [])

  // Fetch user profile when user is authenticated
  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      setProfileLoading(false)
      return
    }

    const fetchProfile = async () => {
      setProfileLoading(true)
      try {
        const response = await fetch(`/api/profiles/${user.id}`)
        if (response.ok) {
          const profile = await response.json()
          setUserProfile(profile)
        } else {
          console.error('❌ Failed to fetch profile:', response.status)
          addToast('Failed to load profile data. Please refresh the page.', 'error')
        }
      } catch (error) {
        console.error('❌ Error fetching profile:', error)
        addToast('Error loading profile data. Please check your connection.', 'error')
      } finally {
        setProfileLoading(false)
      }
    }

    fetchProfile()

    // Listen for profile update events
    const handleProfileUpdate = () => {
      fetchProfile()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('userProfileReady', handleProfileUpdate)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('userProfileReady', handleProfileUpdate)
      }
    }
  }, [user])

  // Handle pending event after modals complete
  useEffect(() => {
    if (pendingEventId && user && userProfile && userProfile.industry_type) {
      // All conditions met, proceed with generation
      console.log('🎯 Auto-triggering generation for pending event:', pendingEventId)
      proceedWithGeneration(pendingEventId)
      setPendingEventId(null)
      // Clear from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pendingEventGeneration')
      }
    }
  }, [pendingEventId, user, userProfile])

  const handleEventClick = async (eventId: string) => {
    // Check if profile is still loading
    if (profileLoading) {
      addToast('Finishing setting up your profile...', 'info', 2000)
      return
    }
    
    // Step 1: Check if user is authenticated
    if (!user) {
      console.log('💾 Saving event to localStorage:', eventId)
      // Save to localStorage before redirecting
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingEventGeneration', eventId)
      }
      setPendingEventId(eventId)
      setShowSignUpModal(true)
      return
    }

    // Step 2: Check if user has completed brand onboarding
    if (!userProfile || !userProfile.industry_type) {
      console.log('💾 Saving event to localStorage (onboarding pending):', eventId)
      // Save to localStorage in case of page refresh during onboarding
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingEventGeneration', eventId)
      }
      setPendingEventId(eventId)
      setShowBrandOnboarding(true)
      return
    }

    // Step 3: User is ready, proceed with generation
    proceedWithGeneration(eventId)
  }

  const proceedWithGeneration = async (eventId: string) => {
    if (!user) return
    
    // Final safety check: ensure profile data is ready
    if (!userProfile || !userProfile.industry_type) {
      addToast('Finishing setting up your profile...', 'warning', 2000)
      console.warn('⚠️ Attempted generation without complete profile data')
      return
    }

    setSelectedEvent(eventId)
    setGenerating(true)
    setError(null)

    try {
      // Generate unique request ID to prevent duplicate processing
      const requestId = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`
      console.log(`🔑 Request ID: ${requestId}`)

      // Call the generation API with event + user industry
      const response = await fetch('/api/generateImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventId,
          userId: user?.id || 'anonymous',
          requestId: requestId,
        }),
      })

      const result = await response.json()

      // Check for daily limit error (429 Too Many Requests)
      if (response.status === 429) {
        console.warn('⚠️ Daily limit reached (429)')
        setGenerating(false)
        setSelectedEvent(null)
        setError('Daily limit reached. Come back tomorrow!')
        
        // Show pricing modal if flagged in response
        // if (result.showPricingModal) {
        //   setTimeout(() => setShowUpgradeModal(true), 500)
        // }
        return // Don't continue
      }

      // Check for 402 Payment Required response (DISABLED FOR NOW)
      // if (response.status === 402) {
      //   console.warn('⚠️ Upgrade required (402)')
      //   setGenerating(false)
      //   setSelectedEvent(null)
      //   setShowUpgradeModal(true)
      //   return // Don't continue
      // }

      if (!response.ok) {
        // SILENT FAILURE: Don't show error to user
        console.error('Generation API error')
        // Just silently continue - empty result will be handled gracefully
      }
      
      // Store result and redirect to result page (even if empty)
      sessionStorage.setItem('generatedResult', JSON.stringify(result))
      router.push('/result')
    } catch (err: any) {
      // SILENT FAILURE: No error message shown
      console.error('Generation error:', err?.message)
      setGenerating(false)
      setSelectedEvent(null)
    }
  }

  const handleSignUpSuccess = () => {
    setShowSignUpModal(false)
    // After signup, the useEffect will detect the user and fetch profile
    // If no industry, the brand onboarding will be triggered automatically
  }

  const handleBrandOnboardingComplete = () => {
    setShowBrandOnboarding(false)
    // Trigger profile refetch
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('userProfileReady'))
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

  if (generating) {
    return (
      <GenerationSpinner 
        messages={['Generating images...', 'Creating your festival post...', 'Applying industry context...']}
        isVisible={generating}
      />
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <Header />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
              🎉 Create Festival Posts
            </h1>
            <p className="text-xl text-purple-200/70">
              Click an event below to generate 4 branded images instantly
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-lg mb-8">
              {error}
            </div>
          )}

          {/* Upcoming Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {UPCOMING_EVENTS.map((event) => {
              const isDisabled = !isFullyLoaded || (user && profileLoading)
              return (
              <Card
                key={event.id}
                className={`bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 transition-all ${
                  isDisabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:border-purple-500/60 hover:bg-purple-500/20 cursor-pointer'
                }`}
                onClick={() => !isDisabled && handleEventClick(event.id)}
              >
                <div className="p-8 h-full flex flex-col justify-between relative">
                  {isDisabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-lg backdrop-blur-sm">
                      <div className="text-white text-sm font-medium flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-4xl mb-4">🎊</div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {event.name}
                    </h3>
                    <p className="text-purple-200/70 text-sm mb-2">{event.date}</p>
                    <p className="text-purple-200/60 text-sm">{event.description}</p>
                  </div>
                  <Button 
                    className="w-full mt-6 bg-purple-600 hover:bg-purple-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isDisabled) handleEventClick(event.id)
                    }}
                    disabled={isDisabled ?? false}
                  >
                    {isDisabled ? 'Loading...' : 'Generate 4 Images'}
                  </Button>
                </div>
              </Card>
            )
          })}
          </div>

          {/* Info Section */}
          <div className="mt-16 bg-slate-800/30 backdrop-blur border border-purple-500/20 rounded-xl p-8 text-center">
            <h3 className="text-xl font-semibold text-white mb-4">✨ How It Works</h3>
            <ol className="text-purple-200/70 space-y-3">
              <li className="flex items-center gap-3 justify-center">
                <span className="text-2xl">1️⃣</span>
                <span>Click any festival event above</span>
              </li>
              <li className="flex items-center gap-3 justify-center">
                <span className="text-2xl">2️⃣</span>
                <span>AI generates 4 branded images</span>
              </li>
              <li className="flex items-center gap-3 justify-center">
                <span className="text-2xl">3️⃣</span>
                <span>Download and share instantly</span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* SIGN UP MODAL */}
      <SimpleSignUpModal
        isOpen={showSignUpModal}
        onClose={() => {
          setShowSignUpModal(false)
          setPendingEventId(null)
          // Clear localStorage if user cancels
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pendingEventGeneration')
          }
        }}
        onSuccess={handleSignUpSuccess}
      />

      {/* BRAND ONBOARDING MODAL */}
      {user && (
        <BrandOnboardingModal
          isOpen={showBrandOnboarding}
          userId={user.id}
          userEmail={user.email || null}
          onComplete={handleBrandOnboardingComplete}
        />
      )}

      {/* UPGRADE MODAL */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        imagesGenerated={imagesGenerated}
        imagesRemaining={imagesRemaining}
        onUpgradeClick={() => setShowUpgradeModal(false)}
      />

      <Footer />
    </main>
  )
}