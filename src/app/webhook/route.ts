import { freemius } from '@/lib/freemius';
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

const listener = freemius.webhook.createListener();

type LicenseWithEnvironment = { id?: string; environment?: 1 | 0 };
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
    const env = (license as unknown as LicenseWithEnvironment | undefined)
      ?.environment;
    // Freemius may send sandbox events to the production webhook URL; ignore them.
    if (env != null && env !== expectedEnvironment) return;

    if (license?.id) {
      await syncEntitlementFromWebhook(String(license.id));
    }
  }
);

listener.on('license.deleted', async event => {
  const envFromEvent = getProp(event, 'environment');
  const envFromData = getProp(event.data, 'environment');
  const env = envFromEvent ?? envFromData;
  const envNumber = typeof env === 'number' ? env : undefined;
  if (envNumber != null && envNumber !== expectedEnvironment) return;

  const licenseId = (event.data as { license_id?: string | number } | null)
    ?.license_id;
  if (licenseId == null) return;

  await deleteEntitlement(String(licenseId));
});

const processor = freemius.webhook.createRequestProcessor(listener);

export { processor as POST };
