'use client'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-purple-200/70">Last updated: January 15, 2026</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8 text-purple-200/70">
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. Introduction</h2>
            <p>
              Fastively ("we," "our," or "us") operates the Fastively website and application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. Information Collection and Use</h2>
            <p>We collect several different types of information for various purposes to provide and improve our service:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Personal Data:</strong> Name, email address, password, profile information</li>
              <li><strong>Usage Data:</strong> Browser type, IP address, pages visited, time spent</li>
              <li><strong>Content Data:</strong> Images, projects, and creations you make on our platform</li>
              <li><strong>Payment Data:</strong> Processed securely through Razorpay (we don't store card details)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. Use of Data</h2>
            <p>Fastively uses the collected data for various purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>To provide and maintain our service</li>
              <li>To notify you about changes to our service</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information to improve our service</li>
              <li>To monitor the usage of our service</li>
              <li>To send promotional emails and newsletters</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">4. Security of Data</h2>
            <p>
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">5. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at privacy@fastively.com
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
