import { useCallback, useEffect, useState } from 'react';

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
  ) => Promise<{ success: boolean; error?: string }>;
  deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshProjects: () => Promise<void>;
}

const MAX_FREE_PROJECTS = 2;

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch projects');
      }

      setProjects(data.projects || []);
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
          return {
            success: false,
            error: result.error || 'Failed to create project',
          };
        }

        // Add new project to local state instead of refetching
        setProjects(prev => [result.project, ...prev]);
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
    async (id: string, data: UpdateProjectRequest) => {
      try {
        const response = await fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: result.error || 'Failed to update project',
          };
        }

        // Update local state
        setProjects(prev =>
          prev.map(project =>
            project.id === id ? { ...project, ...result.project } : project
          )
        );

        return { success: true };
      } catch (err) {
        console.error('Error updating project:', err);
        return {
          success: false,
          error:
            err instanceof Error ? err.message : 'Failed to update project',
        };
      }
    },
    []
  );

  const deleteProject = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
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
        error: err instanceof Error ? err.message : 'Failed to delete project',
      };
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch projects');
      }

      setProjects(data.projects || []);
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
