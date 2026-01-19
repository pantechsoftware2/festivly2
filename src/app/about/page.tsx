'use client'

export default function About() {
  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">About Festivly</h1>
          <p className="text-purple-200/70 text-lg">
            Empowering creators with AI-powered image generation
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-purple-200/70">
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">Our Mission</h2>
            <p>
              Festivly is dedicated to democratizing creative tools. We believe everyone should have access to professional-grade image generation and editing capabilities, regardless of their design expertise or budget.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">What We Do</h2>
            <p>
              We provide an intuitive platform powered by cutting-edge AI technology that allows users to:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2">
              <li>Generate festival and event-specific marketing images</li>
              <li>Edit and customize images with intelligent tools</li>
              <li>Manage projects and assets effortlessly</li>
              <li>Collaborate with team members</li>
              <li>Export in multiple formats and qualities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">Why Choose Fastively?</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Fast and intuitive interface</li>
              <li>Affordable pricing with flexible plans</li>
              <li>Regular feature updates</li>
              <li>Dedicated customer support</li>
              <li>Enterprise solutions available</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">Our Team</h2>
            <p>
              Festively is built by a passionate team of engineers, designers, and creative professionals who believe in the power of AI to enhance human creativity.
            </p>
          </section>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 border border-purple-500/20 rounded-lg p-8 mt-12 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Ready to Create?</h3>
          <p className="text-purple-200/70 mb-6">
            Join thousands of creators using Festivly to bring their vision to life
          </p>
          <a href="/signup" className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            Get Started Free
          </a>
        </div>
      </div>
    </div>
  )
}
