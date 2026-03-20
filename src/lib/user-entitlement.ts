import type { PurchaseEntitlementType, PurchaseInfo } from '@freemius/sdk';

import { freemius } from '@/lib/freemius';
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
  // Call on the instance — extracting `toEntitlementRecord` and invoking it
  // detached breaks `this` inside PurchaseInfo (e.g. reading `this.licenseId`).
  const recordFromSdk = fsPurchase.toEntitlementRecord({ userId });

  const fs_license_id = recordFromSdk.fsLicenseId || fsPurchase.licenseId;
  const fs_plan_id = recordFromSdk.fsPlanId || fsPurchase.planId;
  const fs_pricing_id = recordFromSdk.fsPricingId || fsPurchase.pricingId;
  const fs_user_id = recordFromSdk.fsUserId || fsPurchase.userId;
  const entitlement_type = recordFromSdk.type;

  const expiration = coerceIsoOrNull(
    recordFromSdk.expiration ?? fsPurchase.expiration
  );

  const is_canceled =
    recordFromSdk.isCanceled ||
    fsPurchase.canceled ||
    Boolean(
      getProp(fsPurchase, 'is_canceled') ?? getProp(fsPurchase, 'is_cancelled')
    );

  const refunded_at =
    coerceIsoOrNull(
      getProp(recordFromSdk, 'refundedAt') ??
        getProp(recordFromSdk, 'refunded_at') ??
        getProp(fsPurchase, 'refundedAt') ??
        getProp(fsPurchase, 'refunded_at')
    ) ?? null;

  const isRefundedFlag = Boolean(
    refunded_at ??
      getProp(recordFromSdk, 'isRefunded') ??
      getProp(recordFromSdk, 'is_refunded') ??
      getProp(fsPurchase, 'isRefunded') ??
      getProp(fsPurchase, 'is_refunded')
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
  const isRefunded = isRefundedFlag;
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

  // We need the app user id to keep `users.subscription_*` in sync.
  const { data: existing, error: existingError } = await admin
    .from('user_fs_entitlement')
    .select('user_id')
    .eq('fs_license_id', fsLicenseId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to lookup entitlement for deletion ${fsLicenseId}: ${existingError.message}`
    );
  }

  const { error } = await admin
    .from('user_fs_entitlement')
    .delete()
    .eq('fs_license_id', fsLicenseId);

  if (error) {
    throw new Error(`Failed to delete entitlement: ${error.message}`);
  }

  const userId = existing?.user_id;
  if (userId) {
    const { error: userUpdateError } = await admin
      .from('users')
      .update({
        subscription_tier: 'free',
        subscription_status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (userUpdateError) {
      throw new Error(
        `Failed to update user subscription after deletion: ${userUpdateError.message}`
      );
    }
  }
}

type DbEntitlementRow = {
  fs_license_id: string;
  fs_plan_id: string;
  fs_pricing_id: string;
  fs_user_id: string;
  entitlement_type: string;
  expiration: string | null;
  is_canceled: boolean;
  created_at: string;
  refunded_at?: string | null;
};

type SdkEntitlementRecord = {
  fsLicenseId: string;
  fsPlanId: string;
  fsPricingId: string;
  fsUserId: string;
  type: PurchaseEntitlementType;
  expiration: string | null;
  isCanceled: boolean;
  createdAt: string;
  refundedAt?: string | null;
};

async function getUserEntitlement(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('user_fs_entitlement')
    .select(
      'fs_license_id, fs_plan_id, fs_pricing_id, fs_user_id, entitlement_type, expiration, is_canceled, created_at, refunded_at'
    )
    .eq('user_id', userId)
    .eq('entitlement_type', 'subscription');

  if (error) {
    throw new Error(`Failed to fetch entitlements: ${error.message}`);
  }

  const entitlements: SdkEntitlementRecord[] = (data ?? []).map(
    (row: DbEntitlementRow) => ({
      fsLicenseId: row.fs_license_id,
      fsPlanId: row.fs_plan_id,
      fsPricingId: row.fs_pricing_id,
      fsUserId: row.fs_user_id,
      type: row.entitlement_type as PurchaseEntitlementType,
      expiration: row.expiration,
      isCanceled: row.is_canceled,
      createdAt: row.created_at,
      refundedAt: row.refunded_at ?? null,
    })
  );

  return freemius.entitlement.getActive(entitlements);
}

export async function getFsUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const entitlement = user ? await getUserEntitlement(user.id) : null;
  const email = user?.email ?? undefined;

  return freemius.entitlement.getFsUser(entitlement, email);
}
