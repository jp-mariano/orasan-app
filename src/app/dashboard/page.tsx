'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, FolderOpen, TrendingUp, Plus } from 'lucide-react'
import { Header } from '@/components/ui/header'
import { useProjects } from '@/hooks/useProjects'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { DeleteProjectModal } from '@/components/projects/DeleteProjectModal'
import { Project } from '@/types/index'

export default function DashboardPage() {
  const { user, loading, signOut, manualSignOut } = useAuth()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Project management
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    projectCount,
    canCreateProject,
    createProject,
    deleteProject,
  } = useProjects()

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      
      // Set a timeout to force redirect if sign out takes too long
      const timeoutId = setTimeout(() => {
        console.log('Sign out timeout reached, forcing redirect')
        setIsSigningOut(false)
        router.push('/')
      }, 3000)
      
      await signOut()
      
      // Clear timeout if sign out completes normally
      clearTimeout(timeoutId)
      
      // Force redirect after sign out
      router.push('/')
    } catch (error) {
      console.error('Sign out failed, using manual fallback:', error)
      manualSignOut()
      router.push('/')
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleManualSignOut = () => {
    console.log('Manual sign out triggered from dashboard')
    manualSignOut()
    router.push('/')
  }

  const handleCreateProject = () => {
    setIsCreateModalOpen(true)
  }

  const handleEditProject = (project: Project) => {
    // For now, we'll navigate to project detail page
    router.push(`/dashboard/projects/${project.id}`)
  }

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return
    
    setIsDeleting(true)
    const result = await deleteProject(projectToDelete.id)
    setIsDeleting(false)
    
    if (!result.success) {
      alert(`Failed to delete project: ${result.error}`)
    }
  }

  const handleNavigateToProject = (project: Project) => {
    router.push(`/dashboard/projects/${project.id}`)
  }

  // Auth redirect effect - only handle redirects, let auth context handle profile creation
  useEffect(() => {
    if (!loading && !user && !isSigningOut) {
      console.log('No user found, redirecting to signin')
      router.push('/auth/signin')
    }
  }, [loading, user, router, isSigningOut])



  // Show loading screen only when auth context is loading
  if (loading && !isSigningOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If signing out, show signing out state instead of loading
  if (isSigningOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Signing out...</p>
            <Button 
              onClick={handleManualSignOut} 
              variant="ghost" 
              size="sm" 
              className="mt-4 text-red-600 hover:text-red-700"
            >
              Force Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to signin
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <Header 
        onSignOut={handleSignOut}
        isSigningOut={isSigningOut}
        onForceSignOut={handleManualSignOut}
        showWelcome={true}
      />

      {/* Dashboard Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Track your time and manage your projects</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectCount}/2</div>
              <p className="text-xs text-muted-foreground">
                {projectCount === 0 ? 'No projects yet' : `${2 - projectCount} remaining on free tier`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0h 0m</div>
              <p className="text-xs text-muted-foreground">
                No time tracked today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0h 0m</div>
              <p className="text-xs text-muted-foreground">
                No time tracked this week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
              <p className="text-gray-600">Manage your projects and track progress</p>
            </div>
            <Button onClick={handleCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>

          {/* Error Message */}
          {projectsError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-600 text-sm">{projectsError}</p>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {projectsLoading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Projects Grid */}
          {!projectsLoading && projects.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteProject}
                  onNavigate={handleNavigateToProject}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!projectsLoading && projects.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>No Projects Yet</CardTitle>
                <CardDescription>
                  Create your first project to start tracking time and managing tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleCreateProject} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create Project Modal */}
        <CreateProjectModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onCreateProject={createProject}
          canCreateProject={canCreateProject}
          currentProjectCount={projectCount}
        />

        {/* Delete Project Modal */}
        <DeleteProjectModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          project={projectToDelete}
          onConfirmDelete={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      </main>
    </div>
  )
}
