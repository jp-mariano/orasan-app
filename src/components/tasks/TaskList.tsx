'use client';

import { useState } from 'react';

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { getPriorityBorderColor, getPriorityGroups } from '@/lib/priority';
import { TaskWithDetails } from '@/types';

import { TaskTableRow } from './TaskTableRow';

const TASKS_PER_PAGE = 10;

interface TaskListProps {
  tasks: TaskWithDetails[];
  loading?: boolean;
  onDelete?: (task: TaskWithDetails) => void;
  onUpdate?: (
    taskId: string,
    updates: Partial<TaskWithDetails>
  ) => Promise<void>;
}

export function TaskList({
  tasks,
  loading = false,
  onDelete,
  onUpdate,
}: TaskListProps) {
  const { getTimerForTask } = useTimeTrackingContext();
  const [expandedPriorities, setExpandedPriorities] = useState<Set<string>>(
    new Set(['urgent'])
  );
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [groupPage, setGroupPage] = useState<Record<string, number>>({});

  // Get priority groups from our source of truth
  const priorityGroups = getPriorityGroups().map(group => ({
    ...group,
    expanded: expandedPriorities.has(group.priority),
  }));

  const togglePriority = (priority: string) => {
    setExpandedPriorities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(priority)) {
        newSet.delete(priority);
      } else {
        newSet.add(priority);
      }
      return newSet;
    });
  };

  const getTasksByPriority = (priority: string) => {
    const priorityTasks = tasks.filter(
      task => task.priority === priority && task.status !== 'completed'
    );

    // Sort: tasks with active timer first, then by status (In Progress → On Hold → New)
    const statusOrder: Record<string, number> = {
      in_progress: 1,
      on_hold: 2,
      new: 3,
    };
    return priorityTasks.sort((a, b) => {
      const aActive = !!getTimerForTask(a.id);
      const bActive = !!getTimerForTask(b.id);
      if (aActive !== bActive) return aActive ? -1 : 1;
      const aOrder = statusOrder[a.status] || 4;
      const bOrder = statusOrder[b.status] || 4;
      return aOrder - bOrder;
    });
  };

  const getCompletedTasks = () => {
    const completed = tasks.filter(task => task.status === 'completed');
    return completed.sort((a, b) => {
      const aActive = !!getTimerForTask(a.id);
      const bActive = !!getTimerForTask(b.id);
      if (aActive !== bActive) return aActive ? -1 : 1;
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="pb-2">
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
        </div>
        <div className="pt-0">
          <div className="space-y-3">
            {priorityGroups.map(group => (
              <div
                key={group.priority}
                className="border-l-4 pl-3"
                style={{
                  borderLeftColor: getPriorityBorderColor(group.priority),
                }}
              >
                <div className="flex items-center gap-2 p-1 mb-1">
                  <div className="h-3 w-3 bg-gray-200 rounded"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                  <div className="h-3 w-5 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-0.5 ml-6">
                  {[1, 2].map(i => (
                    <div key={i} className="h-8 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900">No tasks yet</p>
            <p className="text-gray-500 mt-1">
              Get started by creating your first task
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {priorityGroups.map(group => {
        const priorityTasks = getTasksByPriority(group.priority);
        const taskCount = priorityTasks.length;
        const isExpanded = expandedPriorities.has(group.priority);
        const totalPages = Math.max(1, Math.ceil(taskCount / TASKS_PER_PAGE));
        const rawPage = groupPage[group.priority] ?? 1;
        const currentPage = Math.min(Math.max(1, rawPage), totalPages);
        const pageTasks = priorityTasks.slice(
          (currentPage - 1) * TASKS_PER_PAGE,
          currentPage * TASKS_PER_PAGE
        );

        if (taskCount === 0) return null;

        return (
          <div
            key={group.priority}
            className="border-l-4 pl-3"
            style={{
              borderLeftColor: getPriorityBorderColor(group.priority),
            }}
          >
            {/* Priority Header */}
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors p-1 rounded mb-1"
              onClick={() => togglePriority(group.priority)}
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
                <span className="font-medium text-sm">{group.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </Badge>
              </div>
            </div>

            {/* Tasks */}
            {isExpanded && (
              <div className="ml-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Name</th>
                      <th className="text-left py-3 px-4 font-medium">
                        Due date
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Assignee
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Timer</th>
                      <th className="w-10 py-3 px-4" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageTasks.map(task => (
                      <TaskTableRow
                        key={task.id}
                        task={task}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                      />
                    ))}
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
                          [group.priority]: Math.max(
                            1,
                            (prev[group.priority] ?? 1) - 1
                          ),
                        }));
                      }}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      p => (
                        <Button
                          key={p}
                          variant={currentPage === p ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 min-w-8 p-0"
                          onClick={e => {
                            e.stopPropagation();
                            setGroupPage(prev => ({
                              ...prev,
                              [group.priority]: p,
                            }));
                          }}
                          aria-label={`Page ${p}`}
                        >
                          {p}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={e => {
                        e.stopPropagation();
                        setGroupPage(prev => ({
                          ...prev,
                          [group.priority]: Math.min(
                            totalPages,
                            (prev[group.priority] ?? 1) + 1
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

      {/* Completed Tasks Section */}
      {(() => {
        const completedTasks = getCompletedTasks();
        const completedCount = completedTasks.length;
        const totalPages = Math.max(
          1,
          Math.ceil(completedCount / TASKS_PER_PAGE)
        );
        const rawPage = groupPage['completed'] ?? 1;
        const currentPage = Math.min(Math.max(1, rawPage), totalPages);
        const pageTasks = completedTasks.slice(
          (currentPage - 1) * TASKS_PER_PAGE,
          currentPage * TASKS_PER_PAGE
        );

        if (completedCount === 0) return null;

        return (
          <div className="border-l-4 pl-3 border-gray-300">
            {/* Completed Header */}
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors p-1 rounded mb-1"
              onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                {isCompletedExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>

              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-600">
                  Completed
                </span>
                <Badge variant="secondary" className="text-xs">
                  {completedCount} {completedCount === 1 ? 'task' : 'tasks'}
                </Badge>
              </div>
            </div>

            {/* Completed Tasks */}
            {isCompletedExpanded && (
              <div className="ml-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Name</th>
                      <th className="text-left py-3 px-4 font-medium">
                        Due date
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Assignee
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Timer</th>
                      <th className="w-10 py-3 px-4" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageTasks.map(task => (
                      <TaskTableRow
                        key={task.id}
                        task={task}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                      />
                    ))}
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
                          completed: Math.max(1, (prev['completed'] ?? 1) - 1),
                        }));
                      }}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      p => (
                        <Button
                          key={p}
                          variant={currentPage === p ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 min-w-8 p-0"
                          onClick={e => {
                            e.stopPropagation();
                            setGroupPage(prev => ({ ...prev, completed: p }));
                          }}
                          aria-label={`Page ${p}`}
                        >
                          {p}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={e => {
                        e.stopPropagation();
                        setGroupPage(prev => ({
                          ...prev,
                          completed: Math.min(
                            totalPages,
                            (prev['completed'] ?? 1) + 1
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
      })()}
    </div>
  );
}
