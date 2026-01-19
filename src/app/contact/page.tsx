'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      setSuccess(true)
      setFormData({ name: '', email: '', subject: '', message: '' })
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(err.message || 'Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Contact Us</h1>
          <p className="text-purple-200/70 text-lg">
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Contact Info */}
          <div className="md:col-span-1 space-y-6">
            {[
              {
                title: 'Email',
                content: 'pantechsoftware2@gmail.com',
                icon: '📧',
              },
              {
                title: 'Phone',
                content: '+91 7044490574',
               
              },
              {
                title: 'Address',
                content: 'India',
               
              },
              {
                title: 'Working Hours',
                content: 'Monday - Friday, 10am - 6pm IST',
             
              },
            ].map((item, index) => (
              <div key={index} className="bg-slate-900 border border-purple-500/20 rounded-lg p-4">
                <div className="text-2xl mb-2">{item.icon}</div>
                <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                <p className="text-purple-200/70 text-sm">{item.content}</p>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <div className="bg-slate-900 border border-purple-500/20 rounded-lg p-8">
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                  ✅ Thanks for your message! We'll get back to you soon.
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  ❌ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">
                    Name
                  </label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                    className="bg-slate-800 border-purple-500/20 text-white placeholder-purple-200/50"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-semibold mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    required
                    className="bg-slate-800 border-purple-500/20 text-white placeholder-purple-200/50"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-semibold mb-2">
                    Subject
                  </label>
                  <Input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="How can we help?"
                    required
                    className="bg-slate-800 border-purple-500/20 text-white placeholder-purple-200/50"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-semibold mb-2">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Your message..."
                    required
                    rows={5}
                    className="w-full px-4 py-2 bg-slate-800 border border-purple-500/20 rounded-lg text-white placeholder-purple-200/50 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2"
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
