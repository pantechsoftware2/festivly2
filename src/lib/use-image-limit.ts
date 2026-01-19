import { useState, useCallback } from 'react'

interface ImageLimitState {
  canGenerate: boolean
  imagesGenerated: number
  imagesRemaining: number
  subscription: string
  limitExceeded: boolean
}

export function useImageLimit() {
  const [limitState, setLimitState] = useState<ImageLimitState>({
    canGenerate: true,
    imagesGenerated: 0,
    imagesRemaining: 1,
    subscription: 'free',
    limitExceeded: false,
  })
  const [loading, setLoading] = useState(false)

  // Check if user can generate images
  const checkLimit = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/check-image-limit', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to check image limit')
      }

      const data = await response.json()
      setLimitState(data)
      return data
    } catch (error) {
      console.error('Error checking limit:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Increment image count after successful generation
  const incrementCount = useCallback(async () => {
    try {
      const response = await fetch('/api/increment-image-count', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to increment count')
      }

      const data = await response.json()

      // Update local state
      setLimitState((prev) => ({
        ...prev,
        imagesGenerated: data.newCount,
        imagesRemaining:
          data.remaining === 'unlimited' ? 'unlimited' : data.remaining,
        limitExceeded: data.newCount >= 5 && prev.subscription === 'free',
      }))

      return data
    } catch (error) {
      console.error('Error incrementing count:', error)
      return null
    }
  }, [])

  return {
    ...limitState,
    loading,
    checkLimit,
    incrementCount,
  }
}
