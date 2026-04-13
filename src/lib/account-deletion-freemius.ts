import { freemius } from '@/lib/freemius';
import { createAdminClient } from '@/lib/supabase/admin';

export type AccountDeletionFreemiusGateResult =
  | { ok: true }
  | {
      ok: false;
      code: 'SUBSCRIPTION_NOT_CANCELED' | 'SUBSCRIPTION_VERIFY_FAILED';
      message: string;
    };

function subscriptionEntityIsCanceled(sub: unknown): boolean {
  if (!sub || typeof sub !== 'object') return false;
  const o = sub as Record<string, unknown>;
  const v = o.canceled_at ?? o.cancelled_at;
  if (v == null) return false;
  if (typeof v === 'string' && !v.trim()) return false;
  return true;
}

/**
 * Option A: allow account deletion only if there is no current paid-through subscription
 * mirror row, or Freemius reports the subscription as canceled (`canceled_at` set) so it
 * will not renew. Uses live API (not webhooks — `subscription.cancelled` is not wired).
 */
export async function assertAccountDeletionAllowedByFreemius(
  userId: string
): Promise<AccountDeletionFreemiusGateResult> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: row, error } = await admin
    .from('user_fs_entitlement')
    .select('fs_license_id, expiration')
    .eq('user_id', userId)
    .eq('entitlement_type', 'subscription')
    .gt('expiration', nowIso)
    .order('expiration', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[account-deletion] entitlement query failed', error);
    return {
      ok: false,
      code: 'SUBSCRIPTION_VERIFY_FAILED',
      message:
        'We could not verify your subscription status. Please try again in a few minutes.',
    };
  }

  if (!row?.fs_license_id) {
    return { ok: true };
  }

  try {
    const sub = await freemius.api.license.retrieveSubscription(
      row.fs_license_id
    );

    if (sub == null) {
      return {
        ok: false,
        code: 'SUBSCRIPTION_VERIFY_FAILED',
        message:
          'We could not load your subscription from Freemius. Please try again in a few minutes.',
      };
    }

    if (!subscriptionEntityIsCanceled(sub)) {
      return {
        ok: false,
        code: 'SUBSCRIPTION_NOT_CANCELED',
        message:
          'Cancel your subscription in Customer Portal (Billing) first. After Freemius shows it as canceled (no renewal), you can delete your account.',
      };
    }

    return { ok: true };
  } catch (e) {
    console.error('[account-deletion] Freemius retrieveSubscription failed', e);
    return {
      ok: false,
      code: 'SUBSCRIPTION_VERIFY_FAILED',
      message:
        'We could not verify your subscription with Freemius. Please try again in a few minutes.',
    };
  }
}
