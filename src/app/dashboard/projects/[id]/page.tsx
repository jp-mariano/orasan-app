'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Project } from '@/types/index'
import { Header } from '@/components/ui/header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { InlineEdit } from '@/components/ui/inline-edit'
import { ErrorDisplay } from '@/components/ui/error-display'
import { DeleteProjectModal } from '@/components/projects/DeleteProjectModal'
import { Edit, Trash2 } from 'lucide-react'

export default function ProjectDetailPage() {
  const { user, loading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loadingProject, setLoadingProject] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const projectId = params.id as string

  // Fetch project data
  useEffect(() => {
    if (!projectId) return

    const fetchProject = async () => {
      try {
        setLoadingProject(true)
        setError(null)
        
        const response = await fetch(`/api/projects/${projectId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch project')
        }
        
        setProject(data.project)
      } catch (err) {
        console.error('Error fetching project:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch project')
      } finally {
        setLoadingProject(false)
      }
    }

    fetchProject()
  }, [projectId])

  // Auth redirect effect
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [loading, user, router])

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  const handleDeleteProject = () => {
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!project) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete project')
      }
      
      // Redirect to dashboard after successful deletion
      router.push('/dashboard')
    } catch (err) {
      console.error('Error deleting project:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveField = async (field: keyof Project, value: string | number) => {
    if (!project) return
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update project')
      }

      const result = await response.json()
      
      // Update local project state
      setProject(prev => prev ? { ...prev, ...result.project } : null)
    } catch (err) {
      console.error('Error updating project:', err)
      setError(err instanceof Error ? err.message : 'Failed to update project')
    }
  }

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-green-100 text-green-800'
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: Project['status']) => {
    switch (status) {
      case 'new':
        return 'New'
      case 'in_progress':
        return 'In Progress'
      case 'on_hold':
        return 'On Hold'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }



  if (loading || loadingProject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Error Loading Project"
        message={error}
        onBack={handleBackToDashboard}
        backLabel="Back to Dashboard"
        showIssueBadge={true}
        issueCount={1}
      />
    )
  }

  if (!project) {
    return (
      <ErrorDisplay
        title="Project Not Found"
        message="The project you're looking for doesn't exist."
        onBack={handleBackToDashboard}
        backLabel="Back to Dashboard"
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showWelcome={false} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb 
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: project.name, href: `/dashboard/projects/${project.id}` }
          ]}
          className="mb-6"
        />

        {/* Project Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 hover:text-red-700"
                onClick={handleDeleteProject}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Project Stats & Description Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Project Information</CardTitle>
                <CardDescription>Manage your project details and settings</CardDescription>
              </div>
              <Badge className={getStatusColor(project.status)}>
                {getStatusLabel(project.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Name */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Name</Label>
                <InlineEdit
                  value={project.name}
                  onSave={(value) => handleSaveField('name', value)}
                  className="text-2xl font-bold text-gray-900"
                />
              </div>
            </div>
            
            {/* Description */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Description</Label>
                <InlineEdit
                  value={project.description}
                  type="textarea"
                  multiline={true}
                  onSave={(value) => handleSaveField('description', value)}
                  placeholder="No description provided"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Client</Label>
                <InlineEdit
                  value={project.client_name}
                  onSave={(value) => handleSaveField('client_name', value)}
                  placeholder="No client specified"
                />
              </div>
            </div>

            {/* Project Rate Type and Price/Currency */}
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500 text-center block">Rate Type</Label>
                <InlineEdit
                  value={project.rate_type || ''}
                  type="rate-type"
                  onSave={(value) => handleSaveField('rate_type', value)}
                  placeholder="Not set"
                  className="text-lg font-semibold text-gray-900 text-center capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500 text-center block">Price</Label>
                <InlineEdit
                  value={`${project.currency_code || 'USD'} ${project.price || '0.00'}`}
                  type="price-currency"
                  onSave={(value) => {
                    // Parse the combined value format "USD|50.00"
                    if (typeof value === 'string' && value.includes('|')) {
                      const [currency, priceStr] = value.split('|')
                      const price = parseFloat(priceStr)
                      if (!isNaN(price) && price > 0) {
                        // Update both fields
                        handleSaveField('currency_code', currency)
                        handleSaveField('price', price)
                      }
                    }
                  }}
                  placeholder="USD 0.00"
                  className="text-lg font-semibold text-gray-900 text-center"
                  projectData={{
                    price: project.price,
                    currency_code: project.currency_code
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Tasks Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>Manage tasks for this project</CardDescription>
              </div>
              <Button size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Tasks here... (maybe grouped by status: new, in_progress, completed, on_hold in accordion style)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Project Modal */}
      <DeleteProjectModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        project={project}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}
