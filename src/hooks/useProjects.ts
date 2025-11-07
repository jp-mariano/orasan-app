import { useCallback, useEffect, useState } from 'react';

import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { checkAndHandleUnauthorized } from '@/lib/unauthorized-handler';
import {
  CreateProjectRequest,
  Project,
  UpdateProjectRequest,
} from '@/types/index';

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  projectCount: number;
  canCreateProject: boolean;
  createProject: (
    data: CreateProjectRequest
  ) => Promise<{ success: boolean; error?: string }>;
  updateProject: (
    id: string,
    data: UpdateProjectRequest
  ) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshProjects: () => Promise<void>;
}

const MAX_FREE_PROJECTS = 2;

// Status priority for sorting (lower number = higher priority)
const STATUS_PRIORITY = {
  in_progress: 1,
  on_hold: 2,
  new: 3,
  completed: 4,
} as const;

// Sort projects by status, then by creation date within each status
function sortProjectsByStatus(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    // First sort by status priority
    const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (statusDiff !== 0) return statusDiff;

    // Then sort by creation date (newest first) within each status
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get timer context for pause functionality
  const { activeTimers, pauseAllTimers } = useTimeTrackingContext();

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects');
      const data = await response.json();

      if (!response.ok) {
        const handled = await checkAndHandleUnauthorized(response);
        if (handled) {
          return; // User will be redirected, no need to continue
        }
        throw new Error(data.error || 'Failed to fetch projects');
      }

      const projects = data.projects || [];
      setProjects(sortProjectsByStatus(projects));
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(
    async (data: CreateProjectRequest) => {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          const handled = await checkAndHandleUnauthorized(response);
          if (handled) {
            return { success: false, error: 'Unauthorized' };
          }
          return {
            success: false,
            error: result.error || 'Failed to create project',
          };
        }

        // Add new project to local state and maintain sorting
        setProjects(prev => sortProjectsByStatus([result.project, ...prev]));
        return { success: true };
      } catch (err) {
        console.error('Error creating project:', err);
        return {
          success: false,
          error:
            err instanceof Error ? err.message : 'Failed to create project',
        };
      }
    },
    [] // No dependencies needed
  );

  const updateProject = useCallback(
    async (id: string, data: UpdateProjectRequest): Promise<Project | null> => {
      try {
        setError(null);

        const response = await fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          const handled = await checkAndHandleUnauthorized(response);
          if (handled) {
            throw new Error('Unauthorized');
          }
          throw new Error(result.error || 'Failed to update project');
        }

        const updatedProject = result.project;

        // Update local state and maintain sorting
        setProjects(prev =>
          sortProjectsByStatus(
            prev.map(project => (project.id === id ? updatedProject : project))
          )
        );

        return updatedProject;
      } catch (err) {
        // Re-throw the error so the page can handle it with specific error messages
        throw err;
      }
    },
    []
  );

  const deleteProject = useCallback(
    async (id: string) => {
      try {
        // Check if project has any active timers and pause them first
        const projectTimers = activeTimers.filter(
          timer => timer.projectId === id
        );
        if (projectTimers.length > 0) {
          const timerIds = projectTimers.map(timer => timer.id);
          const pauseSuccess = await pauseAllTimers(timerIds);
          if (!pauseSuccess) {
            return {
              success: false,
              error: 'Failed to pause timers before deleting project',
            };
          }
        }

        const response = await fetch(`/api/projects/${id}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (!response.ok) {
          const handled = await checkAndHandleUnauthorized(response);
          if (handled) {
            return { success: false, error: 'Unauthorized' };
          }
          return {
            success: false,
            error: result.error || 'Failed to delete project',
          };
        }

        // Remove from local state
        setProjects(prev => prev.filter(project => project.id !== id));
        return { success: true };
      } catch (err) {
        console.error('Error deleting project:', err);
        return {
          success: false,
          error:
            err instanceof Error ? err.message : 'Failed to delete project',
        };
      }
    },
    [activeTimers, pauseAllTimers]
  );

  const refreshProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects');
      const data = await response.json();

      if (!response.ok) {
        const handled = await checkAndHandleUnauthorized(response);
        if (handled) {
          return; // User will be redirected, no need to continue
        }
        throw new Error(data.error || 'Failed to fetch projects');
      }

      const projects = data.projects || [];
      setProjects(sortProjectsByStatus(projects));
    } catch (err) {
      console.error('Error refreshing projects:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to refresh projects'
      );
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Page Visibility API - refresh when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to the tab - refresh projects
        refreshProjects();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshProjects]);

  return {
    projects,
    loading,
    error,
    projectCount: projects.length,
    canCreateProject: projects.length < MAX_FREE_PROJECTS,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
  };
}
