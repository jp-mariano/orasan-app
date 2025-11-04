import { NextRequest, NextResponse } from 'next/server';

import {
  logAccountDeletionCancellation,
  logAccountDeletionRequest,
} from '@/lib/activity-log';
import { sendDeletionConfirmationEmail } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';
import { UpdateUserRequest } from '@/types';

interface UpdateData {
  email?: string;
  name?: string;
  updated_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from the session using getUser() as recommended
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, name } = await request.json();

    // First check if user profile already exists and what the current values are
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      // Check if there are actual changes to update
      const emailChanged = email && email !== existingUser.email;
      const nameChanged = name && name !== existingUser.name;

      if (!emailChanged && !nameChanged) {
        return NextResponse.json({
          success: true,
          message: 'No changes needed',
        });
      }

      // Only update changed fields
      const updateData: UpdateData = {
        updated_at: new Date().toISOString(),
      };
      if (emailChanged) updateData.email = email;
      if (nameChanged) updateData.name = name;

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user profile:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Profile updated' });
    } else {
      // Create new user profile
      const { error } = await supabase.from('users').insert({
        id: user.id,
        email: email || user.email,
        name:
          name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error creating user profile:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Profile created' });
    }
  } catch (error) {
    console.error('Error in user profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Fetch user profile with all business fields
    const { data: userProfile, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching user profile:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: userProfile });
  } catch (error) {
    console.error('Error in user GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const updateData: UpdateUserRequest = await request.json();

    // Filter out undefined values and prepare update payload
    const updatePayload = Object.fromEntries(
      Object.entries(updateData)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          [
            'name',
            'business_name',
            'business_email',
            'business_address',
            'business_phone',
            'tax_id',
          ].includes(key) && typeof value === 'string'
            ? value.trim() || null
            : value,
        ])
    ) as Partial<UpdateUserRequest>;

    // Check if there are any fields to update
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update',
      });
    }

    // Update user profile (updated_at is handled automatically by database trigger)
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error in user PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate secure deletion token
function generateDeletionToken(): string {
  return crypto.randomUUID();
}

export async function DELETE(request: NextRequest) {
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

    const { confirmUserId, confirmEmail } = await request.json();

    // Validate confirmation data
    if (!confirmUserId || !confirmEmail) {
      return NextResponse.json(
        { error: 'Missing confirmation data' },
        { status: 400 }
      );
    }

    // Verify user ID and email match
    if (confirmUserId !== user.id || confirmEmail !== user.email) {
      return NextResponse.json(
        { error: 'Confirmation failed - user ID or email mismatch' },
        { status: 400 }
      );
    }

    // Check if user already has a pending deletion
    const { data: existingUser } = await supabase
      .from('users')
      .select('deletion_requested_at, deletion_confirmed_at')
      .eq('id', user.id)
      .single();

    if (existingUser?.deletion_confirmed_at) {
      return NextResponse.json(
        { error: 'Account deletion already confirmed and in progress' },
        { status: 400 }
      );
    }

    // Step 1: Generate deletion token and set expiration
    const deletionToken = generateDeletionToken();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24); // 24 hours

    // Step 2: Mark account for deletion
    const { error: updateError } = await supabase
      .from('users')
      .update({
        deletion_requested_at: new Date().toISOString(),
        deletion_token: deletionToken,
        deletion_token_expires_at: tokenExpiresAt.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error marking account for deletion:', updateError);
      return NextResponse.json(
        { error: 'Failed to initiate account deletion' },
        { status: 500 }
      );
    }

    // Step 4: Get user's database name for personalization
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    // Step 5: Send confirmation email with dynamic URL
    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_APP_URL
        : 'http://localhost:3000';
    const confirmationLink = `${baseUrl}/auth/confirm-deletion?token=${deletionToken}`;

    // Send confirmation email
    const emailResult = await sendDeletionConfirmationEmail(
      user.email!,
      userData?.name || user.email!,
      confirmationLink
    );

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send confirmation email. Please try again.' },
        { status: 500 }
      );
    }

    // Log the account deletion request activity (non-blocking)
    logAccountDeletionRequest(user.id).catch(error => {
      console.error('Failed to log account deletion request activity:', error);
    });

    return NextResponse.json({
      success: true,
      message:
        'Account deletion initiated. Please check your email for confirmation.',
    });
  } catch (error) {
    console.error('Error in account deletion API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const { action } = await request.json();

    if (action === 'cancel-deletion') {
      // Check if user has a pending deletion
      const { data: existingUser } = await supabase
        .from('users')
        .select('deletion_requested_at, deletion_confirmed_at')
        .eq('id', user.id)
        .single();

      if (!existingUser?.deletion_requested_at) {
        return NextResponse.json(
          { error: 'No pending account deletion found' },
          { status: 400 }
        );
      }

      // Clear all deletion-related fields
      const { error: updateError } = await supabase
        .from('users')
        .update({
          deletion_requested_at: null,
          deletion_confirmed_at: null,
          deletion_token: null,
          deletion_token_expires_at: null,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error canceling account deletion:', updateError);
        return NextResponse.json(
          { error: 'Failed to cancel account deletion' },
          { status: 500 }
        );
      }

      // Log the account deletion cancellation activity (non-blocking)
      logAccountDeletionCancellation(user.id).catch(error => {
        console.error(
          'Failed to log account deletion cancellation activity:',
          error
        );
      });

      return NextResponse.json({
        success: true,
        message: 'Account deletion has been canceled successfully.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in account deletion cancellation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
