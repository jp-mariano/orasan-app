import type { SupabaseClient } from '@supabase/supabase-js';

type TaskRelation = { status?: string } | null;

export type TimeEntryWithTask = {
  id: string;
  start_time: string | null;
  task?: TaskRelation;
};

/**
 * Active (running/paused) time entries on completed tasks for a project whose
 * open session can overlap the invoice date range: started on or before the
 * range end (sessions that start after `to` cannot affect that period).
 */
export async function fetchActiveTimerEntriesOnCompletedTasksInRange(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  _fromDate: Date,
  toDate: Date
): Promise<TimeEntryWithTask[]> {
  const toIso = toDate.toISOString();

  const { data, error } = await supabase
    .from('time_entries')
    .select(
      `
      id,
      start_time,
      task:task_id (
        status
      )
    `
    )
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .in('timer_status', ['running', 'paused'])
    .lte('start_time', toIso);

  if (error) {
    console.error('[invoice-active-completed-task-timers] query failed', error);
    throw new Error('Failed to load active timers for invoice');
  }

  const rows = (data || []) as TimeEntryWithTask[];
  return rows.filter(e => e.task?.status === 'completed');
}

export async function countActiveTimerEntriesOnCompletedTasksInRange(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  fromDate: Date,
  toDate: Date
): Promise<number> {
  const entries = await fetchActiveTimerEntriesOnCompletedTasksInRange(
    supabase,
    userId,
    projectId,
    fromDate,
    toDate
  );
  return entries.length;
}
