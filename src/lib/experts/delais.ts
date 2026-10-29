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

/** Marge après le délai de réponse : le lien « Répondre » reste utilisable 30 jours après l'échéance. */
export const MARGE_JETON_JOURS = 30

/**
 * Jeton du lien « Répondre » envoyé à la personne sollicitée : lié à la demande ET à la personne (une réattribution
 * l'invalide) et daté : il expire à l'échéance de réponse plus 30 jours. Une relance renvoie un lien neuf.
 * Format : demande.personne.expiration (secondes, base 36).signature. Les anciens jetons sans date (demande.personne.signature)
 * sont refusés : ils n'avaient pas d'échéance, et la plateforme n'était pas encore en production quand ce format a changé.
 */
const signer = (demande: number, personne: number, expire: string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || 'rec242').update(`expert:${demande}:${personne}:${expire}`).digest('base64url').slice(0, 24)

export const jetonExpert = (demande: number, personne: number, maintenant = new Date()) => {
  const fin = ajouterJoursOuvres(maintenant, DELAI_JOURS_OUVRES).getTime() + MARGE_JETON_JOURS * 24 * 3600 * 1000
  const expire = Math.floor(fin / 1000).toString(36)
  return `${demande}.${personne}.${expire}.${signer(demande, personne, expire)}`
}

export const verifierJetonExpert = (jeton: string, maintenant = Date.now()): { demande: number; personne: number } | null => {
  const [d, p, e, s, ...reste] = String(jeton).split('.')
  if (reste.length || !/^\d+$/.test(d ?? '') || !/^\d+$/.test(p ?? '') || !/^[0-9a-z]+$/.test(e ?? '') || !s) return null
  const attendu = signer(Number(d), Number(p), e)
  if (s.length !== attendu.length || !timingSafeEqual(Buffer.from(s), Buffer.from(attendu))) return null
  if (parseInt(e, 36) * 1000 < maintenant) return null
  return { demande: Number(d), personne: Number(p) }
}

export const lienExpert = (demande: number, personne: number) => `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/experts/reponse/${jetonExpert(demande, personne)}`
