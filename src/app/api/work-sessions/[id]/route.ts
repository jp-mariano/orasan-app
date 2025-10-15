import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: workSessionId } = await params;

    // Fetch the work session and verify ownership
    const { data: workSession, error } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('id', workSessionId)
      .eq('user_id', user.id)
      .single();

    if (error || !workSession) {
      return NextResponse.json(
        { error: 'Work session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ work_session: workSession });
  } catch (error) {
    console.error('Error in work session GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: workSessionId } = await params;
    const updateData = await request.json();

    // Validate that at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Validate duration if it's being updated
    if (
      updateData.duration_seconds !== undefined &&
      updateData.duration_seconds < 0
    ) {
      return NextResponse.json(
        { error: 'Duration cannot be negative' },
        { status: 400 }
      );
    }

    // Validate end_time if it's being updated
    if (updateData.end_time && updateData.start_time) {
      const startTime = new Date(updateData.start_time);
      const endTime = new Date(updateData.end_time);
      if (endTime <= startTime) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
    }

    // First check if the work session exists and belongs to the user
    const { data: existingWorkSession, error: fetchError } = await supabase
      .from('work_sessions')
      .select('id, status, start_time')
      .eq('id', workSessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingWorkSession) {
      return NextResponse.json(
        { error: 'Work session not found' },
        { status: 404 }
      );
    }

    // If completing a session, ensure end_time is set
    if (updateData.status === 'completed' && !updateData.end_time) {
      updateData.end_time = new Date().toISOString();
    }

    // If setting end_time, calculate duration if not provided
    if (updateData.end_time && !updateData.duration_seconds) {
      const startTime = new Date(existingWorkSession.start_time);
      const endTime = new Date(updateData.end_time);
      updateData.duration_seconds = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000
      );
    }

    // Prepare update data (only include defined fields)
    const updatePayload = Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined)
    );

    // Update the work session
    const { data: updatedWorkSession, error: updateError } = await supabase
      .from('work_sessions')
      .update(updatePayload)
      .eq('id', workSessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating work session:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      work_session: updatedWorkSession,
      message: 'Work session updated successfully',
    });
  } catch (error) {
    console.error('Error in work session PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: workSessionId } = await params;

    // First check if the work session exists and belongs to the user
    const { data: existingWorkSession, error: fetchError } = await supabase
      .from('work_sessions')
      .select('id')
      .eq('id', workSessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingWorkSession) {
      return NextResponse.json(
        { error: 'Work session not found' },
        { status: 404 }
      );
    }

    // Delete the work session
    const { error: deleteError } = await supabase
      .from('work_sessions')
      .delete()
      .eq('id', workSessionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting work session:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Work session deleted successfully',
    });
  } catch (error) {
    console.error('Error in work session DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
