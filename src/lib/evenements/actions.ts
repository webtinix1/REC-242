'use server'

import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { APIError } from 'payload'

import { autoriserEnvoi, CHAMP_PIEGE, ipDe, jetonValide } from '@/lib/antispam'
import { formatReel, MIME } from '@/lib/echanges/fichiers'
import { messagePublic } from '@/lib/erreurs'
import { membreConnecte } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'
import { verifierJetonLien } from './billets'
import { cleChamp, questionsPour, TAILLE_MAX_REPONSE, verifierReponses, type Profil, type Question, type Saisies } from './formulaire'

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

type Client = Awaited<ReturnType<typeof getPayloadClient>>
type Depot = { question: string; nom: string; donnees: Buffer; format: 'jpeg' | 'png' | 'pdf' }

/**
 * Lit les réponses aux questions de l'événement pour ce profil et les vérifie avec les règles de la collection.
 * Les fichiers ne sont pas encore déposés : le format est contrôlé dans les octets, le dépôt vient après l'anti-robots.
 */
async function lireReponses(payload: Client, f: FormData, profil: Profil) {
  const e = (await payload.findByID({ collection: 'events', id: Number(f.get('evenement')), depth: 0, overrideAccess: true }).catch(() => null)) as { questions?: Question[] | null } | null
  const questions = questionsPour(e?.questions, profil)
  const saisies: Saisies = {}
  const depots: Depot[] = []
  const erreurs: Record<string, string> = {}
  for (const q of questions) {
    const cle = cleChamp(q.id)
    if (q.type !== 'fichier') {
      saisies[q.id] = q.type === 'choix-multiple' ? f.getAll(cle).map(String) : [String(f.get(cle) ?? '')]
      continue
    }
    const v = f.get(cle)
    if (!(v instanceof File) || !v.size) continue
    if (v.size > TAILLE_MAX_REPONSE) {
      erreurs[cle] = 'Fichier trop lourd : 5 Mo maximum.'
      continue
    }
    const donnees = Buffer.from(await v.arrayBuffer())
    const format = formatReel(donnees)
    if (!format || format === 'webp') {
      erreurs[cle] = 'Fichier non accepté : PDF, JPG ou PNG.'
      continue
    }
    depots.push({ question: q.id, nom: v.name, donnees, format })
    saisies[q.id] = ['0', v.name] // Remplacé par l'identifiant du fichier une fois déposé.
  }
  return { saisies, depots, erreurs: { ...verifierReponses(questions, saisies).erreurs, ...erreurs } }
}

/** Dépose les fichiers joints et note leur identifiant dans les réponses. Renvoie les identifiants créés. */
async function deposerFichiers(payload: Client, depots: Depot[], saisies: Saisies) {
  const ids: number[] = []
  for (const d of depots) {
    // Payload vérifie aussi la structure du fichier : un PDF abîmé est refusé ici.
    const doc = await payload.create({
      collection: 'inscriptionFichiers',
      overrideAccess: true,
      data: {},
      file: { data: d.donnees, mimetype: MIME[d.format], name: `reponse-${randomUUID()}.${d.format === 'jpeg' ? 'jpg' : d.format}`, size: d.donnees.length },
    }).catch(async () => {
      await retirerFichiers(payload, ids)
      throw new APIError('Un fichier joint est illisible : envoyez un PDF, JPG ou PNG valable.', 400, null, true)
    })
    ids.push(doc.id as number)
    saisies[d.question] = [String(doc.id), d.nom]
  }
  return ids
}

/** Retire les fichiers déposés quand l'inscription n'a pas abouti (pas de fichier orphelin). */
const retirerFichiers = (payload: Client, ids: number[]) =>
  Promise.all(ids.map((id) => payload.delete({ collection: 'inscriptionFichiers', id, overrideAccess: true }).catch(() => null)))

/** Inscription d'un visiteur : nom, e-mail, WhatsApp, entreprise, questions de l'événement (champ piège, jeton horodaté, limitation par appareil). */
export async function inscrireVisiteur(_: EtatInscription, f: FormData): Promise<EtatInscription> {
  const nom = val(f, 'nom', 120)
  const email = val(f, 'email', 160)
  const erreurs: Record<string, string> = {}
  if (!nom) erreurs.nom = 'Indiquez votre nom.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erreurs.email = 'Indiquez une adresse e-mail valide.'
  const payload = await getPayloadClient()
  const lues = await lireReponses(payload, f, 'visiteurs')
  Object.assign(erreurs, lues.erreurs)
  if (Object.keys(erreurs).length) return { erreurs }
  if (val(f, CHAMP_PIEGE)) return { ok: true, statut: 'inscrit' }
  if (!jetonValide(f.get('jeton'))) return { general: 'Le formulaire a expiré ou a été envoyé trop vite. Rechargez la page puis réessayez.' }
  if (!autoriserEnvoi(`inscription:${ipDe(await headers())}`, MAX_PAR_HEURE, 3600 * 1000))
    return { general: 'Trop d’inscriptions depuis cet appareil. Réessayez dans une heure.' }
  let deposes: number[] = []
  try {
    deposes = await deposerFichiers(payload, lues.depots, lues.saisies)
    const r = await payload.create({
      collection: 'registrations',
      overrideAccess: true,
      context: { visiteur: true, reponses: lues.saisies },
      data: {
        evenement: Number(f.get('evenement')),
        visiteur: { nom, email, telephone: val(f, 'telephone', 40), entreprise: val(f, 'entreprise', 160) },
      } as never,
    })
    revalidatePath('/agenda', 'layout')
    return resultat(r)
  } catch (e) {
    await retirerFichiers(payload, deposes)
    return { general: messagePublic(e, 'evenements') }
  }
}

/** « M'inscrire en un clic » (ou après les questions de l'événement, s'il en a) : membre actif connecté. */
export async function inscrireMembre(_: EtatInscription, f: FormData): Promise<EtatInscription> {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') return { general: 'Connectez-vous à votre espace membre pour vous inscrire.' }
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  const lues = await lireReponses(payload, f, 'membres')
  if (Object.keys(lues.erreurs).length) return { erreurs: lues.erreurs }
  if (lues.depots.length && !autoriserEnvoi(`inscription-membre:${m.id}`, MAX_PAR_HEURE, 3600 * 1000))
    return { general: 'Trop d’envois de fichiers. Réessayez dans une heure.' }
  let deposes: number[] = []
  try {
    deposes = await deposerFichiers(payload, lues.depots, lues.saisies)
    const r = await payload.create({
      collection: 'registrations',
      overrideAccess: false,
      user,
      context: { reponses: lues.saisies },
      data: { evenement: Number(f.get('evenement')) } as never,
    })
    revalidatePath('/agenda', 'layout')
    revalidatePath('/espace-membre', 'layout')
    return resultat(r)
  } catch (e) {
    await retirerFichiers(payload, deposes)
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
