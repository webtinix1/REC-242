'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { autoriserEnvoi, CHAMP_PIEGE, ipDe, jetonValide } from '@/lib/antispam'
import { messagePublic } from '@/lib/erreurs'
import { membreConnecte } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'
import { verifierJetonLien } from './billets'

/**
 * Actions serveur des inscriptions (site, écran 15 ; espace membre, écran 04). Les règles (capacité, liste d'attente,
 * doublons, accès) sont dans la collection `registrations` ; ces actions ajoutent l'anti-robots et l'identification.
 */
export type EtatInscription = {
  ok?: boolean
  statut?: 'inscrit' | 'attente'
  position?: number
  numeroBillet?: string
  erreurs?: Record<string, string>
  general?: string
}

const MAX_PAR_HEURE = process.env.NODE_ENV === 'production' ? 10 : 100
const val = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max)

const resultat = (r: unknown): EtatInscription => {
  const d = r as { statut: 'inscrit' | 'attente'; position?: number; numeroBillet?: string }
  return { ok: true, statut: d.statut, position: d.position ?? undefined, numeroBillet: d.numeroBillet ?? undefined }
}

/** Inscription d'un visiteur : nom, e-mail, WhatsApp, entreprise (champ piège, jeton horodaté, limitation par appareil). */
export async function inscrireVisiteur(_: EtatInscription, f: FormData): Promise<EtatInscription> {
  const nom = val(f, 'nom', 120)
  const email = val(f, 'email', 160)
  const erreurs: Record<string, string> = {}
  if (!nom) erreurs.nom = 'Indiquez votre nom.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erreurs.email = 'Indiquez une adresse e-mail valide.'
  if (Object.keys(erreurs).length) return { erreurs }
  if (val(f, CHAMP_PIEGE)) return { ok: true, statut: 'inscrit' }
  if (!jetonValide(f.get('jeton'))) return { general: 'Le formulaire a expiré ou a été envoyé trop vite. Rechargez la page puis réessayez.' }
  if (!autoriserEnvoi(`inscription:${ipDe(await headers())}`, MAX_PAR_HEURE, 3600 * 1000))
    return { general: 'Trop d’inscriptions depuis cet appareil. Réessayez dans une heure.' }
  const payload = await getPayloadClient()
  try {
    const r = await payload.create({
      collection: 'registrations',
      overrideAccess: true,
      context: { visiteur: true },
      data: {
        evenement: Number(f.get('evenement')),
        visiteur: { nom, email, telephone: val(f, 'telephone', 40), entreprise: val(f, 'entreprise', 160) },
      } as never,
    })
    revalidatePath('/agenda', 'layout')
    return resultat(r)
  } catch (e) {
    return { general: messagePublic(e, 'evenements') }
  }
}

/** « M'inscrire en un clic » : membre actif connecté. */
export async function inscrireMembre(_: EtatInscription, f: FormData): Promise<EtatInscription> {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') return { general: 'Connectez-vous à votre espace membre pour vous inscrire.' }
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  try {
    const r = await payload.create({ collection: 'registrations', overrideAccess: false, user, data: { evenement: Number(f.get('evenement')) } as never })
    revalidatePath('/agenda', 'layout')
    revalidatePath('/espace-membre', 'layout')
    return resultat(r)
  } catch (e) {
    return { general: messagePublic(e, 'evenements') }
  }
}

/** « Annuler mon inscription » depuis l'espace membre (la place libérée promeut la liste d'attente). */
export async function annulerInscriptionMembre(id: number): Promise<{ ok?: boolean; erreur?: string }> {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || user.collection !== 'members') return { erreur: 'Session expirée : reconnectez-vous.' }
  try {
    await payload.update({ collection: 'registrations', id, overrideAccess: false, user, data: { statut: 'annule' } as never })
  } catch (e) {
    return { erreur: messagePublic(e, 'evenements') }
  }
  revalidatePath('/espace-membre', 'layout')
  revalidatePath('/agenda', 'layout')
  return { ok: true }
}

/** Annulation par le lien de l'e-mail (visiteur ou membre), avec le jeton signé. */
export async function annulerParLien(jeton: string): Promise<{ ok?: boolean; erreur?: string }> {
  const id = verifierJetonLien('annulation', jeton)
  if (!id) return { erreur: 'Ce lien d’annulation n’est pas valable.' }
  const payload = await getPayloadClient()
  const r = (await payload.findByID({ collection: 'registrations', id, depth: 0, overrideAccess: true }).catch(() => null)) as { statut?: string } | null
  if (!r) return { erreur: 'Inscription introuvable.' }
  if (r.statut === 'annule') return { ok: true }
  if (r.statut === 'present') return { erreur: 'Votre présence a déjà été enregistrée.' }
  await payload.update({ collection: 'registrations', id, overrideAccess: true, data: { statut: 'annule' } as never })
  revalidatePath('/agenda', 'layout')
  return { ok: true }
}
