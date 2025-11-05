import { useState } from 'react';

import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { checkAndHandleUnauthorized } from '@/lib/unauthorized-handler';

interface UseAccountDeletionReturn {
  isDeleting: boolean;
  isCanceling: boolean;
  error: string | null;
  requestAccountDeletion: (
    confirmUserId: string,
    confirmEmail: string
  ) => Promise<boolean>;
  cancelAccountDeletion: () => Promise<boolean>;
}

export function useAccountDeletion(): UseAccountDeletionReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get timer context for pause functionality
  const { activeTimers, pauseAllTimers } = useTimeTrackingContext();

  const requestAccountDeletion = async (
    confirmUserId: string,
    confirmEmail: string
  ): Promise<boolean> => {
    try {
      setIsDeleting(true);
      setError(null);

      // Step 1: Pause all active timers first (same as project deletion)
      if (activeTimers.length > 0) {
        const timerIds = activeTimers.map(timer => timer.id);
        const pauseSuccess = await pauseAllTimers(timerIds);
        if (!pauseSuccess) {
          return false; // pauseAllTimers already sets error state
        }
      }

      // Step 2: Request account deletion
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmUserId,
          confirmEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const handled = await checkAndHandleUnauthorized(response);
        if (handled) {
          return false; // User will be redirected
        }
        throw new Error(data.error || 'Failed to request account deletion');
      }

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelAccountDeletion = async (): Promise<boolean> => {
    try {
      setIsCanceling(true);
      setError(null);

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel-deletion',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const handled = await checkAndHandleUnauthorized(response);
        if (handled) {
          return false; // User will be redirected
        }
        throw new Error(data.error || 'Failed to cancel account deletion');
      }

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsCanceling(false);
    }
  };

  return {
    isDeleting,
    isCanceling,
    error,
    requestAccountDeletion,
    cancelAccountDeletion,
  };
}
