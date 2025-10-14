'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Clock } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { getProjectColor } from '@/lib/utils';
import { Project, Task } from '@/types';

import { ActiveTimerCard } from './ActiveTimerCard';

interface ProjectTaskData {
  project: Project;
  tasks: Task[];
}

export function ActiveTimersSection() {
  const { activeTimers } = useTimeTrackingContext();
  const activeTimersRef = useRef(activeTimers);
  const [projectTaskMap, setProjectTaskMap] = useState<
    Map<string, ProjectTaskData>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep ref updated with current activeTimers
  useEffect(() => {
    activeTimersRef.current = activeTimers;
  }, [activeTimers]);

  // Fetch project and task details once when active timers change
  const fetchProjectTaskDetails = useCallback(async () => {
    const currentActiveTimers = activeTimersRef.current;
    if (currentActiveTimers.length === 0) {
      setProjectTaskMap(new Map());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get unique project IDs from active timers
      const projectIds = [
        ...new Set(currentActiveTimers.map(timer => timer.projectId)),
      ];

      // Fetch all projects
      const projectsResponse = await fetch('/api/projects');
      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch projects');
      }
      const projectsData = await projectsResponse.json();
      const projects: Project[] = projectsData.projects || [];

      // Fetch tasks for each project that has active timers
      const taskPromises = projectIds.map(async projectId => {
        const tasksResponse = await fetch(`/api/projects/${projectId}/tasks`);
        if (!tasksResponse.ok) {
          console.warn(`Failed to fetch tasks for project ${projectId}`);
          return { projectId, tasks: [] };
        }
        const tasksData = await tasksResponse.json();
        return { projectId, tasks: tasksData.tasks || [] };
      });

      const taskResults = await Promise.all(taskPromises);

      // Create a map of project ID to project and tasks
      const newProjectTaskMap = new Map<string, ProjectTaskData>();
      projects.forEach(project => {
        const taskResult = taskResults.find(tr => tr.projectId === project.id);
        if (taskResult) {
          newProjectTaskMap.set(project.id, {
            project,
            tasks: taskResult.tasks,
          });
        }
      });

      setProjectTaskMap(newProjectTaskMap);
    } catch (err) {
      console.error('Error fetching project/task details:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch project/task details'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a stable key based on timer IDs (not array reference)
  const timerIdsKey = activeTimers
    .map(timer => timer.id)
    .sort()
    .join(',');

  // Fetch details when timer IDs actually change (not every second)
  useEffect(() => {
    fetchProjectTaskDetails();
  }, [timerIdsKey, fetchProjectTaskDetails]);

  if (error) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Timers
          </CardTitle>
          <CardDescription>Currently running and paused timers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">Failed to load active timers</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Active Timers
        </CardTitle>
        <CardDescription>Currently running and paused timers</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : activeTimers.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No active timers</p>
            <p className="text-sm text-gray-400">
              Start a timer from any task to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTimers.map(timer => {
              const projectTaskData = projectTaskMap.get(timer.projectId);
              if (!projectTaskData) {
                return null; // Skip if we don't have the data yet
              }

              const task = projectTaskData.tasks.find(
                t => t.id === timer.taskId
              );
              if (!task) {
                return null; // Skip if task not found
              }

              return (
                <ActiveTimerCard
                  key={timer.id}
                  timer={timer}
                  taskName={task.name}
                  projectName={projectTaskData.project.name}
                  projectColor={getProjectColor(projectTaskData.project.id)}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
