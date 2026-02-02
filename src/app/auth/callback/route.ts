import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Use canonical app URL in production so redirect always goes to orasan.app
  // even if request host is wrong (e.g. proxy or Supabase redirecting to localhost).
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_URL
      : 'http://localhost:3000';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful authentication, redirect to dashboard
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // If there's an error or no code, redirect to signin
  return NextResponse.redirect(
    `${baseUrl}/auth/signin?error=auth_callback_failed`
  );
}
