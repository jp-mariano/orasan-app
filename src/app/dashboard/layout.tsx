'use client';

import { ReactNode } from 'react';

import { TimerLimitDisplay } from '@/components/ui/timer-limit-display';
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
    <>
      <WorkSessionManager />
      <TimerLimitDisplay />
      {children}
    </>
  );
}
