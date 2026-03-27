'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { MoreVertical, Trash2, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TimerDisplay } from '@/components/ui/timer-display';
import { useFreeTierWritableProjects } from '@/hooks/useFreeTierWritableProjects';
import { useTimerActions } from '@/hooks/useTimerActions';
import { getStatusColor, getStatusLabel } from '@/lib/status';
import { FREE_TIER_PROJECT_READONLY_SHORT_MESSAGE } from '@/lib/subscription-enforcement';
import {
  formatDate,
  getAssigneeDisplayName,
  truncateTextSmart,
} from '@/lib/utils';
import { TaskWithDetails } from '@/types';

interface TaskTableRowProps {
  task: TaskWithDetails;
  onDelete?: (task: TaskWithDetails) => void;
  onUpdate?: (
    taskId: string,
    updates: Partial<TaskWithDetails>
  ) => Promise<void>;
}

export function TaskTableRow({ task, onDelete, onUpdate }: TaskTableRowProps) {
  const router = useRouter();
  const freeTier = useFreeTierWritableProjects();
  const isReadOnly = !freeTier.isProjectWritable(task.project_id);
  const [showActions, setShowActions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const {
    timer,
    duration,
    canStart,
    canResume,
    canPause,
    canStop,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useTimerActions(task.id, task.project_id);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRowClick = () => {
    router.push(`/dashboard/projects/${task.project_id}/tasks/${task.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    onDelete?.(task);
    setShowActions(false);
  };

  const handleMarkAsCompleted = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly || !onUpdate || task.status === 'completed') return;
    try {
      setIsUpdating(true);
      await onUpdate(task.id, { status: 'completed' });
      setShowActions(false);
    } catch (error) {
      console.error('Failed to mark task as completed', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowClick();
        }
      }}
      className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <td className="py-3 px-4 font-medium text-gray-900">
        {truncateTextSmart(task.name, 40)}
      </td>
      <td className="py-3 px-4 text-sm">
        {task.due_date ? formatDate(task.due_date) : '—'}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {task.assignee_user ? (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {getAssigneeDisplayName(task.assignee_user)}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="py-3 px-4">
        <Badge className={getStatusColor(task.status)}>
          {getStatusLabel(task.status)}
        </Badge>
      </td>
      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
        {task.status !== 'completed' && (
          <TimerDisplay
            duration={duration}
            isRunning={timer?.isRunning ?? false}
            isPaused={timer?.isPaused ?? false}
            canStart={!isReadOnly && canStart}
            canResume={!isReadOnly && canResume}
            canPause={!isReadOnly && canPause}
            canStop={!isReadOnly && canStop}
            onStart={startTimer}
            onPause={pauseTimer}
            onResume={resumeTimer}
            onStop={stopTimer}
            hasTimer={!!timer}
            compact
          />
        )}
        {task.status === 'completed' && (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td
        className="py-3 px-4 text-right"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <div ref={actionsRef} className="relative inline-block">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={e => {
              e.stopPropagation();
              setShowActions(prev => !prev);
            }}
            disabled={isUpdating}
            aria-label="Task options"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          {showActions && (
            <div className="absolute right-0 top-full z-10 mt-1 min-w-[160px] rounded-md border bg-white py-1 shadow-lg">
              {task.status !== 'completed' && (
                <button
                  type="button"
                  onClick={handleMarkAsCompleted}
                  disabled={isReadOnly || isUpdating}
                  title={
                    isReadOnly
                      ? FREE_TIER_PROJECT_READONLY_SHORT_MESSAGE
                      : undefined
                  }
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Marking…' : 'Mark as Completed'}
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                disabled={isReadOnly}
                title={
                  isReadOnly
                    ? FREE_TIER_PROJECT_READONLY_SHORT_MESSAGE
                    : undefined
                }
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                Delete Task
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
