'use client'

import { ModalContainer, CardBox, HeaderBox, ButtonBox } from '@/components/ui-system'

/**
 * Text Generation Modal - Lightweight & Consistent
 * Part of unified design system
 */
export function TextGenerationModal({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
}: {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}) {
  if (!isOpen) return null

  return (
    <ModalContainer isOpen={isOpen}>
      <CardBox className="max-w-md w-full">
        <HeaderBox
          icon="✨"
          title="Generate with Text?"
          subtitle="Add headlines & captions to your images"
        />

        {/* Description */}
        <p className="text-purple-200/60 text-sm leading-relaxed mb-6">
          You've generated 2 clean images. Generate 2 more with text overlays, headlines, and captions?
        </p>

        {/* Benefits List */}
        <div className="bg-purple-400/10 border border-purple-400/15 rounded-xl p-4 mb-6 space-y-2 backdrop-blur-sm">
          <div className="flex items-start gap-2 text-sm text-purple-100/70">
            <span className="text-purple-300 font-medium">→</span>
            <span>More variety for your content</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-purple-100/70">
            <span className="text-purple-300 font-medium">→</span>
            <span>Text-ready designs for social media</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-purple-100/70">
            <span className="text-purple-300 font-medium">→</span>
            <span>Takes ~10-15 seconds</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <ButtonBox
            onClick={onCancel}
            variant="secondary"
            disabled={isLoading}
          >
            Skip
          </ButtonBox>
          <ButtonBox
            onClick={onConfirm}
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </div>
            ) : (
              '✨ Generate'
            )}
          </ButtonBox>
        </div>
      </CardBox>
    </ModalContainer>
  )
}
