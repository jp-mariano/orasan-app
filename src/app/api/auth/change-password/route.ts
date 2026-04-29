import { NextRequest, NextResponse } from 'next/server';

import { logChangePasswordAttempt } from '@/lib/activity-log';
import { canManageAuthEmailAndPassword } from '@/lib/auth-account';
import { checkAuthCredentialThrottle } from '@/lib/auth-credential-throttle';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageAuthEmailAndPassword(user)) {
      return NextResponse.json(
        { error: 'Password change is not available for this account type.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const currentPassword =
      typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword =
      typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required.' },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const throttle = await checkAuthCredentialThrottle(
      user.id,
      'CHANGE_PASSWORD'
    );
    if (!throttle.allowed) {
      const headers = new Headers();
      if (throttle.retryAfter) {
        const retryAfterSeconds = Math.ceil(
          (throttle.retryAfter.getTime() - Date.now()) / 1000
        );
        headers.set('Retry-After', String(Math.max(1, retryAfterSeconds)));
      }
      return NextResponse.json(
        {
          error: throttle.error || 'Too many password change attempts.',
          retryAfter: throttle.retryAfter?.toISOString(),
        },
        { status: 429, headers }
      );
    }

    await logChangePasswordAttempt(user.id);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });

    if (error) {
      return NextResponse.json(
        { error: getAuthErrorMessage(error) },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('change-password route:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
