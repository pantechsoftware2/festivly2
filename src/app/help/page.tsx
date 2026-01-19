'use client'

export default function Help() {
  const faqs = [
    {
      question: 'How do I get started with Fastively?',
      answer:
        'Simply sign up for a free account, choose your industry, and start creating festival posts. Our intuitive interface makes it easy to get started in minutes.',
    },
    {
      question: 'What image formats are supported?',
      answer:
        'We support PNG, JPG, WEBP, GIF, and SVG formats. You can export your creations in any of these formats.',
    },
    {
      question: 'Can I download my images?',
      answer:
        'Yes! All users can download their generated images. Pro users get access to higher resolution options.',
    },
    {
      question: 'What is the difference between Free and Pro?',
      answer:
        'Free plan allows 3 festival posts per month with standard quality. Pro plan offers unlimited posts with HD quality, logo priority, and advanced templates.',
    },
    {
      question: 'How do I upgrade my plan?',
      answer:
        'Go to Settings > Billing and click "Upgrade". You can choose from Pro (₹99) or Pro Plus (₹199) plans.',
    },
    {
      question: 'Do you offer refunds?',
      answer:
        'Yes, we offer a 7-day money-back guarantee if you\'re not satisfied. Contact support@fastively.com for refund requests.',
    },
    {
      question: 'Can I use Fastively for commercial purposes?',
      answer:
        'Yes! All plans include commercial usage rights. Your creations are yours to use as you see fit.',
    },
    {
      question: 'How do I contact support?',
      answer:
        'You can reach our support team at support@fastively.com or use the contact form on our website. We typically respond within 24 hours.',
    },
  ]

  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Help Center</h1>
          <p className="text-purple-200/70 text-lg">
            Find answers to common questions about Fastively
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="space-y-4 mb-12">
          {faqs.map((faq, index) => (
            <details key={index} className="bg-slate-900 border border-purple-500/20 rounded-lg p-6 cursor-pointer group">
              <summary className="flex items-center justify-between font-semibold text-white hover:text-purple-300 transition-colors">
                <span>{faq.question}</span>
                <span className="text-xl group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-purple-200/70 mt-4 leading-relaxed">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        {/* Support CTA */}
        <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 border border-purple-500/20 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Didn't find your answer?</h3>
          <p className="text-purple-200/70 mb-6">
            Our support team is here to help. Contact us anytime.
          </p>
          <a
            href="/contact"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
