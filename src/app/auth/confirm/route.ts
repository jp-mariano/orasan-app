import { type NextRequest, NextResponse } from 'next/server';

import { type EmailOtpType } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

/** Only allow same-origin relative paths for open redirects. */
function safeRedirectPath(next: string): string {
  if (next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/dashboard';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextRaw = searchParams.get('next') ?? '/dashboard';
  const nextPath = safeRedirectPath(nextRaw);

  const failUrl = new URL(request.url);
  failUrl.pathname = '/auth/signin';
  failUrl.search = '';
  failUrl.searchParams.set('error', 'confirmation_failed');

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      const ok = new URL(nextPath, request.url);
      return NextResponse.redirect(ok);
    }
  }

  return NextResponse.redirect(failUrl);
}
