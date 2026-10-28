import { categorie } from './categories'

export type PaiementResume = { objet?: string; statut?: string; montant?: number; mode?: string }

/** Libellé « Paiement » des listes de candidatures (écran back-office 03). */
export const situationPaiement = (
  a: { categorie?: string | null; modalite?: string | null; modePaiement?: string | null },
  paiements: PaiementResume[] = [],
): string => {
  if (categorie(a.categorie)?.convention) return 'Sur convention'
  if (paiements.some((p) => p.statut === 'remboursement')) return 'Remboursement à traiter'
  if (paiements.some((p) => p.statut === 'rembourse')) return 'Remboursé'
  const payes = paiements.filter((p) => p.statut === 'paye')
  if (payes.some((p) => p.objet === 'adhesion-tranche' || p.objet === 'tranche1')) {
    return payes.some((p) => p.objet === 'tranche2') ? 'Payé en totalité' : '1re tranche payée'
  }
  if (payes.length) return 'Payé en totalité'
  if (paiements.some((p) => p.statut === 'en-attente')) return 'Paiement mobile en attente'
  if (paiements.some((p) => p.statut === 'echoue')) return 'Paiement échoué'
  if (a.modePaiement === 'siege') return 'Paiement au siège'
  return 'Non payé'
}

export const OBJETS_PAIEMENT = [
  { value: 'adhesion', label: 'Droit d’adhésion + cotisation' },
  { value: 'adhesion-tranche', label: 'Droit d’adhésion + cotisation, 1re tranche' },
  { value: 'droit', label: 'Droit d’adhésion' },
  { value: 'tranche1', label: 'Cotisation, 1re tranche' },
  { value: 'tranche2', label: 'Cotisation, 2e tranche' },
  { value: 'cotisation', label: 'Cotisation en totalité' },
  { value: 'encart', label: 'Encart dans l’annuaire imprimé' },
  { value: 'abonnement', label: 'Abonnement « Annuaire détaillé »' },
] as const

export const MODES_PAIEMENT = [
  { value: 'mtn', label: 'MTN MoMo' },
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'especes', label: 'Espèces, au siège' },
  { value: 'virement', label: 'Virement' },
] as const

export const objetLabel = (v?: string | null) => OBJETS_PAIEMENT.find((o) => o.value === v)?.label ?? ''
export const modeLabel = (v?: string | null) => MODES_PAIEMENT.find((o) => o.value === v)?.label ?? ''
