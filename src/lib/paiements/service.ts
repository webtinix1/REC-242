import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload, type PayloadRequest, type Where } from 'payload'

import { verrouiller } from '@/lib/compteurs'
import { demanderPaiement, statutPaiement, type Operateur } from './operateurs'

type PaiementMobile = {
  id: number
  statut: string
  mode: string
  idOperateur?: string
  telephonePayeur?: string
  createdAt?: string
}

/** Refus d'une nouvelle demande tant qu'une précédente attend la validation sur le téléphone. */
export const MESSAGE_PAIEMENT_EN_COURS = 'Un paiement est déjà en cours : validez-le sur votre téléphone ou attendez quelques minutes.'
/** Une demande restée sans réponse au-delà de ce délai n'empêche plus d'en lancer une nouvelle. */
const DELAI_EN_COURS_MS = 10 * 60 * 1000

/**
 * Exécute `fn` dans une transaction (celle de `req` s'il y en a déjà une) : les verrous de ligne pris dedans
 * tiennent jusqu'à la validation.
 */
async function dansTransaction<T>(payload: Payload, req: PayloadRequest | undefined, fn: (req: PayloadRequest) => Promise<T>): Promise<T> {
  const r = req ?? (await createLocalReq({}, payload))
  const proprietaire = await initTransaction(r)
  try {
    const resultat = await fn(r)
    if (proprietaire) await commitTransaction(r)
    return resultat
  } catch (err) {
    if (proprietaire) await killTransaction(r)
    throw err
  }
}

/** Vrai si un paiement mobile récent attend encore la validation pour la même échéance, candidature ou le même abonnement. */
export async function paiementEnCours(
  payload: Payload,
  p: { candidature?: number; membre?: number; echeance?: number; objet: string },
  req?: PayloadRequest,
): Promise<boolean> {
  const cible: Where | null = p.echeance
    ? { echeance: { equals: p.echeance } }
    : p.candidature
      ? { candidature: { equals: p.candidature } }
      : p.membre
        ? { and: [{ membre: { equals: p.membre } }, { objet: { equals: p.objet } }] }
        : null
  if (!cible) return false
  const r = await payload.count({
    collection: 'payments',
    where: {
      and: [
        cible,
        { statut: { equals: 'en-attente' } },
        { mode: { in: ['mtn', 'airtel'] } },
        { createdAt: { greater_than: new Date(Date.now() - DELAI_EN_COURS_MS).toISOString() } },
      ],
    },
    overrideAccess: true,
    req,
  })
  return r.totalDocs > 0
}

/**
 * Crée un paiement « en attente » et envoie la demande de validation sur le téléphone du payeur.
 * Une erreur de l'opérateur passe le paiement en « échoué » sans bloquer la candidature ni la cotisation.
 * Refuse (erreur MESSAGE_PAIEMENT_EN_COURS) si une demande récente attend encore pour la même échéance, la même
 * candidature ou le même abonnement : le contrôle et la création se font sous verrou de l'échéance, de la
 * candidature ou du membre, pour que deux envois simultanés n'en créent pas deux.
 */
export async function lancerPaiementMobile(
  payload: Payload,
  p: { candidature?: number; membre?: number; echeance?: number; operateur: Operateur; telephone: string; montant: number; objet: string; libelle: string; reference: string; abonnementMois?: number },
  req?: PayloadRequest,
) {
  const doc = await dansTransaction(payload, req, async (r) => {
    if (p.echeance) await verrouiller(payload, 'dues', p.echeance, r)
    else if (p.candidature) await verrouiller(payload, 'applications', p.candidature, r)
    else if (p.membre) await verrouiller(payload, 'members', p.membre, r)
    if (await paiementEnCours(payload, p, r)) throw new Error(MESSAGE_PAIEMENT_EN_COURS)
    return (await payload.create({
      collection: 'payments',
      overrideAccess: true,
      req: r,
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
  })
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

/**
 * Relit le statut auprès de l'opérateur et met à jour le paiement s'il a changé. Renvoie le statut final.
 * Le rappel de l'opérateur, le suivi depuis le navigateur et la tâche périodique peuvent arriver en même temps :
 * la ligne du paiement est verrouillée (SELECT … FOR UPDATE) puis son statut relu avant la mise à jour, si bien
 * qu'un seul appel le fait passer d'« en attente » à son statut final (numéro de reçu, prolongation, reçu : une fois).
 */
export async function verifierPaiement(payload: Payload, p: PaiementMobile): Promise<string> {
  if (p.statut !== 'en-attente' || !p.idOperateur || !['mtn', 'airtel'].includes(p.mode)) return p.statut
  const r = await statutPaiement(p.mode as Operateur, p.idOperateur, { telephone: p.telephonePayeur, creeLe: p.createdAt })
  if (r.statut === 'en-attente') return 'en-attente'
  const detail = r.detail as { financialTransactionId?: string; data?: { transaction?: { airtel_money_id?: string } } }
  return dansTransaction(payload, undefined, async (req) => {
    await verrouiller(payload, 'payments', p.id, req)
    const actuel = (await payload.db.findOne({ collection: 'payments', where: { id: { equals: p.id } }, req })) as { statut?: string } | null
    // Déjà traité par un autre appel (ou modifié par l'équipe) : rien à refaire.
    if (!actuel || actuel.statut !== 'en-attente') return actuel?.statut ?? p.statut
    await payload.update({
      collection: 'payments',
      id: p.id,
      overrideAccess: true,
      req,
      data: {
        statut: r.statut,
        referenceOperateur: detail.financialTransactionId || detail.data?.transaction?.airtel_money_id || p.idOperateur,
        journalOperateur: r.detail,
      } as never,
    })
    return r.statut
  })
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
