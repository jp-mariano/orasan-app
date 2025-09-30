/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from 'react';

export interface TimeEntry {
  id: string;
  task_id: string;
  project_id: string;
  user_id: string;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number;
  timer_status: 'running' | 'paused' | 'stopped';
  created_at: string;
  updated_at: string;
}

export interface LocalTimer {
  id: string;
  taskId: string;
  projectId: string;
  duration: number; // in seconds
  isRunning: boolean;
  isPaused: boolean;
  localStartTime: number | null; // timestamp when timer started locally
  lastSyncTime: number; // timestamp of last sync with DB
}

export interface UseTimeTrackerReturn {
  // Timer state
  timers: LocalTimer[];
  activeTimers: LocalTimer[];
  pausedTimers: LocalTimer[];

  // Timer actions
  startTimer: (taskId: string, projectId: string) => Promise<boolean>;
  pauseTimer: (taskId: string) => Promise<boolean>;
  resumeTimer: (taskId: string) => Promise<boolean>;
  stopTimer: (taskId: string) => Promise<boolean>;

  // Timer queries
  getTimerForTask: (taskId: string) => LocalTimer | null;
  canStartTimer: (taskId: string) => boolean;
  canResumeTimer: (taskId: string) => boolean;
  canPauseTimer: (taskId: string) => boolean;
  canStopTimer: (taskId: string) => boolean;

  // Sync functions
  syncWithDatabase: () => Promise<void>;
  loadTimersFromDatabase: () => Promise<void>;

  // Utility functions
  formatDuration: (seconds: number) => string;
  getTotalDuration: (taskId: string) => number;

  // State
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'orasan_timers';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const UPDATE_INTERVAL = 1000; // 1 second for UI updates
const STORAGE_SYNC_INTERVAL = 5 * 1000; // 5 seconds for localStorage sync

export function useTimeTracker(): UseTimeTrackerReturn {
  const [timers, setTimers] = useState<LocalTimer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const storageSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timersRef = useRef<LocalTimer[]>([]);

  // Derived state
  const activeTimers = timers.filter(timer => timer.isRunning);
  const pausedTimers = timers.filter(timer => timer.isPaused);

  // Update ref whenever timers change
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  // Load timers from localStorage on mount
  useEffect(() => {
    loadTimersFromStorage();
    loadTimersFromDatabase();
  }, []);

  // Start sync interval
  useEffect(() => {
    syncIntervalRef.current = setInterval(syncWithDatabase, SYNC_INTERVAL);
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Start update interval for active timers (UI only, no storage sync)
  useEffect(() => {
    if (timers.length > 0) {
      updateIntervalRef.current = setInterval(() => {
        // Just trigger a re-render to update the display
        // The actual time calculation happens in getTotalDuration
        setTimers(prevTimers => [...prevTimers]);
      }, UPDATE_INTERVAL);
    } else {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [timers.length]);

  // Start localStorage sync interval (every 5 seconds)
  useEffect(() => {
    if (timers.length > 0) {
      storageSyncIntervalRef.current = setInterval(() => {
        saveTimersToStorage(timersRef.current);
      }, STORAGE_SYNC_INTERVAL);
    } else {
      if (storageSyncIntervalRef.current) {
        clearInterval(storageSyncIntervalRef.current);
      }
    }

    return () => {
      if (storageSyncIntervalRef.current) {
        clearInterval(storageSyncIntervalRef.current);
      }
    };
  }, [timers.length]);

  // Load timers from localStorage
  const loadTimersFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedTimers = JSON.parse(stored);
        setTimers(parsedTimers);
      }
    } catch (error) {
      console.error('Error loading timers from storage:', error);
    }
  }, []);

  // Save timers to localStorage
  const saveTimersToStorage = useCallback((timersToSave: LocalTimer[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timersToSave));
    } catch (error) {
      console.error('Error saving timers to storage:', error);
    }
  }, []);

  // Load timers from database
  const loadTimersFromDatabase = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/time-entries');
      if (!response.ok) {
        throw new Error('Failed to load timers');
      }

      const data = await response.json();
      const timeEntries: TimeEntry[] = data.time_entries || [];

      // Convert database entries to local timers
      const dbTimers: LocalTimer[] = timeEntries.map(entry => ({
        id: entry.id,
        taskId: entry.task_id,
        projectId: entry.project_id,
        duration: entry.duration_seconds, // Duration is already in seconds
        isRunning: entry.timer_status === 'running',
        isPaused: entry.timer_status === 'paused',
        localStartTime: entry.timer_status === 'running' ? Date.now() : null,
        lastSyncTime: Date.now(),
      }));

      setTimers(dbTimers);
      saveTimersToStorage(dbTimers);
    } catch (error) {
      console.error('Error loading timers from database:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load timers'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync with database
  const syncWithDatabase = useCallback(async () => {
    if (timersRef.current.length === 0) return;

    try {
      for (const timer of timersRef.current) {
        if (timer.isRunning || timer.isPaused) {
          await updateTimerInDatabase(timer);
        }
      }
      console.log('Database sync completed successfully');
    } catch (error) {
      console.error('Error syncing with database:', error);
      setError('Failed to sync with database. Changes are saved locally.');
    }
  }, []);

  // Update timer in database
  const updateTimerInDatabase = async (timer: LocalTimer) => {
    try {
      const response = await fetch(`/api/time-entries/${timer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration_seconds: timer.duration, // Duration is already in seconds
          timer_status: timer.isRunning
            ? 'running'
            : timer.isPaused
              ? 'paused'
              : 'stopped',
          end_time: timer.isRunning ? null : undefined, // Clear end_time when running
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: Failed to update timer`
        );
      }
    } catch (error) {
      console.error(`Failed to update timer ${timer.id}:`, error);
      throw error;
    }
  };

  // Start timer
  const startTimer = useCallback(
    async (taskId: string, projectId: string): Promise<boolean> => {
      if (!canStartTimer(taskId)) {
        setError('Cannot start timer for this task');
        return false;
      }

      try {
        // Check if timer already exists
        const existingTimer = getTimerForTask(taskId);

        if (existingTimer) {
          // Resume existing timer
          return await resumeTimer(taskId);
        }

        // Create new timer
        const response = await fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: taskId,
            project_id: projectId,
            start_time: new Date().toISOString(),
            duration_seconds: 0,
            timer_status: 'running',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();

          // If timer already exists, try to resume it instead
          if (errorData.existing_timer_id) {
            console.log(
              'Timer already exists, resuming instead:',
              errorData.existing_timer_id
            );
            return await resumeTimer(taskId);
          }

          throw new Error(errorData.error || 'Failed to start timer');
        }

        const data = await response.json();
        const newTimer: LocalTimer = {
          id: data.time_entry.id,
          taskId,
          projectId,
          duration: 0,
          isRunning: true,
          isPaused: false,
          localStartTime: Date.now(),
          lastSyncTime: Date.now(),
        };

        const newTimers = [...timersRef.current, newTimer];
        setTimers(newTimers);
        saveTimersToStorage(newTimers); // Save immediately for new timers
        setError(null);
        return true;
      } catch (error) {
        console.error('Error starting timer:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to start timer'
        );
        return false;
      }
    },
    [timers]
  );

  // Pause timer
  const pauseTimer = useCallback(
    async (taskId: string): Promise<boolean> => {
      if (!canPauseTimer(taskId)) {
        setError('Cannot pause timer for this task');
        return false;
      }

      try {
        const timer = getTimerForTask(taskId);
        if (!timer) return false;

        // Calculate current duration by adding elapsed time
        const currentDuration =
          timer.isRunning && timer.localStartTime
            ? timer.duration +
              Math.floor((Date.now() - timer.localStartTime) / 1000)
            : timer.duration;

        const updatedTimer: LocalTimer = {
          ...timer,
          duration: currentDuration,
          isRunning: false,
          isPaused: true,
          localStartTime: null,
          lastSyncTime: Date.now(),
        };

        const updatedTimers = timersRef.current.map(t =>
          t.taskId === taskId ? updatedTimer : t
        );
        setTimers(updatedTimers);
        saveTimersToStorage(updatedTimers); // Save immediately for state changes

        // Update in database immediately
        await updateTimerInDatabase(updatedTimer);

        setError(null);
        return true;
      } catch (error) {
        console.error('Error pausing timer:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to pause timer'
        );
        return false;
      }
    },
    [timers]
  );

  // Resume timer
  const resumeTimer = useCallback(
    async (taskId: string): Promise<boolean> => {
      if (!canResumeTimer(taskId)) {
        setError('Cannot resume timer for this task');
        return false;
      }

      try {
        const timer = getTimerForTask(taskId);
        if (!timer) return false;

        const updatedTimer: LocalTimer = {
          ...timer,
          isRunning: true,
          isPaused: false,
          localStartTime: Date.now(), // Reset start time for new session
          lastSyncTime: Date.now(),
        };

        const updatedTimers = timersRef.current.map(t =>
          t.taskId === taskId ? updatedTimer : t
        );
        setTimers(updatedTimers);
        saveTimersToStorage(updatedTimers); // Save immediately for state changes

        // Update in database immediately
        await updateTimerInDatabase(updatedTimer);

        setError(null);
        return true;
      } catch (error) {
        console.error('Error resuming timer:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to resume timer'
        );
        return false;
      }
    },
    [timers]
  );

  // Stop timer
  const stopTimer = useCallback(
    async (taskId: string): Promise<boolean> => {
      if (!canStopTimer(taskId)) {
        setError('Cannot stop timer for this task');
        return false;
      }

      try {
        const timer = getTimerForTask(taskId);
        if (!timer) return false;

        // Calculate final duration by adding elapsed time
        const finalDuration =
          timer.isRunning && timer.localStartTime
            ? timer.duration +
              Math.floor((Date.now() - timer.localStartTime) / 1000)
            : timer.duration;

        const updatedTimer: LocalTimer = {
          ...timer,
          duration: finalDuration,
          isRunning: false,
          isPaused: false,
          localStartTime: null,
          lastSyncTime: Date.now(),
        };

        const updatedTimers = timersRef.current.map(t =>
          t.taskId === taskId ? updatedTimer : t
        );
        setTimers(updatedTimers);
        saveTimersToStorage(updatedTimers); // Save immediately for state changes

        // Update in database immediately
        await fetch(`/api/time-entries/${timer.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duration_seconds: finalDuration, // Duration is already in seconds
            timer_status: 'stopped',
            end_time: new Date().toISOString(),
          }),
        });

        setError(null);
        return true;
      } catch (error) {
        console.error('Error stopping timer:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to stop timer'
        );
        return false;
      }
    },
    [timers]
  );

  // Get timer for specific task
  const getTimerForTask = useCallback(
    (taskId: string): LocalTimer | null => {
      return timers.find(timer => timer.taskId === taskId) || null;
    },
    [timers]
  );

  // Check if timer can be started
  const canStartTimer = useCallback(
    (taskId: string): boolean => {
      const timer = timers.find(t => t.taskId === taskId);
      return !timer; // Can start if no timer exists
    },
    [timers]
  );

  // Check if timer can be resumed
  const canResumeTimer = useCallback(
    (taskId: string): boolean => {
      const timer = timers.find(t => t.taskId === taskId);
      return timer
        ? timer.isPaused || (!timer.isRunning && !timer.isPaused)
        : false;
    },
    [timers]
  );

  // Check if timer can be paused
  const canPauseTimer = useCallback(
    (taskId: string): boolean => {
      const timer = timers.find(t => t.taskId === taskId);
      return timer ? timer.isRunning : false;
    },
    [timers]
  );

  // Check if timer can be stopped
  const canStopTimer = useCallback(
    (taskId: string): boolean => {
      const timer = timers.find(t => t.taskId === taskId);
      return timer ? timer.isRunning || timer.isPaused : false;
    },
    [timers]
  );

  // Format duration for display
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }, []);

  // Get total duration for a task
  const getTotalDuration = useCallback(
    (taskId: string): number => {
      const timer = getTimerForTask(taskId);
      if (!timer) return 0;

      // For running timers, calculate elapsed time on-the-fly
      if (timer.isRunning && timer.localStartTime) {
        return (
          timer.duration +
          Math.floor((Date.now() - timer.localStartTime) / 1000)
        );
      }

      // For paused/stopped timers, return the stored duration
      return timer.duration;
    },
    [getTimerForTask]
  );

  return {
    // Timer state
    timers,
    activeTimers,
    pausedTimers,

    // Timer actions
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,

    // Timer queries
    getTimerForTask,
    canStartTimer,
    canResumeTimer,
    canPauseTimer,
    canStopTimer,

    // Sync functions
    syncWithDatabase,
    loadTimersFromDatabase,

    // Utility functions
    formatDuration,
    getTotalDuration,

    // State
    isLoading,
    error,
  };
}
