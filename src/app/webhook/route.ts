/**
 * Freemius webhook entrypoint (App Router).
 *
 * We use a custom POST instead of `createRequestProcessor` alone so we can:
 * 1. Filter by Freemius `environment` (prod vs sandbox) before doing work — wrong env → 2xx, no DB row.
 * 2. Claim `event.id` in `fs_webhook_events` (`received`) so retries are idempotent — duplicate → 2xx, skip handlers.
 * 3. Mark `processed` / `failed` after the SDK runs handlers (second layer: entitlement upserts stay deterministic).
 *
 * Flow summary: verify signature → parse → [env skip?] → [claim?] → listener.process() → mark terminal status.
 */
import { freemius } from '@/lib/freemius';
import {
  markFsWebhookEventFailed,
  markFsWebhookEventProcessed,
  tryClaimFsWebhookEvent,
} from '@/lib/fs-webhook-events';
import {
  deleteEntitlement,
  syncEntitlementFromWebhook,
} from '@/lib/user-entitlement';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getProp(obj: unknown, key: string): unknown {
  return isRecord(obj) ? obj[key] : undefined;
}

function getExpectedEnvironment(): 0 | 1 {
  // Freemius uses `0` for production and `1` for sandbox.
  return process.env.NODE_ENV === 'production' ? 0 : 1;
}

/**
 * Only these types run our license sync/delete handlers below.
 * We also only insert `fs_webhook_events` rows for these — other Freemius event types pass straight to the SDK.
 * Keep this set in sync with `listener.on(...)` registrations.
 */
const HANDLED_WEBHOOK_TYPES = new Set<string>([
  'license.created',
  'license.extended',
  'license.shortened',
  'license.updated',
  'license.cancelled',
  'license.expired',
  'license.plan.changed',
  'license.deleted',
]);

/** Resolve `environment` from payload (license object, or root / data for e.g. license.deleted). */
function getWebhookEnvironment(event: unknown): number | undefined {
  const objects = getProp(event, 'objects');
  const license = getProp(objects, 'license');
  if (license && typeof license === 'object') {
    const env = getProp(license, 'environment');
    if (env === 0 || env === 1) return env;
  }
  const envFromEvent = getProp(event, 'environment');
  const envFromData = getProp(getProp(event, 'data'), 'environment');
  const env = envFromEvent ?? envFromData;
  if (env === 0 || env === 1) return env;
  return undefined;
}

type WebhookProcessResult = {
  status: number;
  success?: boolean;
  error?: string;
};

/** Response shape matches what the Freemius SDK returns from `listener.process`. */
function jsonResponse(result: WebhookProcessResult) {
  return new Response(JSON.stringify(result), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const listener = freemius.webhook.createListener();
const expectedEnvironment = getExpectedEnvironment();

listener.on(
  [
    'license.created',
    'license.extended',
    'license.shortened',
    'license.updated',
    'license.cancelled',
    'license.expired',
    'license.plan.changed',
  ],
  async ({ objects: { license } }) => {
    if (license?.id) {
      await syncEntitlementFromWebhook(String(license.id));
    }
  }
);

listener.on('license.deleted', async event => {
  const licenseId = (event.data as { license_id?: string | number } | null)
    ?.license_id;
  if (licenseId == null) return;

  await deleteEntitlement(String(licenseId));
});

/** Never fail the HTTP response if the status update alone fails (row may stay `received`). */
async function safeMarkProcessed(eventId: string) {
  try {
    await markFsWebhookEventProcessed(eventId);
  } catch (e) {
    console.error(
      '[webhook] markFsWebhookEventProcessed failed',
      eventId,
      e instanceof Error ? e.message : e
    );
  }
}

async function safeMarkFailed(eventId: string, message: string) {
  try {
    await markFsWebhookEventFailed(eventId, message);
  } catch (e) {
    console.error(
      '[webhook] markFsWebhookEventFailed failed',
      eventId,
      e instanceof Error ? e.message : e
    );
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers = request.headers;

  // Same verification the SDK uses inside `listener.process` (we need an early parse for idempotency).
  const sig = headers.get('x-signature') ?? headers.get('X-Signature');
  if (!listener.verifySignature(rawBody, sig)) {
    return jsonResponse({
      status: 401,
      success: false,
      error: 'Invalid signature',
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    // Malformed body — let the SDK return its standard error payload.
    const result = await listener.process({ headers, rawBody });
    return jsonResponse(result);
  }

  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    const result = await listener.process({ headers, rawBody });
    return jsonResponse(result);
  }

  const event = parsed as { id?: unknown; type: string };

  // Events we do not handle: no claim row; SDK may no-op or warn about missing handlers.
  if (!HANDLED_WEBHOOK_TYPES.has(event.type)) {
    const result = await listener.process({ headers, rawBody });
    return jsonResponse(result);
  }

  // Wrong sandbox/prod for this deployment: acknowledge so Freemius does not retry; do not write `fs_webhook_events`.
  const env = getWebhookEnvironment(parsed);
  if (env != null && env !== expectedEnvironment) {
    return jsonResponse({ status: 200, success: true });
  }

  const eventId = event.id;
  if (eventId == null || eventId === '') {
    // Cannot dedupe without `id`; still run handlers (rare).
    const result = await listener.process({ headers, rawBody });
    return jsonResponse(result);
  }

  const eventIdStr = String(eventId);

  // Insert `status = received` or detect duplicate (`23505`) — duplicate means already processed this Freemius event id.
  let duplicate: boolean;
  try {
    const claim = await tryClaimFsWebhookEvent({
      eventId: eventIdStr,
      eventType: event.type,
      environment: env ?? null,
    });
    duplicate = claim.duplicate;
  } catch (e) {
    console.error('[webhook] tryClaimFsWebhookEvent failed', eventIdStr, e);
    // DB outage: still run sync so the customer is not blocked; idempotency may be skipped for this delivery.
    const result = await listener.process({ headers, rawBody });
    return jsonResponse(result);
  }

  if (duplicate) {
    return jsonResponse({ status: 200, success: true });
  }

  // First-time delivery: SDK verifies again and invokes the `listener.on` handlers above.
  const result = await listener.process({ headers, rawBody });

  if (result.status === 200 && result.success === true) {
    await safeMarkProcessed(eventIdStr);
  } else {
    const errMsg =
      'error' in result && typeof result.error === 'string'
        ? result.error
        : 'Webhook processing failed';
    await safeMarkFailed(eventIdStr, errMsg);
  }

  return jsonResponse(result as WebhookProcessResult);
}
