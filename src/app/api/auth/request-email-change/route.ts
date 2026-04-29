import { NextRequest, NextResponse } from 'next/server';

import { logRequestEmailChangeAttempt } from '@/lib/activity-log';
import { canManageAuthEmailAndPassword } from '@/lib/auth-account';
import { checkAuthCredentialThrottle } from '@/lib/auth-credential-throttle';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { createClient } from '@/lib/supabase/server';
import { validateEmail } from '@/lib/validation';

function resolveAppOrigin(request: NextRequest): string {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_APP_URL
  ) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  return request.nextUrl.origin;
}

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
        { error: 'Email change is not available for this account type.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const newEmailRaw =
      typeof body.newEmail === 'string' ? body.newEmail.trim() : '';
    const emailError = validateEmail(newEmailRaw);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }
    const newEmail = newEmailRaw.toLowerCase();
    if (newEmail === (user.email || '').toLowerCase()) {
      return NextResponse.json(
        { error: 'This is already your email address.' },
        { status: 400 }
      );
    }

    const throttle = await checkAuthCredentialThrottle(
      user.id,
      'REQUEST_EMAIL_CHANGE'
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
          error: throttle.error || 'Too many email change attempts.',
          retryAfter: throttle.retryAfter?.toISOString(),
        },
        { status: 429, headers }
      );
    }

    await logRequestEmailChangeAttempt(user.id);

    const origin = resolveAppOrigin(request);
    const emailRedirectTo = `${origin}/auth/confirm?next=${encodeURIComponent('/user-settings')}`;

    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo }
    );

    if (error) {
      return NextResponse.json(
        { error: getAuthErrorMessage(error) },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Check your current and new email inboxes to confirm the change.',
    });
  } catch (e) {
    console.error('request-email-change route:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
