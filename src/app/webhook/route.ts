import { freemius } from '@/lib/freemius';
import {
  deleteEntitlement,
  syncEntitlementFromWebhook,
} from '@/lib/user-entitlement';

const listener = freemius.webhook.createListener();

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

listener.on('license.deleted', async ({ data }) => {
  const licenseId = (data as { license_id?: string | number } | null)
    ?.license_id;
  if (licenseId != null) {
    await deleteEntitlement(String(licenseId));
  }
});

const processor = freemius.webhook.createRequestProcessor(listener);

export { processor as POST };
