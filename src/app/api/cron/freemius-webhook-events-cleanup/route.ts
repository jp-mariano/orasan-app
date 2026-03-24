import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

/** Rows older than this (by `received_at`) are removed. */
const RETENTION_DAYS = 30;

/**
 * Deletes stale rows from `fs_webhook_events` (Freemius webhook idempotency ledger).
 * Vercel Cron: see `vercel.json`. Auth: `Authorization: Bearer <CRON_SECRET>` (same as other crons).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET is not configured');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }

    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const cutoffMs = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const cutoff = new Date(cutoffMs);

    const { error, count } = await supabase
      .from('fs_webhook_events')
      .delete({ count: 'exact' })
      .lt('received_at', cutoff.toISOString());

    if (error) {
      console.error('Freemius webhook events cleanup failed:', error);
      return NextResponse.json(
        { error: 'Cleanup failed', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Freemius webhook events cleanup completed',
      deleted_count: count ?? 0,
      retention_days: RETENTION_DAYS,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    console.error('Error in freemius-webhook-events-cleanup cron:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
