'use client';

import { useEffect, useRef, useState } from 'react';

import { MoreVertical, Pause, Play, Square, Trash2, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getStatusColor, getStatusLabel } from '@/lib/status';
import {
  formatDate,
  getAssigneeDisplayName,
  truncateTextSmart,
} from '@/lib/utils';
import { TaskWithDetails } from '@/types';

interface TaskCardProps {
  task: TaskWithDetails;
  onDelete?: (task: TaskWithDetails) => void;
  onUpdate?: (
    taskId: string,
    updates: Partial<TaskWithDetails>
  ) => Promise<void>;
}

export function TaskCard({ task, onDelete, onUpdate }: TaskCardProps) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePlayPause = () => {
    setIsTimerRunning(!isTimerRunning);
    // TODO: Implement actual time tracking
  };

  const handleStop = () => {
    setIsTimerRunning(false);
    // TODO: Implement actual time tracking
  };

  const handleDelete = () => {
    onDelete?.(task);
  };

  const handleMarkAsCompleted = async () => {
    if (!onUpdate || task.status === 'completed') return;

    try {
      setIsUpdating(true);
      await onUpdate(task.id, { status: 'completed' });
      setShowActions(false);
    } catch (error) {
      console.error('Failed to mark task as completed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group mb-3"
      onClick={() =>
        (window.location.href = `/dashboard/projects/${task.project_id}/tasks/${task.id}`)
      }
    >
      <CardContent>
        <div className="flex items-center justify-between">
          {/* Task Info */}
          <div className="flex-1 min-w-0">
            {/* Task Name */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 text-sm">
                {truncateTextSmart(task.name, 40)}
              </h3>
            </div>

            {/* Additional Details Row */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {/* Due Date */}
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <span>Due: {formatDate(task.due_date)}</span>
                </div>
              )}

              {/* Assignee */}
              {task.assignee_user && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{getAssigneeDisplayName(task.assignee_user)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Badge and Actions */}
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(task.status)}>
              {getStatusLabel(task.status)}
            </Badge>

            <div className="relative" ref={actionsRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation(); // Prevent card click when clicking options
                  setShowActions(!showActions);
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {showActions && (
                <div className="absolute right-0 top-8 bg-white border rounded-md shadow-lg z-10 py-1 min-w-[140px]">
                  {/* Mark as Completed - Only show for non-completed tasks */}
                  {task.status !== 'completed' && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleMarkAsCompleted();
                      }}
                      disabled={isUpdating}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>
                        {isUpdating ? 'Marking...' : 'Mark as Completed'}
                      </span>
                    </button>
                  )}

                  {/* Time Tracking Actions - Only show for non-completed tasks */}
                  {task.status !== 'completed' && (
                    <>
                      <div className="border-t my-1"></div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handlePlayPause();
                          setShowActions(false);
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                      >
                        {!isTimerRunning ? (
                          <>
                            <Play className="h-4 w-4" />
                            <span>Start Timer</span>
                          </>
                        ) : (
                          <>
                            <Pause className="h-4 w-4" />
                            <span>Pause Timer</span>
                          </>
                        )}
                      </button>

                      {isTimerRunning && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleStop();
                            setShowActions(false);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          <Square className="h-4 w-4" />
                          <span>Stop Timer</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Delete Action */}
                  <div className="border-t my-1"></div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete();
                      setShowActions(false);
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Task</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
