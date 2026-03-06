import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { validatePricingConsistency } from '@/lib/utils';
import { UpdateTaskRequest } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;

    // First verify the project exists and belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, currency_code')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch task with related data
    const { data: task, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        project:projects(name, client_name, status, currency_code),
        assignee_user:users!tasks_assignee_fkey(name, email)
      `
      )
      .eq('id', taskId)
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      console.error('Error fetching task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error in project task GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;
    const updateData: UpdateTaskRequest = await request.json();

    // Validate that at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Validate name if it's being updated
    if (updateData.name !== undefined && updateData.name.trim() === '') {
      return NextResponse.json(
        { error: 'Task name cannot be empty' },
        { status: 400 }
      );
    }

    // First verify the project exists and belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Then check if the task exists and belongs to the user and project
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, name, user_id, project_id, status, rate_type, price')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json(
        {
          error: 'Task not found',
        },
        { status: 404 }
      );
    }

    // Validate pricing fields consistency if any pricing field is being updated
    const hasPricingUpdate =
      updateData.rate_type !== undefined || updateData.price !== undefined;

    if (hasPricingUpdate) {
      const projectCurrencyCode = (
        project as {
          currency_code?: string | null;
        }
      ).currency_code;
      // Get the final values (existing values for unchanged fields, new values for changed fields)
      const finalRateType =
        updateData.rate_type !== undefined
          ? updateData.rate_type
          : existingTask.rate_type;
      const finalPrice =
        updateData.price !== undefined ? updateData.price : existingTask.price;

      const pricingValidation = validatePricingConsistency(
        finalRateType,
        finalPrice,
        // Tasks inherit currency from the project
        projectCurrencyCode || 'USD'
      );

      if (!pricingValidation.isValid) {
        return NextResponse.json(
          { error: pricingValidation.error },
          { status: 400 }
        );
      }
    }

    // Prepare update data (only include defined fields)
    const updatePayload = Object.fromEntries(
      Object.entries(updateData)
        // Ignore undefined values and any task-level currency_code
        .filter(
          ([key, value]) => value !== undefined && key !== 'currency_code'
        )
        .map(([key, value]) => [
          key,
          ['name', 'description', 'due_date', 'assignee'].includes(key)
            ? typeof value === 'string'
              ? value.trim()
              : value
            : value,
        ])
    );

    // Update the task
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .select(
        `
        *,
        project:projects(name, client_name, status),
        assignee_user:users!tasks_assignee_fkey(name, email)
      `
      )
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // When a fixed-rate task is marked completed, create a synthetic time entry
    // so it can be included in invoice generation (start/end = now, duration 0).
    const isTransitioningToCompleted =
      updateData.status === 'completed' && existingTask.status !== 'completed';
    const isFixedRate = existingTask.rate_type === 'fixed';

    if (isTransitioningToCompleted && isFixedRate) {
      const { data: existingSynthetic } = await supabase
        .from('time_entries')
        .select('id')
        .eq('task_id', taskId)
        .eq('timer_status', 'stopped')
        .eq('duration_seconds', 0)
        .limit(1)
        .maybeSingle();

      if (!existingSynthetic) {
        const now = new Date().toISOString();
        const { error: insertError } = await supabase
          .from('time_entries')
          .insert({
            task_id: taskId,
            project_id: existingTask.project_id,
            user_id: existingTask.user_id,
            start_time: now,
            end_time: now,
            duration_seconds: 0,
            timer_status: 'stopped',
          });

        if (insertError) {
          console.error(
            'Error creating synthetic time entry for fixed-rate task:',
            insertError
          );
          // Don't fail the PATCH; task was updated successfully
        }
      }
    }

    return NextResponse.json({
      message: 'Task updated successfully',
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error in project task PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;

    // First verify the project exists and belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if the task exists and belongs to the user and project
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, name')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json(
        {
          error: 'Task not found',
        },
        { status: 404 }
      );
    }

    // Delete the task
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id)
      .eq('project_id', projectId);

    if (deleteError) {
      console.error('Error deleting task:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Task deleted successfully',
      deletedTaskId: taskId,
    });
  } catch (error) {
    console.error('Error in project task DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
