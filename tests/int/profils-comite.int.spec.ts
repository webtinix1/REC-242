import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { getProfil, profilHref } from '@/lib/site/data'

/** Profils du comité : adresse, droits de lecture, et seules les personnes du comité ont une page. */
let payload: Payload
const unique = Date.now()
const crees: number[] = []

const personne = async (data: Record<string, unknown>) => {
  const p = await payload.create({
    collection: 'people',
    overrideAccess: true,
    data: { nom: `Élise N’Goma ${unique}`, fonction: 'Test', role: 'comite', visible: true, ...data } as never,
  })
  crees.push(p.id as number)
  return p as unknown as { id: number; slug: string }
}

beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  for (const id of crees) await payload.db.deleteOne({ collection: 'people', where: { id: { equals: id } } }).catch(() => null)
})

describe('Adresse du profil', () => {
  it('est tirée du nom, sans accents, et ne change pas si le nom change', async () => {
    const p = await personne({})
    expect(p.slug).toBe(`elise-n-goma-${unique}`)
    const u = await payload.update({ collection: 'people', id: p.id, overrideAccess: true, data: { nom: 'Autre Nom' } as never })
    expect((u as unknown as { slug: string }).slug).toBe(p.slug)
  })

  it('est réservée au comité', () => {
    expect(profilHref({ role: 'comite', slug: 'x' })).toBe('/le-reseau/gouvernance/x')
    expect(profilHref({ role: 'fondatrice', slug: 'x' })).toBe('/le-reseau/gouvernance/x')
    expect(profilHref({ role: 'expert', slug: 'x' })).toBeUndefined()
  })
})

describe('Lecture du profil', () => {
  it('ne sert ni les experts, ni les fiches masquées aux visiteurs, ni l’e-mail', async () => {
    const expert = await personne({ nom: `Expert ${unique}`, role: 'expert' })
    expect(await getProfil(expert.slug)).toBeNull()

    const masquee = await personne({ nom: `Masquée ${unique}`, visible: false })
    expect(await getProfil(masquee.slug)).toBeNull()
    expect(await getProfil(masquee.slug, true)).not.toBeNull()

    const p = await personne({ nom: `Publique ${unique}`, email: `prive-${unique}@e2e.test` })
    const lu = await getProfil(p.slug)
    expect(lu?.nom).toBe(`Publique ${unique}`)
    expect(JSON.stringify(lu)).not.toContain('prive-')
  })
})
