import { NextRequest, NextResponse } from 'next/server';

import {
  getFreeTierProjectLimitState,
  getUserSubscription,
} from '@/lib/subscription-enforcement';
import { createClient } from '@/lib/supabase/server';
import { validatePricingConsistency } from '@/lib/utils';
import { CreateProjectData } from '@/types/projects';

export async function GET() {
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

    // Get user's projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: projects || [] });
  } catch (error) {
    console.error('Error in projects GET API:', error);
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

    const projectData: CreateProjectData = await request.json();

    // Enhanced validation with better error messages
    const validationErrors: string[] = [];

    if (!projectData.name?.trim()) {
      validationErrors.push('Project name is required');
    }

    if (projectData.name && projectData.name.trim().length > 100) {
      validationErrors.push('Project name must be less than 100 characters');
    }

    // Validate pricing fields consistency and require all pricing fields
    const pricingValidation = validatePricingConsistency(
      projectData.rate_type,
      projectData.price,
      projectData.currency_code
    );

    if (!pricingValidation.isValid) {
      validationErrors.push(pricingValidation.error!);
    }

    const hasRateType = projectData.rate_type != null;
    const hasPrice =
      projectData.price != null &&
      projectData.price !== undefined &&
      projectData.price >= 0;
    const hasCurrency =
      projectData.currency_code != null &&
      projectData.currency_code !== undefined &&
      String(projectData.currency_code).trim() !== '';
    if (!hasRateType || !hasPrice || !hasCurrency) {
      validationErrors.push(
        'Rate type, price, and currency are required for every project.'
      );
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // Check project limit for Free tier users (2 active projects).
    const { tier } = await getUserSubscription(supabase, user.id);
    if (tier === 'free') {
      const { activeProjectCount } = await getFreeTierProjectLimitState(
        supabase,
        user.id
      );
      const maxActiveProjects = 2;
      if (activeProjectCount >= maxActiveProjects) {
        return NextResponse.json(
          {
            error: 'Project limit reached',
            details: {
              current_active: activeProjectCount,
              limit_active: maxActiveProjects,
              message:
                'Free tier allows up to 2 active projects. Complete or delete a project, or upgrade to Pro.',
            },
          },
          { status: 403 }
        );
      }
    }

    // Create the project with clean data mapping
    const projectInsertData = {
      name: projectData.name.trim(),
      description: projectData.description?.trim() || null,
      client_name: projectData.client_name?.trim() || null,
      client_email: projectData.client_email?.trim() || null,
      client_address: projectData.client_address?.trim() || null,
      client_phone: projectData.client_phone?.trim() || null,
      rate_type: projectData.rate_type || null,
      price: projectData.price !== undefined ? projectData.price : null,
      currency_code: projectData.currency_code || null,
      user_id: user.id,
      status: 'new' as const,
    };

    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert(projectInsertData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating project:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        project: newProject,
        message: 'Project created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in projects POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
