import 'server-only'
import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

export const getPayloadClient = cache(async () => getPayload({ config }))

export type Media = { url?: string | null; alt?: string; sizes?: Record<string, { url?: string | null } | undefined>; focalX?: number | null; focalY?: number | null }

export type Bouton = { libelle: string; lien: string }

export type SectionBlock = {
  blockType: 'section'
  ancre?: string
  surtitre?: string
  titre?: string
  texte?: string
  image?: Media | number | null
  boutons?: Bouton[]
  note?: string
}

export type Carte = { titre: string; texte?: string; lien?: string; libelleLien?: string; image?: Media | number | null }

export type CartesBlock = {
  blockType: 'cartes'
  ancre?: string
  surtitre?: string
  titre?: string
  intro?: string
  style?: string
  reference?: string
  boutons?: Bouton[]
  cartes?: Carte[]
}

export type AntennesBlock = {
  blockType: 'antennes'
  ancre?: string
  antennes?: { ville: string; statut: string; adresse?: string; referent?: string; contact?: string }[]
}

export type AnyBlock = SectionBlock | CartesBlock | AntennesBlock | ({ blockType: string; ancre?: string } & Record<string, unknown>)

export type PageDoc = { id: number; title: string; slug: string; chemin?: string; layout?: AnyBlock[]; meta?: { title?: string; description?: string; image?: Media | number | null } }

/** Page publiée par son adresse sur le site (champ « chemin »). */
export const getPage = cache(async (chemin: string, draft = false): Promise<PageDoc | null> => {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'pages',
    where: { chemin: { equals: chemin } },
    limit: 1,
    depth: 1,
    draft,
    overrideAccess: draft,
  })
  return (r.docs[0] as unknown as PageDoc) ?? null
})

/** Bloc d'une page par son identifiant de section. */
export function block<T extends AnyBlock = SectionBlock>(page: PageDoc | null, ancre: string): T | undefined {
  return page?.layout?.find((b) => b.ancre === ancre) as T | undefined
}

export const mediaUrl = (m: Media | number | null | undefined, size?: 'vignette' | 'carte' | 'grande'): string | undefined => {
  if (!m || typeof m === 'number') return undefined
  return (size && m.sizes?.[size]?.url) || m.url || undefined
}

export const mediaAlt = (m: Media | number | null | undefined): string => (m && typeof m !== 'number' ? m.alt || '' : '')

/** Position de l'image à partir du point focal choisi dans la médiathèque. */
export const mediaPos = (m: Media | number | null | undefined): string | undefined =>
  m && typeof m !== 'number' && m.focalX != null && m.focalY != null ? `${m.focalX}% ${m.focalY}%` : undefined
