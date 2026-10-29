import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import { extractJWT, getFieldsToSign, jwtSign, type AuthStrategy, type Payload } from 'payload'

/** Cookie de session de Payload (préfixe de la configuration). */
export const nomCookie = (payload: Payload) => `${payload.config.cookiePrefix || 'payload'}-token`

/**
 * Durée de session : 30 jours avec « Rester connecté », sinon 30 minutes sans activité. Les deux limites valent côté
 * serveur (échéance de la session en base, voir strategieEcheanceSession) ; le cookie suit (prolongé par src/proxy.ts).
 */
export const DUREE_LONGUE = 30 * 24 * 3600
export const DUREE_COURTE = 30 * 60
/** Repère « une session a existé sur cet appareil » : permet d'afficher « Session expirée ». */
export const COOKIE_SESSION = 'rec242_session'

export const optionsCookie = (maxAge: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge,
})

/** Jeton à usage unique (activation, lien de connexion) : on n'enregistre que son empreinte. */
export const nouveauJeton = () => {
  const jeton = randomBytes(32).toString('base64url')
  return { jeton, empreinte: empreinte(jeton) }
}
export const empreinte = (jeton: string) => createHash('sha256').update(jeton).digest('hex')

/**
 * Ouvre une session pour un membre sans mot de passe (lien de connexion valable 15 minutes, activation qui vient de poser le mot de passe).
 * Reprend le fonctionnement de Payload : une session est ajoutée au membre et son identifiant est signé dans le jeton.
 */
export async function ouvrirSession(payload: Payload, membreId: number): Promise<{ token: string; exp: number }> {
  const collection = payload.collections.members.config
  const user = (await payload.db.findOne({ collection: 'members', where: { id: { equals: membreId } } })) as Record<string, unknown> & {
    id: number
    email: string
    sessions?: { id: string; createdAt: string | Date; expiresAt: string | Date }[]
  }
  const now = new Date()
  const sid = randomUUID()
  // Ces connexions (lien, activation, nouveau mot de passe) ne cochent pas « Rester connecté » : session courte côté serveur.
  const expiresAt = new Date(now.getTime() + DUREE_COURTE * 1000)
  const sessions = (user.sessions ?? []).filter((s) => new Date(s.expiresAt) > now)
  sessions.push({ id: sid, createdAt: now, expiresAt })
  await payload.db.updateOne({ collection: 'members', id: user.id, data: { ...user, sessions, derniereConnexion: now.toISOString(), updatedAt: null }, returning: false })
  const fieldsToSign = getFieldsToSign({
    collectionConfig: collection,
    email: user.email,
    sid,
    user: { ...user, sessions, collection: 'members' } as never,
  })
  return jwtSign({ fieldsToSign, secret: payload.secret, tokenExpiration: collection.auth.tokenExpiration })
}

type SessionEnBase = { id: string; createdAt?: string | Date | null; expiresAt: string | Date }
type MembreSessions = Record<string, unknown> & { id: number; sessions?: SessionEnBase[] | null }

/**
 * Contenu d'un jeton de session signé par Payload (HS256 avec `payload.secret`), ou null si la signature ou la date
 * d'expiration ne conviennent pas.
 */
export function lireJeton(jeton: string, secret: string): { id: number | string; collection: string; sid?: string } | null {
  const [h, p, s] = jeton.split('.')
  if (!h || !p || !s) return null
  const attendu = createHmac('sha256', secret).update(`${h}.${p}`).digest()
  const recu = Buffer.from(s, 'base64url')
  if (recu.length !== attendu.length || !timingSafeEqual(recu, attendu)) return null
  try {
    const c = JSON.parse(Buffer.from(p, 'base64url').toString('utf-8')) as { id?: number | string; collection?: string; sid?: string; exp?: number }
    if (typeof c.exp === 'number' && c.exp * 1000 < Date.now()) return null
    if (c.id == null || typeof c.collection !== 'string') return null
    return { id: c.id, collection: c.collection, sid: typeof c.sid === 'string' ? c.sid : undefined }
  } catch {
    return null
  }
}

/**
 * Session sans « Rester connecté » : son échéance en base est ramenée à 30 minutes (Payload la crée pour 30 jours).
 * Appelé après la connexion par le formulaire (hook afterLogin de la collection members).
 */
export async function raccourcirSession(payload: Payload, membreId: number, sid: string, req?: Parameters<Payload['db']['findOne']>[0]['req']) {
  const user = (await payload.db.findOne({ collection: 'members', where: { id: { equals: membreId } }, req })) as MembreSessions | null
  const s = user?.sessions?.find((x) => x.id === sid)
  if (!user || !s) return
  s.expiresAt = new Date(Date.now() + DUREE_COURTE * 1000)
  await payload.db.updateOne({ collection: 'members', id: membreId, data: { ...user, sessions: user.sessions, updatedAt: null }, req, returning: false })
}

/** Une écriture au plus par minute et par session pour prolonger une session courte. */
const PAS_PROLONGATION_MS = 60 * 1000

/**
 * Stratégie d'authentification placée avant celle de Payload (qui vérifie seulement que la session existe, sans regarder
 * son échéance). Elle ne connecte jamais personne : pour un jeton de membre, elle retire de la base les sessions échues
 * (la stratégie JWT de Payload refuse alors le jeton) et prolonge de 30 minutes une session courte encore valable, à chaque
 * requête authentifiée. Une session longue (« Rester connecté ») n'est jamais prolongée au-delà de 30 jours après sa création.
 */
export const strategieEcheanceSession: AuthStrategy = {
  name: 'echeance-session-membre',
  authenticate: async ({ headers, payload }) => {
    const brut = extractJWT({ headers, payload })
    const ref = brut ? lireJeton(brut, payload.secret) : null
    if (!ref || ref.collection !== 'members' || !ref.sid) return { user: null }
    const user = (await payload.db.findOne({ collection: 'members', where: { id: { equals: ref.id } } })) as MembreSessions | null
    const sessions = user?.sessions ?? []
    const s = sessions.find((x) => x.id === ref.sid)
    if (!user || !s) return { user: null }
    const now = Date.now()
    const fin = new Date(s.expiresAt).getTime()
    if (fin <= now) {
      // Session échue : retirée, avec les autres sessions échues de ce membre.
      const restantes = sessions.filter((x) => new Date(x.expiresAt).getTime() > now)
      await payload.db.updateOne({ collection: 'members', id: user.id, data: { ...user, sessions: restantes, updatedAt: null }, returning: false })
      return { user: null }
    }
    if (fin - now <= DUREE_COURTE * 1000) {
      const debut = s.createdAt ? new Date(s.createdAt).getTime() : now
      const cible = Math.min(now + DUREE_COURTE * 1000, debut + DUREE_LONGUE * 1000)
      if (cible - fin >= PAS_PROLONGATION_MS) {
        s.expiresAt = new Date(cible)
        await payload.db.updateOne({ collection: 'members', id: user.id, data: { ...user, sessions, updatedAt: null }, returning: false })
      }
    }
    return { user: null }
  },
}

/** Vrai si la session indiquée est une session courte (moins de 30 minutes avant son échéance). */
export async function estSessionCourte(payload: Payload, membreId: number | string, sid?: string, req?: Parameters<Payload['db']['findOne']>[0]['req']) {
  if (!sid) return false
  const user = (await payload.db.findOne({ collection: 'members', where: { id: { equals: membreId } }, req })) as MembreSessions | null
  const s = user?.sessions?.find((x) => x.id === sid)
  return Boolean(s && new Date(s.expiresAt).getTime() - Date.now() <= DUREE_COURTE * 1000)
}

/** Ferme une session (déconnexion de cet appareil). */
export async function revoquerSession(payload: Payload, membreId: number, sid: string) {
  const user = (await payload.db.findOne({ collection: 'members', where: { id: { equals: membreId } } })) as Record<string, unknown> & {
    sessions?: { id: string }[]
  }
  const sessions = (user.sessions ?? []).filter((s) => s.id !== sid)
  await payload.db.updateOne({ collection: 'members', id: membreId, data: { ...user, sessions, updatedAt: null }, returning: false })
}

/** Ferme toutes les sessions d'un membre (tous les appareils), sauf celle indiquée. */
export async function fermerSessions(payload: Payload, membreId: number, garder?: string) {
  const user = (await payload.db.findOne({ collection: 'members', where: { id: { equals: membreId } } })) as Record<string, unknown> & {
    sessions?: { id: string }[]
  }
  const sessions = (user.sessions ?? []).filter((s) => garder && s.id === garder)
  await payload.db.updateOne({ collection: 'members', id: membreId, data: { ...user, sessions, updatedAt: null }, returning: false })
}
