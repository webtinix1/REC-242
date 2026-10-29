import { createHash } from 'crypto'
import { APIError, type PayloadRequest } from 'payload'

/**
 * Adresse IP du client, seule fonction à utiliser pour les limites de débit et le journal.
 * En production, le site est derrière Nginx, qui doit poser l'adresse réelle de la connexion :
 *   proxy_set_header X-Real-IP $remote_addr;
 *   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 * On lit d'abord X-Real-IP (écrasé par Nginx, donc fiable), sinon le DERNIER élément de X-Forwarded-For (ajouté par
 * Nginx) : le premier élément est fourni par le client et ne sert jamais, sinon il suffirait de le changer pour
 * contourner les limites.
 */
export const ipDepuisEntetes = (h?: Pick<Headers, 'get'> | null): string => {
  const reelle = h?.get?.('x-real-ip')?.trim()
  if (reelle) return reelle
  const fwd = h?.get?.('x-forwarded-for')
  if (fwd) {
    const liste = fwd.split(',').map((x) => x.trim()).filter(Boolean)
    if (liste.length) return liste[liste.length - 1]
  }
  return ''
}

/** Adresse IP du client (voir ipDepuisEntetes). */
export const clientIp = (req?: Partial<PayloadRequest> | null): string => ipDepuisEntetes(req?.headers)

type Fenetres = Map<string, number[]>
// Mémoire du processus, partagée par les actions serveur et l'API de Payload (même si le code est chargé deux fois).
const fenetres: Fenetres = ((globalThis as { __rec242Fenetres?: Fenetres }).__rec242Fenetres ??= new Map())

/**
 * Vrai si l'envoi est autorisé (et le compte). Mémoire du processus : suffisant pour le serveur unique du VPS.
 * `cle` combine l'usage et l'appareil ou l'adresse (par exemple « contact:203.0.113.4 »).
 */
export const autoriserEnvoi = (cle: string, max: number, fenetreMs: number, now = Date.now()): boolean => {
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

const DEV = process.env.NODE_ENV !== 'production'
const QUART = 15 * 60 * 1000
const HEURE = 3600 * 1000

/** Demandes « Mot de passe oublié » par adresse : partagé par le formulaire de l'espace membre et l'API de Payload. */
export const autoriserOubliPourEmail = (collection: string, email: string) =>
  autoriserEnvoi(`oubli-email:${collection}:${email.trim().toLowerCase()}`, DEV ? 30 : 3, HEURE)

/** Plafonds par appareil des opérations d'authentification appelées par l'API REST (production ; dix fois plus en développement). */
const PLAFONDS: Record<string, number> = {
  login: 20,
  forgotPassword: 5,
  resetPassword: 10,
  unlock: 20,
  refresh: 120,
}

/**
 * Hook `beforeOperation` des collections d'authentification : limite par adresse IP les routes REST natives
 * (/api/<collection>/login, forgot-password, reset-password, unlock, refresh-token) et, pour « mot de passe oublié »,
 * le nombre de demandes par adresse e-mail. Les appels de l'API locale (actions serveur, tâches, tests) ont leurs propres
 * limites et ne sont pas comptés ici.
 */
export const limiterAuthentification = ({
  args,
  collection,
  operation,
  req,
}: {
  args: unknown
  collection: { slug: string }
  operation: string
  req: Partial<PayloadRequest>
}): void => {
  const max = PLAFONDS[operation]
  if (!max || req.payloadAPI === 'local') return
  const ip = clientIp(req) || 'local'
  const refus = () => new APIError('Trop de tentatives depuis cet appareil. Réessayez dans 15 minutes.', 429, null, true)
  if (!autoriserEnvoi(`auth:${collection.slug}:${operation}:${ip}`, DEV ? max * 10 : max, QUART)) throw refus()
  if (operation === 'forgotPassword') {
    const email = String((args as { data?: { email?: unknown } } | undefined)?.data?.email ?? '')
    if (email && !autoriserOubliPourEmail(collection.slug, email)) throw refus()
  }
}

/**
 * Hook `afterLogin` : une connexion réussie rend la tentative comptée par `limiterAuthentification`. Seuls les échecs
 * (force brute, blocage volontaire d'un compte) consomment la limite, pas une équipe qui se connecte souvent depuis
 * le même bureau.
 */
export const rendreTentativeConnexion = ({ collection, req }: { collection: { slug: string }; req: Partial<PayloadRequest> }): void => {
  if (req.payloadAPI === 'local') return
  const liste = fenetres.get(`auth:${collection.slug}:login:${clientIp(req) || 'local'}`)
  liste?.pop()
}

/**
 * Ville du client si le frontal la transmet (en-tête posé par Nginx avec GeoIP, ou par un CDN).
 * Sans information, on renvoie une chaîne vide : on n'invente pas de ville.
 */
export const clientCity = (req?: Partial<PayloadRequest> | null): string => {
  const h = req?.headers
  const v = h?.get?.('x-geo-city') || h?.get?.('cf-ipcity') || h?.get?.('x-vercel-ip-city') || ''
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export const userAgent = (req?: Partial<PayloadRequest> | null): string =>
  req?.headers?.get?.('user-agent') ?? ''

/** Empreinte d'appareil : navigateur et système, sans numéro de version mineure, pour reconnaître un appareil connu. */
export const deviceKey = (ua: string): string => {
  const simplified = ua.replace(/\d+(\.\d+)+/g, (m) => m.split('.')[0])
  return createHash('sha256').update(simplified).digest('hex').slice(0, 16)
}

/** Libellé lisible de l'appareil, pour l'e-mail d'alerte. */
export const deviceLabel = (ua: string): string => {
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'système inconnu'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'navigateur inconnu'
  return `${browser} sur ${os}`
}
