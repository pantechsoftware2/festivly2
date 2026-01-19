'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-950 border-t border-purple-500/20 mt-16">
      {/* Pricing CTA Section */}
      {/* <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 border-b border-purple-500/20 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-bold text-2xl mb-2">
                ✨ Unlock Unlimited Festival Posts
              </h3>
              <p className="text-purple-200/70 text-sm">
                Free: 3 festival posts | Pro: Unlimited + HD + Logo priority
              </p>
            </div>
            <Link href="/pricing">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 font-semibold">
                🚀 View Plans & Upgrade
              </Button>
            </Link>
          </div>
        </div>
      </div> */}

      {/* Main Footer */}
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Fastively</h3>
              <p className="text-purple-200/70 text-sm">
                AI-powered image generation and creative tools for your business
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/editor" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                    Image Editor
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/projects" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                    Projects
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                    Settings
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/pricing" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-purple-500/20 pt-6">
            {/* Bottom Section */}
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-purple-200/60 text-sm mb-4 md:mb-0">
                © {currentYear} Fastively. All rights reserved.
              </div>
              
              {/* Social Links */}
              {/* <div className="flex gap-4">
                <a href="#" className="text-purple-200/70 hover:text-purple-200 text-sm">
                  Twitter
                </a>
                <a href="#" className="text-purple-200/70 hover:text-purple-200 text-sm">
                  LinkedIn
                </a>
                <a href="#" className="text-purple-200/70 hover:text-purple-200 text-sm">
                  Instagram
                </a>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

