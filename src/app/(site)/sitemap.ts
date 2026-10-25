import type { MetadataRoute } from 'next'

import { conditionAnnuaire } from '@/lib/annuaire/donnees'
import { VISIBLES } from '@/collections/Events'
import { getPayloadClient } from '@/lib/site/payload'
import { siteUrl } from '@/lib/site/seo'

/** sitemap.xml : pages publiées, actualités publiques et listes du site (complété au fil des lots). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayloadClient()
  const base = siteUrl()
  const [pages, news, fiches, evenements] = await Promise.all([
    payload.find({
      collection: 'pages',
      where: { _status: { equals: 'published' } },
      limit: 500,
      depth: 0,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'news',
      where: { and: [{ _status: { equals: 'published' } }, { etat: { not_equals: 'archive' } }] },
      limit: 1000,
      depth: 0,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'companies',
      where: conditionAnnuaire,
      select: { slug: true, updatedAt: true },
      limit: 2000,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'events',
      where: { statut: { in: VISIBLES } },
      select: { slug: true, updatedAt: true },
      limit: 1000,
      depth: 0,
      overrideAccess: false,
    }),
  ])
  const fixes = ['/actualites', '/presse', '/plan-du-site', '/membres', '/agenda', '/opportunites']
  return [
    ...pages.docs
      .filter((p) => (p as { chemin?: string }).chemin)
      .map((p) => ({
        url: `${base}${(p as { chemin: string }).chemin === '/' ? '' : (p as { chemin: string }).chemin}`,
        lastModified: p.updatedAt,
      })),
    ...fixes.map((c) => ({ url: `${base}${c}` })),
    ...news.docs.map((n) => ({
      url: `${base}/actualites/${(n as { slug: string }).slug}`,
      lastModified: n.updatedAt,
    })),
    ...evenements.docs.map((e) => ({
      url: `${base}/agenda/${(e as { slug: string }).slug}`,
      lastModified: e.updatedAt,
    })),
    ...fiches.docs.map((c) => ({
      url: `${base}/membres/${(c as { slug: string }).slug}`,
      lastModified: c.updatedAt,
    })),
  ]
}
