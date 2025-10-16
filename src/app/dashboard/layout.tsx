'use client';

import { ReactNode } from 'react';

import {
  TimeTrackingProvider,
  useTimeTrackingContext,
} from '@/contexts/time-tracking-context';
import { WorkSessionProvider } from '@/contexts/work-session-context';
import { useWorkSessionManager } from '@/hooks/useWorkSessionManager';

interface DashboardLayoutProps {
  children: ReactNode;
}

// Simple component that initializes work session manager
function WorkSessionManager() {
  useWorkSessionManager();
  return null;
}

// Global error display for timer errors
function TimerErrorDisplay() {
  const { error } = useTimeTrackingContext();

  if (!error) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-red-800">Timer Error</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <TimeTrackingProvider>
      <WorkSessionProvider>
        <WorkSessionManager />
        <TimerErrorDisplay />
        {children}
      </WorkSessionProvider>
    </TimeTrackingProvider>
  );
}
