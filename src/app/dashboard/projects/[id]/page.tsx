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
import { ErrorDisplay } from '@/components/ui/error-display'
import { Edit, Trash2 } from 'lucide-react'

export default function ProjectDetailPage() {
  const { user, loading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loadingProject, setLoadingProject] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const formatPrice = (price: number | null | undefined, currencyCode: string) => {
    if (!price) return 'Not set'
    
    const currency = getCurrencySymbol(currencyCode)
    return `${currency}${price.toFixed(2)}`
  }

  const getCurrencySymbol = (code: string) => {
    const symbolMap: Record<string, string> = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
      'CAD': 'C$', 'AUD': 'A$', 'CHF': 'CHF', 'CNY': '¥'
    }
    return symbolMap[code] || code
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
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <Badge className={getStatusColor(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Project Stats & Description Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>Manage your project details and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Name */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-24 text-sm font-medium text-gray-500 flex-shrink-0">Name:</div>
                <div className="flex-1 text-2xl font-bold text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                  {project.name}
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-24 text-sm font-medium text-gray-500 flex-shrink-0">Description:</div>
                <div className="flex-1 text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                  {project.description || 'No description provided'}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-24 text-sm font-medium text-gray-500 flex-shrink-0">Client:</div>
                <div className="flex-1 text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                  {project.client_name || 'No client specified'}
                </div>
              </div>
            </div>

            {/* Project Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
              <div className="text-center">
                <div className="text-sm text-gray-500">Rate Type</div>
                <div className="text-lg font-semibold text-gray-900 capitalize">
                  {project.rate_type || 'Not set'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Price</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatPrice(project.price, project.currency_code)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Created</div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Date(project.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Updated</div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Date(project.updated_at).toLocaleDateString()}
                </div>
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
    </div>
  )
}
