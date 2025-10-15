'use client';

import { createContext, useContext, ReactNode } from 'react';

import { useWorkSession } from '@/hooks/useWorkSession';

interface WorkSessionContextType {
  currentSession: ReturnType<typeof useWorkSession>['currentSession'];
  isLoading: boolean;
  error: string | null;
  startWorkSession: () => Promise<boolean>;
  endWorkSession: () => Promise<boolean>;
  updateSessionDuration: (duration: number) => Promise<boolean>;
  // Stats functionality
  stats: ReturnType<typeof useWorkSession>['stats'];
  statsLoading: boolean;
  statsError: string | null;
  refreshStats: () => Promise<void>;
}

const WorkSessionContext = createContext<WorkSessionContextType | undefined>(
  undefined
);

interface WorkSessionProviderProps {
  children: ReactNode;
}

export function WorkSessionProvider({ children }: WorkSessionProviderProps) {
  const workSession = useWorkSession();

  return (
    <WorkSessionContext.Provider value={workSession}>
      {children}
    </WorkSessionContext.Provider>
  );
}

export function useWorkSessionContext() {
  const context = useContext(WorkSessionContext);
  if (context === undefined) {
    throw new Error(
      'useWorkSessionContext must be used within a WorkSessionProvider'
    );
  }
  return context;
}
