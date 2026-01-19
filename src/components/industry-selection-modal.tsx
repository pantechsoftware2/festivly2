/**
 * Component: Industry Selection Modal
 * Shows when a Google user needs to set their industry type
 * Required before generating images
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const INDUSTRY_OPTIONS = [
  'Education',
  'Real Estate',
  'Tech & Startup',
  'Manufacturing',
  'Retail & Fashion',
  'Food & Cafe'
]

interface IndustryModalProps {
  isOpen: boolean
  userId: string
  onConfirm: (industry: string) => void
  onCancel?: () => void
}

export function IndustrySelectionModal({
  isOpen,
  userId,
  onConfirm,
  onCancel,
}: IndustryModalProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (!selectedIndustry) {
      setError('Please select an industry')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Call API to save industry type
      const response = await fetch('/api/check-industry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          industryType: selectedIndustry,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save industry')
      }

      const data = await response.json()
      console.log('✅ Industry saved:', data.industry)
      
      // Call parent callback
      onConfirm(selectedIndustry)
    } catch (err: any) {
      console.error('❌ Error saving industry:', err)
      setError(err.message || 'Failed to save industry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="bg-white text-black p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
        <p className="text-gray-600 mb-6">
          Please select your business industry to generate high-quality images tailored to your business.
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2 mb-6">
          {INDUSTRY_OPTIONS.map((industry) => (
            <button
              key={industry}
              onClick={() => setSelectedIndustry(industry)}
              className={`w-full p-3 text-left rounded border-2 transition-colors ${
                selectedIndustry === industry
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {industry}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 text-black border-gray-300"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!selectedIndustry || loading}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>

        {selectedIndustry && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Selected: <strong>{selectedIndustry}</strong>
          </p>
        )}
      </Card>
    </div>
  )
}
