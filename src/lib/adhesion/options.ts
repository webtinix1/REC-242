/** Listes du formulaire d'adhésion (maquette, écran site 10 ; fiche d'adhésion de sources/). Partagées par le site et l'admin. */

const opts = <T extends string>(l: [T, string][]) => l.map(([value, label]) => ({ value, label }))

export const CIVILITES = opts([
  ['madame', 'Madame'],
  ['monsieur', 'Monsieur'],
])
export const AGES = opts([
  ['18-25', '18-25'],
  ['26-35', '26-35'],
  ['36-45', '36-45'],
  ['46+', '46 et plus'],
])
export const FORMES = opts([
  ['informelle', 'Activité informelle'],
  ['individuelle', 'Entreprise individuelle'],
  ['sarl', 'SARL'],
  ['sa', 'SA'],
  ['autre', 'Autre'],
])
export const EFFECTIFS = opts([
  ['porteur', 'Porteur de projet'],
  ['1-9', '1 à 9'],
  ['10-49', '10 à 49'],
  ['50+', '50 et plus'],
])
export const ANCIENNETES = opts([
  ['porteur', 'Porteur de projet'],
  ['moins-1', 'Moins d’un an'],
  ['1-3', '1 à 3 ans'],
  ['3-5', '3 à 5 ans'],
  ['plus-5', 'Plus de 5 ans'],
])
export const OBJECTIFS = opts([
  ['projet', 'Développer un projet'],
  ['formations', 'Formations'],
  ['afterworks', 'Activités et afterworks'],
  ['affaires', 'Opportunités d’affaires'],
  ['visibilite', 'Visibilité'],
  ['formalisation', 'Formalisation'],
])
export const CONNU_PAR = opts([
  ['membre', 'Un membre'],
  ['whatsapp', 'WhatsApp'],
  ['reseaux', 'Réseaux sociaux'],
  ['evenement', 'Un événement'],
  ['autre', 'Autre'],
])
export const AUTORISATIONS = [
  { name: 'annuaire', label: 'Présenter mon activité dans l’annuaire en ligne et papier' },
  { name: 'coordonnees', label: 'Montrer mes coordonnées professionnelles aux membres connectés' },
  { name: 'logo', label: 'Autoriser l’usage de mon logo sur les supports de REC 242' },
  { name: 'portrait', label: 'Autoriser l’usage de mon portrait sur les supports de REC 242' },
] as const

export const STATUTS_CANDIDATURE = opts([
  ['recue', 'Reçue'],
  ['en-examen', 'En examen'],
  ['complement', 'Complément demandé'],
  ['acceptee', 'Acceptée'],
  ['active', 'Active'],
  ['refusee', 'Refusée'],
  ['archivee', 'Archivée'],
])

export const label = (liste: { value: string; label: string }[], v?: string | null) =>
  liste.find((o) => o.value === v)?.label ?? ''

/** Couleur du badge de statut (classes rec-badge de la maquette). */
export const badgeStatut = (s?: string | null) =>
  s === 'acceptee' || s === 'active' ? 'active' : s === 'refusee' || s === 'archivee' ? 'suspended' : 'pending'
