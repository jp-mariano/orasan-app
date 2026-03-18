import type { PurchaseInfo } from '@freemius/sdk';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type ProcessPurchaseOptions = {
  userId: string;
  fsPurchase: PurchaseInfo;
};

type EntitlementRecord = {
  fs_license_id: string;
  fs_plan_id: string;
  fs_pricing_id: string;
  fs_user_id: string;
  entitlement_type: string;
  expiration: string | null;
  is_canceled: boolean;
  refunded_at?: string | null;
  user_id: string;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getProp(obj: unknown, key: string): unknown {
  return isRecord(obj) ? obj[key] : undefined;
}

function coerceIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

async function applyPurchaseToUserEntitlement({
  userId,
  fsPurchase,
}: ProcessPurchaseOptions): Promise<void> {
  const toEntitlementRecord = getProp(fsPurchase, 'toEntitlementRecord');
  const recordFromSdk =
    typeof toEntitlementRecord === 'function'
      ? (toEntitlementRecord as (args: { userId: string }) => unknown)({
          userId,
        })
      : null;

  const fs_license_id =
    getProp(recordFromSdk, 'fsLicenseId') ??
    getProp(fsPurchase, 'licenseId') ??
    getProp(fsPurchase, 'license_id');
  const fs_plan_id =
    getProp(recordFromSdk, 'fsPlanId') ??
    getProp(fsPurchase, 'planId') ??
    getProp(fsPurchase, 'plan_id');
  const fs_pricing_id =
    getProp(recordFromSdk, 'fsPricingId') ??
    getProp(fsPurchase, 'pricingId') ??
    getProp(fsPurchase, 'pricing_id');
  const fs_user_id =
    getProp(recordFromSdk, 'fsUserId') ??
    getProp(fsPurchase, 'userId') ??
    getProp(fsPurchase, 'user_id');
  const entitlement_type =
    getProp(recordFromSdk, 'type') ??
    getProp(recordFromSdk, 'entitlementType') ??
    getProp(fsPurchase, 'type') ??
    getProp(fsPurchase, 'entitlement_type') ??
    'subscription';

  const expiration = coerceIsoOrNull(
    getProp(recordFromSdk, 'expiration') ?? getProp(fsPurchase, 'expiration')
  );
  const is_canceled = Boolean(
    getProp(recordFromSdk, 'isCanceled') ??
      getProp(fsPurchase, 'isCanceled') ??
      getProp(fsPurchase, 'is_canceled')
  );

  const refunded_at = coerceIsoOrNull(
    getProp(recordFromSdk, 'refundedAt') ?? getProp(fsPurchase, 'refunded_at')
  );

  if (!fs_license_id || !fs_plan_id || !fs_pricing_id || !fs_user_id) {
    throw new Error('Freemius purchase data missing required identifiers');
  }

  const entitlementRow: EntitlementRecord = {
    user_id: userId,
    fs_license_id: String(fs_license_id),
    fs_plan_id: String(fs_plan_id),
    fs_pricing_id: String(fs_pricing_id),
    fs_user_id: String(fs_user_id),
    entitlement_type: String(entitlement_type),
    expiration,
    is_canceled,
    refunded_at,
  };

  const admin = createAdminClient();

  const { error: upsertError } = await admin
    .from('user_fs_entitlement')
    .upsert(entitlementRow, { onConflict: 'fs_license_id' });

  if (upsertError) {
    throw new Error(`Failed to upsert entitlement: ${upsertError.message}`);
  }

  // Derive app tier/status for enforcement.
  const now = new Date();
  const expirationDate = expiration ? new Date(expiration) : null;
  const isRefunded = Boolean(refunded_at);
  const isActiveEntitlement =
    !isRefunded &&
    (!is_canceled || (expirationDate !== null && expirationDate > now));

  const subscription_tier = isActiveEntitlement ? 'pro' : 'free';
  const subscription_status = isActiveEntitlement
    ? is_canceled
      ? 'cancelled'
      : 'active'
    : 'inactive';

  const { error: userUpdateError } = await admin
    .from('users')
    .update({
      subscription_tier,
      subscription_status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (userUpdateError) {
    throw new Error(
      `Failed to update user subscription: ${userUpdateError.message}`
    );
  }
}

/**
 * Process Freemius purchase info and update local DB.
 *
 * This is called by the Freemius checkout request processor.
 */
export async function processPurchaseInfo(
  fsPurchase: PurchaseInfo
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No session. In our app, checkout is initiated by logged-in users.
    // Webhooks will keep DB in sync for off-session changes.
    return;
  }

  await applyPurchaseToUserEntitlement({ userId: user.id, fsPurchase });
}

export async function syncEntitlementFromWebhook(
  fsLicenseId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from('user_fs_entitlement')
    .select('user_id')
    .eq('fs_license_id', fsLicenseId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to lookup entitlement for license ${fsLicenseId}: ${existingError.message}`
    );
  }

  // If we haven't seen this license before, we can't safely map it to an app user yet.
  if (!existing?.user_id) return;

  const { freemius } = await import('@/lib/freemius');
  const purchaseInfo = await freemius.purchase.retrievePurchase(fsLicenseId);
  if (!purchaseInfo) return;

  await applyPurchaseToUserEntitlement({
    userId: existing.user_id,
    fsPurchase: purchaseInfo,
  });
}

export async function deleteEntitlement(fsLicenseId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('user_fs_entitlement')
    .delete()
    .eq('fs_license_id', fsLicenseId);

  if (error) {
    throw new Error(`Failed to delete entitlement: ${error.message}`);
  }
}
