import type { SearchPluginConfig } from '@payloadcms/plugin-search/types'

import { plainText } from '@/lib/richtext'

const TZ = 'Africa/Brazzaville'
const dateLong = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: TZ,
      })
    : ''

const NEWS_LABEL: Record<string, string> = {
  article: 'Article',
  communique: 'Communiqué',
  interview: 'Interview',
  annonce: 'Annonce',
  retour: 'Retour sur événement',
}

/** Tous les textes d'une liste de blocs (titres, textes, cartes), pour la recherche. */
const blockText = (v: unknown): string[] => {
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.flatMap(blockText)
  if (v && typeof v === 'object')
    return Object.entries(v)
      .filter(([k]) =>
        [
          'surtitre',
          'titre',
          'texte',
          'intro',
          'note',
          'cartes',
          'antennes',
          'ville',
          'adresse',
          'referent',
        ].includes(k),
      )
      .flatMap(([, x]) => blockText(x))
  return []
}

const court = (s: string, n = 160) =>
  s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s

/**
 * Recherche du site (écran 23) : pages, actualités, et au fil des lots événements et fiches publiques des membres.
 * Seul le contenu public est indexé : pour une actualité réservée, le titre et le chapeau seulement.
 */
export const searchConfig: SearchPluginConfig = {
  collections: ['pages', 'news'],
  defaultPriorities: { pages: 10, news: 20 },
  searchOverrides: {
    slug: 'search',
    labels: { singular: 'Résultat de recherche', plural: 'Index de recherche' },
    admin: { hidden: true },
    access: { read: () => true },
    fields: ({ defaultFields }) => [
      ...defaultFields,
      { name: 'type', label: 'Type', type: 'text', index: true },
      { name: 'lien', label: 'Lien', type: 'text' },
      { name: 'extrait', label: 'Extrait', type: 'textarea' },
      { name: 'contenu', label: 'Contenu indexé', type: 'textarea' },
    ],
  },
  beforeSync: ({ originalDoc, searchDoc, collectionSlug }) => {
    if (collectionSlug === 'pages') {
      const textes = blockText(originalDoc.layout)
      const hero = (originalDoc.layout ?? []).find(
        (b: { ancre?: string }) => b.ancre === 'hero',
      ) as { texte?: string } | undefined
      return {
        ...searchDoc,
        title: originalDoc.title,
        type: 'Page',
        lien: originalDoc.chemin || '/',
        extrait: court(
          originalDoc.meta?.description || hero?.texte || textes.find((t) => t.length > 40) || '',
        ),
        contenu: textes.join(' \n'),
      }
    }
    if (collectionSlug === 'news') {
      const corps = originalDoc.reserveMembres ? '' : plainText(originalDoc.corps)
      return {
        ...searchDoc,
        title: originalDoc.titre,
        type: 'Actualité',
        lien: `/actualites/${originalDoc.slug}`,
        extrait: [NEWS_LABEL[originalDoc.type], dateLong(originalDoc.datePublication)]
          .filter(Boolean)
          .join(' · '),
        contenu: [originalDoc.chapeau, corps].join(' \n'),
      }
    }
    return searchDoc
  },
}
