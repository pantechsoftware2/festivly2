'use client'

import Link from 'next/link'

export default function Blog() {
  const posts = [
    {
      id: 1,
      title: 'Getting Started with AI Image Generation',
      excerpt: 'Learn how to use Fastively to create stunning festival marketing images in minutes.',
      date: 'Jan 15, 2026',
      category: 'Tutorial',
      readTime: '5 min read',
    },
    {
      id: 2,
      title: 'Pro Tips for Festival Marketing',
      excerpt: 'Discover the best practices for creating engaging festival promotions with AI.',
      date: 'Jan 10, 2026',
      category: 'Marketing',
      readTime: '7 min read',
    },
    {
      id: 3,
      title: 'Maximizing Your Creative Workflow',
      excerpt: 'Tips and tricks to streamline your image creation process on Fastively.',
      date: 'Jan 5, 2026',
      category: 'Tips',
      readTime: '4 min read',
    },
    {
      id: 4,
      title: 'What\'s New in Fastively v2.0',
      excerpt: 'Check out the latest features and improvements we\'ve added to the platform.',
      date: 'Dec 28, 2025',
      category: 'Updates',
      readTime: '6 min read',
    },
  ]

  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Blog</h1>
          <p className="text-purple-200/70 text-lg">
            Tips, tutorials, and updates from the Fastively team
          </p>
        </div>

        {/* Blog Posts */}
        <div className="space-y-6">
          {posts.map((post) => (
            <Link key={post.id} href={`#`}>
              <div className="bg-slate-900 border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-white hover:text-purple-300 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-purple-200/70 text-sm mt-2">{post.excerpt}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-purple-200/50 mt-4">
                  <span className="bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full">
                    {post.category}
                  </span>
                  <span>{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 border border-purple-500/20 rounded-lg p-8 mt-12 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Stay Updated</h3>
          <p className="text-purple-200/70 mb-6">
            Subscribe to our newsletter for tips, tutorials, and product updates
          </p>
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 bg-slate-900 border border-purple-500/20 rounded-lg text-white placeholder-purple-200/50 focus:outline-none focus:border-purple-500/50"
            />
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
