import type { Where } from 'payload'

import { CATEGORIES } from '@/lib/adhesion/categories'
import { joursRestants, typeLabel } from '@/lib/opportunites/regles'
import { getPayloadClient } from '@/lib/site/payload'

export type OppPublique = {
  id: number
  reservee: false
  type: string
  titre: string
  secteur: string
  par: string
  dateLimite: string
  jours: number
  lien?: string
  commentRepondre?: string
}
export type OppReservee = { id: number; reservee: true; type: string; dateLimite: string; jours: number }
export type OppCarte = OppPublique | OppReservee
export type OppExpiree = { id: number; type: string; titre: string; dateLimite: string }

type Brut = {
  id: number
  type: string
  titre: string
  dateLimite: string
  auteur?: string | null
  membre?: number | { id: number } | null
  secteurs?: (number | { id: number })[] | null
  source?: { lien?: string | null; libelle?: string | null } | null
  commentRepondre?: string | null
}
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))
const RELAYEES = ['evenement', 'appel-offres', 'financement']

/** Opportunités publiques publiées : lues sans utilisateur, la fonction d'accès ne renvoie que les publiques. */
async function publiques(type: string | undefined, accueil: boolean): Promise<OppPublique[]> {
  const payload = await getPayloadClient()
  const where: Where = {
    and: [
      { statut: { equals: 'publiee' } },
      { visibilite: { equals: 'public' } },
      ...(type ? [{ type: { equals: type } }] : []),
      ...(accueil ? [{ miseEnAvant: { equals: true } }] : []),
    ],
  }
  const r = await payload.find({ collection: 'opportunities', where, sort: 'dateLimite', limit: 100, depth: 0, overrideAccess: false })
  const docs = (r.docs as unknown as Brut[]).filter((o) => joursRestants(o.dateLimite) >= 0)
  const secteurIds = [...new Set(docs.flatMap((o) => (o.secteurs ?? []).map(idDe)).filter(Boolean))] as number[]
  const membreIds = [...new Set(docs.filter((o) => o.auteur === 'membre').map((o) => idDe(o.membre)).filter(Boolean))] as number[]
  const [secteurs, membres] = await Promise.all([
    secteurIds.length
      ? payload.find({ collection: 'sectors', where: { id: { in: secteurIds } }, limit: 100, depth: 0, overrideAccess: true })
      : { docs: [] },
    membreIds.length
      ? payload.find({ collection: 'members', where: { id: { in: membreIds } }, select: { categorie: true }, limit: 100, depth: 0, overrideAccess: true })
      : { docs: [] },
  ])
  const nomSecteur = new Map((secteurs.docs as unknown as { id: number; nom: string }[]).map((s) => [s.id, s.nom]))
  const catMembre = new Map((membres.docs as unknown as { id: number; categorie: string }[]).map((m) => [m.id, m.categorie]))
  return docs.map((o) => {
    const noms = (o.secteurs ?? []).map((s) => nomSecteur.get(idDe(s) as number)).filter(Boolean) as string[]
    let par = o.source?.libelle?.trim() || (RELAYEES.includes(o.type) ? 'Relayé par REC 242' : 'Publié par REC 242')
    if (o.auteur === 'membre') {
      const cat = CATEGORIES.find((c) => c.valeur === catMembre.get(idDe(o.membre) as number))
      par = cat ? `Membre catégorie ${cat.lettre}` : 'Membre'
    }
    return {
      id: o.id,
      reservee: false as const,
      type: typeLabel(o.type),
      titre: o.titre,
      secteur: noms.length ? noms.join(', ') : 'Tous secteurs',
      par,
      dateLimite: o.dateLimite,
      jours: joursRestants(o.dateLimite),
      lien: o.source?.lien?.trim() || undefined,
      commentRepondre: o.commentRepondre?.trim() || undefined,
    }
  })
}

/** Accueil : opportunités publiques mises en avant. */
export const opportunitesAccueil = async (n = 2) => (await publiques(undefined, true)).slice(0, n)

/** Page Opportunités : publiques (complètes), réservées (type et date limite seulement) et expirées. */
export async function opportunitesSite(type?: string) {
  const payload = await getPayloadClient()
  const filtreType = type ? [{ type: { equals: type } }] : []
  const [ouvertes, res, exp] = await Promise.all([
    publiques(type, false),
    payload.find({
      collection: 'opportunities',
      where: { and: [{ statut: { equals: 'publiee' } }, { visibilite: { equals: 'membres' } }, ...filtreType] },
      select: { type: true, dateLimite: true },
      sort: 'dateLimite',
      limit: 100,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'opportunities',
      where: { and: [{ statut: { equals: 'expiree' } }, { visibilite: { equals: 'public' } }, ...filtreType] },
      select: { type: true, titre: true, dateLimite: true },
      sort: '-dateLimite',
      limit: 3,
      depth: 0,
      overrideAccess: true,
    }),
  ])
  const reservees: OppReservee[] = (res.docs as unknown as { id: number; type: string; dateLimite: string }[])
    .filter((o) => joursRestants(o.dateLimite) >= 0)
    .map((o) => ({ id: o.id, reservee: true as const, type: typeLabel(o.type), dateLimite: o.dateLimite, jours: joursRestants(o.dateLimite) }))
  const cartes: OppCarte[] = [...ouvertes, ...reservees].sort((a, b) => a.dateLimite.localeCompare(b.dateLimite))
  const expirees: OppExpiree[] = (exp.docs as unknown as { id: number; type: string; titre: string; dateLimite: string }[]).map((o) => ({
    id: o.id,
    type: typeLabel(o.type),
    titre: o.titre,
    dateLimite: o.dateLimite,
  }))
  return { cartes, expirees }
}
