/**
 * Situation de la cotisation de l'exercice, calculée à partir des montants copiés sur la fiche à l'adhésion
 * et des paiements enregistrés. Les échéances et relances détaillées arrivent avec le lot 11 (`dues`).
 */
export type PaiementMembre = {
  id: number
  numero?: string | null
  objet?: string
  montant?: number
  mode?: string
  statut?: string
  datePaiement?: string | null
  membre?: number | { id: number } | null
}

export type MontantsMembre = { cotisation?: { droit?: number | null; montant?: number | null; tranches?: number | null } | null }

export function situationCotisation(m: MontantsMembre, paiements: PaiementMembre[]) {
  const droit = m.cotisation?.droit ?? 0
  const montant = m.cotisation?.montant ?? 0
  const du = droit + montant
  const payes = paiements.filter((p) => p.statut === 'paye' && p.objet !== 'encart')
  const regle = payes.reduce((s, p) => s + (p.montant ?? 0), 0)
  const reste = Math.max(0, du - regle)
  const tranches = Math.max(1, m.cotisation?.tranches ?? 1)
  const tranche = Math.round(montant / tranches)
  const objets = new Set(payes.map((p) => p.objet))
  const droitPaye = ['adhesion', 'adhesion-tranche', 'droit'].some((o) => objets.has(o))
  const t1 = ['adhesion', 'adhesion-tranche', 'tranche1', 'cotisation'].some((o) => objets.has(o))
  const t2 = ['adhesion', 'tranche2', 'cotisation'].some((o) => objets.has(o))
  const deuxiemeDue = objets.has('adhesion-tranche') || objets.has('tranche1') ? !t2 : false
  const libelle = !du ? 'Sur convention' : reste === 0 ? 'À jour' : deuxiemeDue ? '2e tranche due' : regle ? 'Partiellement réglée' : 'Non réglée'
  return { du, regle, reste, tranche, deuxiemeDue, droitPaye, t1, t2, libelle, connue: du > 0 }
}
