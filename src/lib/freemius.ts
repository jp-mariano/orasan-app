/**
 * Freemius SDK — server-side only (API routes, server components).
 * Do not import this file from client components.
 */
import { Freemius } from '@freemius/sdk';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

export const freemius = new Freemius({
  productId: requireEnv('FREEMIUS_PRODUCT_ID'),
  apiKey: requireEnv('FREEMIUS_API_KEY'),
  secretKey: requireEnv('FREEMIUS_SECRET_KEY'),
  publicKey: requireEnv('FREEMIUS_PUBLIC_KEY'),
});
