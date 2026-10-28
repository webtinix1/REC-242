import { createLocalReq, getPayload, type Endpoint, type Payload, type PayloadRequest } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { endpointsExperts } from '@/endpoints/experts'
import { signalerSansReponse } from '@/jobs/demandesSansReponse'
import { marquerLu, nonLus } from '@/lib/echanges/service'
import { ajouterJoursOuvres, jetonExpert, verifierJetonExpert } from '@/lib/experts/delais'

let payload: Payload
const unique = Date.now()
const crees: Record<string, number[]> = { members: [], expertRequests: [], people: [], connectionRequests: [], commissionRequests: [], networkMessages: [] }

const membre = async (n: number) => {
  const m = await payload.create({
    collection: 'members',
    overrideAccess: true,
    data: { email: `ech${n}-${unique}@test.rec242.test`, password: 'Mot-de-passe-test-1', prenom: 'Ech', nom: `Test${n}`, categorie: 'B', statut: 'actif' } as never,
  })
  crees.members.push(m.id as number)
  return { ...m, collection: 'members' } as unknown as { id: number; collection: 'members' }
}

const appeler = async (chemin: string, id: number, corps: unknown = {}) => {
  const e = endpointsExperts.find((x) => x.path === chemin) as Endpoint
  const u = await payload.find({ collection: 'users', where: { email: { equals: 'beryl.bobanda@rec242.test' } }, limit: 1, overrideAccess: true })
  const req = (await createLocalReq({ user: { ...u.docs[0], collection: 'users' } as never }, payload)) as PayloadRequest
  req.routeParams = { id: String(id) }
  req.json = async () => corps
  const r = await e.handler(req)
  return r.json()
}

beforeAll(async () => {
  payload = await getPayload({ config })
})
afterAll(async () => {
  for (const c of ['expertRequests', 'connectionRequests', 'commissionRequests', 'networkMessages', 'people', 'members'])
    for (const id of crees[c]) await payload.db.deleteOne({ collection: c as never, where: { id: { equals: id } } }).catch(() => null)
})

describe('Lot 10 : experts, échanges, commissions', () => {
  it('une question à un expert est suivie, relancée, réattribuée et clôturée', async () => {
    const tag = (await payload.find({ collection: 'expertiseTags', limit: 1, overrideAccess: true })).docs[0]
    const p1 = await payload.create({ collection: 'people', overrideAccess: true, data: { nom: `Expert A ${unique}`, fonction: 'Test', role: 'expert', etiquettes: [tag.id], email: `expa-${unique}@test.rec242.test` } as never })
    const p2 = await payload.create({ collection: 'people', overrideAccess: true, data: { nom: `Expert B ${unique}`, fonction: 'Test', role: 'expert', etiquettes: [tag.id], email: `expb-${unique}@test.rec242.test` } as never })
    const p3 = await payload.create({ collection: 'people', overrideAccess: true, data: { nom: `Sans étiquette ${unique}`, fonction: 'Test', role: 'expert', etiquettes: [] } as never })
    crees.people.push(p1.id as number, p2.id as number, p3.id as number)
    const m = await membre(1)
    await expect(
      payload.create({ collection: 'expertRequests', user: m as never, overrideAccess: false, data: { etiquette: tag.id, personne: p3.id, question: 'Question de test assez longue.' } as never }),
    ).rejects.toThrow(/étiquette/)
    const d = await payload.create({
      collection: 'expertRequests',
      user: m as never,
      overrideAccess: false,
      data: { etiquette: tag.id, personne: p1.id, question: 'Quel statut juridique choisir ?', statut: 'cloturee' } as never,
    })
    crees.expertRequests.push(d.id as number)
    const doc = d as unknown as { statut: string; echeance: string }
    expect(doc.statut).toBe('envoyee')
    expect(new Date(doc.echeance).getTime()).toBeGreaterThan(Date.now() + 4 * 86400e3)

    // Échéance dépassée : « Sans réponse ».
    await payload.db.updateOne({ collection: 'expertRequests', id: d.id, data: { echeance: new Date(Date.now() - 3600e3).toISOString() }, returning: false })
    expect(await signalerSansReponse(payload)).toBeGreaterThanOrEqual(1)
    const lire = async () => (await payload.findByID({ collection: 'expertRequests', id: d.id, depth: 0, overrideAccess: true })) as unknown as { statut: string; relances: number; personne: number; fil: { texte: string }[]; nonLuMembre: boolean }
    expect((await lire()).statut).toBe('sans-reponse')

    await appeler('/:id/relancer', d.id as number)
    expect((await lire()).relances).toBe(1)
    await expect(appeler('/:id/reattribuer', d.id as number, { personne: p3.id })).rejects.toThrow()
    await appeler('/:id/reattribuer', d.id as number, { personne: p2.id })
    expect((await lire()).personne).toBe(p2.id)
    expect((await lire()).statut).toBe('reattribuee')
    // L'ancien lien de réponse ne vaut plus pour la nouvelle personne.
    expect(verifierJetonExpert(jetonExpert(d.id as number, p1.id as number))).toEqual({ demande: d.id, personne: p1.id })
    await appeler('/:id/repondre', d.id as number, { texte: 'Réponse de REC 242 au membre.' })
    const apres = await lire()
    expect(apres.statut).toBe('repondue')
    expect(apres.nonLuMembre).toBe(true)
    expect((await nonLus(payload, m.id)).experts).toBe(1)
    await marquerLu(payload, 'experts', d.id as number, m.id)
    expect((await nonLus(payload, m.id)).experts).toBe(0)
    // Le membre clôture sa demande.
    await payload.update({ collection: 'expertRequests', id: d.id, user: m as never, overrideAccess: false, data: { statut: 'cloturee' } as never })
    expect((await lire()).statut).toBe('cloturee')
    await expect(appeler('/:id/repondre', d.id as number, { texte: 'Trop tard.' })).rejects.toThrow(/clôturée/)
  })

  it('les compteurs de non-lus sont justes et une commission ouverte accepte les demandes', async () => {
    const a = await membre(2)
    const b = await membre(3)
    const e = await payload.create({ collection: 'companies', overrideAccess: true, data: { nom: `Fiche ${unique}`, titulaire: b.id, visibilite: { annuaire: true } } as never })
    await payload.update({ collection: 'members', id: b.id, overrideAccess: true, data: { entreprise: e.id } as never })
    const r = await payload.create({ collection: 'connectionRequests', user: a as never, overrideAccess: false, data: { entreprise: e.id, message: 'Bonjour, prenons contact.' } as never })
    crees.connectionRequests.push(r.id as number)
    expect((await nonLus(payload, b.id)).relations).toBe(1)
    expect((await nonLus(payload, a.id)).relations).toBe(0)
    await marquerLu(payload, 'relations', r.id as number, b.id)
    expect((await nonLus(payload, b.id)).relations).toBe(0)
    // Depuis le 28/10/2026 la conversation est ouverte dès le premier message : la réponse de B (écriture système,
    // comme l'action `ecrire`) fait apparaître un non-lu chez A.
    expect((r as unknown as { statut: string }).statut).toBe('acceptee')
    await payload.update({
      collection: 'connectionRequests',
      id: r.id,
      overrideAccess: true,
      context: { systeme: true },
      data: { fil: [{ auteur: b.id, texte: 'Avec plaisir.', date: new Date().toISOString() }], nonLuPar: [a.id] } as never,
    })
    expect((await nonLus(payload, a.id)).relations).toBe(1)

    const msg = await payload.create({ collection: 'networkMessages', overrideAccess: true, data: { membre: a.id, titre: 'Test', texte: 'Message de test' } as never })
    crees.networkMessages.push(msg.id as number)
    const avant = (await nonLus(payload, a.id)).reseau
    await marquerLu(payload, 'reseau', msg.id as number, a.id)
    expect((await nonLus(payload, a.id)).reseau).toBe(avant - 1)

    const com = await payload.find({ collection: 'commissions', limit: 20, overrideAccess: true })
    const ouverte = (com.docs as unknown as { id: number; ouverture: string }[]).find((c) => c.ouverture === 'ouverte')!
    const designation = (com.docs as unknown as { id: number; ouverture: string }[]).find((c) => c.ouverture === 'designation')
    if (designation)
      await expect(payload.create({ collection: 'commissionRequests', user: a as never, overrideAccess: false, data: { commission: designation.id, apport: 'Test' } as never })).rejects.toThrow(/désignés/)
    const cr = await payload.create({ collection: 'commissionRequests', user: a as never, overrideAccess: false, data: { commission: ouverte.id, apport: 'Je peux aider.' } as never })
    crees.commissionRequests.push(cr.id as number)
    await payload.update({ collection: 'commissionRequests', id: cr.id, overrideAccess: true, data: { statut: 'acceptee' } as never })
    const fiche = (await payload.findByID({ collection: 'members', id: a.id, depth: 0, overrideAccess: true })) as unknown as { commissions: number[] }
    expect(fiche.commissions).toContain(ouverte.id)
    expect(ajouterJoursOuvres(new Date('2026-10-23T10:00:00Z'), 1).getUTCDay()).toBe(1)
  })
})
