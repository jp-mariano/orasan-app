import { useCallback } from 'react';

import { useTimeTrackingContext } from '@/contexts/time-tracking-context';

import { LocalTimer } from './useTimeTracker';

export interface TimerActions {
  timer: LocalTimer | null;
  duration: number;
  canStart: boolean;
  canResume: boolean;
  canPause: boolean;
  canStop: boolean;
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;
  resetTimer: () => Promise<boolean>;
}

export function useTimerActions(
  taskId: string,
  projectId: string
): TimerActions {
  const {
    getTimerForTask,
    canStartTimer,
    canResumeTimer,
    canPauseTimer,
    canStopTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    getTotalDuration,
  } = useTimeTrackingContext();

  const timer = getTimerForTask(taskId);
  const duration = getTotalDuration(taskId);

  const handleStartTimer = useCallback(async () => {
    await startTimer(taskId, projectId);
  }, [startTimer, taskId, projectId]);

  const handlePauseTimer = useCallback(async () => {
    await pauseTimer(taskId);
  }, [pauseTimer, taskId]);

  const handleResumeTimer = useCallback(async () => {
    await resumeTimer(taskId);
  }, [resumeTimer, taskId]);

  const handleStopTimer = useCallback(async () => {
    await stopTimer(taskId);
  }, [stopTimer, taskId]);

  const handleResetTimer = useCallback(async () => {
    return await resetTimer(taskId);
  }, [resetTimer, taskId]);

  return {
    timer,
    duration,
    canStart: canStartTimer(taskId),
    canResume: canResumeTimer(taskId),
    canPause: canPauseTimer(taskId),
    canStop: canStopTimer(taskId),
    startTimer: handleStartTimer,
    pauseTimer: handlePauseTimer,
    resumeTimer: handleResumeTimer,
    stopTimer: handleStopTimer,
    resetTimer: handleResetTimer,
  };
}
