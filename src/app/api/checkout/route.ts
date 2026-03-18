/**
 * Checkout endpoint used by the Freemius React Starter Kit.
 *
 * Handles:
 * - GET action=pricing_data
 * - POST action=process_purchase (sync)
 */
import { freemius } from '@/lib/freemius';
import { processPurchaseInfo } from '@/lib/user-entitlement';

const processor = freemius.checkout.request.createProcessor({
  onPurchase: processPurchaseInfo,
});

export { processor as GET, processor as POST };
