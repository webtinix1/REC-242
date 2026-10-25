/**
 * Catégories de membres (statuts, article 11 ; docs/05-regles-metier.md §1).
 * Les montants ne sont jamais écrits ici : ils viennent des Paramètres, onglet Tarifs (global `settings`, champ `tarifs`).
 */

export type CodeCategorie = 'A' | 'B' | 'C' | 'expert' | 'partenaire' | 'honneur'

export type Categorie = {
  valeur: CodeCategorie
  lettre: string
  nom: string
  /** Clés des montants dans les Paramètres (absentes : sur convention). */
  droit?: 'droitA' | 'droitB' | 'droitC' | 'droitExpert'
  cotisation?: 'cotisationA' | 'cotisationB' | 'cotisationC' | 'cotisationExpert'
  convention?: boolean
  note?: string
}

export const CATEGORIES: Categorie[] = [
  { valeur: 'A', lettre: 'A', nom: 'Individuel, informel, porteur de projet', droit: 'droitA', cotisation: 'cotisationA' },
  { valeur: 'B', lettre: 'B', nom: 'Établissement, commerçant formalisé', droit: 'droitB', cotisation: 'cotisationB' },
  { valeur: 'C', lettre: 'C', nom: 'Entreprise, société', droit: 'droitC', cotisation: 'cotisationC' },
  {
    valeur: 'expert',
    lettre: 'E',
    nom: 'Expert',
    droit: 'droitExpert',
    cotisation: 'cotisationExpert',
    note: 'Les experts relèvent de la catégorie B des statuts (article 11).',
  },
  {
    valeur: 'partenaire',
    lettre: 'P',
    nom: 'Partenaire',
    convention: true,
    note: 'Montant fixé par la convention de partenariat (article 11 des statuts).',
  },
  {
    valeur: 'honneur',
    lettre: 'H',
    nom: 'Membre d’honneur',
    convention: true,
    note: 'Admission par le comité de direction, conditions fixées par convention (article 11 des statuts).',
  },
]

export const categorie = (v?: string | null): Categorie | undefined =>
  CATEGORIES.find((c) => c.valeur === v || c.lettre === v)

/** Libellé court (« A », « Expert »…), pour les listes du back-office. */
export const lettreCategorie = (v?: string | null) => categorie(v)?.lettre ?? ''

export type Tarifs = Partial<Record<string, number | null>> & { tranchesMax?: number | null; delaiMois?: number | null }

export type Montants = {
  droit: number
  cotisation: number
  total: number
  /** Une tranche de cotisation (cotisation / nombre de tranches). */
  tranche: number
  /** À payer à la candidature en deux tranches : droit + première tranche. */
  premierVersement: number
}

/** Montants d'une catégorie, ou null si elle est sur convention ou si les tarifs ne sont pas renseignés. */
export const montants = (c: Categorie | undefined, t: Tarifs | undefined): Montants | null => {
  if (!c || c.convention || !c.droit || !c.cotisation) return null
  const droit = t?.[c.droit]
  const cotisation = t?.[c.cotisation]
  if (droit == null || cotisation == null) return null
  const n = Math.max(1, t?.tranchesMax ?? 2)
  const tranche = Math.round(cotisation / n)
  return { droit, cotisation, total: droit + cotisation, tranche, premierVersement: droit + tranche }
}

export const fcfa = (n?: number | null): string =>
  n == null ? '' : `${n.toLocaleString('fr-FR').replace(/[  ]/g, ' ')} FCFA`

export const SECTEURS_MAX = 3
export const MESSAGE_SECTEURS = 'Trois secteurs au maximum. Retirez-en un pour en choisir un autre.'
export const MESSAGE_DOUBLON =
  "Une demande d'adhésion est déjà enregistrée avec ces coordonnées. Veuillez contacter l'administration si vous pensez qu'il s'agit d'une erreur."

/** Téléphone au format international (+242 par défaut) : « 06 725 79 50 » → « +242067257950 ». */
export const telephoneInternational = (v?: string | null): string => {
  const brut = (v ?? '').trim()
  if (!brut) return ''
  const digits = brut.replace(/\D/g, '')
  if (brut.startsWith('+')) return `+${digits}`
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('242') && digits.length >= 12) return `+${digits}`
  return `+242${digits}`
}

export const emailNormalise = (v?: string | null) => (v ?? '').trim().toLowerCase().replace(/\s+/g, '')

/** Affichage d'un numéro international congolais par groupes : +242067257950 → « +242 06 725 79 50 ». */
export const telephoneAffiche = (v?: string | null): string => {
  const t = (v ?? '').trim()
  const m = t.match(/^\+242(\d{2})(\d{3})(\d{2})(\d{2})$/)
  return m ? `+242 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : t
}
