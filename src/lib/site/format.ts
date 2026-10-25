const TZ = 'Africa/Brazzaville'

export const dateLong = (iso?: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: TZ,
      })
    : ''

export const dateCourt = (iso?: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: TZ,
      })
    : ''

/** Jour et mois abrégé en capitales, pour les disques de date (« 14 », « NOV. »). */
export const dateDisque = (iso?: string | null): { d: string; m: string } => {
  if (!iso) return { d: '', m: '' }
  const dt = new Date(iso)
  return {
    d: dt.toLocaleDateString('fr-FR', { day: '2-digit', timeZone: TZ }),
    m: dt.toLocaleDateString('fr-FR', { month: 'short', timeZone: TZ }).toUpperCase(),
  }
}

export const fcfa = (n?: number | null): string =>
  n == null ? '' : `${n.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`
