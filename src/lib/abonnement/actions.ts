'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { telephoneInternational } from '@/lib/adhesion/categories'
import { autoriserEnvoi, ipDe } from '@/lib/antispam'
import type { EtatPaiement } from '@/lib/cotisations/actions'
import { membreConnecte } from '@/lib/membres/espace'
import type { Operateur } from '@/lib/paiements/operateurs'
import { lancerPaiementMobile, MESSAGE_PAIEMENT_EN_COURS } from '@/lib/paiements/service'
import { getPayloadClient } from '@/lib/site/payload'
import { offreAbonnement } from './service'

/**
 * Paiement de l'abonnement « Annuaire détaillé » depuis l'espace membre (MTN MoMo ou Airtel Money).
 * Le montant et la durée viennent toujours des Paramètres, jamais du formulaire ; l'abonnement est prolongé
 * à la confirmation du paiement (collection payments). Le suivi réutilise `suivrePaiement` de la cotisation.
 */
export async function payerAbonnement(_: EtatPaiement, f: FormData): Promise<EtatPaiement> {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') return { erreur: 'Session expirée : reconnectez-vous.' }
  if (!autoriserEnvoi(`abonnement:${ipDe(await headers())}`, process.env.NODE_ENV === 'production' ? 10 : 100, 3600 * 1000))
    return { erreur: 'Trop de tentatives en une heure. Réessayez plus tard.' }
  const operateur = String(f.get('operateur') ?? '') as Operateur
  const telephone = telephoneInternational(String(f.get('telephone') ?? ''))
  const erreurs: Record<string, string> = {}
  if (!['mtn', 'airtel'].includes(operateur)) erreurs.operateur = 'Choisissez l’opérateur.'
  if (telephone.replace(/\D/g, '').length < 9) erreurs.telephone = 'Indiquez le numéro qui va payer.'
  if (Object.keys(erreurs).length) return { erreurs }
  // Chaque demande fait sonner le téléphone du payeur : nombre limité par numéro, quel que soit l'appareil.
  if (!autoriserEnvoi(`payeur:${telephone.replace(/\D/g, '')}`, process.env.NODE_ENV === 'production' ? 5 : 100, 3600 * 1000))
    return { erreur: 'Trop de demandes de paiement pour ce numéro en une heure. Réessayez plus tard.' }
  const payload = await getPayloadClient()
  const offre = await offreAbonnement(payload)
  if (!offre) return { erreur: 'L’abonnement n’est pas encore proposé.' }
  const p = await lancerPaiementMobile(payload, {
    membre: m.id,
    operateur,
    telephone,
    montant: offre.montant,
    objet: 'abonnement',
    libelle: 'Abonnement Annuaire détaillé REC 242',
    reference: `ABO-${m.id}-${Date.now()}`,
    // La durée payée est figée sur le paiement : un changement de tarif ensuite ne la modifie pas.
    abonnementMois: offre.dureeMois,
  }).catch((err: Error) => {
    if (err.message === MESSAGE_PAIEMENT_EN_COURS) return null
    throw err
  })
  if (!p) return { erreur: MESSAGE_PAIEMENT_EN_COURS }
  revalidatePath('/espace-membre/annuaire')
  return { ok: p.statut !== 'echoue', paiement: p.id, statut: p.statut, erreur: p.statut === 'echoue' ? 'Le paiement n’a pas pu être lancé. Réessayez dans un instant.' : undefined }
}
