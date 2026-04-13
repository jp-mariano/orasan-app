import { NextResponse } from 'next/server';

import {
  ACCOUNT_DELETION_COMMERCE_BLOCKED_CODE,
  ACCOUNT_DELETION_COMMERCE_BLOCKED_MESSAGE,
} from '@/lib/commerce-constants';
import { createClient } from '@/lib/supabase/server';

/**
 * When non-null, return this from GET/POST handlers for `/api/portal` and
 * `/api/checkout` instead of delegating to Freemius. Unauthenticated requests
 * return null so the Freemius processor can apply its own auth behavior.
 */
export async function getCommerceBlockedByAccountDeletionResponse(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: row, error } = await supabase
    .from('users')
    .select('deletion_requested_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[commerce-access] users lookup failed', error);
    return NextResponse.json(
      {
        error: 'Unable to verify account state. Please try again.',
        code: 'ACCOUNT_STATE_VERIFY_FAILED',
      },
      { status: 500 }
    );
  }

  if (row?.deletion_requested_at) {
    return NextResponse.json(
      {
        error: ACCOUNT_DELETION_COMMERCE_BLOCKED_MESSAGE,
        code: ACCOUNT_DELETION_COMMERCE_BLOCKED_CODE,
      },
      { status: 403 }
    );
  }

  return null;
}
