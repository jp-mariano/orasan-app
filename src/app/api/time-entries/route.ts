import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    const projectId = searchParams.get('project_id');
    const date = searchParams.get('date');
    const running = searchParams.get('running');

    // Build the query
    let query = supabase
      .from('time_entries')
      .select(
        `
        *,
        task:task_id (
          id,
          name,
          project_id,
          project:project_id (
            id,
            name
          )
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (taskId) {
      query = query.eq('task_id', taskId);
    }

    if (projectId) {
      query = query.eq('task.project_id', projectId);
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());
    }

    if (running === 'true') {
      query = query.eq('is_running', true);
    }

    const { data: timeEntries, error } = await query;

    if (error) {
      console.error('Error fetching time entries:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ time_entries: timeEntries || [] });
  } catch (error) {
    console.error('Error in time entries GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const timeEntryData = await request.json();

    // Validate required fields
    if (!timeEntryData.task_id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    if (
      timeEntryData.duration_minutes === undefined ||
      timeEntryData.duration_minutes < 0 ||
      (timeEntryData.duration_minutes === 0 && !timeEntryData.is_running)
    ) {
      return NextResponse.json(
        { error: 'Duration must be greater than 0 for completed timers' },
        { status: 400 }
      );
    }

    // Verify the task exists and belongs to the user
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id')
      .eq('id', timeEntryData.task_id)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check for running timers on the same task
    if (timeEntryData.is_running) {
      const { data: runningTimer } = await supabase
        .from('time_entries')
        .select('id')
        .eq('task_id', timeEntryData.task_id)
        .eq('user_id', user.id)
        .eq('is_running', true)
        .single();

      if (runningTimer) {
        return NextResponse.json(
          { error: 'A timer is already running for this task' },
          { status: 400 }
        );
      }
    }

    // Create the time entry
    const { data: newTimeEntry, error: createError } = await supabase
      .from('time_entries')
      .insert({
        task_id: timeEntryData.task_id,
        user_id: user.id,
        start_time: timeEntryData.start_time || null,
        end_time: timeEntryData.end_time || null,
        duration_minutes: timeEntryData.duration_minutes,
        description: timeEntryData.description?.trim() || null,
        is_running: timeEntryData.is_running || false,
      })
      .select(
        `
        *,
        task:task_id (
          id,
          name,
          project_id,
          project:project_id (
            id,
            name
          )
        )
      `
      )
      .single();

    if (createError) {
      console.error('Error creating time entry:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        time_entry: newTimeEntry,
        message: 'Time entry created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in time entries POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
