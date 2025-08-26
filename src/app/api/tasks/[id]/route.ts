import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateTaskRequest } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params

    // Fetch task with related data
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(name, client_name, status),
        assignee_user:users!tasks_assignee_fkey(name, email)
      `)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      console.error('Error fetching task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error in task GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params
    const updateData: UpdateTaskRequest = await request.json()

    // Validate that at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Validate name if it's being updated
    if (updateData.name !== undefined && (updateData.name.trim() === '')) {
      return NextResponse.json({ error: 'Task name cannot be empty' }, { status: 400 })
    }

    // First check if the task exists and belongs to the user
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, name, user_id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json({ 
        error: 'Task not found or access denied' 
      }, { status: 404 })
    }

    // If assignee is being set, verify the user exists
    if (updateData.assignee !== undefined) {
      if (updateData.assignee) {
        const { data: assigneeUser, error: assigneeError } = await supabase
          .from('users')
          .select('id')
          .eq('id', updateData.assignee)
          .single()

        if (assigneeError || !assigneeUser) {
          return NextResponse.json({ 
            error: 'Assignee user not found' 
          }, { status: 400 })
        }
      }
    }

    // Prepare update data (only include defined fields and trim strings)
    const updatePayload = Object.fromEntries(
      Object.entries(updateData)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key, 
          ['name', 'description'].includes(key) && typeof value === 'string' 
            ? value.trim() || null 
            : value
        ])
    ) as Partial<UpdateTaskRequest>

    // Update the task
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select(`
        *,
        project:projects(name, client_name, status),
        assignee_user:users!tasks_assignee_fkey(name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating task:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      task: updatedTask,
      message: 'Task updated successfully' 
    })

  } catch (error) {
    console.error('Error in task PATCH API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params

    // Verify task exists and belongs to user
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, user_id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json({ 
        error: 'Task not found or access denied' 
      }, { status: 404 })
    }

    // Delete task (cascade will handle related time entries)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Task deleted successfully',
      deletedTaskId: taskId
    })
  } catch (error) {
    console.error('Error in task DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
