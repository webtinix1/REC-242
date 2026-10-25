import { createHmac, timingSafeEqual } from 'crypto'

/** Cookie qui ouvre la page « Merci » juste après l'envoi d'une candidature (30 minutes), sans exposer les dossiers. */
export const COOKIE_MERCI = 'rec242_merci'

const signer = (v: string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || 'rec242').update(`merci:${v}`).digest('hex').slice(0, 32)

export const jetonMerci = (id: number) => `${id}.${signer(String(id))}`

export const lireJetonMerci = (v?: string): number | null => {
  if (!v) return null
  const [id, sig] = v.split('.')
  if (!id || !sig) return null
  const attendu = signer(id)
  if (sig.length !== attendu.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(attendu))) return null
  return Number(id) || null
}
