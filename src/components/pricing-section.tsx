'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface PricingTier {
  name: string
  price: number
  currency: string
  description: string
  features: string[]
  buttonText: string
  highlighted?: boolean
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: 0,
    currency: '₹',
    description: '4 festival posts per month',
    features: [
      '✓ 4 festival generation posts',
      '✓ Standard quality images',
      '✓ Basic templates',
      '✗ HD images',
      '✗ Logo priority',
    ],
    buttonText: 'Current Plan',
  },
  {
    name: 'Pro',
    price: 99,
    currency: '₹',
    description: 'Unlimited posts + Premium features',
    features: [
      '✓ Unlimited festival posts',
      '✓ HD quality images',
      '✓ Logo priority placement',
      '✓ Advanced templates',
      '✓ Priority support',
    ],
    buttonText: 'Upgrade Now',
    highlighted: true,
  },
  {
    name: 'Pro Plus',
    price: 199,
    currency: '₹',
    description: 'Everything in Pro + Advanced tools',
    features: [
      '✓ Unlimited festival posts',
      '✓ 4K quality images',
      '✓ Custom branding',
      '✓ API access',
      '✓ 24/7 support',
    ],
    buttonText: 'Upgrade Now',
  },
]

export function PricingSection() {
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async (tier: PricingTier) => {
    if (tier.price === 0) return

    setIsLoading(true)
    try {
      // Initialize Razorpay payment
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: tier.price * 100, // Convert to paise
          planName: tier.name,
        }),
      })

      const data = await response.json()

      if (!data.orderId) {
        throw new Error('Failed to create order')
      }

      // Open Razorpay payment modal
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id: data.orderId,
          amount: tier.price * 100,
          currency: 'INR',
          name: 'Festivly',
          description: `Upgrade to ${tier.name} Plan`,
          handler: async (response: any) => {
            // Payment successful - verify and update profile
            await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: data.orderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                planName: tier.name,
              }),
            })

            alert('✅ Payment successful! Your account has been upgraded.')
            window.location.reload()
          },
          prefill: {
            name: 'User',
            email: 'user@example.com',
          },
          theme: {
            color: '#000000',
          },
        }

        const razorpay = new (window as any).Razorpay(options)
        razorpay.open()
      }
      document.body.appendChild(script)
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('❌ Failed to initiate payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-slate-950 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-purple-200/70 text-lg">
            Choose the perfect plan for your creative needs
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {PRICING_TIERS.map((tier) => (
            <Card
              key={tier.name}
                onClick={() => handleUpgrade(tier)}
              className={`p-8 border-0 cursor-pointer transition-all ${
                tier.highlighted
                  ? 'bg-gradient-to-br from-purple-600 to-purple-900 ring-2 ring-purple-400 transform scale-105 hover:scale-110'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {/* Tier Name */}
              <h3 className="text-2xl font-bold text-white mb-2">
                {tier.name}
              </h3>

              {/* Price */}
              <div className="mb-4">
                <span className="text-5xl font-bold text-white">
                  {tier.currency}
                  {tier.price}
                </span>
                <span className="text-purple-200/70 ml-2">/month</span>
              </div>

              {/* Description */}
              <p className="text-purple-200/70 text-sm mb-6">
                {tier.description}
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-purple-100 text-sm flex items-start"
                  >
                    <span className="mr-3">{feature.startsWith('✓') ? '✓' : '✗'}</span>
                    <span>{feature.substring(2)}</span>
                  </li>
                ))}
              </ul>

              {/* Button */}
              <Button
                onClick={() => handleUpgrade(tier)}
                disabled={isLoading || tier.price === 0}
                className={`w-full py-2 text-base font-semibold ${
                  tier.price === 0
                    ? 'bg-gray-600 text-white cursor-not-allowed'
                    : tier.highlighted
                    ? 'bg-white text-purple-600 hover:bg-gray-100'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isLoading ? 'Processing...' : tier.buttonText}
              </Button>

              {tier.highlighted && (
                <div className="mt-4 text-center">
                  <span className="text-xs text-yellow-300 font-semibold">
                    🚀 MOST POPULAR
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-slate-900 border border-purple-500/20 rounded-lg p-6 text-center">
          <p className="text-purple-200/70 text-sm">
            📊 Need more? Contact our sales team for enterprise pricing
          </p>
        </div>
      </div>
    </div>
  )
}
