import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'

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

const fenetres = new Map<string, number[]>()

/**
 * Vrai si l'envoi est autorisé (et le compte). Mémoire du processus : suffisant pour le serveur unique du VPS.
 * `cle` combine l'usage et l'appareil (par exemple « contact:203.0.113.4 »).
 */
export const autoriserEnvoi = (
  cle: string,
  max: number,
  fenetreMs: number,
  now = Date.now(),
): boolean => {
  const liste = (fenetres.get(cle) ?? []).filter((t) => now - t < fenetreMs)
  if (liste.length >= max) {
    fenetres.set(cle, liste)
    return false
  }
  liste.push(now)
  fenetres.set(cle, liste)
  if (fenetres.size > 10000)
    for (const [k, v] of fenetres) if (!v.some((t) => now - t < fenetreMs)) fenetres.delete(k)
  return true
}

/** Adresse IP de la requête en cours (derrière Nginx : X-Forwarded-For). */
export const ipDe = (h: Headers): string =>
  h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'local'
