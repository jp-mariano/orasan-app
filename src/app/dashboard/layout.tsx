'use client';

import { ReactNode } from 'react';

import { TimeTrackingProvider } from '@/contexts/time-tracking-context';
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

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <TimeTrackingProvider>
      <WorkSessionProvider>
        <WorkSessionManager />
        {children}
      </WorkSessionProvider>
    </TimeTrackingProvider>
  );
}
