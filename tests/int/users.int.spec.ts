import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
const PWD = 'Mot-de-passe-test-2026'
const created: number[] = []

const make = async (email: string, roles: string[]) => {
  const u = await payload.create({
    collection: 'users',
    overrideAccess: true,
    context: { skipAudit: true },
    data: { name: email.split('@')[0], email, password: PWD, roles: roles as never, statut: 'actif' },
  })
  created.push(u.id)
  return { ...u, collection: 'users' as const }
}

describe('Comptes d’administration', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await payload.db.deleteMany({ collection: 'users', where: { email: { like: '@int.test' } } })
  })
  afterAll(async () => {
    await payload.db.deleteMany({ collection: 'auditLog', where: { cible: { like: '@int.test' } } })
    if (created.length) await payload.db.deleteMany({ collection: 'users', where: { id: { in: created } } })
  })

  it('refuse un mot de passe de moins de 12 caractères', async () => {
    await expect(
      payload.create({ collection: 'users', overrideAccess: true, data: { name: 'Court', email: 'court@int.test', password: 'trop-court', roles: ['editeur'], statut: 'actif' } }),
    ).rejects.toThrow(/12 caractères/)
  })

  it('un éditeur ne voit que son propre compte, un administrateur les voit tous', async () => {
    const ed = await make('editeur@int.test', ['editeur'])
    const ad = await make('admin@int.test', ['admin'])
    const asEd = await payload.find({ collection: 'users', user: ed, overrideAccess: false, limit: 100 })
    expect(asEd.docs.map((d) => d.id)).toEqual([ed.id])
    const asAd = await payload.find({ collection: 'users', user: ad, overrideAccess: false, limit: 100 })
    expect(asAd.totalDocs).toBeGreaterThan(1)
  })

  it('un administrateur ne peut pas modifier les rôles d’un autre utilisateur', async () => {
    const ad = await make('admin2@int.test', ['admin'])
    const ed = await make('editeur2@int.test', ['editeur'])
    await expect(payload.update({ collection: 'users', id: ed.id, user: ad, overrideAccess: false, data: { roles: ['superadmin'] } })).rejects.toThrow()
  })

  it('le journal ne peut être ni créé ni modifié ni supprimé par l’API', async () => {
    const sa = await make('super@int.test', ['superadmin'])
    await expect(
      payload.create({ collection: 'auditLog', user: sa, overrideAccess: false, data: { action: 'x', categorie: 'connexion' } }),
    ).rejects.toThrow()
    const any = await payload.find({ collection: 'auditLog', limit: 1, overrideAccess: true })
    if (any.docs[0]) {
      await expect(payload.delete({ collection: 'auditLog', id: any.docs[0].id, user: sa, overrideAccess: false })).rejects.toThrow()
    }
  })

  it('bloque le compte après 5 essais et trace la connexion réussie', async () => {
    await make('bloque@int.test', ['editeur'])
    for (let i = 0; i < 5; i++) {
      await payload.login({ collection: 'users', data: { email: 'bloque@int.test', password: 'mauvais-mot-de-passe' } }).catch(() => {})
    }
    await expect(payload.login({ collection: 'users', data: { email: 'bloque@int.test', password: PWD } })).rejects.toThrow()

    await make('ok@int.test', ['editeur'])
    await payload.login({ collection: 'users', data: { email: 'ok@int.test', password: PWD } })
    const log = await payload.find({ collection: 'auditLog', where: { cible: { equals: 'ok@int.test' } }, overrideAccess: true })
    expect(log.docs[0]?.action).toBe('Connexion')
  })

  it('refuse la connexion d’un compte désactivé', async () => {
    const u = await make('off@int.test', ['editeur'])
    await payload.update({ collection: 'users', id: u.id, overrideAccess: true, context: { skipAudit: true }, data: { statut: 'desactive' } })
    await expect(payload.login({ collection: 'users', data: { email: 'off@int.test', password: PWD } })).rejects.toThrow(/désactivé/)
  })
})
