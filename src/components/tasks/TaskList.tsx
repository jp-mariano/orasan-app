'use client';

import { useState } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPriorityBorderColor, getPriorityGroups } from '@/lib/priority';
import { TaskWithDetails } from '@/types';

import { TaskCard } from './TaskCard';

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
  const [expandedPriorities, setExpandedPriorities] = useState<Set<string>>(
    new Set(['urgent'])
  );
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

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

    // Sort by status: In Progress → On Hold → New
    return priorityTasks.sort((a, b) => {
      const statusOrder: Record<string, number> = {
        in_progress: 1,
        on_hold: 2,
        new: 3,
      };
      const aOrder = statusOrder[a.status] || 4;
      const bOrder = statusOrder[b.status] || 4;
      return aOrder - bOrder;
    });
  };

  const getTotalTasksByPriority = (priority: string) => {
    return getTasksByPriority(priority).length;
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
        const taskCount = getTotalTasksByPriority(group.priority);
        const isExpanded = expandedPriorities.has(group.priority);

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
              <div className="space-y-0.5 ml-6">
                {priorityTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Completed Tasks Section */}
      {(() => {
        const completedTasks = tasks
          .filter(task => task.status === 'completed')
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime()
          );
        const completedCount = completedTasks.length;

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
              <div className="space-y-0.5 ml-6">
                {completedTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
