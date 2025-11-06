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

    const { project_id } = await request.json();

    // Validate input
    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Verify project exists and belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get all active timers (running or paused) for this project
    const { data: activeTimers, error: fetchError } = await supabase
      .from('time_entries')
      .select(
        'id, task_id, project_id, duration_seconds, start_time, timer_status'
      )
      .eq('user_id', user.id)
      .eq('project_id', project_id)
      .in('timer_status', ['running', 'paused']);

    if (fetchError) {
      console.error('Error fetching active timers:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch active timers' },
        { status: 500 }
      );
    }

    if (!activeTimers || activeTimers.length === 0) {
      return NextResponse.json({
        success: true,
        stoppedCount: 0,
        message: 'No active timers found for this project',
      });
    }

    const now = new Date().toISOString();

    // Update all active timers to stopped status with end_time
    // For running timers, duration_seconds should already be calculated correctly
    // For paused timers, duration_seconds is already the final duration
    const { error: updateError } = await supabase
      .from('time_entries')
      .update({
        timer_status: 'stopped',
        end_time: now,
        updated_at: now,
      })
      .in(
        'id',
        activeTimers.map(t => t.id)
      )
      .eq('user_id', user.id)
      .eq('project_id', project_id)
      .in('timer_status', ['running', 'paused']);

    if (updateError) {
      console.error('Error stopping timers:', updateError);
      return NextResponse.json(
        { error: 'Failed to stop timers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stoppedCount: activeTimers.length,
      message: `Successfully stopped ${activeTimers.length} active timer(s) for invoice generation`,
    });
  } catch (error) {
    console.error('Error in stop-all endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
