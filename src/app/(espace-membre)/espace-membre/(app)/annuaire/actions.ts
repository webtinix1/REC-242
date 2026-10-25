'use server'

import { headers } from 'next/headers'

import { membreConnecte } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'

export type RetourRelation = { ok?: boolean; erreur?: string; erreurs?: { message?: string } }

const utilisateur = async () => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user
}

/** « Demander une mise en relation » (écran membre 08). Plafond, destinataire et contrôles : collection connectionRequests. */
export async function demanderRelation(_: RetourRelation, f: FormData): Promise<RetourRelation> {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') return { erreur: 'Session expirée : reconnectez-vous.' }
  const message = String(f.get('message') ?? '').trim()
  if (message.length < 10) return { erreurs: { message: 'Présentez-vous en quelques mots (10 caractères au moins).' } }
  const payload = await getPayloadClient()
  try {
    await payload.create({
      collection: 'connectionRequests',
      data: { entreprise: Number(f.get('entreprise')), message } as never,
      overrideAccess: false,
      user: await utilisateur(),
    })
  } catch (e) {
    return { erreur: (e as Error).message }
  }
  return { ok: true }
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
    return { erreur: (e as Error).message }
  }
  return { ok: true }
}
