import type { MetadataRoute } from 'next';

import { getPublicSiteUrl } from '@/lib/site-url';

/** Indexable public routes (marketing and legal). */
const PUBLIC_PATHS = ['/', '/privacy', '/terms', '/license'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicSiteUrl();
  const now = new Date();

  return PUBLIC_PATHS.map(path => {
    return {
      url: path === '/' ? base : `${base}${path}`,
      lastModified: now,
      changeFrequency: path === '/' ? 'weekly' : 'yearly',
      priority: path === '/' ? 1 : 0.5,
    };
  });
}
