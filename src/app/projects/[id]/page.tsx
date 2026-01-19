'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'

interface Project {
  id: string
  title: string
  description?: string
  prompt?: string
  image_urls?: string[]
  thumbnail_url?: string
  created_at: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchProjects()
    }
  }, [user, authLoading, router])

  const fetchProjects = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading projects:', error)
        throw error
      }

      setProjects(data || [])
    } catch (error: any) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) {
      return
    }

    setDeleting(projectId)
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user?.id)

      if (error) throw error

      setProjects(projects.filter(p => p.id !== projectId))
      alert('✅ Project deleted')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setDeleting(null)
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <Header />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">📁 My Projects</h1>
              <p className="text-purple-200/70">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'} saved
              </p>
            </div>
            <Button
              onClick={() => router.push('/home')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              + Generate New
            </Button>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <Card className="bg-slate-800/50 border-purple-500/30 p-12 text-center">
              <p className="text-purple-200/70 text-lg mb-6">
                No saved projects yet. Generate some images to get started!
              </p>
              <Button
                onClick={() => router.push('/home')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Generate Images
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="bg-slate-800/50 border-purple-500/30 overflow-hidden hover:border-purple-500/60 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-slate-900 relative group">
                    {project.thumbnail_url || (project.image_urls && project.image_urls[0]) ? (
                      <img
                        src={project.thumbnail_url || (project.image_urls && project.image_urls[0])}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-purple-200/40">
                        No image
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                      <Button
                        size="sm"
                        onClick={() => setViewingImage(project.thumbnail_url || (project.image_urls && project.image_urls[0]) || '')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeleteProject(project.id)}
                        disabled={deleting === project.id}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white font-semibold truncate mb-2">
                      {project.title}
                    </h3>
                    <p className="text-purple-200/60 text-xs mb-3">
                      {project.description}
                    </p>
                    <p className="text-purple-200/50 text-xs">
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Image Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setViewingImage(null)}
        >
          <div 
            className="max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setViewingImage(null)}
                className="bg-red-600 hover:bg-red-700"
              >
                ✕ Close
              </Button>
            </div>
            <img
              src={viewingImage}
              alt="Full size view"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </main>
  )
}