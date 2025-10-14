'use client';

import { useRouter } from 'next/navigation';

import { Card, CardContent } from '@/components/ui/card';
import { TimerDisplay } from '@/components/ui/timer-display';
import { useTimerActions } from '@/hooks/useTimerActions';
import { LocalTimer } from '@/hooks/useTimeTracker';

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
    timer: timerData,
    duration,
    canStart,
    canResume,
    canPause,
    canStop,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useTimerActions(timer.taskId, timer.projectId);

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
            <div className="mt-2">
              <TimerDisplay
                duration={duration}
                isRunning={timerData?.isRunning || false}
                isPaused={timerData?.isPaused || false}
                canStart={canStart}
                canResume={canResume}
                canPause={canPause}
                canStop={canStop}
                onStart={startTimer}
                onPause={pauseTimer}
                onResume={resumeTimer}
                onStop={stopTimer}
                hasTimer={!!timerData}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
