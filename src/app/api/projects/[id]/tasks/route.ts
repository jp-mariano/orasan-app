import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { validatePricingConsistency } from '@/lib/utils';
import { CreateTaskRequest } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: projectId } = await params;

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignee = searchParams.get('assignee');

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

    // Build query for tasks
    let query = supabase
      .from('tasks')
      .select(
        `
        *,
        project:projects(name, client_name),
        assignee_user:users!tasks_assignee_fkey(name, email)
      `
      )
      .eq('user_id', user.id)
      .eq('project_id', projectId);

    // Apply filters
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (assignee) query = query.eq('assignee', assignee);

    // Execute query
    const { data: tasks, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error in project tasks GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: projectId } = await params;

    // Parse request body
    const body: CreateTaskRequest = await request.json();
    const {
      name,
      description,
      priority = 'low',
      due_date,
      assignee,
      rate_type,
      price,
      currency_code,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        {
          error: 'Task name is required',
        },
        { status: 400 }
      );
    }

    // Validate name is not empty
    if (name.trim() === '') {
      return NextResponse.json(
        {
          error: 'Task name cannot be empty',
        },
        { status: 400 }
      );
    }

    // First verify the project exists and belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, rate_type, price, currency_code')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Determine pricing data: use task's explicit pricing if provided, otherwise inherit from project
    const taskRateType =
      rate_type !== undefined ? rate_type : project.rate_type;
    const taskPrice = price !== undefined ? price : project.price;
    const taskCurrencyCode =
      currency_code !== undefined ? currency_code : project.currency_code;

    // Validate pricing fields consistency if any pricing field is provided
    const hasAnyPricingField =
      (taskRateType !== null && taskRateType !== undefined) ||
      (taskPrice !== null && taskPrice !== undefined) ||
      (taskCurrencyCode !== null && taskCurrencyCode !== undefined);

    if (hasAnyPricingField) {
      const pricingValidation = validatePricingConsistency(
        taskRateType,
        taskPrice,
        taskCurrencyCode
      );

      if (!pricingValidation.isValid) {
        return NextResponse.json(
          { error: pricingValidation.error },
          { status: 400 }
        );
      }
    }

    // Create the task
    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert({
        name: name.trim(),
        description: description?.trim() || undefined,
        project_id: projectId,
        user_id: user.id,
        priority,
        due_date: due_date || undefined,
        assignee: assignee || undefined,
        status: 'new',
        rate_type: taskRateType,
        price: taskPrice,
        currency_code: taskCurrencyCode,
      })
      .select(
        `
        *,
        project:projects(name, client_name),
        assignee_user:users!tasks_assignee_fkey(name, email)
      `
      )
      .single();

    if (createError) {
      console.error('Error creating task:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error) {
    console.error('Error in project tasks POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
