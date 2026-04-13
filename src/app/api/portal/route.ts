import { NextRequest } from 'next/server';

import { getCommerceBlockedByAccountDeletionResponse } from '@/lib/commerce-access';
import { freemius } from '@/lib/freemius';
import { getFsUser, processPurchaseInfo } from '@/lib/user-entitlement';

const processor = freemius.customerPortal.request.createProcessor({
  getUser: getFsUser,
  portalEndpoint: `${process.env.NEXT_PUBLIC_APP_URL}/api/portal`,
  isSandbox: process.env.NODE_ENV !== 'production',
  onRestore: freemius.customerPortal.createRestorer(processPurchaseInfo),
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
