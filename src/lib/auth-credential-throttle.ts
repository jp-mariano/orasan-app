import { createClient } from '@/lib/supabase/server';
import type { ActivityAction } from '@/types';

export const AUTH_CREDENTIAL_THROTTLE_CONFIG = {
  CHANGE_PASSWORD: { maxAttempts: 5, windowHours: 1 },
  REQUEST_EMAIL_CHANGE: { maxAttempts: 5, windowHours: 1 },
} as const;

export type AuthCredentialThrottleAction = Extract<
  ActivityAction,
  'CHANGE_PASSWORD' | 'REQUEST_EMAIL_CHANGE'
>;

export interface AuthCredentialThrottleResult {
  allowed: boolean;
  retryAfter?: Date;
  error?: string;
}

export async function checkAuthCredentialThrottle(
  userId: string,
  action: AuthCredentialThrottleAction
): Promise<AuthCredentialThrottleResult> {
  const cfg =
    action === 'CHANGE_PASSWORD'
      ? AUTH_CREDENTIAL_THROTTLE_CONFIG.CHANGE_PASSWORD
      : AUTH_CREDENTIAL_THROTTLE_CONFIG.REQUEST_EMAIL_CHANGE;

  try {
    const supabase = await createClient();
    const timeWindowStart = new Date();
    timeWindowStart.setHours(timeWindowStart.getHours() - cfg.windowHours);

    const { data: recent, error } = await supabase
      .from('user_activity_log')
      .select('created_at')
      .eq('user_id', userId)
      .eq('action', action)
      .gte('created_at', timeWindowStart.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking auth credential throttle:', error);
      return { allowed: true };
    }

    const count = recent?.length ?? 0;
    if (count >= cfg.maxAttempts) {
      const oldest = recent?.[recent.length - 1];
      if (oldest?.created_at) {
        const oldestAt = new Date(oldest.created_at);
        const retryAfter = new Date(oldestAt);
        retryAfter.setHours(retryAfter.getHours() + cfg.windowHours);
        return {
          allowed: false,
          retryAfter,
          error: `Too many attempts. Try again after ${retryAfter.toLocaleString()}.`,
        };
      }
      return {
        allowed: false,
        error: 'Too many attempts. Please try again later.',
      };
    }

    return { allowed: true };
  } catch (e) {
    console.error('checkAuthCredentialThrottle:', e);
    return { allowed: true };
  }
}
