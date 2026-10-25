import { createHash, randomBytes, randomUUID } from 'crypto'
import { getFieldsToSign, jwtSign, type Payload } from 'payload'

/** Cookie de session de Payload (préfixe de la configuration). */
export const nomCookie = (payload: Payload) => `${payload.config.cookiePrefix || 'payload'}-token`

/** Durée de session : 30 jours avec « Rester connecté », sinon 30 minutes sans activité (prolongées par src/proxy.ts). */
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
  const expiresAt = new Date(now.getTime() + collection.auth.tokenExpiration * 1000)
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
