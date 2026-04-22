/**
 * Public legal/support contact for this deployment (set via env; see
 * .env.local.example). Used on /privacy, /terms, and /license.
 */
export type OperatorContact = {
  /** Legal or product name shown as "Operator" (e.g. company name). */
  legalName: string | null;
  email: string | null;
  /** Support or contact page URL (https://…). */
  supportUrl: string | null;
  hasConfiguredContact: boolean;
};

function trim(s: string | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

export function getOperatorContact(): OperatorContact {
  const legalName = trim(process.env.NEXT_PUBLIC_OPERATOR_LEGAL_NAME);
  const email = trim(process.env.NEXT_PUBLIC_OPERATOR_CONTACT_EMAIL);
  const supportUrl = trim(process.env.NEXT_PUBLIC_OPERATOR_SUPPORT_URL);
  return {
    legalName,
    email,
    supportUrl,
    hasConfiguredContact: Boolean(legalName || email || supportUrl),
  };
}
