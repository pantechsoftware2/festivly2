'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  imagesGenerated: number
  imagesRemaining: number
  onUpgradeClick: () => void
}

export function UpgradeModal({
  isOpen,
  onClose,
  imagesGenerated,
  imagesRemaining,
  onUpgradeClick,
}: UpgradeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <Card className="w-full max-w-lg bg-gradient-to-br from-purple-900 to-purple-800 border-2 border-purple-500 shadow-2xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-8 text-center">
          {/* Icon */}
          <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🎨</div>

          {/* Heading */}
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
            Free Trial Limit Reached
          </h2>

          {/* Message */}
          <p className="text-sm sm:text-base text-purple-100 mb-4 sm:mb-6">
            You've used your <strong>1 free generation</strong> (4 images). Ready for unlimited?
          </p>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-xs sm:text-sm text-purple-200 mb-2">
              <span>Free Attempts Used</span>
              <span>{imagesGenerated}/1</span>
            </div>
            <div className="w-full bg-purple-900/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all"
                style={{ width: `${(imagesGenerated / 1) * 100}%` }}
              />
            </div>
          </div>

          {/* Features List */}
          <div className="bg-purple-900/30 rounded-lg p-3 sm:p-4 mb-6 text-left">
            <p className="text-white font-semibold text-xs sm:text-sm mb-3">Upgrade and get:</p>
            <ul className="space-y-2 text-xs sm:text-sm text-purple-100">
              <li>✓ Unlimited image generation</li>
              <li>✓ HD quality images (Pro)</li>
              <li>✓ 4K quality images (Pro Plus)</li>
              <li>✓ Advanced templates</li>
              <li>✓ Logo priority</li>
              <li>✓ Priority support</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <a href="/pricing" className="block">
              <Button
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-2.5 sm:py-3 text-sm sm:text-base hover:from-yellow-300 hover:to-orange-400 rounded-lg transition-all"
              >
                🚀 View Pricing Plans
              </Button>
            </a>
            <Button
              onClick={onClose}
              className="w-full bg-purple-700 hover:bg-purple-600 text-white font-semibold py-2.5 sm:py-3 text-sm sm:text-base border border-purple-500 rounded-lg transition-all"
            >
              Maybe Later
            </Button>
          </div>

          {/* Footer */}
          <p className="text-xs sm:text-xs text-purple-300 mt-4">
            7-day money-back guarantee · Cancel anytime
          </p>
        </div>
      </Card>
    </div>
  )
}
