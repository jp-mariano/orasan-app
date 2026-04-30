/** Cloudflare test sitekey that always passes (visible widget). For local dev when env is unset. */
export const TURNSTILE_ALWAYS_PASS_TEST_SITEKEY =
  '1x00000000000000000000AA' as const;

/**
 * Site key for the Turnstile widget. Production must set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
 * In development, falls back to Cloudflare’s always-pass test key (pair it with the matching test secret in Supabase when testing).
 */
export function getTurnstileSiteKey(): string {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (key) return key;
  if (process.env.NODE_ENV === 'development') {
    return TURNSTILE_ALWAYS_PASS_TEST_SITEKEY;
  }
  return '';
}
