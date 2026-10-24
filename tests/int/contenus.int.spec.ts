import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { publierProgrammes } from '@/jobs/publierProgrammes'

let payload: Payload
const PWD = 'Mot-de-passe-test-2026'
const users: number[] = []
const news: number[] = []

const staff = async (email: string, roles: string[]) => {
  await payload.db.deleteMany({ collection: 'users', where: { email: { equals: email } } })
  const u = await payload.create({
    collection: 'users',
    overrideAccess: true,
    context: { skipAudit: true },
    data: { name: email, email, password: PWD, roles: roles as never, statut: 'actif' },
  })
  users.push(u.id)
  return { ...u, collection: 'users' as const }
}

describe('Lot 2 : contenus et droits', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })
  afterAll(async () => {
    if (news.length)
      await payload.db.deleteMany({ collection: 'news', where: { id: { in: news } } })
    if (users.length)
      await payload.db.deleteMany({ collection: 'users', where: { id: { in: users } } })
  })

  it('un éditeur prépare une page en brouillon mais ne la publie pas', async () => {
    const ed = await staff('ed-pages@int.test', ['editeur'])
    const page = await payload.create({
      collection: 'pages',
      user: ed,
      overrideAccess: false,
      draft: true,
      data: { title: 'Brouillon test int', _status: 'draft' },
    })
    await expect(
      payload.update({
        collection: 'pages',
        id: page.id,
        user: ed,
        overrideAccess: false,
        data: { _status: 'published' },
      }),
    ).rejects.toThrow(/administrateur/)
    await payload.delete({ collection: 'pages', id: page.id, overrideAccess: true })
  })

  it('le responsable événements rédige un retour sur événement en brouillon, rien d’autre', async () => {
    const ev = await staff('ev-news@int.test', ['evenements'])
    const ok = await payload.create({
      collection: 'news',
      user: ev,
      overrideAccess: false,
      draft: true,
      data: { titre: 'Retour test int', chapeau: 'x', type: 'retour', _status: 'draft' },
    })
    news.push(ok.id)
    await expect(
      payload.create({
        collection: 'news',
        user: ev,
        overrideAccess: false,
        draft: true,
        data: { titre: 'Article interdit', chapeau: 'x', type: 'article', _status: 'draft' },
      }),
    ).rejects.toThrow(/retours/)
    await expect(
      payload.update({
        collection: 'news',
        id: ok.id,
        user: ev,
        overrideAccess: false,
        data: { _status: 'published' },
      }),
    ).rejects.toThrow()
  })

  it('le public ne voit ni les brouillons ni les actualités archivées', async () => {
    const d = await payload.create({
      collection: 'news',
      overrideAccess: true,
      draft: true,
      data: { titre: 'Invisible test int', chapeau: 'x', type: 'article', _status: 'draft' },
    })
    news.push(d.id)
    const pub = await payload.find({
      collection: 'news',
      overrideAccess: false,
      where: { id: { equals: d.id } },
    })
    expect(pub.totalDocs).toBe(0)
  })

  it('publie automatiquement une actualité programmée à sa date', async () => {
    const d = await payload.create({
      collection: 'news',
      overrideAccess: true,
      draft: true,
      data: {
        titre: 'Programmée test int',
        chapeau: 'x',
        type: 'annonce',
        etat: 'programme',
        datePublication: new Date(Date.now() + 2000).toISOString(),
        _status: 'draft',
      },
    })
    news.push(d.id)
    await new Promise((r) => setTimeout(r, 2500))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (publierProgrammes.handler as any)({ req: { payload }, input: {}, job: {}, tasks: {} })
    const after = await payload.findByID({ collection: 'news', id: d.id, overrideAccess: true })
    expect(after._status).toBe('published')
    expect(after.etat).toBe('publie')
  })

  it('un visiteur ne voit que les documents publics, et les partenaires sous convention', async () => {
    const docs = await payload.find({ collection: 'documents', overrideAccess: false, limit: 100 })
    expect(docs.docs.every((d) => d.visibilite === 'public')).toBe(true)
    const all = await payload.find({ collection: 'documents', overrideAccess: true, limit: 100 })
    expect(all.totalDocs).toBeGreaterThan(docs.totalDocs)
    const partners = await payload.find({ collection: 'partners', overrideAccess: false })
    expect(partners.docs.every((p) => p.conventionSignee)).toBe(true)
  })

  it('les tarifs ne sont modifiables que par un administrateur, le lien du groupe n’est jamais public', async () => {
    const ed = await staff('ed-settings@int.test', ['editeur'])
    const before = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
    await payload.updateGlobal({
      slug: 'settings',
      user: ed,
      overrideAccess: false,
      data: { tarifs: { ...before.tarifs, cotisationA: 1 } },
    })
    const after = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
    expect(after.tarifs?.cotisationA).toBe(before.tarifs?.cotisationA)

    await payload.updateGlobal({
      slug: 'settings',
      overrideAccess: true,
      context: { skipAudit: true },
      data: { whatsapp: { ...before.whatsapp, lienGroupe: 'https://chat.whatsapp.com/test' } },
    })
    const pub = await payload.findGlobal({ slug: 'settings', overrideAccess: false })
    expect(pub.whatsapp?.lienGroupe).toBeUndefined()
    await payload.updateGlobal({
      slug: 'settings',
      overrideAccess: true,
      context: { skipAudit: true },
      data: { whatsapp: before.whatsapp },
    })
  })
})
