'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { autoriserEnvoi, ipDe } from '@/lib/antispam'
import { messagePublic } from '@/lib/erreurs'
import { membreConnecte } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'
import { formatReel, MIME } from '@/lib/echanges/fichiers'
import { coordonneesDetectees } from './regles'

/**
 * Actions serveur des opportunités dans l'espace membre (écrans 05 et 06). Statuts, modération et contrôles :
 * collections `opportunities` et `opportunityReplies`.
 */
export type EtatOpportunite = { ok?: boolean; erreur?: string; erreurs?: Record<string, string>; avertissement?: string }

const val = (f: FormData, k: string, max = 3000) => String(f.get(k) ?? '').trim().slice(0, max)

async function contexte() {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') return null
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return { m, user, payload }
}

/** Dépose une pièce jointe (PDF, JPEG ou PNG, 5 Mo) au nom du membre. */
async function deposer(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  fichier: FormDataEntryValue | null,
  proprietaire: number,
  visibilite: 'public' | 'membres' | 'prive',
  destinataire?: number,
): Promise<number | undefined | { erreur: string }> {
  if (!(fichier instanceof File) || !fichier.size) return undefined
  if (fichier.size > 5 * 1024 * 1024) return { erreur: 'Pièce jointe : 5 Mo au maximum.' }
  // Format lu dans les octets, pas dans le type annoncé par le navigateur.
  const data = Buffer.from(await fichier.arrayBuffer())
  const format = formatReel(data)
  if (!format || format === 'webp') return { erreur: 'Pièce jointe : PDF, JPEG ou PNG.' }
  const doc = await payload.create({
    collection: 'fichiers',
    overrideAccess: true,
    data: { visibilite, proprietaire, destinataire } as never,
    file: { data, mimetype: MIME[format], name: fichier.name, size: data.length },
  })
  return doc.id as number
}

/** Supprime une pièce déposée quand l'enregistrement qui devait la porter a échoué (pas de fichier orphelin). */
async function retirer(payload: Awaited<ReturnType<typeof getPayloadClient>>, piece: number | undefined | { erreur: string }) {
  if (typeof piece === 'number') await payload.delete({ collection: 'fichiers', id: piece, overrideAccess: true }).catch(() => null)
}

/**
 * « Publier une opportunité » (écran 06) : l'annonce part en modération. Champs : `id` (modification ou republication),
 * `type`, `titre`, `description`, `secteur`, `visibilite`, `dateLimite`, `commentRepondre`, `pieceJointe`.
 */
export async function proposerOpportunite(_: EtatOpportunite, f: FormData): Promise<EtatOpportunite> {
  const c = await contexte()
  if (!c) return { erreur: 'Session expirée : reconnectez-vous.' }
  if (!autoriserEnvoi(`opportunite:${ipDe(await headers())}`, process.env.NODE_ENV === 'production' ? 10 : 100, 3600 * 1000))
    return { erreur: 'Trop d’envois en une heure. Réessayez plus tard.' }
  const erreurs: Record<string, string> = {}
  const titre = val(f, 'titre', 160)
  const description = val(f, 'description')
  const dateLimite = val(f, 'dateLimite', 20)
  if (!val(f, 'type')) erreurs.type = 'Choisissez le type.'
  if (!titre) erreurs.titre = 'Indiquez un titre.'
  if (description.length < 20) erreurs.description = 'Décrivez votre annonce (20 caractères au moins).'
  if (!dateLimite) erreurs.dateLimite = 'La date limite est obligatoire.'
  if (Object.keys(erreurs).length) return { erreurs }
  const visibilite = val(f, 'visibilite') === 'public' ? 'public' : 'membres'
  // La cible est vérifiée avant le dépôt de la pièce : une modification ne porte que sur une annonce du membre.
  const id = Number(f.get('id'))
  if (id) {
    const o = (await c.payload.findByID({ collection: 'opportunities', id, depth: 0, overrideAccess: true }).catch(() => null)) as { membre?: number | { id: number } | null } | null
    const auteur = o?.membre && typeof o.membre === 'object' ? o.membre.id : o?.membre
    if (auteur !== c.m.id) return { erreur: 'Annonce introuvable.' }
  }
  const piece = await deposer(c.payload, f.get('pieceJointe'), c.m.id, visibilite)
  if (piece && typeof piece === 'object') return { erreurs: { pieceJointe: piece.erreur } }
  const data = {
    type: val(f, 'type'),
    titre,
    description,
    secteurs: val(f, 'secteur') ? [Number(val(f, 'secteur'))] : [],
    visibilite,
    dateLimite: new Date(`${dateLimite}T12:00:00Z`).toISOString(),
    commentRepondre: val(f, 'commentRepondre'),
    ...(piece ? { pieceJointe: piece } : {}),
    statut: 'a-moderer',
  }
  try {
    if (id) await c.payload.update({ collection: 'opportunities', id, data: data as never, overrideAccess: false, user: c.user })
    else await c.payload.create({ collection: 'opportunities', data: data as never, overrideAccess: false, user: c.user })
  } catch (e) {
    await retirer(c.payload, piece)
    return { erreur: messagePublic(e, 'opportunites') }
  }
  revalidatePath('/espace-membre/opportunites')
  const coords = coordonneesDetectees(titre, description, data.commentRepondre)
  return {
    ok: true,
    avertissement: coords.length ? `Le texte semble contenir : ${coords.join(', ')}. Le modérateur vous demandera de le retirer.` : undefined,
  }
}

/** « Répondre » à une offre entre membres (écran 05) : message et pièce jointe, l'auteur est prévenu (e-mail 16). */
export async function repondreOpportunite(_: EtatOpportunite, f: FormData): Promise<EtatOpportunite> {
  const c = await contexte()
  if (!c) return { erreur: 'Session expirée : reconnectez-vous.' }
  if (!autoriserEnvoi(`reponse-annonce:${ipDe(await headers())}`, process.env.NODE_ENV === 'production' ? 20 : 200, 3600 * 1000))
    return { erreur: 'Trop d’envois en une heure. Réessayez plus tard.' }
  const message = val(f, 'message')
  if (message.length < 10) return { erreurs: { message: 'Écrivez votre réponse (10 caractères au moins).' } }
  const id = Number(f.get('opportunite'))
  const o = (await c.payload.findByID({ collection: 'opportunities', id, depth: 0, overrideAccess: true }).catch(() => null)) as {
    membre?: number
    statut?: string
  } | null
  // Mêmes contrôles que la collection `opportunityReplies`, faits avant de déposer la pièce jointe.
  if (!o?.membre || o.statut !== 'publiee') return { erreur: 'Cette annonce ne reçoit pas de réponse.' }
  if (o.membre === c.m.id) return { erreur: 'Vous ne pouvez pas répondre à votre propre annonce.' }
  const piece = await deposer(c.payload, f.get('pieceJointe'), c.m.id, 'prive', o.membre)
  if (piece && typeof piece === 'object') return { erreurs: { pieceJointe: piece.erreur } }
  try {
    await c.payload.create({
      collection: 'opportunityReplies',
      data: { opportunite: id, message, ...(piece ? { pieceJointe: piece } : {}) } as never,
      overrideAccess: false,
      user: c.user,
    })
  } catch (e) {
    await retirer(c.payload, piece)
    return { erreur: messagePublic(e, 'opportunites') }
  }
  return { ok: true }
}
