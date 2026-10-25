/** Règles des opportunités (docs/05-regles-metier.md §8), sans dépendance au serveur : utilisées par les hooks et les écrans. */

export const TYPES_OPPORTUNITE = [
  { value: 'partenariat', label: 'Appel à partenariat' },
  { value: 'evenement', label: 'Événement partenaire' },
  { value: 'appel-offres', label: 'Appel d’offres' },
  { value: 'financement', label: 'Financement' },
  { value: 'b2b', label: 'Rencontre B2B ou mission' },
  { value: 'offre-membre', label: 'Offre entre membres' },
] as const

export const STATUTS_OPPORTUNITE = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'a-moderer', label: 'À modérer' },
  { value: 'modification', label: 'Modification demandée' },
  { value: 'publiee', label: 'Publiée' },
  { value: 'refusee', label: 'Refusée' },
  { value: 'expiree', label: 'Expirée' },
] as const

export const typeLabel = (v?: string | null) => TYPES_OPPORTUNITE.find((t) => t.value === v)?.label ?? ''
export const statutLabel = (v?: string | null) => STATUTS_OPPORTUNITE.find((t) => t.value === v)?.label ?? ''

// Téléphones (+242 06 123 45 67, 06 123 45 67, 0612345678…), adresses e-mail, liens WhatsApp.
const MOTIFS: { nom: string; re: RegExp }[] = [
  { nom: 'adresse e-mail', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { nom: 'numéro de téléphone', re: /(?:\+|00)\s?\d{2,3}[\s.-]?\d{2}[\s.-]?\d{2,3}[\s.-]?\d{2}[\s.-]?\d{2}|\b0\d(?:[\s.-]?\d{2,3}){3,4}\b/ },
  { nom: 'lien WhatsApp', re: /wa\.me\/|whatsapp\.com\//i },
]

/** Coordonnées repérées dans un texte (vérification automatique de la modération). */
export const coordonneesDetectees = (...textes: (string | null | undefined)[]): string[] => {
  const t = textes.filter(Boolean).join('\n')
  return MOTIFS.filter((m) => m.re.test(t)).map((m) => m.nom)
}

/** Fin de la journée de la date limite à Brazzaville : l'annonce expire le lendemain. */
export const finDuJour = (iso: string) => {
  const d = new Date(iso)
  const jour = d.toLocaleDateString('en-CA', { timeZone: 'Africa/Brazzaville' })
  return new Date(`${jour}T23:59:59.999+01:00`)
}

export const joursRestants = (iso: string, maintenant = new Date()) => Math.ceil((finDuJour(iso).getTime() - maintenant.getTime()) / 86400e3)
