/** Listes propres aux membres (docs/03-modele-de-donnees.md, `members` et `companies`). */

export const STATUTS_MEMBRE = [
  { value: 'attente', label: 'En attente d’activation' },
  { value: 'actif', label: 'Actif' },
  { value: 'suspendu', label: 'Suspendu' },
  { value: 'ancien', label: 'Ancien membre' },
]

export const statutMembreLabel = (v?: string | null) => STATUTS_MEMBRE.find((s) => s.value === v)?.label ?? ''

export const badgeMembre = (v?: string | null) => (v === 'actif' ? 'active' : v === 'attente' ? 'pending' : 'suspended')

/** Préférences de notification (écran 03), avec le canal affiché. */
export const NOTIFICATIONS = [
  { name: 'rappels', label: 'Rappels de mes événements', canal: 'La veille, par e-mail' },
  { name: 'opportunites', label: 'Opportunités de mes secteurs', canal: 'Dès leur publication, par e-mail' },
  { name: 'echanges', label: 'Réponses et mises en relation', canal: 'Immédiatement, par e-mail' },
  { name: 'cotisation', label: 'Échéances de cotisation', canal: '30 jours et 7 jours avant, par e-mail' },
  { name: 'lettre', label: 'Lettre d’information du réseau', canal: 'Une fois par mois, par e-mail' },
] as const

/** Réglages de visibilité de la fiche (écran 03). */
export const VISIBILITES = [
  { name: 'annuaire', label: 'Fiche visible dans l’annuaire public' },
  { name: 'telephone', label: 'Afficher mon téléphone aux membres' },
  { name: 'whatsapp', label: 'Afficher mon WhatsApp aux membres' },
  { name: 'email', label: 'Afficher mon e-mail aux membres' },
  { name: 'miseEnAvant', label: 'Me mettre en avant sur l’accueil si le bureau me sélectionne' },
] as const

/** Champs vérifiés : ils ne changent que par une demande validée par le responsable membres. */
export const CHAMPS_VERIFIES = [
  { value: 'nom', label: 'Nom et prénom' },
  { value: 'raisonSociale', label: 'Raison sociale' },
  { value: 'secteurs', label: 'Secteurs' },
  { value: 'villeQuartier', label: 'Ville et quartier' },
  { value: 'telephone', label: 'Téléphone' },
  { value: 'email', label: 'E-mail' },
] as const

export type ChampVerifie = (typeof CHAMPS_VERIFIES)[number]['value']

export const champLabel = (v?: string | null) => CHAMPS_VERIFIES.find((c) => c.value === v)?.label ?? ''

/** Numéro d'adhérent : REC-AAAA-NNNN. */
export const numeroAdherent = (annee: number, n: number) => `REC-${annee}-${String(n).padStart(4, '0')}`

/** Veille de la prochaine date anniversaire : fin de l'exercice et validité de la carte. */
export const finExercice = (debut: Date | string): Date => {
  const d = new Date(debut)
  const fin = new Date(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate(), 12))
  fin.setUTCDate(fin.getUTCDate() - 1)
  return fin
}

/** Date limite pour solder la cotisation : début de l'exercice + délai (3 mois par défaut, Paramètres › Tarifs). */
export const limiteCotisation = (debut: Date | string, mois = 3): Date => {
  const d = new Date(debut)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + mois, d.getUTCDate(), 12))
}
