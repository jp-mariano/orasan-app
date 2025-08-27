import { useState, useEffect, useCallback } from 'react';
import { TaskWithDetails, CreateTaskRequest, UpdateTaskRequest } from '@/types';

interface UseTasksOptions {
  projectId?: string;
  status?: string;
  priority?: string;
  assignee?: string;
}

interface UseTasksReturn {
  tasks: TaskWithDetails[];
  loading: boolean;
  error: string | null;
  createTask: (taskData: CreateTaskRequest) => Promise<TaskWithDetails | null>;
  updateTask: (
    id: string,
    updates: UpdateTaskRequest
  ) => Promise<TaskWithDetails | null>;
  deleteTask: (id: string) => Promise<boolean>;
  refreshTasks: () => Promise<void>;
}

export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build query parameters
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (options.projectId) params.append('project_id', options.projectId);
    if (options.status) params.append('status', options.status);
    if (options.priority) params.append('priority', options.priority);
    if (options.assignee) params.append('assignee', options.assignee);
    return params.toString();
  }, [options.projectId, options.status, options.priority, options.assignee]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = buildQueryParams();
      const url = queryParams ? `/api/tasks?${queryParams}` : '/api/tasks';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(errorMessage);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  // Create task
  const createTask = useCallback(
    async (taskData: CreateTaskRequest): Promise<TaskWithDetails | null> => {
      try {
        setError(null);

        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create task');
        }

        const data = await response.json();
        const newTask = data.task;

        // Add to local state
        setTasks(prev => [newTask, ...prev]);

        return newTask;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create task';
        setError(errorMessage);
        console.error('Error creating task:', err);
        return null;
      }
    },
    []
  );

  // Update task
  const updateTask = useCallback(
    async (
      id: string,
      updates: UpdateTaskRequest
    ): Promise<TaskWithDetails | null> => {
      try {
        setError(null);

        const response = await fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update task');
        }

        const data = await response.json();
        const updatedTask = data.task;

        // Update local state
        setTasks(prev =>
          prev.map(task => (task.id === id ? updatedTask : task))
        );

        return updatedTask;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update task';
        setError(errorMessage);
        console.error('Error updating task:', err);
        return null;
      }
    },
    []
  );

  // Delete task
  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete task');
      }

      // Remove from local state
      setTasks(prev => prev.filter(task => task.id !== id));

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete task';
      setError(errorMessage);
      console.error('Error deleting task:', err);
      return false;
    }
  }, []);

  // Refresh tasks
  const refreshTasks = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  // Initial fetch and refetch when options change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    refreshTasks,
  };
}
