import 'server-only'
import { cache } from 'react'

import { getPayloadClient, type Media } from './payload'

export type Settings = {
  adresse?: string
  email?: string
  horaires?: string
  reseauxSociaux?: { reseau: string; url: string }[]
  planAcces?: { latitude?: number | null; longitude?: number | null; indications?: string }
  whatsapp?: { numero?: string; lienChaine?: string }
  chiffresCles?: { libelle: string; mode: string; valeur?: string }[]
  tarifs?: Record<string, number | undefined>
  annuaire?: { edition?: string; cloture?: string; encartLogo?: number; encartDemiPage?: number; encartPleinePage?: number }
  seo?: { titre?: string; description?: string; image?: Media | number | null }
}

export type NavLink = { libelle: string; url?: string; page?: { chemin?: string } | number | null; sousMenu?: NavLink[] }
export type Navigation = { principal?: NavLink[]; piedDePage?: { titre: string; liens?: NavLink[] }[] }

export const getSettings = cache(async (): Promise<Settings> => {
  const payload = await getPayloadClient()
  return (await payload.findGlobal({ slug: 'settings', depth: 1 })) as unknown as Settings
})

export const getNavigation = cache(async (): Promise<Navigation> => {
  const payload = await getPayloadClient()
  return (await payload.findGlobal({ slug: 'navigation', depth: 1 })) as unknown as Navigation
})

export const linkHref = (l: NavLink): string =>
  (l.page && typeof l.page !== 'number' && l.page.chemin) || l.url || '#'

/** Lien WhatsApp avec message prérempli. */
export const waLink = (numero?: string, message?: string): string | undefined => {
  if (!numero) return undefined
  const digits = numero.replace(/\D/g, '')
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

/**
 * Chiffres clés : saisis, ou calculés à partir des données (les calculs se branchent quand les membres existent, lot 6).
 * Un chiffre vide n'est pas renvoyé : il n'apparaît pas sur le site.
 */
export const getKeyFigures = cache(async (): Promise<{ libelle: string; valeur: string }[]> => {
  const s = await getSettings()
  const payload = await getPayloadClient()
  const has = (slug: string) => payload.config.collections.some((c) => c.slug === slug)
  const out: { libelle: string; valeur: string }[] = []
  for (const c of s.chiffresCles ?? []) {
    let v = c.mode === 'saisi' ? (c.valeur ?? '').trim() : ''
    if (c.mode === 'membresActifs' && has('members')) {
      v = String((await payload.count({ collection: 'members' as never, where: { statut: { equals: 'actif' } } as never, overrideAccess: true })).totalDocs)
    }
    if (c.mode === 'entreprises' && has('companies')) {
      v = String((await payload.count({ collection: 'companies' as never, overrideAccess: true })).totalDocs)
    }
    if (v) out.push({ libelle: c.libelle, valeur: v })
  }
  return out
})
