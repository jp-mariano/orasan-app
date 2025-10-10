'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { LocalTimer } from '@/hooks/useTimeTracker';
import { Project, TaskWithDetails } from '@/types';

interface ActiveTimerWithDetails {
  timer: LocalTimer;
  task: TaskWithDetails;
  project: Project;
}

interface UseActiveTimersReturn {
  activeTimersWithDetails: ActiveTimerWithDetails[];
  isLoading: boolean;
  error: string | null;
  refreshActiveTimers: () => Promise<void>;
}

export function useActiveTimers(): UseActiveTimersReturn {
  const { activeTimers } = useTimeTrackingContext();
  const [activeTimersWithDetails, setActiveTimersWithDetails] = useState<
    ActiveTimerWithDetails[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveTimersDetails = useCallback(async () => {
    if (activeTimers.length === 0) {
      setActiveTimersWithDetails([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get unique project IDs from active timers
      const projectIds = [
        ...new Set(activeTimers.map(timer => timer.projectId)),
      ];

      // Fetch all projects
      const projectsResponse = await fetch('/api/projects');
      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch projects');
      }
      const projectsData = await projectsResponse.json();
      const projects: Project[] = projectsData.projects || [];

      // Create a map of project ID to project for quick lookup
      const projectMap = new Map(
        projects.map(project => [project.id, project])
      );

      // Fetch tasks for each project that has active timers
      const taskPromises = projectIds.map(async projectId => {
        const tasksResponse = await fetch(`/api/projects/${projectId}/tasks`);
        if (!tasksResponse.ok) {
          console.warn(`Failed to fetch tasks for project ${projectId}`);
          return [];
        }
        const tasksData = await tasksResponse.json();
        return tasksData.tasks || [];
      });

      const taskResults = await Promise.all(taskPromises);
      const allTasks = taskResults.flat();

      // Create a map of task ID to task for quick lookup
      const taskMap = new Map(allTasks.map(task => [task.id, task]));

      // Combine active timers with their task and project details
      const timersWithDetails = activeTimers
        .map(timer => {
          const task = taskMap.get(timer.taskId);
          const project = projectMap.get(timer.projectId);

          if (!task || !project) {
            console.warn(`Missing task or project for timer ${timer.id}`);
            return null;
          }

          return {
            timer,
            task,
            project,
          };
        })
        .filter((item): item is ActiveTimerWithDetails => item !== null);

      setActiveTimersWithDetails(timersWithDetails);
    } catch (err) {
      console.error('Error fetching active timers details:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch active timers'
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeTimers]);

  const refreshActiveTimers = useCallback(async () => {
    await fetchActiveTimersDetails();
  }, [fetchActiveTimersDetails]);

  // Fetch details when active timers change
  useEffect(() => {
    fetchActiveTimersDetails();
  }, [fetchActiveTimersDetails]);

  return {
    activeTimersWithDetails,
    isLoading,
    error,
    refreshActiveTimers,
  };
}
