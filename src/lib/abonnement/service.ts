import { sql } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'

import { logAction } from '@/lib/audit'
import { verrouiller } from '@/lib/compteurs'

/**
 * Abonnement « Annuaire détaillé » (décision de Webtinix du 28/10/2026) : en plus de la cotisation, il montre aux
 * membres les fiches détaillées de l'annuaire, jamais les coordonnées. Prix et durée : Paramètres, onglet Tarifs ;
 * tant que l'un des deux est vide, l'abonnement n'est pas proposé (aucun montant n'est fixé dans le code).
 */
export type OffreAbonnement = { montant: number; dureeMois: number }

export async function offreAbonnement(payload: Payload, req?: PayloadRequest): Promise<OffreAbonnement | null> {
  const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true, req })) as {
    abonnement?: { montant?: number | null; dureeMois?: number | null }
  }
  const montant = Number(s.abonnement?.montant)
  const dureeMois = Number(s.abonnement?.dureeMois)
  return montant > 0 && dureeMois > 0 ? { montant, dureeMois } : null
}

/** Vrai si l'abonnement du membre court encore. */
export const estAbonne = (m: { abonnementJusquau?: string | null } | null | undefined, maintenant = Date.now()): boolean =>
  !!m?.abonnementJusquau && new Date(m.abonnementJusquau).getTime() > maintenant

/** Fin d'abonnement après un paiement : la durée s'ajoute à la fin en cours, ou à aujourd'hui si elle est passée. */
export function nouvelleFin(finActuelle: string | null | undefined, dureeMois: number, maintenant = new Date()): Date {
  const depart = finActuelle && new Date(finActuelle) > maintenant ? new Date(finActuelle) : maintenant
  const fin = new Date(depart)
  fin.setMonth(fin.getMonth() + dureeMois)
  return fin
}

/** Exécute une requête SQL dans la transaction de `req` s'il y en a une (même principe que `prochainNumero`). */
async function executer(payload: Payload, q: ReturnType<typeof sql>, req?: PayloadRequest): Promise<{ rows: unknown[] }> {
  const adapter = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows: unknown[] }> }
    sessions?: Record<string, { db: { execute: (q: unknown) => Promise<{ rows: unknown[] }> } }>
  }
  const tid = req?.transactionID ? await req.transactionID : undefined
  const db = (tid && adapter.sessions?.[String(tid)]?.db) || adapter.drizzle
  return db.execute(q)
}

/**
 * Prolonge l'abonnement d'un membre après un paiement confirmé (durée enregistrée sur le paiement).
 * Avec `paiementId`, la prolongation n'est appliquée qu'une fois pour ce paiement : la marque `abonnement_prolonge_le`
 * est posée par une seule requête conditionnelle (« … WHERE abonnement_prolonge_le IS NULL RETURNING »), si bien
 * qu'un second appel (rappel rejoué, double confirmation, nouvel enregistrement par l'équipe) ne fait rien et renvoie null.
 */
export async function prolongerAbonnement(
  payload: Payload,
  membreId: number,
  dureeMois: number,
  req?: PayloadRequest,
  paiementId?: number,
): Promise<Date | null> {
  if (paiementId) {
    const r = await executer(
      payload,
      sql`UPDATE "payments" SET "abonnement_prolonge_le" = now() WHERE "id" = ${paiementId} AND "abonnement_prolonge_le" IS NULL RETURNING "id"`,
      req,
    )
    if (!r.rows.length) {
      payload.logger.warn({ paiement: paiementId }, 'Abonnement déjà prolongé pour ce paiement : rien à refaire')
      return null
    }
  }
  // Deux paiements du même membre confirmés en même temps : la fin d'abonnement est relue sous verrou.
  await verrouiller(payload, 'members', membreId, req)
  const m = (await payload.findByID({ collection: 'members', id: membreId, depth: 0, overrideAccess: true, req })) as unknown as {
    abonnementJusquau?: string | null
    numeroAdherent?: string
  }
  const fin = nouvelleFin(m.abonnementJusquau, dureeMois)
  await payload.update({
    collection: 'members',
    id: membreId,
    overrideAccess: true,
    req,
    context: { sansMotif: true },
    data: { abonnementJusquau: fin.toISOString() } as never,
  })
  await logAction(payload, {
    req,
    categorie: 'paiement',
    action: `Abonnement « Annuaire détaillé » prolongé jusqu’au ${fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    cible: m.numeroAdherent,
  })
  return fin
}
