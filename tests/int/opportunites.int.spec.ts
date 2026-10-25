import { createLocalReq, getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { expirer } from '@/jobs/expirerOpportunites'
import { coordonneesDetectees, finDuJour } from '@/lib/opportunites/regles'

let payload: Payload
const unique = Date.now()
const crees: Record<'opportunities' | 'opportunityReplies' | 'members', number[]> = { opportunities: [], opportunityReplies: [], members: [] }
const demain = () => new Date(Date.now() + 86400e3).toISOString()

const membre = async (n: number) => {
  const m = await payload.create({
    collection: 'members',
    overrideAccess: true,
    data: { email: `opp${n}-${unique}@test.rec242.test`, password: 'Mot-de-passe-test-1', prenom: 'Opp', nom: `Test${n}`, categorie: 'B', statut: 'actif' } as never,
  })
  crees.members.push(m.id as number)
  return { ...m, collection: 'members' } as unknown as { id: number; collection: 'members' }
}

beforeAll(async () => {
  payload = await getPayload({ config })
})
afterAll(async () => {
  for (const c of ['opportunityReplies', 'opportunities', 'members'] as const)
    for (const id of crees[c]) await payload.db.deleteOne({ collection: c, where: { id: { equals: id } } }).catch(() => null)
})

describe('Lot 9 : opportunités', () => {
  it('une annonce de membre passe par la modération avant d’être visible', async () => {
    const auteur = await membre(1)
    const autre = await membre(2)
    const o = await payload.create({
      collection: 'opportunities',
      user: auteur as never,
      overrideAccess: false,
      context: { sansEmail: true },
      data: { type: 'offre-membre', titre: `Annonce ${unique}`, description: 'Nous cherchons un partenaire, appelez le 06 123 45 67.', visibilite: 'public', dateLimite: demain(), statut: 'publiee', miseEnAvant: true } as never,
    })
    crees.opportunities.push(o.id as number)
    const d = o as unknown as { statut: string; miseEnAvant: boolean; coordonnees: string; membre: number | { id: number } }
    expect(d.statut).toBe('a-moderer')
    expect(d.miseEnAvant).toBe(false)
    expect(d.coordonnees).toContain('numéro de téléphone')
    // Invisible pour le public et pour un autre membre tant qu'elle n'est pas publiée.
    const pub = await payload.find({ collection: 'opportunities', overrideAccess: false, where: { id: { equals: o.id } } })
    expect(pub.docs).toHaveLength(0)
    expect((await payload.find({ collection: 'opportunities', user: autre as never, overrideAccess: false, where: { id: { equals: o.id } } })).docs).toHaveLength(0)
    expect((await payload.find({ collection: 'opportunities', user: auteur as never, overrideAccess: false, where: { id: { equals: o.id } } })).docs).toHaveLength(1)
    // Le membre ne peut pas publier lui-même.
    const tente = (await payload.update({ collection: 'opportunities', id: o.id, user: auteur as never, overrideAccess: false, data: { statut: 'publiee' } as never })) as unknown as { statut: string }
    expect(tente.statut).toBe('a-moderer')

    const u = await payload.find({ collection: 'users', where: { email: { equals: 'yohan.dinga@rec242.test' } }, limit: 1, overrideAccess: true })
    const req = await createLocalReq({ user: { ...u.docs[0], collection: 'users' } as never }, payload)
    req.context = { sansEmail: true }
    await expect(payload.update({ collection: 'opportunities', id: o.id, req, overrideAccess: false, data: { statut: 'refusee' } as never })).rejects.toThrow(/motif/)
    await payload.update({ collection: 'opportunities', id: o.id, req, overrideAccess: false, data: { statut: 'publiee' } as never })
    expect((await payload.find({ collection: 'opportunities', overrideAccess: false, where: { id: { equals: o.id } } })).docs).toHaveLength(1)

    // Réponse d'un autre membre : lue par l'auteur, pas par un tiers.
    const r = await payload.create({ collection: 'opportunityReplies', user: autre as never, overrideAccess: false, data: { opportunite: o.id, message: 'Bonjour, je suis intéressé.' } as never })
    crees.opportunityReplies.push(r.id as number)
    await expect(payload.create({ collection: 'opportunityReplies', user: auteur as never, overrideAccess: false, data: { opportunite: o.id, message: 'Je me réponds à moi-même.' } as never })).rejects.toThrow()
    expect((await payload.find({ collection: 'opportunityReplies', user: auteur as never, overrideAccess: false })).docs.some((x) => x.id === r.id)).toBe(true)
    const tiers = await membre(3)
    expect((await payload.find({ collection: 'opportunityReplies', user: tiers as never, overrideAccess: false })).docs.some((x) => x.id === r.id)).toBe(false)
  })

  it('une opportunité expirée disparaît le lendemain de sa date limite', async () => {
    const o = await payload.create({
      collection: 'opportunities',
      overrideAccess: true,
      context: { sansEmail: true },
      data: { type: 'financement', titre: `Expire ${unique}`, description: 'Programme de test.', visibilite: 'public', dateLimite: demain(), statut: 'publiee' } as never,
    })
    crees.opportunities.push(o.id as number)
    const hier = new Date(Date.now() - 2 * 86400e3).toISOString()
    await payload.db.updateOne({ collection: 'opportunities', id: o.id, data: { dateLimite: hier }, returning: false })
    expect(await expirer(payload)).toBeGreaterThanOrEqual(1)
    const apres = (await payload.findByID({ collection: 'opportunities', id: o.id, overrideAccess: true })) as unknown as { statut: string }
    expect(apres.statut).toBe('expiree')
    // Le jour même de la date limite, elle reste publiée.
    expect(finDuJour(new Date().toISOString()).getTime()).toBeGreaterThan(Date.now())
    await expect(
      payload.create({ collection: 'opportunities', overrideAccess: true, data: { type: 'appel-offres', titre: 'Sans source', description: 'Test', dateLimite: demain(), statut: 'publiee' } as never }),
    ).rejects.toThrow(/source officielle/)
    expect(coordonneesDetectees('écrire à contact@exemple.cg')).toEqual(['adresse e-mail'])
  })
})
