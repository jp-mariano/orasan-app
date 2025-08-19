import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface UpdateData {
  email?: string
  name?: string
  updated_at: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user from the session using getUser() as recommended
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, name } = await request.json()

    // First check if user profile already exists and what the current values are
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', user.id)
      .single()

    if (existingUser) {
      // Check if there are actual changes to update
      const emailChanged = email && email !== existingUser.email
      const nameChanged = name && name !== existingUser.name
      
      if (!emailChanged && !nameChanged) {
        console.log('No changes detected, skipping update')
        return NextResponse.json({ success: true, message: 'No changes needed' })
      }
      
      // Only update changed fields
      const updateData: UpdateData = {
        updated_at: new Date().toISOString()
      }
      if (emailChanged) updateData.email = email
      if (nameChanged) updateData.name = name
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)

      if (error) {
        console.error('Error updating user profile:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      console.log('User profile updated successfully')
      return NextResponse.json({ success: true, message: 'Profile updated' })
    } else {
      // Create new user profile
      const { error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: email || user.email,
          name: name || user.user_metadata?.full_name || user.user_metadata?.name || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error creating user profile:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      console.log('User profile created successfully')
      return NextResponse.json({ success: true, message: 'Profile created' })
    }
  } catch (error) {
    console.error('Error in user profile API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
