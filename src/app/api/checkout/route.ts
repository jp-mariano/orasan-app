/**
 * Checkout endpoint used by the Freemius React Starter Kit.
 *
 * Handles:
 * - GET action=pricing_data
 * - POST action=process_purchase (sync)
 */
import { NextRequest } from 'next/server';

import { getCommerceBlockedByAccountDeletionResponse } from '@/lib/commerce-access';
import { freemius } from '@/lib/freemius';
import { processPurchaseInfo } from '@/lib/user-entitlement';

const processor = freemius.checkout.request.createProcessor({
  onPurchase: processPurchaseInfo,
});

export async function GET(request: NextRequest) {
  const blocked = await getCommerceBlockedByAccountDeletionResponse();
  if (blocked) return blocked;
  return processor(request);
}

export async function POST(request: NextRequest) {
  const blocked = await getCommerceBlockedByAccountDeletionResponse();
  if (blocked) return blocked;
  return processor(request);
}
