'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { TaskWithDetails } from '@/types';
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
import { Trash2 } from 'lucide-react';
import { DeleteTaskModal } from '@/components/tasks/DeleteTaskModal';

export default function TaskDetailPage() {
  const { user, loading } = useAuth();
  const params = useParams();
  const router = useRouter();

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const taskId = params.id as string;

  const fetchTask = useCallback(async () => {
    try {
      setLoadingTask(true);
      const response = await fetch(`/api/tasks/${taskId}`);

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
  }, [taskId]);

  useEffect(() => {
    if (user && !loading) {
      fetchTask();
    }
  }, [user, loading, fetchTask]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  const handleSaveField = async (field: string, value: string | number) => {
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const data = await response.json();
      setTask(data.task);
    } catch (err) {
      console.error('Error updating task:', err);
      // Revert the change on error
      fetchTask();
    }
  };

  const handleDeleteTask = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!task) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Redirect back to project page
      router.push(`/dashboard/projects/${task.project_id}`);
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
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ErrorDisplay
            title="Error Loading Task"
            message={error}
            onBack={() => router.push('/dashboard')}
          />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ErrorDisplay
            title="Task Not Found"
            message="The requested task could not be found."
            onBack={() => router.push('/dashboard')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            {
              label: task.project?.name || 'Project',
              href: `/dashboard/projects/${task.project_id}`,
            },
            { label: task.name, href: `/dashboard/tasks/${task.id}` },
          ]}
        />

        {/* Task Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Task Details</CardTitle>
                <CardDescription>
                  Manage task information and settings
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteTask}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Task
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label>Task Name</Label>
              <InlineEdit
                value={task.name}
                onSave={value => handleSaveField('name', value)}
                className="text-xl font-semibold"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <InlineEdit
                value={task.description || ''}
                onSave={value => handleSaveField('description', value)}
                multiline
                placeholder="Add a description..."
                className="text-gray-700"
              />
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label>Project</Label>
              <div className="text-gray-700">
                {task.project?.name || 'Unknown Project'}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <InlineEdit
                value={task.status}
                type="status"
                onSave={value => handleSaveField('status', value)}
                className="text-gray-700"
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <InlineEdit
                value={task.priority}
                onSave={value => handleSaveField('priority', value)}
                className="text-gray-700"
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <InlineEdit
                value={task.due_date || ''}
                onSave={value => handleSaveField('due_date', value)}
                placeholder="Set due date (YYYY-MM-DD)..."
                className="text-gray-700"
              />
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label>Assignee</Label>
              <InlineEdit
                value={task.assignee || ''}
                onSave={value => handleSaveField('assignee', value)}
                placeholder="Unassigned"
                className="text-gray-700"
              />
            </div>

            {/* Created/Updated Info */}
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-500 space-y-1">
                <div>
                  Created: {new Date(task.created_at).toLocaleDateString()}
                </div>
                <div>
                  Last updated: {new Date(task.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
