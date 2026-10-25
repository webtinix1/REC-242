import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Jetons signés des inscriptions (aucune donnée personnelle) :
 * - billet : `REC242:B:<id inscription>:<signature>`, contenu du QR scanné à l'entrée ;
 * - annulation : jeton du lien « Annuler mon inscription » envoyé par e-mail.
 */
const signer = (usage: string, id: number | string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || 'rec242').update(`${usage}:${id}`).digest('base64url').slice(0, 22)

const egal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export const jetonBillet = (id: number) => `REC242:B:${id}:${signer('billet', id)}`
export const verifierJetonBillet = (jeton: string): number | null => {
  const m = /^REC242:B:(\d+):([\w-]{22})$/.exec(jeton.trim())
  return m && egal(m[2], signer('billet', m[1])) ? Number(m[1]) : null
}

/** Jeton d'URL (billet ou annulation) : `<id>.<signature>`. */
export const jetonLien = (usage: 'billet' | 'annulation', id: number) => `${id}.${signer(`lien-${usage}`, id)}`
export const verifierJetonLien = (usage: 'billet' | 'annulation', jeton: string): number | null => {
  const [id, sig] = String(jeton).split('.')
  return id && sig && /^\d+$/.test(id) && egal(sig, signer(`lien-${usage}`, id)) ? Number(id) : null
}

const base = () => process.env.NEXT_PUBLIC_SERVER_URL || ''
export const lienBillet = (id: number) => `${base()}/agenda/billet/${jetonLien('billet', id)}`
export const lienAnnulation = (id: number) => `${base()}/agenda/annulation/${jetonLien('annulation', id)}`

/** Numéro de billet B-JJMM-NNN (jour et mois de l'événement, rang dans l'événement). */
export const numeroBillet = (debut: string | Date, rang: number) => {
  const d = new Date(debut)
  const jj = d.toLocaleString('fr-FR', { day: '2-digit', timeZone: 'Africa/Brazzaville' })
  const mm = d.toLocaleString('fr-FR', { month: '2-digit', timeZone: 'Africa/Brazzaville' })
  return `B-${jj}${mm}-${String(rang).padStart(3, '0')}`
}
