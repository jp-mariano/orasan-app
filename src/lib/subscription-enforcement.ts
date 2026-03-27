import type { SupabaseClient } from '@supabase/supabase-js';

type SubscriptionTier = 'free' | 'pro';

type UserSubscription = {
  tier: SubscriptionTier;
  status: 'active' | 'inactive' | 'cancelled';
};

export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSubscription> {
  const { data, error } = await supabase
    .from('users')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user subscription: ${error.message}`);
  }

  const tier = (data?.subscription_tier ?? 'free') as SubscriptionTier;
  const status = (data?.subscription_status ??
    'inactive') as UserSubscription['status'];

  return { tier, status };
}

export type FreeTierProjectLimitState = {
  overLimit: boolean;
  activeProjectCount: number;
  writableProjectIds: string[];
};

export async function getFreeTierProjectLimitState(
  supabase: SupabaseClient,
  userId: string
): Promise<FreeTierProjectLimitState> {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  const rows = projects ?? [];
  const active = rows.filter(p => p.status !== 'completed');
  const activeProjectCount = active.length;
  const overLimit = activeProjectCount > 2;

  const writableProjectIds = overLimit ? active.slice(0, 2).map(p => p.id) : [];

  return { overLimit, activeProjectCount, writableProjectIds };
}

/** Free users may not create, update, or delete invoices (view/download unchanged). */
export function invoiceMutationAllowedForTier(tier: SubscriptionTier): boolean {
  return tier === 'pro';
}

export const INVOICE_PRO_ONLY_ERROR_MESSAGE =
  'Invoicing is available on Pro only.' as const;

/** Tooltips and short disabled reasons when a control is blocked (read-only project on Free). */
export const FREE_TIER_PROJECT_READONLY_SHORT_MESSAGE =
  'This project is read-only on the Free plan' as const;

/**
 * Opening sentence for in-app banners (Free plan + over active-project limit).
 * Append a space and a page-specific suffix if needed.
 */
export const FREE_TIER_PROJECT_READONLY_BANNER_BASE =
  `${FREE_TIER_PROJECT_READONLY_SHORT_MESSAGE} because you have more than 2 active projects.` as const;

/** `error` field in JSON 403 responses for blocked mutations (API wording uses “tier”). */
export const FREE_TIER_PROJECT_READONLY_API_MESSAGE =
  'This project is read-only on the Free tier because you have more than 2 active projects.' as const;

/**
 * For batch timer mutations: `null` means every project is allowed (Pro, or Free
 * within active-project limit). Otherwise only IDs in the set may be mutated.
 */
export async function getProjectIdsAllowedForTimeEntryMutation(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string> | null> {
  const { tier } = await getUserSubscription(supabase, userId);
  if (tier === 'pro') return null;

  const { overLimit, writableProjectIds } = await getFreeTierProjectLimitState(
    supabase,
    userId
  );
  if (!overLimit) return null;
  return new Set(writableProjectIds);
}

export async function assertProjectWritableOrThrow(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<void> {
  const { tier } = await getUserSubscription(supabase, userId);
  if (tier === 'pro') return;

  const { overLimit, writableProjectIds } = await getFreeTierProjectLimitState(
    supabase,
    userId
  );

  if (!overLimit) return;
  if (writableProjectIds.includes(projectId)) return;

  const error = new Error('Project is read-only on Free tier');
  (error as Error & { code?: string; writableProjectIds?: string[] }).code =
    'FREE_TIER_PROJECT_READONLY';
  (
    error as Error & { code?: string; writableProjectIds?: string[] }
  ).writableProjectIds = writableProjectIds;
  throw error;
}
