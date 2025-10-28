import { NextRequest, NextResponse } from 'next/server';

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

// Helper function to create deletion confirmation email HTML
function createDeletionEmailHtml(
  userName: string,
  confirmationLink: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Confirm Account Deletion</h2>
        <p>Hello ${userName || 'User'},</p>
        <p>You requested to delete your account from our time tracking application.</p>
        
        <div class="warning">
          <strong>⚠️ Warning:</strong> This action will permanently delete all your data including:
          <ul>
            <li>All projects and tasks</li>
            <li>All time entries and work sessions</li>
            <li>All invoices and business information</li>
            <li>Your account profile</li>
          </ul>
        </div>
        
        <p>Click the button below to confirm account deletion:</p>
        <a href="${confirmationLink}" class="button">Confirm Account Deletion</a>
        
        <p><strong>Grace Period:</strong> Your account will be permanently deleted after 7 days. You can cancel this request anytime before then by logging into your account.</p>
        
        <p>If you didn't request this deletion, please ignore this email or contact support.</p>
        
        <div class="footer">
          <p>This email was sent because you requested account deletion. If you have questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
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

    // Step 4: Send confirmation email
    const confirmationLink = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/confirm-deletion?token=${deletionToken}`;
    const emailHtml = createDeletionEmailHtml(
      user.user_metadata?.name || user.email,
      confirmationLink
    );

    // TODO: Implement actual email sending
    // For now, we'll log the email content
    console.log('Deletion confirmation email would be sent to:', user.email);
    console.log('Confirmation link:', confirmationLink);
    console.log('Email HTML:', emailHtml);

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
