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

    const { id: timeEntryId } = await params;

    // Fetch the time entry and verify ownership
    const { data: timeEntry, error } = await supabase
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
      .eq('id', timeEntryId)
      .eq('user_id', user.id)
      .single();

    if (error || !timeEntry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ time_entry: timeEntry });
  } catch (error) {
    console.error('Error in time entry GET API:', error);
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

    const { id: timeEntryId } = await params;
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
      updateData.duration_minutes !== undefined &&
      (updateData.duration_minutes < 0 ||
        (updateData.duration_minutes === 0 && updateData.is_running !== true))
    ) {
      return NextResponse.json(
        { error: 'Duration must be greater than 0 for completed timers' },
        { status: 400 }
      );
    }

    // First check if the time entry exists and belongs to the user
    const { data: existingTimeEntry, error: fetchError } = await supabase
      .from('time_entries')
      .select('id, task_id, is_running')
      .eq('id', timeEntryId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingTimeEntry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      );
    }

    // If starting a timer, check for running timers on the same task
    if (updateData.is_running === true) {
      const { data: runningTimer } = await supabase
        .from('time_entries')
        .select('id')
        .eq('task_id', existingTimeEntry.task_id)
        .eq('user_id', user.id)
        .eq('is_running', true)
        .neq('id', timeEntryId)
        .single();

      if (runningTimer) {
        return NextResponse.json(
          { error: 'A timer is already running for this task' },
          { status: 400 }
        );
      }
    }

    // Prepare update data (only include defined fields)
    const updatePayload = Object.fromEntries(
      Object.entries(updateData)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          ['description'].includes(key) && typeof value === 'string'
            ? value.trim() || null
            : value,
        ])
    );

    // Update the time entry
    const { data: updatedTimeEntry, error: updateError } = await supabase
      .from('time_entries')
      .update(updatePayload)
      .eq('id', timeEntryId)
      .eq('user_id', user.id)
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

    if (updateError) {
      console.error('Error updating time entry:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      time_entry: updatedTimeEntry,
      message: 'Time entry updated successfully',
    });
  } catch (error) {
    console.error('Error in time entry PATCH API:', error);
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

    const { id: timeEntryId } = await params;

    // First check if the time entry exists and belongs to the user
    const { data: existingTimeEntry, error: fetchError } = await supabase
      .from('time_entries')
      .select('id, task_id, is_running')
      .eq('id', timeEntryId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingTimeEntry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      );
    }

    // Delete the time entry
    const { error: deleteError } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', timeEntryId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting time entry:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Time entry deleted successfully',
      deletedTimeEntry: existingTimeEntry,
    });
  } catch (error) {
    console.error('Error in time entry DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
