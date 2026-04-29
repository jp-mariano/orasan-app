import type { AuthError } from '@supabase/supabase-js';

/** User-facing copy for Supabase Auth errors (sign-in, sign-up, password reset). */
export function getAuthErrorMessage(error: AuthError | Error): string {
  const raw = ('message' in error ? error.message : '')?.toLowerCase() ?? '';

  if (raw.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (raw.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (
    raw.includes('user already registered') ||
    raw.includes('already been registered')
  ) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (raw.includes('signup is disabled')) {
    return 'Sign up is currently disabled.';
  }
  if (raw.includes('rate limit') || raw.includes('too many requests')) {
    return 'Too many attempts. Please try again later.';
  }
  if (raw.includes('password should be at least')) {
    return error instanceof Error ? error.message : 'Password is too weak.';
  }

  if ('message' in error && error.message?.trim()) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
