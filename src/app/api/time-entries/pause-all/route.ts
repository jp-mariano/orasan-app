import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from the session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { updates } = await request.json();

    // Validate input
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'updates must be a non-empty array' },
        { status: 400 }
      );
    }

    // Extract timer IDs from updates
    const timerIds = updates.map(update => update.id);

    // Step 1: Validate timers exist, are running, and belong to the user
    const { data: validTimersRaw, error: validationError } = await supabase
      .from('time_entries')
      .select('id, user_id, timer_status, task_id, project_id')
      .in('id', timerIds)
      .eq('user_id', user.id)
      .eq('timer_status', 'running');

    if (validationError) {
      console.error('Validation error:', validationError);
      return NextResponse.json(
        { error: 'Failed to validate timers' },
        { status: 500 }
      );
    }

    const validTimers = validTimersRaw || [];

    if (validTimers.length === 0) {
      return NextResponse.json({
        success: true,
        pausedCount: 0,
        message: 'No timers to pause',
      });
    }

    // Create a map of timer ID to task_id and project_id for upsert
    const validIds = new Set(validTimers.map(t => t.id));
    const timerToTaskMap = new Map(
      validTimers.map(timer => [timer.id, timer.task_id])
    );
    const timerToProjectMap = new Map(
      validTimers.map(timer => [timer.id, timer.project_id])
    );

    // Step 2: Use upsert for batch update
    const updatesToApply = updates.filter(update => validIds.has(update.id));
    const { data: updatedTimers, error: updateError } = await supabase
      .from('time_entries')
      .upsert(
        updatesToApply.map(update => ({
          id: update.id,
          task_id: timerToTaskMap.get(update.id), // Add task_id for NOT NULL constraint
          project_id: timerToProjectMap.get(update.id), // Add project_id for NOT NULL constraint
          duration_seconds: update.duration_seconds,
          timer_status: 'paused',
          end_time: update.end_time,
          updated_at: update.updated_at,
          user_id: user.id, // Add user_id for RLS compliance
        })),
        {
          onConflict: 'id',
          ignoreDuplicates: false,
        }
      )
      .select('id, duration_seconds, timer_status');

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to pause timers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pausedCount: updatedTimers.length,
      message: `Successfully paused ${updatedTimers.length} timer(s)`,
    });
  } catch (error) {
    console.error('Error in pause-all endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
