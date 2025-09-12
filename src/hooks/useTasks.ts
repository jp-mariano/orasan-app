import { useCallback, useEffect, useState } from 'react';

import { CreateTaskRequest, TaskWithDetails, UpdateTaskRequest } from '@/types';

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

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!options.projectId) {
        setError('Project ID is required to fetch tasks');
        return;
      }

      // Build query parameters inline
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.priority) params.append('priority', options.priority);
      if (options.assignee) params.append('assignee', options.assignee);
      const queryParams = params.toString();

      const url = queryParams
        ? `/api/projects/${options.projectId}/tasks?${queryParams}`
        : `/api/projects/${options.projectId}/tasks`;

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
  }, [options.projectId, options.status, options.priority, options.assignee]);

  // Create task
  const createTask = useCallback(
    async (taskData: CreateTaskRequest): Promise<TaskWithDetails | null> => {
      try {
        setError(null);

        if (!options.projectId) {
          throw new Error('Project ID is required to create a task');
        }

        const response = await fetch(
          `/api/projects/${options.projectId}/tasks`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData),
          }
        );

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
    [options.projectId]
  );

  // Update task
  const updateTask = useCallback(
    async (
      id: string,
      updates: UpdateTaskRequest
    ): Promise<TaskWithDetails | null> => {
      try {
        setError(null);

        if (!options.projectId) {
          throw new Error('Project ID is required to update a task');
        }

        const response = await fetch(
          `/api/projects/${options.projectId}/tasks/${id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          }
        );

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
        // Re-throw the error so the page can handle it with specific error messages
        throw err;
      }
    },
    [options.projectId]
  );

  // Delete task
  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);

        if (!options.projectId) {
          throw new Error('Project ID is required to delete a task');
        }

        const response = await fetch(
          `/api/projects/${options.projectId}/tasks/${id}`,
          {
            method: 'DELETE',
          }
        );

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
    },
    [options.projectId]
  );

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
