import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { CreateProjectData } from '@/types/projects'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get the current user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ projects: projects || [] })
  } catch (error) {
    console.error('Error in projects GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectData: CreateProjectData = await request.json()

    // Validate required fields
    if (!projectData.name || projectData.name.trim() === '') {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    // Check project limit for free tier users
    const { data: existingProjects, error: countError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)

    if (countError) {
      console.error('Error checking project count:', countError)
      return NextResponse.json({ error: 'Failed to check project limit' }, { status: 500 })
    }

    const currentProjectCount = existingProjects?.length || 0
    const maxProjects = 2 // Free tier limit

    if (currentProjectCount >= maxProjects) {
      return NextResponse.json({ 
        error: 'Project limit reached',
        details: {
          current: currentProjectCount,
          limit: maxProjects,
          message: 'You have reached the maximum number of projects for the free tier. Please delete an existing project or upgrade your account.'
        }
      }, { status: 403 })
    }

    // Create the project
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        name: projectData.name.trim(),
        description: projectData.description?.trim() || null,
        client_name: projectData.client_name?.trim() || null,
        rate_type: projectData.rate_type || null,
        price: projectData.price || null,
        currency_code: projectData.currency_code || 'USD',
        user_id: user.id,
        status: 'new'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating project:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      project: newProject,
      message: 'Project created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in projects POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
