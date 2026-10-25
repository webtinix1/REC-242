import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
const created: { news: number[]; users: number[] } = { news: [], users: [] }

const corps = {
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        children: [
          {
            type: 'text',
            text: 'Décisions confidentielles du comité.',
            version: 1,
            format: 0,
            mode: 'normal',
            style: '',
            detail: 0,
          },
        ],
      },
    ],
  },
}

describe('Lot 3 : site public', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })
  afterAll(async () => {
    if (created.news.length)
      await payload.db.deleteMany({ collection: 'news', where: { id: { in: created.news } } })
    if (created.users.length)
      await payload.db.deleteMany({ collection: 'users', where: { id: { in: created.users } } })
  })

  it('une actualité réservée ne livre que son titre et son chapeau à un visiteur', async () => {
    const n = await payload.create({
      collection: 'news',
      overrideAccess: true,
      context: { skipAudit: true },
      draft: false,
      data: {
        titre: 'Réservée test int',
        chapeau: 'Chapeau public',
        corps: corps as never,
        reserveMembres: true,
        type: 'article',
        _status: 'published',
      },
    })
    created.news.push(n.id)
    const visiteur = await payload.findByID({ collection: 'news', id: n.id, overrideAccess: false })
    expect(visiteur.chapeau).toBe('Chapeau public')
    expect(visiteur.corps).toBeUndefined()

    await payload.db.deleteMany({
      collection: 'users',
      where: { email: { equals: 'site-int@int.test' } },
    })
    const u = await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { skipAudit: true },
      data: {
        name: 'Site int',
        email: 'site-int@int.test',
        password: 'Mot-de-passe-test-2026',
        roles: ['editeur'] as never,
        statut: 'actif',
      },
    })
    created.users.push(u.id)
    const equipe = await payload.findByID({
      collection: 'news',
      id: n.id,
      overrideAccess: false,
      user: { ...u, collection: 'users' },
    })
    expect(equipe.corps).toBeTruthy()
  })

  it('l’index de recherche ne contient pas le corps d’une actualité réservée', async () => {
    const id = created.news[0]
    const r = await payload.find({
      collection: 'search',
      where: { 'doc.value': { equals: id } },
      overrideAccess: true,
    })
    const doc = r.docs[0] as unknown as { contenu?: string; type?: string }
    expect(doc?.type).toBe('Actualité')
    expect(doc?.contenu).toContain('Chapeau public')
    expect(doc?.contenu).not.toContain('confidentielles')
  })

  it('les partenaires sans convention signée ne sont pas lus par le site', async () => {
    const p = await payload.create({
      collection: 'partners',
      overrideAccess: true,
      data: { nom: 'Partenaire sans convention int', conventionSignee: false },
    })
    const r = await payload.find({
      collection: 'partners',
      where: { conventionSignee: { equals: true } },
      overrideAccess: false,
      limit: 100,
    })
    expect(r.docs.some((d) => d.id === p.id)).toBe(false)
    await payload.delete({ collection: 'partners', id: p.id, overrideAccess: true })
  })
})
