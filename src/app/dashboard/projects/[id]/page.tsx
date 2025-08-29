'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Project } from '@/types/index';
import { Header } from '@/components/ui/header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Label } from '@/components/ui/label';
import { InlineEdit } from '@/components/ui/inline-edit';

import { ErrorDisplay } from '@/components/ui/error-display';
import { DeleteProjectModal } from '@/components/projects/DeleteProjectModal';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { TaskList } from '@/components/tasks/TaskList';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { DeleteTaskModal } from '@/components/tasks/DeleteTaskModal';
import { Plus, MoreVertical, Trash2, Edit } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { TaskWithDetails } from '@/types';

export default function ProjectDetailPage() {
  const { user, loading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Task management state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithDetails | null>(
    null
  );
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const projectId = params.id as string;

  // Task management
  const {
    tasks,
    loading: tasksLoading,
    createTask,
    deleteTask,
  } = useTasks({ projectId });

  // Project management
  const { updateProject } = useProjects();

  // Fetch project data
  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      try {
        setLoadingProject(true);
        setError(null);

        const response = await fetch(`/api/projects/${projectId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch project');
        }

        setProject(data.project);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch project'
        );
      } finally {
        setLoadingProject(false);
      }
    };

    fetchProject();
  }, [projectId]);

  // Auth redirect effect
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [loading, user, router]);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleConfirmDelete = async () => {
    if (!project) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }

      // Redirect to dashboard after successful deletion
      router.push('/dashboard');
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  // Task management handlers
  const handleCreateTask = async (
    taskData: import('@/types').CreateTaskRequest
  ) => {
    try {
      await createTask(taskData);
      // Task will be automatically added to the list via the hook
    } catch (error) {
      console.error('Error creating task:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleDeleteTask = (task: TaskWithDetails) => {
    setTaskToDelete(task);
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;

    setIsDeletingTask(true);
    try {
      await deleteTask(taskToDelete.id);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleUpdateProject = async (
    data: import('@/types').UpdateProjectRequest
  ) => {
    if (!project) return { success: false, error: 'No project to update' };

    try {
      const result = await updateProject(project.id, data);

      if (result.success) {
        // Update local project state
        setProject(prev => (prev ? { ...prev, ...data } : null));
      }

      return result;
    } catch (error) {
      console.error('Error updating project:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update project',
      };
    }
  };

  const handleSaveField = async (
    field: keyof Project,
    value: string | number
  ) => {
    if (!project) return;

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project');
      }

      const result = await response.json();

      // Update local project state
      setProject(prev => (prev ? { ...prev, ...result.project } : null));
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

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
    );
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
    );
  }

  if (!project) {
    return (
      <ErrorDisplay
        title="Project Not Found"
        message="The project you're looking for doesn't exist."
        onBack={handleBackToDashboard}
        backLabel="Back to Dashboard"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showWelcome={false} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: project.name, href: `/dashboard/projects/${project.id}` },
          ]}
          className="mb-6"
        />

        {/* Project Stats & Description Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Project Information</CardTitle>
                <CardDescription>
                  Manage your project details and settings
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <InlineEdit
                  value={project.status}
                  type="status"
                  onSave={value => handleSaveField('status', value)}
                  className="text-base px-4 py-2"
                />

                <div className="relative" ref={actionsRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowActions(!showActions)}
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>

                  {showActions && (
                    <div className="absolute right-0 top-8 bg-white border rounded-md shadow-lg z-10 py-1 min-w-[120px]">
                      <button
                        onClick={() => {
                          setIsEditModalOpen(true);
                          setShowActions(false);
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsDeleteModalOpen(true);
                          setShowActions(false);
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Name */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  Name
                </Label>
                <InlineEdit
                  value={project.name}
                  onSave={value => handleSaveField('name', value)}
                  className="text-2xl font-bold text-gray-900"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              {/* Description - Only show if it has a value */}
              {project.description ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">
                    Description
                  </Label>
                  <InlineEdit
                    value={project.description}
                    type="textarea"
                    multiline={true}
                    onSave={value => handleSaveField('description', value)}
                    placeholder="No description provided"
                  />
                </div>
              ) : null}

              {/* Client Name - Only show if it has a value */}
              {project.client_name ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">
                    Client
                  </Label>
                  <InlineEdit
                    value={project.client_name}
                    onSave={value => handleSaveField('client_name', value)}
                    placeholder="No client specified"
                  />
                </div>
              ) : null}
            </div>

            {/* Project Rate Type and Price/Currency - Only show if they have values */}
            {project.rate_type && project.price !== null ? (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500 block">
                    Rate Type
                  </Label>
                  <InlineEdit
                    value={project.rate_type}
                    type="rate-type"
                    onSave={value => handleSaveField('rate_type', value)}
                    placeholder="Not set"
                    className="text-center capitalize"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500 block">
                    Price
                  </Label>
                  <InlineEdit
                    value={`${project.currency_code || 'USD'} ${project.price}`}
                    type="price-currency"
                    onSave={value => {
                      // Parse the combined value format "USD|50.00"
                      if (typeof value === 'string' && value.includes('|')) {
                        const [currency, priceStr] = value.split('|');
                        const price = parseFloat(priceStr);
                        if (!isNaN(price) && price >= 0) {
                          // Update both fields
                          handleSaveField('currency_code', currency);
                          handleSaveField('price', price);
                        }
                      }
                    }}
                    placeholder="USD 0.00"
                    className="text-center"
                    projectData={{
                      price: project.price,
                      currency_code: project.currency_code,
                    }}
                  />
                </div>
              </div>
            ) : null}
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
              <Button size="sm" onClick={() => setIsCreateTaskModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={tasks}
              loading={tasksLoading}
              onDelete={handleDeleteTask}
            />
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

      {/* Edit Project Modal */}
      <ProjectModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        project={project}
        onUpdateProject={handleUpdateProject}
      />

      {/* Create Task Modal */}
      {project && (
        <CreateTaskModal
          open={isCreateTaskModalOpen}
          onOpenChange={setIsCreateTaskModalOpen}
          project={project}
          users={[]} // TODO: Fetch users for assignee selection
          onSubmit={handleCreateTask}
        />
      )}

      {/* Delete Task Modal */}
      <DeleteTaskModal
        open={!!taskToDelete}
        onOpenChange={open => !open && setTaskToDelete(null)}
        task={taskToDelete}
        onConfirmDelete={handleConfirmDeleteTask}
        isDeleting={isDeletingTask}
      />
    </div>
  );
}
