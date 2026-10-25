/**
 * Procédure disciplinaire (statuts, article 15 ; docs/05-regles-metier.md §5). Fonctions pures : les hooks de
 * `disciplinaryCases` s'en servent pour refuser toute étape hors de l'ordre prévu.
 */

export const GRIEFS = [
  { value: 'charte', label: 'Non-respect de la charte de l’adhérent' },
  { value: 'statuts', label: 'Non-respect des statuts ou du règlement intérieur' },
  { value: 'illicite', label: 'Activité illicite ou pyramidale' },
  { value: 'escroquerie', label: 'Escroquerie, vol ou détournement' },
  { value: 'autre', label: 'Autre faute grave' },
] as const

export const SANCTIONS = [
  { value: 'rappel', label: 'Rappel à l’ordre verbal' },
  { value: 'avertissement', label: 'Avertissement écrit' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'exclusion', label: 'Exclusion' },
] as const

export const ETAPES = [
  { value: 'ouverte', label: 'Ouverte' },
  { value: 'griefs', label: 'Griefs notifiés' },
  { value: 'defense', label: 'Défense reçue' },
  { value: 'avis', label: 'Avis de la commission rendu' },
  { value: 'decision', label: 'Décision notifiée' },
  { value: 'recours', label: 'Recours devant l’assemblée générale' },
  { value: 'close', label: 'Close' },
] as const

export type Etape = (typeof ETAPES)[number]['value']

export const DELAI_DEFENSE_JOURS = 15
export const DELAI_RECOURS_JOURS = 30
export const SUSPENSION_MOIS = { min: 1, max: 6 }

export const plusJours = (d: Date | string, n: number) => new Date(new Date(d).getTime() + n * 86400e3)
export const plusMois = (d: Date | string, n: number) => {
  const x = new Date(d)
  x.setUTCMonth(x.getUTCMonth() + n)
  return x
}

export type Dossier = {
  statut: Etape
  griefs?: string[]
  faits?: string | null
  sanctionEnvisagee?: string | null
  dateGriefs?: string | null
  finDefense?: string | null
  defense?: string | null
  dateDefense?: string | null
  avis?: string | null
  dateAvis?: string | null
  sanction?: string | null
  dureeMois?: number | null
  motivation?: string | null
  dateDecision?: string | null
  finRecours?: string | null
}

/**
 * Peut-on passer à l'étape `vers` ? Renvoie le motif du refus, ou null.
 * Ordre : griefs notifiés → défense (reçue, ou délai de 15 jours écoulé) → avis de la commission → décision motivée → recours éventuel.
 */
export function refusTransition(d: Dossier, vers: Etape, maintenant = new Date()): string | null {
  switch (vers) {
    case 'griefs':
      if (d.statut !== 'ouverte') return 'Les griefs ont déjà été notifiés.'
      if (!d.griefs?.length) return 'Choisissez au moins un grief.'
      if (!String(d.faits ?? '').trim()) return 'Exposez les faits reprochés.'
      if (!d.sanctionEnvisagee) return 'Indiquez la sanction envisagée.'
      return null
    case 'defense':
      if (d.statut !== 'griefs') return 'La défense suit la notification des griefs.'
      if (!String(d.defense ?? '').trim()) return 'Saisissez la défense écrite du membre.'
      return null
    case 'avis': {
      if (d.statut !== 'griefs' && d.statut !== 'defense') return 'L’avis de la commission suit la notification des griefs et la défense.'
      if (d.statut === 'griefs' && d.finDefense && new Date(d.finDefense) > maintenant)
        return `Le délai de défense de ${DELAI_DEFENSE_JOURS} jours court jusqu’au ${new Date(d.finDefense).toLocaleDateString('fr-FR', { timeZone: 'Africa/Brazzaville' })}.`
      if (!String(d.avis ?? '').trim()) return 'Saisissez l’avis de la commission Éthique et Vérification.'
      return null
    }
    case 'decision':
      if (d.statut !== 'avis') return 'Aucune sanction sans notification des griefs, délai de défense et avis de la commission.'
      if (!d.sanction) return 'Choisissez la sanction prononcée (ou classez le dossier).'
      if (!String(d.motivation ?? '').trim()) return 'La décision doit être motivée.'
      if (d.sanction === 'suspension' && !(Number(d.dureeMois) >= SUSPENSION_MOIS.min && Number(d.dureeMois) <= SUSPENSION_MOIS.max))
        return 'Une suspension dure de 1 à 6 mois.'
      return null
    case 'recours':
      if (d.statut !== 'decision') return 'Le recours suit la décision.'
      if (d.finRecours && new Date(d.finRecours) < maintenant) return `Le délai de recours de ${DELAI_RECOURS_JOURS} jours est écoulé.`
      return null
    case 'close':
      if (!['ouverte', 'griefs', 'defense', 'avis', 'decision', 'recours'].includes(d.statut)) return 'Dossier déjà clos.'
      return null
    default:
      return 'Étape inconnue.'
  }
}
