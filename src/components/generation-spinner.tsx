'use client'

import { useEffect, useState } from 'react'
import { Loader2, Lightbulb } from 'lucide-react'

interface GenerationSpinnerProps {
  messages: string[]
  isVisible: boolean
}

// Status messages that cycle during generation (3-4 seconds)
const STATUS_MESSAGES = [
  'Analyzing your request...',
  'Brainstorming concepts...',
  'Drafting the layout...',
  'Selecting color palettes...',
  'Finalizing your design...',
];

// Tips of the Day - displayed to users while waiting
const TIPS = [
  "Tip: Be specific about lighting (e.g., 'cinematic lighting' or 'golden hour').",
  "Tip: Mention a specific art style like 'minimalist', 'oil painting', or 'cyberpunk'.",
  'Tip: Use negative prompts to exclude things you don\'t want.',
  "Tip: Mentioning a camera angle like 'wide shot' or 'close up' helps frame the subject.",
  "Tip: Colors evoke emotion. Try specifying 'warm tones' for a cozy feel.",
]

/**
 * Displays animated spinner with rotating progress messages and tips
 * Used during image/text generation process
 */
export function GenerationSpinner({ messages, isVisible }: GenerationSpinnerProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0)
  const [currentTip, setCurrentTip] = useState('')
  const [mounted, setMounted] = useState(false)

  // Select random tip after mount to avoid hydration mismatch
  useEffect(() => {
    setCurrentTip(TIPS[Math.floor(Math.random() * TIPS.length)])
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isVisible || messages.length === 0) return

    // Rotate through messages every 2 seconds
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [isVisible, messages])

  // Cycle through status messages every 3.5 seconds
  useEffect(() => {
    if (!isVisible) return

    const statusInterval = setInterval(() => {
      setCurrentStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length)
    }, 3000) // Change message every 3 seconds

    return () => clearInterval(statusInterval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full mx-4">
        {/* Spinner */}
        <div className="flex justify-center mb-8">
          <Loader2 className="w-14 h-14 text-blue-600 animate-spin" />
        </div>

        {/* Status Messages - animated */}
        <div className="text-center mb-8 min-h-[80px] flex flex-col justify-center">
          <p className="text-gray-900 font-bold text-lg mb-3 animate-pulse">
            {STATUS_MESSAGES[currentStatusIndex]}
          </p>
          <div className="flex justify-center gap-1">
            {STATUS_MESSAGES.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index <= currentStatusIndex ? 'bg-blue-600 w-3' : 'bg-gray-300 w-2'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Tip of the Day */}
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-lg p-4">
          <div className="flex gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">
              {currentTip}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
