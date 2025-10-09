'use client';

import { TimerDisplay } from '@/components/ui/timer-display';
import { useTimerActions } from '@/hooks/useTimerActions';

interface TaskDetailTimerProps {
  taskId: string;
  projectId: string;
}

export function TaskDetailTimer({ taskId, projectId }: TaskDetailTimerProps) {
  const timerActions = useTimerActions(taskId, projectId);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-500">Timer</label>
      <TimerDisplay
        duration={timerActions.duration}
        isRunning={timerActions.timer?.isRunning || false}
        isPaused={timerActions.timer?.isPaused || false}
        canStart={timerActions.canStart}
        canResume={timerActions.canResume}
        canPause={timerActions.canPause}
        canStop={timerActions.canStop}
        onStart={timerActions.startTimer}
        onPause={timerActions.pauseTimer}
        onResume={timerActions.resumeTimer}
        onStop={timerActions.stopTimer}
        hasTimer={!!timerActions.timer}
      />
    </div>
  );
}
