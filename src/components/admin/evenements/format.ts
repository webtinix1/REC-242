const TZ = 'Africa/Brazzaville'

export const dateCourte = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : ''
export const jourNum = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', timeZone: TZ }) : '')
export const moisCourt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { month: 'short', timeZone: TZ }) : '')

export const STATUTS_EV: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'pending' },
  publie: { label: 'Publié', cls: 'active' },
  complet: { label: 'Complet', cls: 'suspended' },
  annule: { label: 'Annulé', cls: 'suspended' },
  reporte: { label: 'Reporté', cls: 'pending' },
  termine: { label: 'Terminé', cls: 'active' },
}

export const taux = (inscrits: number, capacite?: number | null) => (capacite ? Math.round((inscrits / capacite) * 100) : null)
