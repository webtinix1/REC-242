import 'server-only'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { categorie } from '@/lib/adhesion/categories'
import { getPayloadClient } from '@/lib/site/payload'
import { situationCotisation, type PaiementMembre } from './cotisation'
import { COOKIE_SESSION } from './session'

export type Media = { url?: string | null; alt?: string | null; sizes?: Record<string, { url?: string | null }> } | null
export type Entreprise = {
  id: number
  nom: string
  slug?: string
  logo?: Media | number
  secteurs?: { id: number; nom: string }[]
  localite?: { id: number; nom: string } | null
  quartier?: string | null
  effectif?: string | null
  presentation?: string | null
  presentationProposee?: string | null
  presentationEnRelecture?: boolean | null
  services?: string | null
  siteWeb?: string | null
  linkedin?: string | null
  facebook?: string | null
  visibilite?: Record<string, boolean | null | undefined>
}
export type Membre = {
  id: number
  email: string
  prenom: string
  nom: string
  nomComplet?: string
  numeroAdherent?: string
  statut: string
  categorie: string
  telephone?: string | null
  whatsapp?: string | null
  fonction?: string | null
  photo?: Media | number
  entreprise?: Entreprise | null
  dateAdhesion?: string | null
  validiteCarte?: string | null
  /** Abonnement « Annuaire détaillé » : fin de la période payée. */
  abonnementJusquau?: string | null
  dateLimiteCotisation?: string | null
  cotisation?: { droit?: number | null; montant?: number | null; tranches?: number | null }
  commissions?: { id: number; nom?: string; titre?: string; slug?: string }[]
  notifications?: Record<string, boolean | null | undefined>
  derniereConnexion?: string | null
  candidature?: number | { id: number } | null
}

/** Membre connecté (session `members`), ou null. Mémorisé pour la requête en cours. */
export const membreConnecte = cache(async (): Promise<Membre | null> => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() }).catch(() => ({ user: null }))
  if (!user || user.collection !== 'members') return null
  const m = await payload.findByID({ collection: 'members', id: user.id, depth: 2, overrideAccess: false, user })
  return m as unknown as Membre
})

/**
 * Exige un membre actif. Sans session : retour à la connexion (« Session expirée » si une session existait sur cet appareil),
 * puis retour à la page demandée.
 */
export async function exigerMembre(): Promise<Membre> {
  const m = await membreConnecte()
  const h = await headers()
  const chemin = h.get('x-rec-chemin') || '/espace-membre'
  if (!m) {
    // Lien d'e-mail ou favori : Payload ignore le cookie d'une navigation venue d'ailleurs (contrôle CSRF). Une page du site
    // recharge l'adresse : la nouvelle requête part du site et le cookie est lu normalement.
    const site = h.get('sec-fetch-site')
    if ((site === 'cross-site' || site === 'none') && (await cookies()).has('payload-token'))
      redirect(`/espace-membre/ouverture?${new URLSearchParams({ vers: chemin })}`)
    const avait = (await cookies()).get(COOKIE_SESSION)?.value
    const q = new URLSearchParams({ retour: chemin })
    if (avait) q.set('etat', 'expiree')
    redirect(`/espace-membre/connexion?${q}`)
  }
  if (m.statut !== 'actif') redirect(`/espace-membre/connexion?etat=${m.statut === 'attente' ? 'attente' : 'suspendu'}`)
  return m
}

export const initialesDe = (m: { prenom?: string; nom?: string }) =>
  `${(m.prenom ?? '').trim()[0] ?? ''}${(m.nom ?? '').trim()[0] ?? ''}`.toUpperCase()

export const urlMedia = (x?: Media | number, taille?: string): string | undefined => {
  if (!x || typeof x === 'number') return undefined
  return (taille && x.sizes?.[taille]?.url) || x.url || undefined
}

export const nomCategorie = (v: string) => categorie(v)?.nom ?? ''
export const lettreCategorie = (v: string) => categorie(v)?.lettre ?? v

export const dateLongue = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Brazzaville' }) : ''
export const dateCourte = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Brazzaville' }) : ''

/** Complétude du profil : part des champs remplis parmi ceux qui composent la fiche (docs/07, écran 02). */
export function completude(m: Membre): { pct: number; manquants: { cle: string; libelle: string; gain: number }[] } {
  const e = m.entreprise
  const champs: [string, string, unknown][] = [
    ['photo', 'Ajouter votre photo', m.photo],
    ['logo', 'Ajouter le logo de votre entreprise', e?.logo],
    ['presentation', 'Présenter votre activité dans votre fiche', e?.presentation || e?.presentationProposee],
    ['services', 'Présenter vos services dans votre fiche', e?.services],
    ['fonction', 'Indiquer votre fonction', m.fonction],
    ['telephone', 'Téléphone', m.telephone],
    ['secteurs', 'Secteurs', e?.secteurs?.length],
    ['localite', 'Ville', e?.localite],
    ['quartier', 'Quartier', e?.quartier],
    ['siteWeb', 'Ajouter un lien (site, LinkedIn ou Facebook)', e?.siteWeb || e?.linkedin || e?.facebook],
  ]
  const gain = Math.round(100 / champs.length)
  const remplis = champs.filter(([, , v]) => Boolean(v)).length
  return {
    pct: Math.round((remplis / champs.length) * 100),
    manquants: champs.filter(([, , v]) => !v).map(([cle, libelle]) => ({ cle, libelle, gain })),
  }
}

export type Paiement = PaiementMembre
export { situationCotisation }

export async function paiementsDe(m: Membre): Promise<Paiement[]> {
  const payload = await getPayloadClient()
  const r = await payload.find({ collection: 'payments', where: { membre: { equals: m.id } }, sort: '-createdAt', depth: 0, limit: 100, overrideAccess: true })
  return r.docs as unknown as Paiement[]
}
