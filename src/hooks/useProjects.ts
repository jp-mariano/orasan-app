import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { useUser } from '@/hooks/useUser';
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

// Sort projects by name (case-insensitive)
function sortProjectsByName(projects: Project[]): Project[] {
  return [...projects].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', undefined, {
      sensitivity: 'base',
    })
  );
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: userLoading } = useUser();

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
      setProjects(sortProjectsByName(projects));
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
        setProjects(prev => sortProjectsByName([result.project, ...prev]));
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
          sortProjectsByName(
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
      setProjects(sortProjectsByName(projects));
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

  const canCreateProject = useMemo(() => {
    if (userLoading) {
      return true;
    }
    const tier = user?.subscription_tier ?? 'free';
    if (tier === 'pro') {
      return true;
    }
    const activeCount = projects.filter(p => p.status !== 'completed').length;
    return activeCount < MAX_FREE_PROJECTS;
  }, [user?.subscription_tier, userLoading, projects]);

  return {
    projects,
    loading,
    error,
    projectCount: projects.length,
    canCreateProject,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
  };
}
