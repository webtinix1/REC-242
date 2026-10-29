import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'

import { autoriserEnvoi, ipDepuisEntetes } from './request'

/**
 * Protection des formulaires publics (docs/02-architecture.md) :
 * - champ piège invisible (rempli par les robots seulement) ;
 * - jeton horodaté et signé : envoi refusé s'il arrive moins de 3 secondes après l'affichage ou plus de 24 h après ;
 * - limitation du nombre d'envois par appareil (adresse IP) sur une fenêtre glissante.
 */

export const CHAMP_PIEGE = 'site_web'
const DELAI_MIN_MS = 3000
const DUREE_MAX_MS = 24 * 3600 * 1000

const signer = (t: string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || 'rec242')
    .update(`formulaire:${t}`)
    .digest('hex')
    .slice(0, 32)

/** Jeton à placer dans un champ caché au moment de l'affichage du formulaire. */
export const jetonFormulaire = (now = Date.now()): string => `${now}.${signer(String(now))}`

export const jetonValide = (jeton: unknown, now = Date.now()): boolean => {
  if (typeof jeton !== 'string') return false
  const [t, sig] = jeton.split('.')
  if (!t || !sig) return false
  const attendu = signer(t)
  if (sig.length !== attendu.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(attendu)))
    return false
  const age = now - Number(t)
  return age >= DELAI_MIN_MS && age <= DUREE_MAX_MS
}

/** Limitation par fenêtre glissante : la mémoire est partagée avec les hooks d'authentification de Payload (src/lib/request.ts). */
export { autoriserEnvoi }

/**
 * Adresse IP de la requête en cours : X-Real-IP posé par Nginx (`proxy_set_header X-Real-IP $remote_addr;`), sinon le
 * dernier élément de X-Forwarded-For. Jamais le premier, fourni par le client (voir ipDepuisEntetes).
 */
export const ipDe = (h: Headers): string => ipDepuisEntetes(h) || 'local'
