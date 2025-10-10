'use client';

import { useRouter } from 'next/navigation';

import { Pause, Play, Square, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { LocalTimer } from '@/hooks/useTimeTracker';
import { formatDuration } from '@/lib/utils';

interface ActiveTimerCardProps {
  timer: LocalTimer;
  taskName: string;
  projectName: string;
  projectColor?: string;
  onNavigateToTask?: () => void;
}

export function ActiveTimerCard({
  timer,
  taskName,
  projectName,
  projectColor = 'oklch(0.6 0.2 240)', // Default blue color
  onNavigateToTask,
}: ActiveTimerCardProps) {
  const router = useRouter();
  const {
    pauseTimer,
    resumeTimer,
    stopTimer,
    getTotalDuration,
    canPauseTimer,
    canResumeTimer,
    canStopTimer,
  } = useTimeTrackingContext();

  const currentDuration = getTotalDuration(timer.taskId);

  const handlePause = async () => {
    await pauseTimer(timer.taskId);
  };

  const handleResume = async () => {
    await resumeTimer(timer.taskId);
  };

  const handleStop = async () => {
    await stopTimer(timer.taskId);
  };

  const handleNavigateToTask = () => {
    if (onNavigateToTask) {
      onNavigateToTask();
    } else {
      router.push(
        `/dashboard/projects/${timer.projectId}/tasks/${timer.taskId}`
      );
    }
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
      {/* Project Color Indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: projectColor }}
      />

      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Task and Project Info */}
          <div className="flex-1 min-w-0">
            <button
              onClick={handleNavigateToTask}
              className="text-left w-full hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
            >
              <h3 className="font-medium text-gray-900 truncate">{taskName}</h3>
              <p className="text-sm text-gray-500 truncate">{projectName}</p>
            </button>

            {/* Timer Display */}
            <div className="flex items-center gap-2 mt-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="font-mono text-lg font-medium text-gray-900">
                {formatDuration(currentDuration)}
              </span>
              {timer.isRunning && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600 font-medium">
                    Running
                  </span>
                </div>
              )}
              {timer.isPaused && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span className="text-xs text-yellow-600 font-medium">
                    Paused
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center gap-1 ml-4">
            {timer.isRunning && canPauseTimer(timer.taskId) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePause}
                className="h-8 w-8 p-0"
                title="Pause timer"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}

            {timer.isPaused && canResumeTimer(timer.taskId) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleResume}
                className="h-8 w-8 p-0"
                title="Resume timer"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}

            {canStopTimer(timer.taskId) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStop}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Stop timer"
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
