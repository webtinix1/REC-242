import type { Payload, PayloadRequest } from 'payload'

import { logAction } from '@/lib/audit'

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

/** Prolonge l'abonnement d'un membre après un paiement confirmé (durée enregistrée sur le paiement). */
export async function prolongerAbonnement(payload: Payload, membreId: number, dureeMois: number, req?: PayloadRequest): Promise<Date> {
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
