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
