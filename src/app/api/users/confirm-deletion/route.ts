import { NextRequest, NextResponse } from 'next/server';

import { logAccountDeletionConfirmation } from '@/lib/activity-log';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Step 1: Find user with this deletion token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(
        'id, deletion_token, deletion_token_expires_at, deletion_requested_at, deletion_confirmed_at'
      )
      .eq('deletion_token', token)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired confirmation token' },
        { status: 400 }
      );
    }

    // Step 2: Check if token is expired
    const now = new Date();
    const tokenExpiresAt = new Date(user.deletion_token_expires_at);

    if (now > tokenExpiresAt) {
      return NextResponse.json(
        { error: 'Confirmation token has expired' },
        { status: 400 }
      );
    }

    // Step 3: Check if deletion is already confirmed
    if (user.deletion_confirmed_at) {
      return NextResponse.json(
        { error: 'Account deletion has already been confirmed' },
        { status: 400 }
      );
    }

    // Step 4: Check if deletion was requested
    if (!user.deletion_requested_at) {
      return NextResponse.json(
        { error: 'No pending deletion request found' },
        { status: 400 }
      );
    }

    // Step 5: Confirm the deletion
    const { error: updateError } = await supabase
      .from('users')
      .update({
        deletion_confirmed_at: now.toISOString(),
        // Clear the token since it's been used
        deletion_token: null,
        deletion_token_expires_at: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error confirming account deletion:', updateError);
      return NextResponse.json(
        { error: 'Failed to confirm account deletion' },
        { status: 500 }
      );
    }

    // Log the account deletion confirmation activity (non-blocking)
    logAccountDeletionConfirmation(user.id).catch(error => {
      console.error(
        'Failed to log account deletion confirmation activity:',
        error
      );
    });

    return NextResponse.json({
      success: true,
      message: 'Account deletion confirmed successfully',
    });
  } catch (error) {
    console.error('Error in confirm-deletion API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
