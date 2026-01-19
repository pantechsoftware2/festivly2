'use client'

import { PricingSection } from '@/components/pricing-section'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black pt-24">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-900/20 to-black py-12 px-4 mb-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            Upgrade Your Creative Power
          </h1>
          <p className="text-purple-200/70 text-xl">
            Generate unlimited festival posts with premium features
          </p>
        </div>
      </div>

      {/* Pricing Section */}
      <PricingSection />

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Frequently Asked Questions
        </h2>

        <div className="space-y-6">
          {[
            {
              question: 'Can I upgrade anytime?',
              answer:
                'Yes! You can upgrade or downgrade your plan anytime. Changes take effect immediately.',
            },
            {
              question: 'Is there a refund policy?',
              answer:
                'We offer a 7-day money-back guarantee if you are not satisfied with the service.',
            },
            {
              question: 'Do you offer annual billing?',
              answer:
                'Currently we offer monthly billing. Contact our sales team for annual discounts.',
            },
            {
              question: 'What payment methods do you accept?',
              answer:
                'We accept all major credit/debit cards, UPI, and digital wallets through Razorpay.',
            },
            {
              question: 'Can I cancel anytime?',
              answer:
                'Yes, you can cancel your subscription anytime with no hidden fees or penalties.',
            },
            {
              question: 'Is my data secure?',
              answer:
                'All payments are processed securely through Razorpay, which is PCI DSS compliant.',
            },
          ].map((faq, index) => (
            <div
              key={index}
              className="bg-slate-900 border border-purple-500/20 rounded-lg p-6"
            >
              <h3 className="text-white font-semibold mb-3">{faq.question}</h3>
              <p className="text-purple-200/70">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Support Section */}
      <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 border-t border-purple-500/20 py-12 px-4 mt-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Need Help?</h2>
          <p className="text-purple-200/70 mb-6">
            Our support team is here to help you get the most out of Festivly
          </p>
          <div className="space-y-3">
            <p className="text-white">
              📧 Email:{' '}
              <a href="mailto:pantechsoftware2@gmail.com" className="text-purple-400 hover:text-purple-300">
                pantechsoftware2@gmail.com
              </a>
            </p>
            <p className="text-white">
              💬 Live Chat: Available Monday-Friday, 10am-6pm IST
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
