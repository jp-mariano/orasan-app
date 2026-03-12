'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PauseTimersModal } from '@/components/ui/pause-timers-modal';
import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { LocalTimer } from '@/hooks/useTimeTracker';
import { getProjectColor } from '@/lib/utils';
import { Project, Task } from '@/types';

import { ActiveTimerTableRow } from './ActiveTimerTableRow';

interface ProjectTaskData {
  project: Project;
  tasks: Task[];
}

const TIMERS_PER_PAGE = 10;

export function ActiveTimersSection() {
  const { activeTimers, pausedTimers, pauseAllTimers } =
    useTimeTrackingContext();
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

  const [showPauseTimersModal, setShowPauseTimersModal] = useState(false);
  const [isPausingAll, setIsPausingAll] = useState(false);

  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(
    new Set()
  );
  const [groupPage, setGroupPage] = useState<Record<string, number>>({});

  useEffect(() => {
    allActiveTimersRef.current = allActiveTimers;
  }, [allActiveTimers]);

  const toggleProject = (projectId: string) => {
    setExpandedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const fetchProjectTaskDetails = useCallback(async () => {
    const current = allActiveTimersRef.current;
    if (current.length === 0) {
      setProjectTaskMap(new Map());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const projectIds = [...new Set(current.map(t => t.projectId))];
      const projectsRes = await fetch('/api/projects');
      if (!projectsRes.ok) throw new Error('Failed to fetch projects');
      const { projects = [] }: { projects: Project[] } =
        await projectsRes.json();

      const taskResults = await Promise.all(
        projectIds.map(async projectId => {
          const res = await fetch(`/api/projects/${projectId}/tasks`);
          if (!res.ok) return { projectId, tasks: [] as Task[] };
          const data = await res.json();
          return { projectId, tasks: data.tasks || [] };
        })
      );

      const map = new Map<string, ProjectTaskData>();
      projects.forEach(project => {
        const tr = taskResults.find(r => r.projectId === project.id);
        if (tr) map.set(project.id, { project, tasks: tr.tasks });
      });
      setProjectTaskMap(map);
    } catch (err) {
      console.error('Error fetching project/task details', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch project/task details'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePauseAll = useCallback(async () => {
    const runningIds = allActiveTimers.filter(t => t.isRunning).map(t => t.id);
    if (runningIds.length === 0) return;
    setIsPausingAll(true);
    try {
      const success = await pauseAllTimers(runningIds);
      if (success) setShowPauseTimersModal(false);
    } catch (e) {
      console.error('Error pausing all timers', e);
    } finally {
      setIsPausingAll(false);
    }
  }, [allActiveTimers, pauseAllTimers]);

  const timerIdsKey = allActiveTimers
    .map(t => t.id)
    .sort()
    .join(',');
  useEffect(() => {
    fetchProjectTaskDetails();
  }, [timerIdsKey, fetchProjectTaskDetails]);

  // Group by project, sort projects by name, sort timers: running first, then by task name
  const projectsWithTimers = useMemo(() => {
    if (allActiveTimers.length === 0) return [];

    const byProject = new Map<string, LocalTimer[]>();
    allActiveTimers.forEach(timer => {
      const list = byProject.get(timer.projectId) || [];
      list.push(timer);
      byProject.set(timer.projectId, list);
    });

    const result: {
      projectId: string;
      project: Project;
      timers: LocalTimer[];
    }[] = [];

    byProject.forEach((timers, projectId) => {
      const data = projectTaskMap.get(projectId);
      if (!data) return; // skip until we have project/task data

      const getTaskName = (t: LocalTimer) => {
        const task = data.tasks.find(tk => tk.id === t.taskId);
        return task?.name ?? '';
      };

      const sorted = [...timers].sort((a, b) => {
        if (a.isRunning !== b.isRunning) return a.isRunning ? -1 : 1;
        const nameA = getTaskName(a);
        const nameB = getTaskName(b);
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      });

      result.push({ projectId, project: data.project, timers: sorted });
    });

    result.sort((a, b) =>
      a.project.name.localeCompare(b.project.name, undefined, {
        sensitivity: 'base',
      })
    );
    return result;
  }, [allActiveTimers, projectTaskMap]);

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Active Timers
            </CardTitle>
            <CardDescription>
              Currently running and paused timers
            </CardDescription>
          </div>
          {allActiveTimers.some(t => t.isRunning) && (
            <Button
              size="sm"
              onClick={() => setShowPauseTimersModal(true)}
              className="ml-4 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 hover:border-yellow-600"
            >
              Pause Timers
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-10 bg-gray-100 rounded w-48 animate-pulse" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">
                      Task name
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Timer</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map(i => (
                    <tr key={i} className="border-b">
                      <td className="py-3 px-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : allActiveTimers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No active or paused timers</p>
            <p className="text-sm text-gray-400">
              Start a timer from any task to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projectsWithTimers.map(({ projectId, project, timers }) => {
              const totalPages = Math.max(
                1,
                Math.ceil(timers.length / TIMERS_PER_PAGE)
              );
              const rawPage = groupPage[projectId] ?? 1;
              const currentPage = Math.min(Math.max(1, rawPage), totalPages);
              const pageTimers = timers.slice(
                (currentPage - 1) * TIMERS_PER_PAGE,
                currentPage * TIMERS_PER_PAGE
              );
              const projectTaskData = projectTaskMap.get(projectId);
              const isExpanded = expandedProjectIds.has(projectId);

              return (
                <div
                  key={projectId}
                  className="pl-3 border-l-4"
                  style={{
                    borderLeftColor: getProjectColor(projectId),
                  }}
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors p-1 rounded mb-1"
                    onClick={() => toggleProject(projectId)}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {project.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {timers.length}{' '}
                        {timers.length === 1 ? 'timer' : 'timers'}
                      </Badge>
                    </div>
                  </div>

                  {isExpanded && projectTaskData && (
                    <div className="ml-6 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium">
                              Task name
                            </th>
                            <th className="text-left py-3 px-4 font-medium">
                              Timer
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageTimers.map(timer => {
                            const task = projectTaskData.tasks.find(
                              t => t.id === timer.taskId
                            );
                            if (!task) return null;
                            return (
                              <ActiveTimerTableRow
                                key={timer.id}
                                timer={timer}
                                taskName={task.name}
                                projectId={projectId}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                      {totalPages > 1 && (
                        <div className="mt-3 flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={e => {
                              e.stopPropagation();
                              setGroupPage(prev => ({
                                ...prev,
                                [projectId]: Math.max(
                                  1,
                                  (prev[projectId] ?? 1) - 1
                                ),
                              }));
                            }}
                            disabled={currentPage === 1}
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                          ).map(p => (
                            <Button
                              key={p}
                              variant={
                                currentPage === p ? 'default' : 'outline'
                              }
                              size="sm"
                              className="h-8 min-w-8 p-0"
                              onClick={e => {
                                e.stopPropagation();
                                setGroupPage(prev => ({
                                  ...prev,
                                  [projectId]: p,
                                }));
                              }}
                              aria-label={`Page ${p}`}
                            >
                              {p}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={e => {
                              e.stopPropagation();
                              setGroupPage(prev => ({
                                ...prev,
                                [projectId]: Math.min(
                                  totalPages,
                                  (prev[projectId] ?? 1) + 1
                                ),
                              }));
                            }}
                            disabled={currentPage === totalPages}
                            aria-label="Next page"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <PauseTimersModal
        open={showPauseTimersModal}
        onOpenChange={setShowPauseTimersModal}
        title="Pause All Running Timers"
        description="Are you sure you want to pause all running timers? This will pause all currently running timers."
        confirmText="Proceed"
        onConfirm={handlePauseAll}
        isLoading={isPausingAll}
      />
    </Card>
  );
}
