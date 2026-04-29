import type { User } from '@supabase/supabase-js';

/**
 * True when the user can manage email + password in Orasan (email provider only,
 * no GitHub/Google identity). Hybrid OAuth+email accounts use OAuth for this policy.
 */
export function canManageAuthEmailAndPassword(user: User | null): boolean {
  if (!user) return false;

  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.length > 0) {
    const hasOAuth = providers.some(p => p === 'google' || p === 'github');
    const hasEmail = providers.includes('email');
    return hasEmail && !hasOAuth;
  }

  const identities = user.identities ?? [];
  if (identities.length > 0) {
    const hasOAuth = identities.some(
      i => i.provider === 'google' || i.provider === 'github'
    );
    const hasEmail = identities.some(i => i.provider === 'email');
    return hasEmail && !hasOAuth;
  }

  const single = user.app_metadata?.provider;
  if (typeof single === 'string') {
    if (single === 'google' || single === 'github') return false;
    if (single === 'email') return true;
  }

  return false;
}
