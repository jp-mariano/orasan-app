'use client';

import { useEffect, useRef, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { Edit, MoreVertical, Trash2 } from 'lucide-react';

import { DeleteTaskModal } from '@/components/tasks/DeleteTaskModal';
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
import { useAuth } from '@/contexts/auth-context';
import { useErrorDisplay } from '@/hooks/useErrorDisplay';
import { useTasks } from '@/hooks/useTasks';
import { formatDate } from '@/lib/utils';
import { TaskWithDetails } from '@/types';

export default function ProjectTaskDetailPage() {
  const { user, loading } = useAuth();
  const params = useParams();
  const router = useRouter();

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Handle errors with the new error display hook
  const { shouldShowErrorDisplay, ErrorDisplayComponent, inlineErrorMessage } =
    useErrorDisplay(error, { context: 'data', fallbackToInline: true });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const projectId = params.id as string;
  const taskId = params.taskId as string;

  // Task management
  const { updateTask, deleteTask } = useTasks({ projectId });

  // Fetch task data - same pattern as Project page
  useEffect(() => {
    if (!projectId || !taskId) return;

    const fetchTask = async () => {
      try {
        setLoadingTask(true);
        setError(null);

        // Now we can use the project-scoped API directly
        const response = await fetch(
          `/api/projects/${projectId}/tasks/${taskId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch task');
        }

        const data = await response.json();
        setTask(data.task);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch task');
      } finally {
        setLoadingTask(false);
      }
    };

    fetchTask();
  }, [projectId, taskId]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

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

  const handleSaveField = async (
    field: string,
    value: string | number | null
  ) => {
    if (!task) return;

    try {
      const updatedTask = await updateTask(taskId, { [field]: value });

      // Update local task state
      setTask(updatedTask);
      // Clear field error on success
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update task';

      // Set field-specific error
      setFieldErrors(prev => ({ ...prev, [field]: errorMessage }));

      // Re-throw the error so InlineEdit can catch it
      throw err;
    }
  };

  const handleDeleteTask = () => {
    setShowDeleteModal(true);
  };

  const handleUpdateTask = async (
    taskData: import('@/types').UpdateTaskRequest
  ) => {
    if (!task) return;

    try {
      const updatedTask = await updateTask(taskId, taskData);

      setTask(updatedTask);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!task) return;

    setIsDeleting(true);
    try {
      const success = await deleteTask(taskId);

      if (success) {
        // Redirect back to project page
        router.push(`/dashboard/projects/${projectId}`);
      } else {
        setError('Failed to delete task');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading || loadingTask) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
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

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <ErrorDisplay
            title="Task Not Found"
            message="The requested task could not be found."
            onBack={() => router.push(`/dashboard/projects/${projectId}`)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            {
              label: task.project?.name || 'Project',
              href: `/dashboard/projects/${projectId}`,
            },
            {
              label: task.name,
              href: `/dashboard/projects/${projectId}/tasks/${taskId}`,
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

        {/* Task Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Task Details</CardTitle>
                <CardDescription>
                  Manage task information and settings
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
                          handleDeleteTask();
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
            {/* Task Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Task Name
              </Label>
              <InlineEdit
                value={task.name}
                onSave={async value => await handleSaveField('name', value)}
                onError={error =>
                  setFieldErrors(prev => ({ ...prev, name: error }))
                }
                error={fieldErrors.name}
                className="text-xl font-semibold"
              />
            </div>

            {/* Description */}
            {task.description ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  Description
                </Label>
                <InlineEdit
                  value={task.description}
                  onSave={async value =>
                    await handleSaveField('description', value)
                  }
                  onError={error =>
                    setFieldErrors(prev => ({ ...prev, description: error }))
                  }
                  error={fieldErrors.description}
                  multiline
                  placeholder="Add a description..."
                  className="text-gray-700"
                />
              </div>
            ) : null}

            {/* Due Date */}
            {task.due_date ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  Due Date
                </Label>
                <InlineEdit
                  value={task.due_date}
                  type="due-date"
                  onSave={async value =>
                    await handleSaveField('due_date', value)
                  }
                  onError={error =>
                    setFieldErrors(prev => ({ ...prev, due_date: error }))
                  }
                  error={fieldErrors.due_date}
                  placeholder="Set due date..."
                  className="text-gray-700"
                />
              </div>
            ) : null}

            {/* Assignee */}
            {task.assignee && task.assignee_user ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  Assignee
                </Label>
                <InlineEdit
                  value={task.assignee}
                  type="assignee"
                  onSave={async value =>
                    await handleSaveField('assignee', value)
                  }
                  onError={error =>
                    setFieldErrors(prev => ({ ...prev, assignee: error }))
                  }
                  error={fieldErrors.assignee}
                  placeholder="Unassigned"
                  className="text-gray-700"
                  assigneeData={{
                    users: user
                      ? [
                          {
                            id: user.id,
                            email: user.email || '',
                            name:
                              user.user_metadata?.full_name ||
                              user.user_metadata?.name,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                          },
                        ]
                      : [],
                    currentUserId: user?.id,
                    assigneeUser: task.assignee_user,
                  }}
                />
              </div>
            ) : null}

            {/* Task Rate Type and Price/Currency */}
            {task.rate_type && task.price !== null ? (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500 block">
                    Rate Type
                  </Label>
                  <InlineEdit
                    value={task.rate_type}
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
                    value={`${task.currency_code || 'USD'} ${task.price}`}
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
                      price: task.price,
                      currency_code: task.currency_code,
                    }}
                  />
                </div>
              </div>
            ) : null}

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Priority
              </Label>
              <InlineEdit
                value={task.priority}
                type="priority"
                onSave={async value => await handleSaveField('priority', value)}
                onError={error =>
                  setFieldErrors(prev => ({ ...prev, priority: error }))
                }
                error={fieldErrors.priority}
                className="text-gray-700"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Status
              </Label>
              <InlineEdit
                value={task.status}
                type="status"
                onSave={async value => await handleSaveField('status', value)}
                onError={error =>
                  setFieldErrors(prev => ({ ...prev, status: error }))
                }
                error={fieldErrors.status}
                className="text-gray-700"
              />
            </div>

            {/* Created/Updated Info */}
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-500 space-y-1">
                <div>
                  <span>Project:</span>{' '}
                  {task.project?.name || 'Unknown Project'}
                </div>
                <div>Created: {formatDate(task.created_at)}</div>
                <div>Last updated: {formatDate(task.updated_at)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Task Modal */}
      {task && (
        <TaskModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          project={{
            id: projectId,
            name: task.project?.name || 'Unknown Project',
            status: 'new',
            user_id: user?.id || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          task={task}
          onSubmit={handleUpdateTask}
        />
      )}

      {/* Delete Task Modal */}
      <DeleteTaskModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        task={task}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
