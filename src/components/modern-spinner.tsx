'use client'

import { ModalContainer, CardBox } from '@/components/ui-system'

/**
 * Modern Spinner Component - Lightweight & Consistent
 * Part of unified design system across all pages
 */
export function ModernSpinner({ 
  title = 'Generating...', 
  subtitle = 'Please wait',
  isVisible = true 
}: { 
  title?: string
  subtitle?: string
  isVisible?: boolean
}) {
  if (!isVisible) return null

  return (
    <ModalContainer isOpen={isVisible}>
      <CardBox className="max-w-sm w-full shadow-xl">
        <div className="flex flex-col items-center justify-center gap-6 py-12">
          {/* Modern Spinner - Gradient Circles */}
          <div className="relative w-16 h-16">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-400 animate-spin" />
            
            {/* Middle ring - slower rotation */}
            <div className="absolute inset-2 rounded-full border-3 border-transparent border-b-pink-500 border-l-pink-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
            
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-linear-to-r from-purple-500 to-pink-500 rounded-full" />
            </div>
          </div>

          {/* Text Content */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white/90 mb-1">{title}</h3>
            <p className="text-purple-200/50 text-sm">{subtitle}</p>
          </div>

          {/* Animated Dots */}
          <div className="flex gap-2 items-center justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-linear-to-r from-purple-400 to-pink-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </CardBox>
    </ModalContainer>
  )
}
