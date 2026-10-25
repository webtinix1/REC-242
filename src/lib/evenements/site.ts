import 'server-only'

import type { Where } from 'payload'

import { ACCES, VISIBLES } from '@/collections/Events'
import { dateDisque } from '@/lib/site/format'
import { getPayloadClient, type Media } from '@/lib/site/payload'
import { placesParEvenement } from './lecture'
import { heureFr } from './notifications'

/** Heure sans zéro initial (« 9 h 30 »). */
export const heure = (iso: string) => heureFr(iso).replace(/^0/, '')

type Tax = { id: number; nom: string; slug?: string }
type RichData = unknown

/** Événement tel que le lit le site public (sans lien de carte : ce champ est réservé à l'équipe et aux billets). */
export type EvenementSite = {
  id: number
  titre: string
  slug: string
  statut: string
  type?: Tax | number | null
  ville?: Tax | number | null
  chapeau?: string | null
  description?: RichData
  debut: string
  fin?: string | null
  format?: string | null
  lieu?: string | null
  adresse?: string | null
  image?: Media | number | null
  acces: string
  capacite?: number | null
  cloture?: string | null
  listeAttente?: boolean | null
  tarif?: string | null
  programme?: { id?: string; heure?: string | null; intitule: string }[] | null
  intervenants?: { id?: string; nom: string; fonction?: string | null; photo?: Media | number | null }[] | null
  documents?: { id?: string; visibilite?: string | null; document: { id: number; titre?: string } | number }[] | null
  compteRendu?: RichData
  participants?: number | null
  galerie?: { id?: string; image: Media | number }[] | null
  actualite?: { id: number; slug?: string; titre?: string } | number | null
  messageInscrits?: string | null
  nouvelleDate?: string | null
}

export const tax = (t: Tax | number | null | undefined): Tax | null => (t && typeof t !== 'number' ? t : null)
export const accesLabel = (a: string) => ACCES.find((x) => x.value === a)?.label ?? a

/** Un événement est passé quand sa fin (ou son début) est derrière nous, ou quand il est marqué « terminé ». */
export const estPasse = (e: Pick<EvenementSite, 'statut' | 'debut' | 'fin'>, now = Date.now()) =>
  e.statut === 'termine' || new Date(e.fin ?? e.debut).getTime() < now

export type PlacesInfo = { texte: string; classe: 'open' | 'few' | 'full' | 'past'; complet: boolean } | null

/** Mention de places d'un événement (rien si la capacité est illimitée). */
export function placesInfo(e: EvenementSite, restantes: number | null | undefined): PlacesInfo {
  if (e.statut === 'annule') return { texte: 'Annulé', classe: 'past', complet: false }
  if (e.statut === 'reporte') return { texte: 'Reporté', classe: 'past', complet: false }
  if (e.statut === 'termine') return { texte: e.compteRendu ? 'Compte rendu disponible' : 'Terminé', classe: 'past', complet: false }
  if (e.statut === 'complet' || restantes === 0) return { texte: 'Complet, liste d’attente', classe: 'full', complet: true }
  if (restantes == null) return null
  return { texte: restantes === 1 ? '1 place restante' : `${restantes} places restantes`, classe: restantes < 15 ? 'few' : 'open', complet: false }
}

export const heureLieu = (e: Pick<EvenementSite, 'lieu' | 'ville' | 'debut'>) =>
  [e.lieu || tax(e.ville)?.nom, heure(e.debut)].filter(Boolean).join(' · ')

export const disque = (e: Pick<EvenementSite, 'debut'>) => dateDisque(e.debut)

/** Événements visibles du public, lus sans utilisateur (les brouillons ne sortent jamais). */
export async function evenementsPublics(where?: Where, opts: { sort?: string; limit?: number } = {}): Promise<EvenementSite[]> {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'events',
    where: { and: [{ statut: { in: VISIBLES } }, ...(where ? [where] : [])] },
    sort: opts.sort ?? 'debut',
    limit: opts.limit ?? 200,
    depth: 1,
    overrideAccess: false,
    user: null,
  })
  return r.docs as unknown as EvenementSite[]
}

export async function prochainsEvenements(n: number) {
  const now = Date.now()
  const tous = (await evenementsPublics({ statut: { not_equals: 'termine' } })).filter((e) => !estPasse(e, now) && e.statut !== 'annule')
  const evs = tous.slice(0, n)
  return { evs, places: await placesParEvenement(evs) }
}

export async function evenementParSlug(slug: string): Promise<EvenementSite | null> {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'events',
    where: { and: [{ slug: { equals: slug } }, { statut: { in: VISIBLES } }] },
    limit: 1,
    depth: 2,
    overrideAccess: false,
    user: null,
  })
  return (r.docs[0] as unknown as EvenementSite) ?? null
}

/** Inscription non annulée d'un membre à un événement. */
export async function inscriptionDuMembre(evenement: number, membre: number) {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'registrations',
    where: { and: [{ evenement: { equals: evenement } }, { membre: { equals: membre } }, { statut: { not_equals: 'annule' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return (r.docs[0] as unknown as { statut: string; position?: number | null; numeroBillet?: string | null } | undefined) ?? null
}
