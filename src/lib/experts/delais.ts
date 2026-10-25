import { createHmac, timingSafeEqual } from 'crypto'

/** Ajoute des jours ouvrés (du lundi au vendredi, heure de Brazzaville). Les jours fériés ne sont pas connus. */
export function ajouterJoursOuvres(depart: Date, jours: number): Date {
  const d = new Date(depart)
  let restants = jours
  while (restants > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    const j = new Date(d.getTime() + 3600e3).getUTCDay()
    if (j !== 0 && j !== 6) restants--
  }
  return d
}

/** Délai de réponse d'un expert (docs/05-regles-metier.md §9). */
export const DELAI_JOURS_OUVRES = 5

/** Jeton du lien « Répondre » envoyé à la personne sollicitée : lié à la demande ET à la personne (une réattribution l'invalide). */
const signer = (demande: number, personne: number) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || 'rec242').update(`expert:${demande}:${personne}`).digest('base64url').slice(0, 24)

export const jetonExpert = (demande: number, personne: number) => `${demande}.${personne}.${signer(demande, personne)}`

export const verifierJetonExpert = (jeton: string): { demande: number; personne: number } | null => {
  const [d, p, s] = String(jeton).split('.')
  if (!/^\d+$/.test(d ?? '') || !/^\d+$/.test(p ?? '') || !s) return null
  const attendu = signer(Number(d), Number(p))
  return s.length === attendu.length && timingSafeEqual(Buffer.from(s), Buffer.from(attendu)) ? { demande: Number(d), personne: Number(p) } : null
}

export const lienExpert = (demande: number, personne: number) => `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/experts/reponse/${jetonExpert(demande, personne)}`
