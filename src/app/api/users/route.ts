import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user from the session using getUser() as recommended
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, name } = await request.json()

    // Create/update user profile using the authenticated user context
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: email || user.email,
        name: name || user.user_metadata?.full_name || user.user_metadata?.name || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (error) {
      console.error('Error creating/updating user profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in user profile API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
