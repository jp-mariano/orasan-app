import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateTaskRequest } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignee = searchParams.get('assignee')

    // Build query
    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:projects(name, client_name),
        assignee_user:users!tasks_assignee_fkey(name, email)
      `)
      .eq('user_id', user.id)

    // Apply filters
    if (projectId) query = query.eq('project_id', projectId)
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (assignee) query = query.eq('assignee', assignee)

    // Execute query
    const { data: tasks, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error in task GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: CreateTaskRequest = await request.json()
    const { name, description, project_id, priority = 'low', due_date, assignee } = body

    // Validate required fields
    if (!name || !project_id) {
      return NextResponse.json({ 
        error: 'Name and project_id are required' 
      }, { status: 400 })
    }

    // Validate name is not empty
    if (name.trim() === '') {
      return NextResponse.json({ 
        error: 'Task name cannot be empty' 
      }, { status: 400 })
    }

    // Validate priority value
    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return NextResponse.json({ 
        error: 'Invalid priority value' 
      }, { status: 400 })
    }

    // Verify project exists and belongs to user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, rate_type, price, currency_code')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ 
        error: 'Project not found or access denied' 
      }, { status: 404 })
    }

    // If assignee is provided, verify the user exists
    if (assignee) {
      const { data: assigneeUser, error: assigneeError } = await supabase
        .from('users')
        .select('id')
        .eq('id', assignee)
        .single()

      if (assigneeError || !assigneeUser) {
        return NextResponse.json({ 
          error: 'Assignee user not found' 
        }, { status: 400 })
      }
    }

    // Create task with project rate information
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        name,
        description,
        project_id,
        user_id: user.id,
        priority,
        due_date: due_date || null,
        assignee: assignee || null,
        rate_type: project.rate_type,
        price: project.price,
        currency_code: project.currency_code
      })
      .select(`
        *,
        project:projects(name, client_name),
        assignee_user:users!tasks_assignee_fkey(name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      task,
      message: 'Task created successfully' 
    }, { status: 201 })
  } catch (error) {
    console.error('Error in task POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
