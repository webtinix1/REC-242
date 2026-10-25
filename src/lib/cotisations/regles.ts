/** Règles des cotisations (statuts ; docs/05-regles-metier.md §4). Fonctions pures, utilisées par les hooks et les écrans. */

export const RELANCES_MAX = 3
export const ECART_RELANCES_JOURS = 15

export type Tranche = { numero: number; montant: number; echeance: string; statut: 'a-payer' | 'paye'; paiement?: number | null }
export type Relance = { numero: number; date: string; canal?: string }
export type Echeance = {
  droit?: number | null
  montant?: number | null
  tranches?: Tranche[]
  dateLimite?: string | null
  relances?: Relance[]
  statut?: string | null
}

export const resteDu = (e: Echeance) =>
  (e.tranches ?? []).filter((t) => t.statut !== 'paye').reduce((s, t) => s + (t.montant ?? 0), 0)

/** Refus d'une relance, ou null : cotisation non soldée, date limite passée, trois relances au plus, espacées de 15 jours. */
export function refusRelance(e: Echeance, maintenant = new Date()): string | null {
  if (e.statut === 'perte') return 'La perte de la qualité de membre est déjà constatée.'
  if (resteDu(e) <= 0) return 'La cotisation est soldée.'
  if (e.dateLimite && new Date(e.dateLimite) > maintenant) return 'La date limite de paiement n’est pas encore passée.'
  const r = e.relances ?? []
  if (r.length >= RELANCES_MAX) return 'Les trois relances prévues par les statuts ont été envoyées.'
  const derniere = r.map((x) => new Date(x.date).getTime()).sort((a, b) => b - a)[0]
  if (derniere && maintenant.getTime() - derniere < ECART_RELANCES_JOURS * 86400e3) {
    const possible = new Date(derniere + ECART_RELANCES_JOURS * 86400e3)
    return `Les relances sont espacées d’au moins 15 jours : prochaine relance possible le ${possible.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Brazzaville' })}.`
  }
  return null
}

/** Refus d'un constat de perte, ou null : trois relances envoyées et cotisation toujours due. */
export function refusConstat(e: Echeance, maintenant = new Date()): string | null {
  if (e.statut === 'perte') return 'La perte est déjà constatée.'
  if (resteDu(e) <= 0) return 'La cotisation est soldée.'
  const r = e.relances ?? []
  if (r.length < RELANCES_MAX) return 'Le constat de perte suit la troisième relance.'
  const derniere = Math.max(...r.map((x) => new Date(x.date).getTime()))
  if (maintenant.getTime() - derniere < ECART_RELANCES_JOURS * 86400e3) return 'Laissez au membre 15 jours après la troisième relance.'
  return null
}

/** Statut affiché : à jour, à venir (avant la date limite), en relance (N/3), perte constatée. */
export function statutEcheance(e: Echeance, maintenant = new Date()): 'a-jour' | 'a-venir' | 'en-relance' | 'perte' {
  if (e.statut === 'perte') return 'perte'
  if (resteDu(e) <= 0) return 'a-jour'
  if ((e.relances ?? []).length || (e.dateLimite && new Date(e.dateLimite) < maintenant)) return 'en-relance'
  return 'a-venir'
}
