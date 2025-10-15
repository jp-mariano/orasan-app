'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

// Auto-fit grid that automatically adjusts columns based on available space
function getGridColsClass(): string {
  return 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]';
}

export function ActiveTimersSection() {
  const { activeTimers, pausedTimers } = useTimeTrackingContext();
  // Combine running and paused timers for display
  const allActiveTimers = useMemo(
    () => [...activeTimers, ...pausedTimers],
    [activeTimers, pausedTimers]
  );
  const allActiveTimersRef = useRef(allActiveTimers);
  const [projectTaskMap, setProjectTaskMap] = useState<
    Map<string, ProjectTaskData>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accordion state - both sections open by default
  const [expandedSections, setExpandedSections] = useState(
    new Set(['active', 'paused'])
  );

  // Keep ref updated with current allActiveTimers
  useEffect(() => {
    allActiveTimersRef.current = allActiveTimers;
  }, [allActiveTimers]);

  // Toggle accordion section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Get timers by state
  const getTimersByState = (state: 'active' | 'paused') => {
    const timers = state === 'active' ? activeTimers : pausedTimers;
    return timers;
  };

  // Get total timers by state
  const getTotalTimersByState = (state: 'active' | 'paused') => {
    return getTimersByState(state).length;
  };

  // Fetch project and task details once when active timers change
  const fetchProjectTaskDetails = useCallback(async () => {
    const currentActiveTimers = allActiveTimersRef.current;
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
  const timerIdsKey = allActiveTimers
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
            Active Timers
          </CardTitle>
          <CardDescription>Currently running and paused timers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">Failed to load timer data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Active Timers</CardTitle>
        <CardDescription>Currently running and paused timers</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className={`grid gap-6 w-full ${getGridColsClass()}`}>
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : allActiveTimers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No active or paused timers</p>
            <p className="text-sm text-gray-400">
              Start a timer from any task to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Timers Section */}
            {getTotalTimersByState('active') > 0 && (
              <div className="pl-3">
                {/* Active Timers Header */}
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors p-1 rounded mb-1"
                  onClick={() => toggleSection('active')}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                  >
                    {expandedSections.has('active') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>

                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Active Timers</span>
                    <Badge variant="secondary" className="text-xs">
                      {getTotalTimersByState('active')}{' '}
                      {getTotalTimersByState('active') === 1
                        ? 'timer'
                        : 'timers'}
                    </Badge>
                  </div>
                </div>

                {/* Active Timers Grid */}
                {expandedSections.has('active') && (
                  <div className={`grid gap-6 w-full ${getGridColsClass()}`}>
                    {getTimersByState('active').map(timer => {
                      const projectTaskData = projectTaskMap.get(
                        timer.projectId
                      );
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
                          projectColor={getProjectColor(
                            projectTaskData.project.id
                          )}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Paused Timers Section */}
            {getTotalTimersByState('paused') > 0 && (
              <div className="pl-3">
                {/* Paused Timers Header */}
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors p-1 rounded mb-1"
                  onClick={() => toggleSection('paused')}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                  >
                    {expandedSections.has('paused') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>

                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Paused Timers</span>
                    <Badge variant="secondary" className="text-xs">
                      {getTotalTimersByState('paused')}{' '}
                      {getTotalTimersByState('paused') === 1
                        ? 'timer'
                        : 'timers'}
                    </Badge>
                  </div>
                </div>

                {/* Paused Timers Grid */}
                {expandedSections.has('paused') && (
                  <div className={`grid gap-6 w-full ${getGridColsClass()}`}>
                    {getTimersByState('paused').map(timer => {
                      const projectTaskData = projectTaskMap.get(
                        timer.projectId
                      );
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
                          projectColor={getProjectColor(
                            projectTaskData.project.id
                          )}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
