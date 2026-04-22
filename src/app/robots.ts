import type { MetadataRoute } from 'next';

import { getPublicSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/dashboard', '/user-settings', '/webhook'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
