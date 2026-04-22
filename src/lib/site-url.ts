/**
 * Public canonical origin for sitemap, robots, and other absolute URLs.
 * Set `NEXT_PUBLIC_APP_URL` in all deployed environments (see `.env.local.example`).
 */
export function getPublicSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}
