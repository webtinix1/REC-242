import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/site/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/espace-membre', '/apercu', '/composants', '/recherche'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
