import { createAdminClient } from '@/lib/supabase/admin';

/** Postgres unique_violation — duplicate Freemius `event.id` (already claimed). */
const PG_UNIQUE_VIOLATION = '23505';

export type ClaimFsWebhookEventParams = {
  eventId: string;
  eventType: string;
  /** Freemius `0` = production, `1` = sandbox; omit or pass null if unknown. */
  environment?: number | null;
};

/**
 * Claim a webhook event for processing (`status = received`).
 * On unique conflict for `event_id`, returns `{ duplicate: true }` (respond 2xx, skip work).
 */
export async function tryClaimFsWebhookEvent({
  eventId,
  eventType,
  environment,
}: ClaimFsWebhookEventParams): Promise<{ duplicate: boolean }> {
  const admin = createAdminClient();

  const { error } = await admin.from('fs_webhook_events').insert({
    event_id: eventId,
    event_type: eventType,
    environment: environment ?? null,
    status: 'received',
  });

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      return { duplicate: true };
    }
    throw new Error(`Failed to claim Freemius webhook event: ${error.message}`);
  }

  return { duplicate: false };
}

/**
 * Mark a claimed event as successfully processed (only updates rows still `received`).
 */
export async function markFsWebhookEventProcessed(
  eventId: string
): Promise<void> {
  const admin = createAdminClient();
  const processedAt = new Date().toISOString();

  const { error } = await admin
    .from('fs_webhook_events')
    .update({
      status: 'processed',
      processed_at: processedAt,
      error_message: null,
    })
    .eq('event_id', eventId)
    .eq('status', 'received');

  if (error) {
    throw new Error(
      `Failed to mark Freemius webhook event processed: ${error.message}`
    );
  }
}

/**
 * Mark a claimed event as failed (only updates rows still `received`).
 */
export async function markFsWebhookEventFailed(
  eventId: string,
  message: string
): Promise<void> {
  const admin = createAdminClient();
  const processedAt = new Date().toISOString();

  const { error } = await admin
    .from('fs_webhook_events')
    .update({
      status: 'failed',
      processed_at: processedAt,
      error_message: message,
    })
    .eq('event_id', eventId)
    .eq('status', 'received');

  if (error) {
    throw new Error(
      `Failed to mark Freemius webhook event failed: ${error.message}`
    );
  }
}
