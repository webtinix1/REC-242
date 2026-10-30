/**
 * Questions personnalisées du formulaire d'inscription d'un événement. Module sans dépendance serveur : les mêmes règles
 * servent à l'action du site (erreurs sous les champs) et à la collection `registrations` (contrôle final).
 */
export const TYPES_QUESTION = [
  { value: 'texte', label: 'Texte court' },
  { value: 'paragraphe', label: 'Texte long' },
  { value: 'nombre', label: 'Nombre' },
  { value: 'email', label: 'E-mail' },
  { value: 'telephone', label: 'Téléphone' },
  { value: 'date', label: 'Date' },
  { value: 'choix-unique', label: 'Choix unique' },
  { value: 'choix-multiple', label: 'Choix multiple' },
  { value: 'liste', label: 'Liste déroulante' },
  { value: 'case', label: 'Case à cocher' },
  { value: 'fichier', label: 'Fichier joint' },
] as const

export const PUBLICS_QUESTION = [
  { value: 'tous', label: 'Visiteurs et membres' },
  { value: 'visiteurs', label: 'Visiteurs seulement' },
  { value: 'membres', label: 'Membres seulement' },
] as const

export type TypeQuestion = (typeof TYPES_QUESTION)[number]['value']
export type Profil = 'visiteurs' | 'membres'

/** Question telle que stockée sur l'événement (les choix sont écrits un par ligne). */
export type Question = {
  id?: string | null
  libelle: string
  type: TypeQuestion
  aide?: string | null
  obligatoire?: boolean | null
  pour?: string | null
  options?: string | null
}

/** Question telle que l'affiche le formulaire. */
export type QuestionAffichee = { id: string; libelle: string; type: TypeQuestion; aide: string; obligatoire: boolean; options: string[] }

/** Réponse enregistrée : le libellé est recopié, pour rester lisible si la question change ou disparaît. */
export type Reponse = { question: string; libelle: string; type: string; valeur: string; fichier?: number }

/** Valeurs saisies par question. Pour un fichier : identifiant du fichier déposé, puis son nom d'origine. */
export type Saisies = Record<string, string[]>

export const MAX_QUESTIONS = 30
export const MAX_QUESTIONS_FICHIER = 3
export const TAILLE_MAX_REPONSE = 5 * 1024 * 1024
const LONGUEUR: Partial<Record<TypeQuestion, number>> = { texte: 300, paragraphe: 3000, email: 160, telephone: 40, nombre: 30 }

export const AVEC_CHOIX: TypeQuestion[] = ['choix-unique', 'choix-multiple', 'liste']

export const optionsDe = (q: Pick<Question, 'options'>): string[] => [
  ...new Set((q.options ?? '').split(/\r?\n/).map((o) => o.trim()).filter(Boolean)),
]

/** Nom du champ de formulaire d'une question. */
export const cleChamp = (id: string) => `q_${id}`

/** Questions posées à un profil, prêtes à afficher (aucune question sans identifiant). */
export const questionsPour = (questions: Question[] | null | undefined, profil: Profil): QuestionAffichee[] =>
  (questions ?? [])
    .filter((q) => q.id && (!q.pour || q.pour === 'tous' || q.pour === profil))
    .map((q) => ({ id: q.id!, libelle: q.libelle, type: q.type, aide: q.aide ?? '', obligatoire: Boolean(q.obligatoire), options: optionsDe(q) }))

const dateValide = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T12:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

function erreurDe(q: QuestionAffichee, valeurs: string[]): string | null {
  if (!valeurs.length) return q.obligatoire ? 'Cette question est obligatoire.' : null
  const v = valeurs[0]
  const max = LONGUEUR[q.type]
  if (max && v.length > max) return `Réponse trop longue : ${max} caractères au maximum.`
  switch (q.type) {
    case 'nombre':
      return /^-?\d+([.,]\d+)?$/.test(v) ? null : 'Indiquez un nombre.'
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Indiquez une adresse e-mail valide.'
    case 'telephone':
      return /^\+?[\d\s.()-]{6,}$/.test(v) ? null : 'Indiquez un numéro de téléphone valide.'
    case 'date':
      return dateValide(v) ? null : 'Indiquez une date valide.'
    case 'choix-unique':
    case 'liste':
      return valeurs.length === 1 && q.options.includes(v) ? null : 'Choisissez une réponse proposée.'
    case 'choix-multiple':
      return valeurs.every((x) => q.options.includes(x)) ? null : 'Choisissez parmi les réponses proposées.'
    case 'fichier':
      return Number.isInteger(Number(v)) ? null : 'Fichier non valable.'
    default:
      return null
  }
}

/** Vérifie les réponses aux questions d'un profil : erreurs par champ, et réponses à enregistrer (non vides). */
export function verifierReponses(questions: QuestionAffichee[], saisies: Saisies): { erreurs: Record<string, string>; reponses: Reponse[] } {
  const erreurs: Record<string, string> = {}
  const reponses: Reponse[] = []
  for (const q of questions) {
    const valeurs = (saisies[q.id] ?? []).map((v) => String(v).trim()).filter(Boolean)
    const erreur = erreurDe(q, valeurs)
    if (erreur) erreurs[cleChamp(q.id)] = erreur
    else if (valeurs.length) {
      const base = { question: q.id, libelle: q.libelle, type: q.type }
      if (q.type === 'fichier') reponses.push({ ...base, valeur: (valeurs[1] ?? '').slice(0, 200), fichier: Number(valeurs[0]) })
      else if (q.type === 'case') reponses.push({ ...base, valeur: 'Oui' })
      else reponses.push({ ...base, valeur: valeurs.join(', ') })
    }
  }
  return { erreurs, reponses }
}
