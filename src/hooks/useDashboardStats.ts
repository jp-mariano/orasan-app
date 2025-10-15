import { useEffect, useState } from 'react';

import { useTimeTrackingContext } from '@/contexts/time-tracking-context';

interface DashboardStats {
  todayTime: number; // Total time tracked today in seconds
  weekTime: number; // Total time tracked this week in seconds
}

export function useDashboardStats() {
  const { activeTimers, pausedTimers, formatDuration } =
    useTimeTrackingContext();
  const [stats, setStats] = useState<DashboardStats>({
    todayTime: 0,
    weekTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch time metrics from API
  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      // Fetch time entries for today
      const todayResponse = await fetch(
        `/api/time-entries?date=${startOfToday.toISOString()}`
      );
      const todayData = await todayResponse.json();

      // For now, we'll fetch all time entries and filter client-side
      // TODO: Enhance API to support date ranges for better performance
      const allResponse = await fetch('/api/time-entries');
      const allData = await allResponse.json();

      if (!todayResponse.ok || !allResponse.ok) {
        throw new Error('Failed to fetch time statistics');
      }

      // Calculate total time for today
      const todayTime = (todayData.time_entries || []).reduce(
        (total: number, entry: { duration_seconds?: number }) =>
          total + (entry.duration_seconds || 0),
        0
      );

      // Calculate total time for this week (client-side filtering)
      const weekTime = (allData.time_entries || [])
        .filter((entry: { created_at: string }) => {
          const entryDate = new Date(entry.created_at);
          return entryDate >= startOfWeek && entryDate <= endOfWeek;
        })
        .reduce(
          (total: number, entry: { duration_seconds?: number }) =>
            total + (entry.duration_seconds || 0),
          0
        );

      setStats(prev => ({
        ...prev,
        todayTime,
        weekTime,
      }));
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Event-driven updates: refresh stats when timer states change
  // Create a stable key based on timer IDs and their states to avoid infinite loops
  const timerStateKey = [
    ...activeTimers.map(t => `${t.id}-${t.isRunning ? 'running' : 'stopped'}`),
    ...pausedTimers.map(t => `${t.id}-${t.isPaused ? 'paused' : 'stopped'}`),
  ]
    .sort()
    .join(',');

  useEffect(() => {
    // Only fetch if we have timers or if the timer state actually changed
    if (timerStateKey) {
      fetchStats();
    }
  }, [timerStateKey]);

  return {
    stats,
    isLoading,
    error,
    formatDuration,
  };
}
