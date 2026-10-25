import 'server-only'
import type { Metadata } from 'next'

import { getPage, mediaUrl, type Media } from './payload'
import { getSettings } from './settings'

export const siteUrl = () => process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/** Retire le suffixe « · REC 242 » ajouté par le plugin SEO : le gabarit des titres l'ajoute déjà. */
const sansSuffixe = (t?: string) => t?.replace(/\s*·\s*REC 242\s*$/, '')

/**
 * Métadonnées d'une page : champs SEO de la page (plugin SEO), sinon son titre et la description générale.
 * Titre, description, image de partage et URL canonique.
 */
export async function metadataFor(
  chemin: string,
  d: {
    title?: string
    description?: string
    image?: Media | number | null
    absoluteTitle?: boolean
    type?: 'website' | 'article'
  },
): Promise<Metadata> {
  const s = await getSettings()
  const title = sansSuffixe(d.title) || s.seo?.titre || 'REC 242'
  const description = d.description || s.seo?.description
  const img = mediaUrl(d.image, 'grande') || mediaUrl(s.seo?.image, 'grande')
  return {
    title: d.absoluteTitle ? { absolute: s.seo?.titre || title } : title,
    description,
    alternates: { canonical: chemin },
    openGraph: {
      title,
      description,
      url: chemin,
      type: d.type ?? 'website',
      images: img ? [{ url: img }] : undefined,
    },
  }
}

export async function pageMetadata(
  chemin: string,
  opts: { absoluteTitle?: boolean; fallbackTitle?: string } = {},
): Promise<Metadata> {
  const page = await getPage(chemin)
  return metadataFor(chemin, {
    title: page?.meta?.title || page?.title || opts.fallbackTitle,
    description: page?.meta?.description,
    image: page?.meta?.image,
    absoluteTitle: opts.absoluteTitle,
  })
}

/** Données structurées BreadcrumbList. */
export const breadcrumbLd = (items: { nom: string; chemin: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [{ nom: 'Accueil', chemin: '/' }, ...items].map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.nom,
    item: `${siteUrl()}${it.chemin}`,
  })),
})
