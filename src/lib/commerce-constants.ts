/** Shared by `/api/portal`, `/api/checkout`, and client UI when commerce is blocked. */
export const ACCOUNT_DELETION_COMMERCE_BLOCKED_CODE =
  'ACCOUNT_DELETION_PENDING' as const;

export const ACCOUNT_DELETION_COMMERCE_BLOCKED_MESSAGE =
  'Billing and checkout are unavailable while account deletion is in progress. Cancel the deletion request to manage your subscription again.';
