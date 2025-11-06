'use client';

import { createContext, useContext, ReactNode } from 'react';

import { useTimeTracker, LocalTimer } from '@/hooks/useTimeTracker';

interface TimeTrackingContextType {
  // Timer state
  timers: LocalTimer[];
  activeTimers: LocalTimer[];
  pausedTimers: LocalTimer[];

  // Timer actions
  startTimer: (taskId: string, projectId: string) => Promise<boolean>;
  pauseTimer: (taskId: string) => Promise<boolean>;
  pauseAllTimers: (timerIds: string[]) => Promise<boolean>;
  stopAllTimers: (projectId: string) => Promise<boolean>;
  resumeTimer: (taskId: string) => Promise<boolean>;
  stopTimer: (taskId: string) => Promise<boolean>;
  resetTimer: (taskId: string) => Promise<boolean>;

  // Timer utilities
  getTimerForTask: (taskId: string) => LocalTimer | null;
  canStartTimer: (taskId: string) => boolean;
  canResumeTimer: (taskId: string) => boolean;
  canPauseTimer: (taskId: string) => boolean;
  canStopTimer: (taskId: string) => boolean;
  formatDuration: (seconds: number) => string;
  getTotalDuration: (taskId: string) => number;

  // Sync functions
  refreshTimerForTask: (taskId: string) => Promise<void>;

  // State
  isLoading: boolean;
  error: string | null;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(
  undefined
);

interface TimeTrackingProviderProps {
  children: ReactNode;
}

export function TimeTrackingProvider({ children }: TimeTrackingProviderProps) {
  const timeTracker = useTimeTracker();

  return (
    <TimeTrackingContext.Provider value={timeTracker}>
      {children}
    </TimeTrackingContext.Provider>
  );
}

export function useTimeTrackingContext() {
  const context = useContext(TimeTrackingContext);
  if (context === undefined) {
    throw new Error(
      'useTimeTrackingContext must be used within a TimeTrackingProvider'
    );
  }
  return context;
}
