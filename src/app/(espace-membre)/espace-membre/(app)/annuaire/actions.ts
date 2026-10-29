'use server'

import { headers } from 'next/headers'

import { ecrire } from '@/lib/echanges/actions'
import { messagePublic } from '@/lib/erreurs'
import { membreConnecte } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'

export type RetourRelation = { ok?: boolean; erreur?: string; erreurs?: { message?: string }; /** Conversation où le message a été écrit. */ conversation?: number }

const utilisateur = async () => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user
}

/**
 * « Écrire à ce membre » (écran membre 08) : ouvre la conversation, ou écrit dans celle déjà ouverte avec ce membre.
 * Plafond, destinataire, masquage des coordonnées et contrôles : collection connectionRequests et action `ecrire`.
 */
export async function demanderRelation(_: RetourRelation, f: FormData): Promise<RetourRelation> {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') return { erreur: 'Session expirée : reconnectez-vous.' }
  const message = String(f.get('message') ?? '').trim()
  if (message.length < 10) return { erreurs: { message: 'Écrivez votre message (10 caractères au moins).' } }
  const payload = await getPayloadClient()
  const e = (await payload.findByID({ collection: 'companies', id: Number(f.get('entreprise')), depth: 0, overrideAccess: true }).catch(() => null)) as unknown as {
    titulaire?: number | { id: number }
  } | null
  const autre = e?.titulaire && typeof e.titulaire === 'object' ? e.titulaire.id : e?.titulaire
  if (autre) {
    const ouverte = await payload.find({
      collection: 'connectionRequests',
      where: {
        and: [
          { or: [{ and: [{ demandeur: { equals: m.id } }, { destinataire: { equals: autre } }] }, { and: [{ demandeur: { equals: autre } }, { destinataire: { equals: m.id } }] }] },
          { statut: { equals: 'acceptee' } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (ouverte.docs[0]) {
      const id = ouverte.docs[0].id as number
      const r = await ecrire('relations', id, message)
      return r.erreur ? { erreur: r.erreur } : { ok: true, conversation: id }
    }
  }
  try {
    const c = await payload.create({
      collection: 'connectionRequests',
      data: { entreprise: Number(f.get('entreprise')), message } as never,
      overrideAccess: false,
      user: await utilisateur(),
    })
    return { ok: true, conversation: c.id as number }
  } catch (err) {
    return { erreur: messagePublic(err, 'annuaire') }
  }
}

/** « Signaler » une fiche ou un abus (écran membre 08) : inscrit au journal pour le responsable membres. */
export async function signalerFiche(_: RetourRelation, f: FormData): Promise<RetourRelation> {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') return { erreur: 'Session expirée : reconnectez-vous.' }
  const motif = String(f.get('motif') ?? '').trim()
  if (!motif) return { erreurs: { message: 'Indiquez ce qui pose problème.' } }
  const payload = await getPayloadClient()
  const e = await payload.findByID({ collection: 'companies', id: Number(f.get('entreprise')), depth: 0, overrideAccess: true }).catch(() => null)
  if (!e) return { erreur: 'Fiche introuvable.' }
  const { logAction } = await import('@/lib/audit')
  await logAction(payload, {
    categorie: 'validation',
    action: `Fiche signalée : ${(e as unknown as { nom: string }).nom} (${motif.slice(0, 200)})`,
    cible: (e as unknown as { nom: string }).nom,
    author: { type: 'membre', nom: `${m.prenom} ${m.nom}` },
  })
  return { ok: true }
}

/** Accepter ou refuser une demande reçue (la boîte « Mes échanges » arrive au lot 10). */
export async function repondreRelation(id: number, accepter: boolean): Promise<RetourRelation> {
  const payload = await getPayloadClient()
  try {
    await payload.update({
      collection: 'connectionRequests',
      id,
      data: { statut: accepter ? 'acceptee' : 'refusee' } as never,
      overrideAccess: false,
      user: await utilisateur(),
    })
  } catch (e) {
    return { erreur: messagePublic(e, 'annuaire') }
  }
  return { ok: true }
}
