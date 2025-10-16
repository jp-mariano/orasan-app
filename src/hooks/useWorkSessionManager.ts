import { useEffect } from 'react';

import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { useWorkSessionContext } from '@/contexts/work-session-context';

export function useWorkSessionManager(): void {
  const { activeTimers } = useTimeTrackingContext();
  const { currentSession, isLoading, startWorkSession, endWorkSession } =
    useWorkSessionContext();

  // Track timer state changes and manage work sessions
  useEffect(() => {
    // Don't do anything while the session is still loading
    if (isLoading) {
      return;
    }

    const currentActiveCount = activeTimers.length;

    // Check if we need to start a work session
    if (currentActiveCount > 0 && !currentSession) {
      // At least one timer is running and no work session exists
      startWorkSession().catch(error => {
        // Handle the case where a session already exists
        if (error.message.includes('already exists')) {
          console.log('Work session already exists, skipping creation');
        } else {
          console.error('Failed to start work session:', error);
        }
      });
    }
    // Check if we need to end a work session
    else if (currentActiveCount === 0 && currentSession) {
      // No timers are running, but work session exists
      endWorkSession();
    }
  }, [
    activeTimers.length,
    currentSession,
    isLoading,
    startWorkSession,
    endWorkSession,
  ]);
}
