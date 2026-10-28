import type { Payload, PayloadRequest } from 'payload'

import { demanderPaiement, statutPaiement, type Operateur } from './operateurs'

type PaiementMobile = {
  id: number
  statut: string
  mode: string
  idOperateur?: string
  telephonePayeur?: string
  createdAt?: string
}

/**
 * Crée un paiement « en attente » et envoie la demande de validation sur le téléphone du payeur.
 * Une erreur de l'opérateur passe le paiement en « échoué » sans bloquer la candidature ni la cotisation.
 */
export async function lancerPaiementMobile(
  payload: Payload,
  p: { candidature?: number; membre?: number; echeance?: number; operateur: Operateur; telephone: string; montant: number; objet: string; libelle: string; reference: string; abonnementMois?: number },
  req?: PayloadRequest,
) {
  const doc = (await payload.create({
    collection: 'payments',
    overrideAccess: true,
    req,
    data: {
      candidature: p.candidature,
      membre: p.membre,
      echeance: p.echeance,
      abonnementMois: p.abonnementMois,
      objet: p.objet,
      montant: p.montant,
      mode: p.operateur,
      statut: 'en-attente',
      telephonePayeur: p.telephone,
    } as never,
  })) as unknown as PaiementMobile
  try {
    const r = await demanderPaiement(p.operateur, { montant: p.montant, telephone: p.telephone, reference: p.reference, libelle: p.libelle })
    await payload.update({ collection: 'payments', id: doc.id, overrideAccess: true, req, data: { idOperateur: r.id, journalOperateur: { mode: r.mode, demande: new Date().toISOString() } } as never })
    return { ...doc, idOperateur: r.id }
  } catch (err) {
    payload.logger.error({ err }, 'Paiement mobile : demande refusée')
    await payload.update({ collection: 'payments', id: doc.id, overrideAccess: true, req, data: { statut: 'echoue', journalOperateur: { erreur: (err as Error).message } } as never })
    return { ...doc, statut: 'echoue' }
  }
}

/** Relit le statut auprès de l'opérateur et met à jour le paiement s'il a changé. Renvoie le statut final. */
export async function verifierPaiement(payload: Payload, p: PaiementMobile): Promise<string> {
  if (p.statut !== 'en-attente' || !p.idOperateur || !['mtn', 'airtel'].includes(p.mode)) return p.statut
  const r = await statutPaiement(p.mode as Operateur, p.idOperateur, { telephone: p.telephonePayeur, creeLe: p.createdAt })
  if (r.statut === 'en-attente') return 'en-attente'
  const detail = r.detail as { financialTransactionId?: string; data?: { transaction?: { airtel_money_id?: string } } }
  await payload.update({
    collection: 'payments',
    id: p.id,
    overrideAccess: true,
    data: {
      statut: r.statut,
      referenceOperateur: detail.financialTransactionId || detail.data?.transaction?.airtel_money_id || p.idOperateur,
      journalOperateur: r.detail,
    } as never,
  })
  return r.statut
}

/** Paiements mobiles encore en attente (tâche périodique, au cas où le rappel de l'opérateur n'arrive pas). */
export async function verifierPaiementsEnAttente(payload: Payload): Promise<number> {
  const r = await payload.find({
    collection: 'payments',
    where: {
      and: [
        { statut: { equals: 'en-attente' } },
        { mode: { in: ['mtn', 'airtel'] } },
        { createdAt: { greater_than: new Date(Date.now() - 48 * 3600e3).toISOString() } },
      ],
    },
    overrideAccess: true,
    depth: 0,
    limit: 100,
  })
  let n = 0
  for (const p of r.docs) if ((await verifierPaiement(payload, p as unknown as PaiementMobile)) !== 'en-attente') n++
  return n
}
