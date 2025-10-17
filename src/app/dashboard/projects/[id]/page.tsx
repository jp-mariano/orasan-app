'use client';

import { useEffect, useRef, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { Edit, MoreVertical, Plus, Trash2 } from 'lucide-react';

import { DeleteProjectModal } from '@/components/projects/DeleteProjectModal';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { DeleteTaskModal } from '@/components/tasks/DeleteTaskModal';
import { ManualTimeEntryModal } from '@/components/tasks/ManualTimeEntryModal';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskModal } from '@/components/tasks/TaskModal';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorDisplay } from '@/components/ui/error-display';
import { Header } from '@/components/ui/header';
import { InlineEdit } from '@/components/ui/inline-edit';
import { Label } from '@/components/ui/label';
import { PauseTimersModal } from '@/components/ui/pause-timers-modal';
import { useAuth } from '@/contexts/auth-context';
import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { useErrorDisplay } from '@/hooks/useErrorDisplay';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { formatDate } from '@/lib/utils';
import { TaskWithDetails } from '@/types';
import { Project } from '@/types/index';

export default function ProjectDetailPage() {
  const { user, loading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Pause all state
  const [showPauseTimersModal, setShowPauseTimersModal] = useState(false);
  const [isPausingAll, setIsPausingAll] = useState(false);

  // Handle errors with the new error display hook
  const { shouldShowErrorDisplay, ErrorDisplayComponent, inlineErrorMessage } =
    useErrorDisplay(error, { context: 'data', fallbackToInline: true });
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
  const [taskForManualTime, setTaskForManualTime] = useState<{
    task: TaskWithDetails;
    currentDuration: number;
  } | null>(null);

  const projectId = params.id as string;

  // Task management
  const {
    tasks,
    loading: tasksLoading,
    createTask,
    updateTask,
    deleteTask,
  } = useTasks({ projectId });

  // Project management
  const { updateProject, deleteProject } = useProjects();

  // Time tracking
  const { activeTimers, pauseAllTimers } = useTimeTrackingContext();

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
      const result = await deleteProject(project.id);

      if (result.success) {
        // Redirect to dashboard after successful deletion
        router.push('/dashboard');
      } else {
        setError(result.error || 'Failed to delete project');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  // Task management handlers
  const handleCreateTask = async (
    taskData:
      | import('@/types').CreateTaskRequest
      | import('@/types').UpdateTaskRequest
  ) => {
    try {
      if ('project_id' in taskData) {
        // This is a CreateTaskRequest
        await createTask(taskData as import('@/types').CreateTaskRequest);
      } else {
        // This is an UpdateTaskRequest - we shouldn't reach here in create mode
        console.error('Unexpected UpdateTaskRequest in create mode');
        throw new Error('Invalid task data for creation');
      }
      // Task will be automatically added to the list via the hook
    } catch (error) {
      console.error('Error creating task:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleDeleteTask = (task: TaskWithDetails) => {
    setTaskToDelete(task);
  };

  const handleOpenManualTime = (
    task: TaskWithDetails,
    currentDuration: number
  ) => {
    setTaskForManualTime({ task, currentDuration });
  };

  const handleUpdateTask = async (
    taskId: string,
    updates: Partial<TaskWithDetails>
  ) => {
    try {
      await updateTask(taskId, updates);
      // Task will be automatically updated in the list via the hook
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
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
      const updatedProject = await updateProject(project.id, data);

      // Update local project state
      setProject(updatedProject);
      return { success: true };
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
    value: string | number | null
  ) => {
    if (!project) return;

    try {
      const updatedProject = await updateProject(project.id, {
        [field]: value,
      });

      // Update local project state
      setProject(updatedProject);
      // Clear field error on success
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update project';

      // Set field-specific error
      setFieldErrors(prev => ({ ...prev, [field]: errorMessage }));

      // Re-throw the error so InlineEdit can catch it
      throw err;
    }
  };

  // Handle pause all timers for this project
  const handlePauseAll = async () => {
    const runningTimerIds = activeTimers
      .filter(timer => timer.isRunning && timer.projectId === projectId)
      .map(timer => timer.id);

    if (runningTimerIds.length === 0) {
      return;
    }

    setIsPausingAll(true);
    try {
      const success = await pauseAllTimers(runningTimerIds);
      if (success) {
        setShowPauseTimersModal(false);
      }
    } catch (error) {
      console.error('Error pausing all timers:', error);
    } finally {
      setIsPausingAll(false);
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

  // Show ErrorDisplay for critical errors
  if (shouldShowErrorDisplay && ErrorDisplayComponent) {
    return <ErrorDisplayComponent />;
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
            {
              label: project.name,
              href: `/dashboard/projects/${project.id}`,
            },
          ]}
          className="mb-6"
        />

        {/* Non-Critical Error Message */}
        {inlineErrorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {inlineErrorMessage}
          </div>
        )}

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
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">Name</Label>
              <InlineEdit
                value={project.name}
                onSave={async value => await handleSaveField('name', value)}
                onError={error =>
                  setFieldErrors(prev => ({ ...prev, name: error }))
                }
                error={fieldErrors.name}
                className="text-xl font-semibold"
              />
            </div>

            {/* Description */}
            {project.description ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  Description
                </Label>
                <InlineEdit
                  value={project.description}
                  type="textarea"
                  multiline={true}
                  onSave={async value =>
                    await handleSaveField('description', value)
                  }
                  onError={error =>
                    setFieldErrors(prev => ({ ...prev, description: error }))
                  }
                  error={fieldErrors.description}
                  placeholder="No description provided"
                />
              </div>
            ) : null}

            {/* Client Name */}
            {project.client_name ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  Client
                </Label>
                <InlineEdit
                  value={project.client_name}
                  onSave={async value =>
                    await handleSaveField('client_name', value)
                  }
                  onError={error =>
                    setFieldErrors(prev => ({ ...prev, client_name: error }))
                  }
                  error={fieldErrors.client_name}
                  placeholder="No client specified"
                />
              </div>
            ) : null}

            {/* Project Rate Type and Price/Currency */}
            {project.rate_type && project.price !== null ? (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500 block">
                    Rate Type
                  </Label>
                  <InlineEdit
                    value={project.rate_type}
                    type="rate-type"
                    onSave={async value =>
                      await handleSaveField('rate_type', value)
                    }
                    onError={error =>
                      setFieldErrors(prev => ({ ...prev, rate_type: error }))
                    }
                    error={fieldErrors.rate_type}
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
                    onSave={async value => {
                      // Parse the combined value format "USD|50.00"
                      if (typeof value === 'string' && value.includes('|')) {
                        const [currency, priceStr] = value.split('|');
                        const price = parseFloat(priceStr);
                        if (!isNaN(price) && price >= 0) {
                          // Update both fields
                          await handleSaveField('currency_code', currency);
                          await handleSaveField('price', price);
                        }
                      }
                    }}
                    onError={error =>
                      setFieldErrors(prev => ({ ...prev, price: error }))
                    }
                    error={fieldErrors.price}
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

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500 block">
                Status
              </Label>
              <InlineEdit
                value={project.status}
                type="status"
                onSave={async value => await handleSaveField('status', value)}
                onError={error =>
                  setFieldErrors(prev => ({ ...prev, status: error }))
                }
                error={fieldErrors.status}
                className="text-base"
              />
            </div>

            {/* Created/Updated Info */}
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-500 space-y-1">
                <div>Created: {formatDate(project.created_at)}</div>
                <div>Last updated: {formatDate(project.updated_at)}</div>
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
              <div className="flex items-center gap-2">
                {activeTimers.some(
                  timer => timer.isRunning && timer.projectId === projectId
                ) && (
                  <Button
                    size="sm"
                    onClick={() => setShowPauseTimersModal(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 hover:border-yellow-600"
                  >
                    Pause Timers
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setIsCreateTaskModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={tasks}
              loading={tasksLoading}
              onDelete={handleDeleteTask}
              onUpdate={handleUpdateTask}
              onOpenManualTime={handleOpenManualTime}
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
        <TaskModal
          open={isCreateTaskModalOpen}
          onOpenChange={setIsCreateTaskModalOpen}
          project={project}
          users={[]} // Currently only supports current user assignment
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

      {/* Manual Time Entry Modal */}
      {taskForManualTime && (
        <ManualTimeEntryModal
          open={!!taskForManualTime}
          onOpenChange={open => !open && setTaskForManualTime(null)}
          taskId={taskForManualTime.task.id}
          projectId={taskForManualTime.task.project_id}
          taskName={taskForManualTime.task.name}
          currentDuration={taskForManualTime.currentDuration}
          onTimeEntryUpdated={() => {
            // Refresh the timer display
            // This will be handled by the timer context automatically
          }}
        />
      )}

      <PauseTimersModal
        open={showPauseTimersModal}
        onOpenChange={setShowPauseTimersModal}
        title="Pause All Running Timers in Project"
        description="Are you sure you want to pause all running timers for this project? This will pause all currently running timers in this project."
        confirmText="Proceed"
        onConfirm={handlePauseAll}
        isLoading={isPausingAll}
      />
    </div>
  );
}
