import type { Payload, PayloadRequest } from 'payload'

import { categorie, montants, type Tarifs } from '@/lib/adhesion/categories'
import { finExercice, limiteCotisation } from '@/lib/membres/options'
import type { Tranche } from './regles'

const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))

/**
 * Crée l'échéance (`dues`) d'un exercice : montants copiés des Tarifs (jamais recalculés ensuite), droit d'adhésion
 * la première année seulement, une ou deux tranches dont la dernière tombe à la date limite (3 mois).
 */
export async function creerEcheance(
  payload: Payload,
  membreId: number,
  debut: Date,
  premiereAnnee: boolean,
  req?: PayloadRequest,
): Promise<number | null> {
  const m = (await payload.findByID({ collection: 'members', id: membreId, depth: 0, overrideAccess: true, req })) as unknown as {
    categorie: string
    cotisation?: { droit?: number; montant?: number; tranches?: number }
  }
  const exerciceDebut = debut.toISOString().slice(0, 10)
  const deja = await payload.count({
    collection: 'dues',
    where: { and: [{ membre: { equals: membreId } }, { 'exercice.debut': { equals: debut.toISOString() } }] },
    overrideAccess: true,
    req,
  })
  if (deja.totalDocs) return null
  const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true, req })) as { tarifs?: Tarifs }
  // Première année : montants copiés sur la fiche à l'adhésion ; renouvellement : tarifs en vigueur.
  const m2 = montants(categorie(m.categorie), s.tarifs)
  const montant = premiereAnnee ? (m.cotisation?.montant ?? m2?.cotisation ?? 0) : (m2?.cotisation ?? 0)
  const droit = premiereAnnee ? (m.cotisation?.droit ?? m2?.droit ?? 0) : 0
  if (!montant && !droit) return null
  const nb = Math.max(1, Math.min(2, (premiereAnnee ? m.cotisation?.tranches : undefined) ?? s.tarifs?.tranchesMax ?? 2))
  const limite = limiteCotisation(debut, s.tarifs?.delaiMois ?? 3)
  const part = Math.round(montant / nb)
  const tranches: Tranche[] = Array.from({ length: nb }, (_, i) => ({
    numero: i + 1,
    // La première tranche inclut le droit d'adhésion et est due au début de l'exercice ; la dernière à la date limite.
    montant: (i === nb - 1 ? montant - part * (nb - 1) : part) + (i === 0 ? droit : 0),
    echeance: (i === nb - 1 ? limite : debut).toISOString(),
    statut: 'a-payer',
  }))
  const doc = await payload.create({
    collection: 'dues',
    overrideAccess: true,
    req,
    data: {
      membre: membreId,
      exercice: { debut: debut.toISOString(), fin: finExercice(debut).toISOString(), libelle: exerciceDebut.slice(0, 4) },
      categorie: m.categorie,
      droit,
      montant,
      tranches,
      dateLimite: limite.toISOString(),
      statut: 'a-venir',
    } as never,
  })
  return doc.id as number
}

export const OBJETS_COTISATION = ['adhesion', 'adhesion-tranche', 'droit', 'tranche1', 'tranche2', 'cotisation']

/**
 * Rapproche un paiement confirmé de l'échéance en cours du membre (champ `echeance` du paiement), puis recalcule les tranches :
 * les montants payés sont imputés dans l'ordre des tranches ; une tranche n'est « payée » que si elle est couverte en entier.
 * Appelé par le hook de `payments` au passage au statut « Payé ».
 */
export async function rapprocherPaiement(payload: Payload, paiement: { id: number; membre?: unknown; objet?: string; statut?: string; echeance?: unknown }, req?: PayloadRequest) {
  const membre = idDe(paiement.membre)
  if (!membre || paiement.statut !== 'paye' || !OBJETS_COTISATION.includes(paiement.objet ?? '')) return
  let echeanceId = idDe(paiement.echeance)
  if (!echeanceId) {
    const e = (await payload.find({ collection: 'dues', where: { membre: { equals: membre } }, sort: '-exercice.debut', limit: 1, depth: 0, overrideAccess: true, req })).docs[0]
    if (!e) return
    echeanceId = e.id as number
    await payload.db.updateOne({ collection: 'payments', id: paiement.id, data: { echeance: echeanceId }, req, returning: false })
  }
  await recalculerTranches(payload, echeanceId, req)
}

export async function recalculerTranches(payload: Payload, echeanceId: number, req?: PayloadRequest) {
  const e = (await payload.findByID({ collection: 'dues', id: echeanceId, depth: 0, overrideAccess: true, req })) as unknown as { tranches?: Tranche[] }
  const payes = await payload.find({
    collection: 'payments',
    where: { and: [{ echeance: { equals: echeanceId } }, { statut: { equals: 'paye' } }] },
    sort: 'datePaiement',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    req,
  })
  let disponible = payes.docs.reduce((s, p) => s + ((p as unknown as { montant?: number }).montant ?? 0), 0)
  const dernier = payes.docs.at(-1)?.id as number | undefined
  const tranches = (e.tranches ?? []).map((t) => {
    const couverte = disponible >= t.montant
    disponible = Math.max(0, disponible - t.montant)
    return { ...t, statut: couverte ? ('paye' as const) : ('a-payer' as const), paiement: couverte ? (t.paiement ?? dernier ?? null) : null }
  })
  await payload.update({ collection: 'dues', id: echeanceId, data: { tranches } as never, overrideAccess: true, req, context: { rapprochement: true } })
}
