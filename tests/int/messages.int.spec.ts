import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { recevoirMessage } from '@/lib/site/messages'

let payload: Payload
const created: { messages: number[]; users: number[] } = { messages: [], users: [] }
const PWD = 'Mot-de-passe-test-2026'

const staff = async (email: string, roles: string[]) => {
  await payload.db.deleteMany({ collection: 'users', where: { email: { equals: email } } })
  const u = await payload.create({
    collection: 'users',
    overrideAccess: true,
    context: { skipAudit: true },
    data: { name: email, email, password: PWD, roles: roles as never, statut: 'actif' },
  })
  created.users.push(u.id)
  return { ...u, collection: 'users' as const }
}

const lit = async (user: Awaited<ReturnType<typeof staff>>, id: number) =>
  (
    await payload.find({
      collection: 'contactMessages',
      user,
      overrideAccess: false,
      where: { id: { equals: id } },
    })
  ).docs.length === 1

describe('Lot 4 : messages des formulaires', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })
  afterAll(async () => {
    if (created.messages.length)
      await payload.db.deleteMany({
        collection: 'contactMessages',
        where: { id: { in: created.messages } },
      })
    if (created.users.length)
      await payload.db.deleteMany({ collection: 'users', where: { id: { in: created.users } } })
  })

  it('achemine chaque motif vers le bon rôle, et seul ce rôle (et l’administration) le lit', async () => {
    const adhesion = await recevoirMessage(payload, {
      formulaire: 'contact',
      motif: 'adhesion',
      nom: 'Test Adhésion',
      email: 'a@int.test',
      message: 'Question',
    })
    const presse = await recevoirMessage(payload, {
      formulaire: 'contact',
      motif: 'presse',
      nom: 'Test Presse',
      telephone: '+242 06 000 00 00',
      message: 'Interview',
    })
    created.messages.push(adhesion.id, presse.id)
    expect(adhesion.destination).toBe('membres')
    expect(presse.destination).toBe('communication')
    expect(adhesion.statut).toBe('a-traiter')

    const membres = await staff('msg-membres@int.test', ['membres'])
    const editeur = await staff('msg-editeur@int.test', ['editeur'])
    const tresorier = await staff('msg-tresorier@int.test', ['tresorier'])
    const admin = await staff('msg-admin@int.test', ['admin'])
    expect(await lit(membres, adhesion.id)).toBe(true)
    expect(await lit(membres, presse.id)).toBe(false)
    expect(await lit(editeur, presse.id)).toBe(true)
    expect(await lit(editeur, adhesion.id)).toBe(false)
    expect(await lit(tresorier, adhesion.id)).toBe(false)
    expect(await lit(admin, adhesion.id)).toBe(true)
    expect(await lit(admin, presse.id)).toBe(true)
  })

  it('le formulaire partenariat va à la commission Partenariats avec un objet explicite', async () => {
    const p = await recevoirMessage(payload, {
      formulaire: 'partenariat',
      motif: 'partenariat',
      nom: 'Contact test, directrice',
      organisation: 'Fondation test',
      email: 'p@int.test',
      message: 'Proposition',
      typePartenariat: 'Partenariat financier',
    })
    created.messages.push(p.id)
    expect(p.destination).toBe('partenariats')
    expect(p.objet).toBe('Proposition de partenariat : partenariat financier')
  })

  it('personne ne crée de message par l’API, et les coordonnées de l’expéditeur ne changent pas', async () => {
    await expect(
      payload.create({
        collection: 'contactMessages',
        overrideAccess: false,
        data: { formulaire: 'contact', motif: 'autre', nom: 'X', message: 'Y' } as never,
      }),
    ).rejects.toThrow()
    const admin = await staff('msg-admin2@int.test', ['admin'])
    const id = created.messages[0]
    const apres = await payload.update({
      collection: 'contactMessages',
      id,
      user: admin,
      overrideAccess: false,
      data: { email: 'pirate@int.test', statut: 'traite' } as never,
    })
    expect(apres.email).toBe('a@int.test')
    expect(apres.statut).toBe('traite')
  })
})
