'use client';

import { useCallback, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { useWorkSessionContext } from '@/contexts/work-session-context';

interface UseSignOutWithTimerCheckOptions {
  onSignOut: () => Promise<void> | void;
  onPauseComplete?: () => void;
}

interface UseSignOutWithTimerCheckReturn {
  handleSignOut: () => Promise<void>;
  isSigningOut: boolean;
  showPauseTimersModal: boolean;
  setShowPauseTimersModal: (show: boolean) => void;
  isPausingAll: boolean;
  handlePauseAll: () => Promise<void>;
  handleCancelPause: () => void;
}

export function useSignOutWithTimerCheck({
  onSignOut,
  onPauseComplete,
}: UseSignOutWithTimerCheckOptions): UseSignOutWithTimerCheckReturn {
  const { isSigningOut } = useAuth();
  const { activeTimers, pauseAllTimers } = useTimeTrackingContext();
  const { currentSession, endWorkSession } = useWorkSessionContext();
  const [showPauseTimersModal, setShowPauseTimersModal] = useState(false);
  const [isPausingAll, setIsPausingAll] = useState(false);

  // Helper function to end work session if it exists
  const endWorkSessionIfExists = useCallback(async (): Promise<void> => {
    if (currentSession) {
      try {
        await endWorkSession();
      } catch (error) {
        console.error('Failed to end work session before sign out:', error);
        // Don't throw - we still want to proceed with sign out
      }
    }
  }, [currentSession, endWorkSession]);

  const handleSignOut = useCallback(async () => {
    // Check if there are active timers
    if (activeTimers.length > 0) {
      // Show the pause timers modal instead of signing out directly
      setShowPauseTimersModal(true);
      return;
    }

    // No active timers, proceed with sign out
    try {
      await onSignOut();
      // The auth context will handle isSigningOut state
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [activeTimers.length, onSignOut]);

  const handlePauseAll = useCallback(async () => {
    try {
      setIsPausingAll(true);

      // Get timer IDs for all active timers
      const timerIds = activeTimers.map(timer => timer.id);

      // Pause all timers
      const success = await pauseAllTimers(timerIds);

      if (success) {
        // Close the modal
        setShowPauseTimersModal(false);

        // Call the pause complete callback if provided
        onPauseComplete?.();

        // Manually end work session before signing out to avoid race conditions
        await endWorkSessionIfExists();

        // Now proceed with sign out
        await onSignOut();
        // The auth context will handle isSigningOut state
      } else {
        console.error('Failed to pause timers');
        // Keep modal open to let user retry or cancel
      }
    } catch (error) {
      console.error('Error pausing timers:', error);
      // Keep modal open to let user retry or cancel
    } finally {
      setIsPausingAll(false);
    }
  }, [
    activeTimers,
    pauseAllTimers,
    onPauseComplete,
    onSignOut,
    endWorkSessionIfExists,
  ]);

  const handleCancelPause = useCallback(() => {
    setShowPauseTimersModal(false);
    setIsPausingAll(false);
  }, []);

  return {
    handleSignOut,
    isSigningOut,
    showPauseTimersModal,
    setShowPauseTimersModal,
    isPausingAll,
    handlePauseAll,
    handleCancelPause,
  };
}
