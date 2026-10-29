import { createLocalReq, getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { ipDe } from '@/lib/antispam'
import { jetonExpert, verifierJetonExpert } from '@/lib/experts/delais'
import { lireJeton, ouvrirSession, strategieEcheanceSession } from '@/lib/membres/session'
import { autoriserOubliPourEmail, clientIp, ipDepuisEntetes, limiterAuthentification, rendreTentativeConnexion } from '@/lib/request'
import { motDePasseSeed, verifierEnvironnementSeed } from '@/seed/lib'

/**
 * Sécurité de l'authentification : adresse IP derrière Nginx, limites des routes REST natives, seed bloqué en production,
 * jeton d'expert daté, sessions fermées à la désactivation et sessions courtes côté serveur.
 * Les comptes créés ici ont une adresse @e2e.test ou @int.test et sont supprimés en fin de fichier.
 */
let payload: Payload
const unique = Date.now()
const membres: number[] = []
const users: number[] = []

beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  for (const id of membres) await payload.delete({ collection: 'members', id, overrideAccess: true }).catch(() => null)
  for (const id of users) await payload.db.deleteOne({ collection: 'users', where: { id: { equals: id } } }).catch(() => null)
})

describe('Adresse IP derrière Nginx', () => {
  it('X-Real-IP passe avant X-Forwarded-For, dont seul le dernier élément compte', () => {
    expect(ipDepuisEntetes(new Headers({ 'x-real-ip': '198.51.100.7', 'x-forwarded-for': '1.2.3.4, 198.51.100.7' }))).toBe('198.51.100.7')
    // Premier élément fourni par le client, dernier ajouté par Nginx.
    expect(ipDepuisEntetes(new Headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' }))).toBe('203.0.113.9')
    expect(ipDe(new Headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' }))).toBe('203.0.113.9')
    expect(ipDe(new Headers())).toBe('local')
    expect(clientIp({ headers: new Headers({ 'x-real-ip': '192.0.2.5' }) } as never)).toBe('192.0.2.5')
  })
})

describe('Limites des routes d’authentification', () => {
  const appel = (operation: string, ip: string, email?: string, payloadAPI: 'REST' | 'local' = 'REST') =>
    limiterAuthentification({
      args: { data: { email } },
      collection: { slug: 'members' },
      operation,
      req: { payloadAPI, headers: new Headers({ 'x-real-ip': ip }) } as never,
    })

  it('au-delà du plafond par appareil, la connexion REST est refusée (429) ; l’API locale n’est pas comptée', () => {
    const ip = `198.18.${unique % 250}.1`
    let refus: unknown = null
    for (let i = 0; i < 1000 && !refus; i++) {
      try {
        appel('login', ip)
      } catch (e) {
        refus = e
      }
    }
    expect((refus as { status?: number })?.status).toBe(429)
    expect(() => appel('login', ip, undefined, 'local')).not.toThrow()
    expect(() => appel('login', `198.18.${unique % 250}.2`)).not.toThrow()
  })

  it('une connexion réussie ne consomme pas la limite : seuls les échecs comptent', () => {
    const ip = `198.18.${unique % 250}.3`
    const req = { payloadAPI: 'REST', headers: new Headers({ 'x-real-ip': ip }) } as never
    for (let i = 0; i < 1000; i++) {
      appel('login', ip)
      rendreTentativeConnexion({ collection: { slug: 'members' }, req })
    }
    expect(() => appel('login', ip)).not.toThrow()
  })

  it('« Mot de passe oublié » est limité par adresse e-mail, même depuis des appareils différents', () => {
    const email = `oubli-${unique}@int.test`
    let refus: unknown = null
    for (let i = 0; i < 100 && !refus; i++) {
      try {
        appel('forgotPassword', `198.19.${i}.${unique % 250}`, email)
      } catch (e) {
        refus = e
      }
    }
    expect((refus as { status?: number })?.status).toBe(429)
    // Le formulaire de l'espace membre partage ce compteur.
    expect(autoriserOubliPourEmail('members', email)).toBe(false)
  })
})

describe('Seed en production', () => {
  it('refusé sans drapeau, refusé sans mot de passe, accepté avec les deux', () => {
    expect(() => verifierEnvironnementSeed({ NODE_ENV: 'production' } as never)).toThrow(/Seed refusé en production/)
    expect(() => verifierEnvironnementSeed({ NODE_ENV: 'production', SEED_EN_PRODUCTION: 'oui' } as never)).toThrow(/SEED_PASSWORD/)
    expect(() => verifierEnvironnementSeed({ NODE_ENV: 'production', SEED_EN_PRODUCTION: 'oui', SEED_PASSWORD: 'court' } as never)).toThrow(/SEED_PASSWORD/)
    expect(motDePasseSeed({ NODE_ENV: 'production', SEED_EN_PRODUCTION: 'oui', SEED_PASSWORD: 'Un-secret-de-seed-2026' } as never)).toBe('Un-secret-de-seed-2026')
    // Développement : la commande habituelle fonctionne sans rien renseigner.
    expect(motDePasseSeed({ NODE_ENV: 'development' } as never)).toBeTruthy()
    expect(motDePasseSeed({} as never)).toBeTruthy()
  })
})

describe('Jeton de réponse d’un expert', () => {
  it('valable jusqu’à l’échéance plus 30 jours, refusé ensuite ; ancien format et signature fausse refusés', () => {
    const t0 = new Date('2026-10-05T09:00:00Z')
    const j = jetonExpert(12, 34, t0)
    expect(verifierJetonExpert(j, t0.getTime() + 20 * 24 * 3600e3)).toEqual({ demande: 12, personne: 34 })
    expect(verifierJetonExpert(j, t0.getTime() + 60 * 24 * 3600e3)).toBeNull()
    expect(verifierJetonExpert('12.34.abcdefghijklmnopqrstuvwx')).toBeNull()
    const [d, p, e, s] = j.split('.')
    expect(verifierJetonExpert(`${d}.${p}.${(parseInt(e, 36) + 999999).toString(36)}.${s}`, t0.getTime())).toBeNull()
  })
})

describe('Champs réservés au serveur', () => {
  it('un membre ne change pas son consentement à l’annuaire par l’API ; l’action serveur (contexte champServeur) oui', async () => {
    const m = await payload.create({
      collection: 'members',
      overrideAccess: true,
      data: { email: `champ-serveur-${unique}@int.test`, password: 'Mot-de-passe-test-1', prenom: 'Champ', nom: 'Serveur', categorie: 'B', statut: 'actif' } as never,
    })
    membres.push(m.id as number)
    const user = { ...m, collection: 'members' } as never
    const date = '2026-10-01T10:00:00.000Z'
    const lire = async () => ((await payload.findByID({ collection: 'members', id: m.id, depth: 0, overrideAccess: true })) as unknown as { consentementAnnuaire?: string | null }).consentementAnnuaire
    await payload.update({ collection: 'members', id: m.id, overrideAccess: false, user, data: { consentementAnnuaire: date } as never })
    expect(await lire()).toBeFalsy()
    await payload.update({ collection: 'members', id: m.id, overrideAccess: false, user, context: { champServeur: true }, data: { consentementAnnuaire: date } as never })
    expect(new Date((await lire())!).toISOString()).toBe(date)
  })
})

describe('Sessions', () => {
  const lireSessions = async (collection: 'members' | 'users', id: number) =>
    (((await payload.db.findOne({ collection, where: { id: { equals: id } } })) as unknown as { sessions?: { id: string; expiresAt: string }[] })
      .sessions ?? [])

  it('désactiver un compte de l’équipe ferme ses sessions ouvertes', async () => {
    const email = `desactive-${unique}@int.test`
    const u = await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { skipAudit: true },
      data: { name: 'Désactivation Test', email, password: 'Mot-de-passe-test-12', roles: ['editeur'], statut: 'actif' } as never,
    })
    users.push(u.id as number)
    await payload.login({ collection: 'users', data: { email, password: 'Mot-de-passe-test-12' } })
    expect((await lireSessions('users', u.id as number)).length).toBeGreaterThan(0)
    await payload.update({ collection: 'users', id: u.id, overrideAccess: true, context: { skipAudit: true }, data: { statut: 'desactive' } as never })
    expect(await lireSessions('users', u.id as number)).toHaveLength(0)
  })

  it('une session sans « Rester connecté » échoit côté serveur après 30 minutes sans activité', async () => {
    const email = `session-courte-${unique}@e2e.test`
    const password = 'Mot-de-passe-test-1'
    const m = await payload.create({
      collection: 'members',
      overrideAccess: true,
      context: { sansEmail: true, skipAudit: true },
      data: { email, password, prenom: 'Session', nom: 'Courte', categorie: 'B', statut: 'actif' } as never,
    })
    membres.push(m.id as number)

    // Connexion sans « Rester connecté » : échéance de 30 minutes en base, alors que le jeton vaut 30 jours.
    const r = await payload.login({ collection: 'members', data: { email, password }, context: { rester: false } })
    const sid = lireJeton(r.token!, payload.secret)?.sid
    const s = (await lireSessions('members', m.id as number)).find((x) => x.id === sid)!
    expect(new Date(s.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000 + 1000)

    // Avec « Rester connecté » : 30 jours.
    const r2 = await payload.login({ collection: 'members', data: { email, password }, context: { rester: true } })
    const sid2 = lireJeton(r2.token!, payload.secret)?.sid
    const s2 = (await lireSessions('members', m.id as number)).find((x) => x.id === sid2)!
    expect(new Date(s2.expiresAt).getTime() - Date.now()).toBeGreaterThan(29 * 24 * 3600 * 1000)

    // Session en cours : le jeton est accepté.
    const entetes = (t: string) => new Headers({ Authorization: `JWT ${t}` })
    expect((await payload.auth({ headers: entetes(r.token!) })).user?.id).toBe(m.id)

    // 31 minutes sans activité (échéance passée) : la session est retirée et le jeton refusé.
    const avant = (await payload.db.findOne({ collection: 'members', where: { id: { equals: m.id } } })) as unknown as Record<string, unknown> & {
      sessions: { id: string; expiresAt: string | Date }[]
    }
    const sessions = avant.sessions.map((x) => (x.id === sid ? { ...x, expiresAt: new Date(Date.now() - 60 * 1000) } : x))
    await payload.db.updateOne({ collection: 'members', id: m.id, data: { ...avant, sessions, updatedAt: null }, returning: false })
    expect((await payload.auth({ headers: entetes(r.token!) })).user).toBeNull()
    expect((await lireSessions('members', m.id as number)).some((x) => x.id === sid)).toBe(false)
    // La session longue reste valable.
    expect((await payload.auth({ headers: entetes(r2.token!) })).user?.id).toBe(m.id)
  })

  it('une session ouverte par lien est courte et la stratégie ne connecte jamais personne seule', async () => {
    const m = await payload.create({
      collection: 'members',
      overrideAccess: true,
      context: { sansEmail: true, skipAudit: true },
      data: { email: `session-lien-${unique}@e2e.test`, password: 'Mot-de-passe-test-1', prenom: 'Session', nom: 'Lien', categorie: 'B', statut: 'actif' } as never,
    })
    membres.push(m.id as number)
    const { token } = await ouvrirSession(payload, m.id as number)
    const sid = lireJeton(token, payload.secret)?.sid
    const s = (await lireSessions('members', m.id as number)).find((x) => x.id === sid)!
    expect(new Date(s.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000 + 1000)
    const req = await createLocalReq({}, payload)
    const r = await strategieEcheanceSession.authenticate({ headers: new Headers({ Authorization: `JWT ${token}` }), payload, req })
    expect(r.user).toBeNull()
    // Jeton modifié : signature refusée.
    expect(lireJeton(`${token}x`, payload.secret)).toBeNull()
  })
})
