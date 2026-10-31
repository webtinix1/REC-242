import 'server-only'
import type { Where } from 'payload'
import { cache } from 'react'

import { getPayloadClient, type Media } from './payload'

/** Lecture publique : les fonctions d'accès des collections s'appliquent comme pour un visiteur. */
const pub = { overrideAccess: false, depth: 1 } as const

export type Tag = { id: number; nom: string; slug?: string }

export type Person = {
  id: number
  nom: string
  initiales?: string
  photo?: Media | number | null
  fonction: string
  role: 'fondatrice' | 'comite' | 'expert'
  pole?: string
  etiquettes?: (Tag | number)[]
  slug?: string | null
}

export type Profil = Person & {
  accroche?: string | null
  lieu?: string | null
  presentation?: string | null
  chiffres?: { id?: string; valeur: string; libelle: string }[] | null
  rubriques?:
    | {
        id?: string
        titre: string
        disposition: 'chronologie' | 'cartes'
        entrees?:
          | {
              id?: string
              periode?: string | null
              lieu?: string | null
              titre: string
              organisation?: string | null
              description?: string | null
              points?: string | null
            }[]
          | null
      }[]
    | null
  competences?: { id?: string; titre: string; texte?: string | null }[] | null
  domaines?: string | null
}

export const tagNames = (p: { etiquettes?: (Tag | number)[] }): string[] =>
  (p.etiquettes ?? []).filter((t): t is Tag => typeof t !== 'number').map((t) => t.nom)

export const getPeople = cache(async (): Promise<Person[]> => {
  const payload = await getPayloadClient()
  const r = await payload.find({ collection: 'people', ...pub, sort: 'ordre', limit: 200 })
  return r.docs as unknown as Person[]
})

/** Adresse de la page de profil : réservée au comité (fondatrice comprise), les experts n'en ont pas. */
export const profilHref = (p: Pick<Person, 'role' | 'slug'>): string | undefined =>
  p.role !== 'expert' && p.slug ? `/le-reseau/gouvernance/${p.slug}` : undefined

/** Profil d'un membre du comité, avec les droits du visiteur. En aperçu, l'équipe voit aussi une fiche masquée. */
export const getProfil = cache(async (slug: string, apercu = false): Promise<Profil | null> => {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'people',
    where: { and: [{ slug: { equals: slug } }, { role: { not_equals: 'expert' } }] },
    limit: 1,
    depth: 1,
    overrideAccess: apercu,
  })
  return (r.docs[0] as unknown as Profil) ?? null
})

export type Commission = {
  id: number
  nom: string
  slug: string
  objet: string
  image?: Media | number | null
  responsable?: Person | number | null
  ouverture: 'ouverte' | 'designation'
  experts?: (Person | number)[]
}

export const getCommissions = cache(async (): Promise<Commission[]> => {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'commissions',
    ...pub,
    where: { afficheeSurSite: { equals: true } },
    sort: 'ordre',
    limit: 50,
  })
  return r.docs as unknown as Commission[]
})

export type Partner = {
  id: number
  nom: string
  logo?: Media | number | null
  lien?: string
  type?: string
  description?: string
}

export const getPartners = cache(async (): Promise<Partner[]> => {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'partners',
    ...pub,
    where: { conventionSignee: { equals: true } },
    sort: 'ordre',
    limit: 100,
  })
  return r.docs as unknown as Partner[]
})

export type FaqItem = { id: number; question: string; reponse: string }

export const getFaq = cache(async (emplacement: 'accueil' | 'adherer'): Promise<FaqItem[]> => {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'faq',
    ...pub,
    where: { and: [{ visible: { equals: true } }, { emplacements: { contains: emplacement } }] },
    sort: 'ordre',
    limit: 50,
  })
  return r.docs as unknown as FaqItem[]
})

export type DocItem = {
  id: number
  titre: string
  rubrique: string
  visibilite: string
  typePresse?: string
  description?: string
  dateDocument?: string
  couverture?: Media | number | null
  filesize?: number
}

export const docHref = (d: { id: number }) => `/api/documents/${d.id}/telecharger`

/** Documents publics d'une rubrique (le visiteur ne lit que les documents publics). */
export const getDocs = cache(async (rubrique: string, typePresse?: string): Promise<DocItem[]> => {
  const payload = await getPayloadClient()
  const and: Where[] = [{ rubrique: { equals: rubrique } }]
  if (typePresse) and.push({ typePresse: { equals: typePresse } })
  const r = await payload.find({
    collection: 'documents',
    ...pub,
    where: { and },
    sort: ['-dateDocument', 'id'],
    limit: 100,
  })
  return r.docs as unknown as DocItem[]
})

/** Titres des textes officiels, publics ou réservés aux membres (le titre n'est pas une donnée sensible). */
export const getTextesOfficiels = cache(async (): Promise<DocItem[]> => {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'documents',
    overrideAccess: true,
    depth: 0,
    where: {
      and: [{ rubrique: { equals: 'textes' } }, { visibilite: { in: ['public', 'membres'] } }],
    },
    sort: 'createdAt',
    limit: 20,
    select: { titre: true, rubrique: true, visibilite: true, dateDocument: true },
  })
  return r.docs as unknown as DocItem[]
})

export type NewsItem = {
  id: number
  titre: string
  slug: string
  chapeau: string
  type: string
  image?: Media | number | null
  corps?: unknown
  blocs?: unknown[]
  secteurs?: (Tag | number)[]
  datePublication?: string
  reserveMembres?: boolean
  aLaUne?: boolean
  pdf?: DocItem | number | null
  auteur?: { nom?: string; prenom?: string; email?: string } | number | null
  meta?: { title?: string; description?: string; image?: Media | number | null }
}

export const NEWS_TYPE_LABEL: Record<string, string> = {
  article: 'Article',
  communique: 'Communiqué',
  interview: 'Interview',
  annonce: 'Annonce',
  retour: 'Retour sur événement',
}

export const getNews = cache(
  async (opts: { type?: string; secteur?: string; page?: number; limit?: number; publiques?: boolean } = {}) => {
    const payload = await getPayloadClient()
    const and: Where[] = [{ _status: { equals: 'published' } }, { etat: { not_equals: 'archive' } }]
    if (opts.type) and.push({ type: { equals: opts.type } })
    if (opts.secteur) and.push({ 'secteurs.slug': { equals: opts.secteur } })
    if (opts.publiques) and.push({ reserveMembres: { not_equals: true } })
    const r = await payload.find({
      collection: 'news',
      ...pub,
      where: { and },
      sort: ['rang', '-datePublication', 'id'],
      page: opts.page ?? 1,
      limit: opts.limit ?? 6,
    })
    return {
      docs: r.docs as unknown as NewsItem[],
      totalPages: r.totalPages,
      page: r.page ?? 1,
      totalDocs: r.totalDocs,
    }
  },
)

export const getNewsBySlug = cache(
  async (slug: string, draft = false): Promise<NewsItem | null> => {
    const payload = await getPayloadClient()
    const r = await payload.find({
      collection: 'news',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 2,
      draft,
      overrideAccess: draft,
    })
    return (r.docs[0] as unknown as NewsItem) ?? null
  },
)

export const getSectors = cache(async (): Promise<Tag[]> => {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'sectors',
    ...pub,
    depth: 0,
    sort: 'ordre',
    limit: 100,
  })
  return r.docs as unknown as Tag[]
})

/** Le visiteur est-il un membre connecté ? (Collection `members`, lot 6.) */
export const isMemberViewer = async (headers: Headers): Promise<boolean> => {
  const payload = await getPayloadClient()
  if (!payload.config.collections.some((c) => (c.slug as string) === 'members')) return false
  const { user } = await payload.auth({ headers })
  return (
    (user as { collection?: string; statut?: string } | null)?.collection === 'members' &&
    (user as { statut?: string }).statut === 'actif'
  )
}

export const hasCollection = async (slug: string): Promise<boolean> => {
  const payload = await getPayloadClient()
  return payload.config.collections.some((c) => c.slug === slug)
}
