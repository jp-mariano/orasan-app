import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';

interface WorkSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  status: 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

interface WorkSessionStats {
  todayTime: number; // Total work time today in seconds
  weekTime: number; // Total work time this week in seconds
}

interface UseWorkSessionReturn {
  currentSession: WorkSession | null;
  isLoading: boolean;
  error: string | null;
  startWorkSession: () => Promise<boolean>;
  endWorkSession: () => Promise<boolean>;
  updateSessionDuration: (duration: number) => Promise<boolean>;
  // Stats functionality
  stats: WorkSessionStats;
  statsLoading: boolean;
  statsError: string | null;
  refreshStats: () => Promise<void>;
}

export function useWorkSession(): UseWorkSessionReturn {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stats state
  const [stats, setStats] = useState<WorkSessionStats>({
    todayTime: 0,
    weekTime: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Load current active session when user becomes available
  useEffect(() => {
    if (user) {
      loadCurrentSession();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear work session state when user signs out
  useEffect(() => {
    if (!user) {
      setCurrentSession(null);
      setError(null);
      setStats({ todayTime: 0, weekTime: 0 });
      setStatsError(null);
    }
  }, [user]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  const loadCurrentSession = useCallback(async () => {
    // Don't load if user is not authenticated
    if (!user) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/work-sessions?status=active');
      if (!response.ok) {
        // Handle authentication errors gracefully during sign out
        if (response.status === 401) {
          setCurrentSession(null);
          return;
        }
        throw new Error('Failed to fetch current session');
      }

      const data = await response.json();
      const activeSessions = data.work_sessions || [];

      if (activeSessions.length > 0) {
        setCurrentSession(activeSessions[0]);
        startDurationUpdate();
      } else {
        setCurrentSession(null);
      }
    } catch (err) {
      console.error('Error loading current session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSessionDuration = useCallback(
    async (duration: number): Promise<boolean> => {
      if (!currentSession) return false;

      try {
        const response = await fetch(
          `/api/work-sessions/${currentSession.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              duration_seconds: duration,
            }),
          }
        );

        if (!response.ok) {
          // Handle authentication errors gracefully during sign out
          if (response.status === 401) {
            return false;
          }
          const errorData = await response.json();
          throw new Error(
            errorData.error || 'Failed to update session duration'
          );
        }

        const data = await response.json();
        setCurrentSession(data.work_session);
        return true;
      } catch (err) {
        console.error('Error updating session duration:', err);
        return false;
      }
    },
    [currentSession]
  );

  const startDurationUpdate = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    updateIntervalRef.current = setInterval(async () => {
      if (currentSession) {
        const startTime = new Date(currentSession.start_time);
        const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
        await updateSessionDuration(duration);
      }
    }, 60000); // Update every minute
  }, [currentSession, updateSessionDuration]);

  // Fetch work session statistics
  const fetchStats = useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!user) {
      return;
    }

    try {
      setStatsLoading(true);
      setStatsError(null);

      // Get today's date range
      const today = new Date();
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      // Get this week's date range
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // End of week (Saturday)
      endOfWeek.setHours(23, 59, 59, 999);

      // Fetch all work sessions (we'll filter client-side for efficiency)
      const response = await fetch('/api/work-sessions');

      if (!response.ok) {
        // Handle authentication errors gracefully during sign out
        if (response.status === 401) {
          return;
        }
        throw new Error('Failed to fetch work session statistics');
      }

      const data = await response.json();

      const allSessions = data.work_sessions || [];

      // Calculate total work time for today
      const todayTime = allSessions
        .filter((session: { status: string; start_time: string }) => {
          if (session.status !== 'completed') return false;
          const sessionDate = new Date(session.start_time);
          return sessionDate >= startOfToday && sessionDate <= endOfToday;
        })
        .reduce(
          (total: number, session: { duration_seconds?: number }) =>
            total + (session.duration_seconds || 0),
          0
        );

      // Calculate total work time for this week
      const weekTime = allSessions
        .filter((session: { status: string; start_time: string }) => {
          if (session.status !== 'completed') return false;
          const sessionDate = new Date(session.start_time);
          return sessionDate >= startOfWeek && sessionDate <= endOfWeek;
        })
        .reduce(
          (total: number, session: { duration_seconds?: number }) =>
            total + (session.duration_seconds || 0),
          0
        );

      setStats({
        todayTime,
        weekTime,
      });
    } catch (err) {
      console.error('Error fetching work session stats:', err);
      setStatsError(
        err instanceof Error ? err.message : 'Failed to fetch stats'
      );
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  const startWorkSession = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/work-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: new Date().toISOString(),
          status: 'active',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start work session');
      }

      const data = await response.json();
      setCurrentSession(data.work_session);
      startDurationUpdate();
      // Refresh stats after successful session start
      fetchStats();
      return true;
    } catch (err) {
      console.error('Error starting work session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [startDurationUpdate, fetchStats]);

  const endWorkSession = useCallback(async (): Promise<boolean> => {
    if (!currentSession) return false;

    try {
      setIsLoading(true);
      setError(null);

      const endTime = new Date().toISOString();
      const startTime = new Date(currentSession.start_time);
      const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);

      const response = await fetch(`/api/work-sessions/${currentSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          end_time: endTime,
          duration_seconds: duration,
          status: 'completed',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to end work session');
      }

      setCurrentSession(null);
      stopDurationUpdate();
      // Refresh stats after successful session end
      fetchStats();
      return true;
    } catch (err) {
      console.error('Error ending work session:', err);
      setError(err instanceof Error ? err.message : 'Failed to end session');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, fetchStats]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopDurationUpdate = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  // Load stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Refresh stats when current session changes (session started/ended)
  useEffect(() => {
    // Refresh stats whenever session state changes (start or end)
    fetchStats();
  }, [currentSession, fetchStats]);

  return {
    currentSession,
    isLoading,
    error,
    startWorkSession,
    endWorkSession,
    updateSessionDuration,
    // Stats functionality
    stats,
    statsLoading,
    statsError,
    refreshStats: fetchStats,
  };
}
