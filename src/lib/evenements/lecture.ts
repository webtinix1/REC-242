import 'server-only'

import { qrSvg } from '@/lib/membres/carte'
import { getPayloadClient } from '@/lib/site/payload'
import { jetonBillet, verifierJetonLien } from './billets'

/** Places restantes d'un événement (null : illimité). */
export async function placesRestantes(evenementId: number, capacite?: number | null): Promise<number | null> {
  if (!capacite) return null
  const payload = await getPayloadClient()
  const n = await payload.count({
    collection: 'registrations',
    where: { and: [{ evenement: { equals: evenementId } }, { statut: { in: ['inscrit', 'present'] } }] },
    overrideAccess: true,
  })
  return Math.max(0, capacite - n.totalDocs)
}

/** Places restantes de plusieurs événements en une requête par événement listé (agenda). */
export async function placesParEvenement(evs: { id: number; capacite?: number | null }[]) {
  const entrees = await Promise.all(evs.map(async (e) => [e.id, await placesRestantes(e.id, e.capacite)] as const))
  return new Map(entrees)
}

export type Billet = {
  id: number
  numero?: string
  statut: string
  position?: number
  nom: string
  evenement: { titre: string; slug?: string; debut: string; fin?: string | null; lieu?: string | null; adresse?: string | null; ville?: string; lienCarte?: string | null }
  qr?: string
}

/** Billet consulté par le lien de l'e-mail (jeton signé). Le lien de carte ou de visioconférence n'est donné qu'à un inscrit. */
export async function billetParLien(jeton: string): Promise<Billet | null> {
  const id = verifierJetonLien('billet', jeton)
  if (!id) return null
  return billetParId(id)
}

export async function billetParId(id: number): Promise<Billet | null> {
  const payload = await getPayloadClient()
  const r = (await payload.findByID({ collection: 'registrations', id, depth: 2, overrideAccess: true }).catch(() => null)) as unknown as {
    id: number
    statut: string
    numeroBillet?: string
    position?: number
    visiteur?: { nom?: string }
    membre?: { prenom?: string; nom?: string } | null
    evenement: { titre: string; slug?: string; debut: string; fin?: string; lieu?: string; adresse?: string; ville?: { nom?: string } | null; lienCarte?: string; billetQr?: boolean }
  } | null
  if (!r) return null
  const e = r.evenement
  const inscrit = r.statut === 'inscrit' || r.statut === 'present'
  return {
    id: r.id,
    numero: r.numeroBillet,
    statut: r.statut,
    position: r.position,
    nom: r.membre ? `${r.membre.prenom ?? ''} ${r.membre.nom ?? ''}`.trim() : (r.visiteur?.nom ?? ''),
    evenement: { titre: e.titre, slug: e.slug, debut: e.debut, fin: e.fin, lieu: e.lieu, adresse: e.adresse, ville: e.ville?.nom, lienCarte: inscrit ? e.lienCarte : null },
    qr: inscrit && e.billetQr !== false ? await qrSvg(jetonBillet(r.id)) : undefined,
  }
}
