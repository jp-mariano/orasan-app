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
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    // Build the query
    let query = supabase
      .from('work_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    // Apply filters
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString());
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: workSessions, error } = await query;

    if (error) {
      console.error('Error fetching work sessions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ work_sessions: workSessions || [] });
  } catch (error) {
    console.error('Error in work sessions GET API:', error);
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

    const workSessionData = await request.json();

    // Validate required fields
    if (!workSessionData.start_time) {
      return NextResponse.json(
        { error: 'Start time is required' },
        { status: 400 }
      );
    }

    if (
      workSessionData.duration_seconds !== undefined &&
      workSessionData.duration_seconds < 0
    ) {
      return NextResponse.json(
        { error: 'Duration must be greater than or equal to 0' },
        { status: 400 }
      );
    }

    // Check for existing active work session
    const { data: existingActiveSession } = await supabase
      .from('work_sessions')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingActiveSession) {
      return NextResponse.json(
        {
          error: 'An active work session already exists. Complete it first.',
          existing_session_id: existingActiveSession.id,
        },
        { status: 400 }
      );
    }

    // Create the work session
    const { data: newWorkSession, error: createError } = await supabase
      .from('work_sessions')
      .insert({
        user_id: user.id,
        start_time: workSessionData.start_time,
        end_time: workSessionData.end_time || null,
        duration_seconds: workSessionData.duration_seconds || 0,
        status: workSessionData.status || 'active',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating work session:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        work_session: newWorkSession,
        message: 'Work session created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in work sessions POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
