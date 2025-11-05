import { useCallback, useEffect, useState } from 'react';

import { checkAndHandleUnauthorized } from '@/lib/unauthorized-handler';
import { UpdateUserRequest, User } from '@/types';

interface UseUserReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  updateUser: (updates: UpdateUserRequest) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user data
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/users');
      const data = await response.json();

      // Check for unauthorized errors before processing response
      if (!response.ok) {
        const handled = await checkAndHandleUnauthorized(response);
        if (handled) {
          return; // User will be redirected, no need to continue
        }
        throw new Error(data.error || 'Failed to fetch user data');
      }

      setUser(data.user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch user data';
      setError(errorMessage);
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user data
  const updateUser = useCallback(
    async (updates: UpdateUserRequest): Promise<boolean> => {
      try {
        setError(null);

        const response = await fetch('/api/users', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        const data = await response.json();

        // Check for unauthorized errors before processing response
        if (!response.ok) {
          const handled = await checkAndHandleUnauthorized(response);
          if (handled) {
            return false; // User will be redirected
          }
          throw new Error(data.error || 'Failed to update user data');
        }

        // Update local state with the updated user data
        setUser(data.user);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update user data';
        setError(errorMessage);
        console.error('Error updating user data:', err);
        return false;
      }
    },
    []
  );

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // Load user data on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    updateUser,
    refreshUser,
  };
}
