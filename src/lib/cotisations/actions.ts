'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { telephoneInternational } from '@/lib/adhesion/categories'
import { autoriserEnvoi, ipDe } from '@/lib/antispam'
import { membreConnecte } from '@/lib/membres/espace'
import type { Operateur } from '@/lib/paiements/operateurs'
import { lancerPaiementMobile, verifierPaiement } from '@/lib/paiements/service'
import { getPayloadClient } from '@/lib/site/payload'
import type { Tranche } from './regles'

/**
 * Paiement de la cotisation depuis l'espace membre (écran 11) : la prochaine tranche due, ou le solde.
 * Le montant vient toujours de l'échéance enregistrée, jamais du formulaire.
 */
export type EtatPaiement = { ok?: boolean; paiement?: number; statut?: string; erreur?: string; erreurs?: Record<string, string> }

export async function payerCotisation(_: EtatPaiement, f: FormData): Promise<EtatPaiement> {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') return { erreur: 'Session expirée : reconnectez-vous.' }
  if (!autoriserEnvoi(`cotisation:${ipDe(await headers())}`, process.env.NODE_ENV === 'production' ? 10 : 100, 3600 * 1000))
    return { erreur: 'Trop de tentatives en une heure. Réessayez plus tard.' }
  const operateur = String(f.get('operateur') ?? '') as Operateur
  const telephone = telephoneInternational(String(f.get('telephone') ?? ''))
  const erreurs: Record<string, string> = {}
  if (!['mtn', 'airtel'].includes(operateur)) erreurs.operateur = 'Choisissez l’opérateur.'
  if (telephone.replace(/\D/g, '').length < 9) erreurs.telephone = 'Indiquez le numéro qui va payer.'
  if (Object.keys(erreurs).length) return { erreurs }
  const payload = await getPayloadClient()
  const e = (await payload.find({ collection: 'dues', where: { membre: { equals: m.id } }, sort: '-exercice.debut', limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as
    | { id: number; tranches?: Tranche[]; exercice?: { libelle?: string } }
    | undefined
  const dues = (e?.tranches ?? []).filter((t) => t.statut !== 'paye')
  if (!e || !dues.length) return { erreur: 'Votre cotisation est déjà soldée.' }
  const tout = f.get('tout') === 'on' && dues.length > 1
  const montant = tout ? dues.reduce((s, t) => s + t.montant, 0) : dues[0].montant
  const objet = tout ? 'cotisation' : dues[0].numero === 1 && (e.tranches ?? []).length === 1 ? 'cotisation' : dues[0].numero === 1 ? 'tranche1' : 'tranche2'
  const p = await lancerPaiementMobile(payload, {
    membre: m.id,
    echeance: e.id,
    operateur,
    telephone,
    montant,
    objet,
    libelle: `Cotisation REC 242 ${e.exercice?.libelle ?? ''}`.trim(),
    reference: `COT-${e.id}-${Date.now()}`,
  })
  revalidatePath('/espace-membre/cotisation')
  return { ok: p.statut !== 'echoue', paiement: p.id, statut: p.statut, erreur: p.statut === 'echoue' ? 'Le paiement n’a pas pu être lancé. Réessayez dans un instant.' : undefined }
}

/** Suivi du paiement en cours (validation sur le téléphone) : relit le statut auprès de l'opérateur. */
export async function suivrePaiement(id: number): Promise<{ statut: string; numero?: string }> {
  const m = await membreConnecte()
  if (!m) return { statut: 'inconnu' }
  const payload = await getPayloadClient()
  const p = (await payload.findByID({ collection: 'payments', id, depth: 0, overrideAccess: true }).catch(() => null)) as unknown as {
    id: number
    statut: string
    mode: string
    idOperateur?: string
    telephonePayeur?: string
    createdAt?: string
    membre?: number
    numero?: number
  } | null
  if (!p || p.membre !== m.id) return { statut: 'inconnu' }
  const statut = await verifierPaiement(payload, p)
  if (statut === 'paye') revalidatePath('/espace-membre', 'layout')
  const relu = (await payload.findByID({ collection: 'payments', id, depth: 0, overrideAccess: true })) as unknown as { numero?: number }
  return { statut, numero: relu.numero ? `PAY-${String(relu.numero).padStart(4, '0')}` : undefined }
}
