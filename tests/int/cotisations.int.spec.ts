import { createLocalReq, getPayload, type Endpoint, type Payload, type PayloadRequest } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { DisciplinaryCases } from '@/collections/DisciplinaryCases'
import { Dues } from '@/collections/Dues'
import { suiviAdhesions } from '@/jobs/suiviAdhesions'
import { refusRelance, refusConstat } from '@/lib/cotisations/regles'
import { creerEcheance } from '@/lib/cotisations/service'
import { refusTransition } from '@/lib/discipline/regles'

let payload: Payload
const unique = Date.now()
const crees: Record<string, number[]> = { members: [], dues: [], payments: [], disciplinaryCases: [] }

const membre = async (n: number, extra: Record<string, unknown> = {}) => {
  const m = await payload.create({
    collection: 'members',
    overrideAccess: true,
    data: {
      email: `cot${n}-${unique}@test.rec242.test`,
      password: 'Mot-de-passe-test-1',
      prenom: 'Cot',
      nom: `Test${n}`,
      categorie: 'B',
      statut: 'actif',
      dateAdhesion: new Date(Date.now() - 120 * 86400e3).toISOString(),
      cotisation: { droit: 15000, montant: 75000, tranches: 2 },
      ...extra,
    } as never,
  })
  crees.members.push(m.id as number)
  return m as unknown as { id: number; email: string }
}

const appeler = async (endpoints: Endpoint[], chemin: string, id: number, corps: unknown = {}) => {
  const e = endpoints.find((x) => x.path === chemin) as Endpoint
  const u = await payload.find({ collection: 'users', where: { email: { equals: 'ange.mouandza@rec242.test' } }, limit: 1, overrideAccess: true })
  const req = (await createLocalReq({ user: { ...u.docs[0], collection: 'users' } as never }, payload)) as PayloadRequest
  req.routeParams = { id: String(id) }
  req.json = async () => corps
  return (await e.handler(req)).json()
}

beforeAll(async () => {
  payload = await getPayload({ config })
})
afterAll(async () => {
  for (const c of ['disciplinaryCases', 'payments', 'dues', 'members'])
    for (const id of crees[c]) await payload.db.deleteOne({ collection: c as never, where: { id: { equals: id } } }).catch(() => null)
})

describe('Lot 11 : cotisations et discipline', () => {
  it('trois relances au plus, la deuxième pas avant 15 jours, puis constat de perte', async () => {
    const m = await membre(1)
    const id = (await creerEcheance(payload, m.id, new Date(Date.now() - 120 * 86400e3), true)) as number
    crees.dues.push(id)
    const e = (await payload.findByID({ collection: 'dues', id, overrideAccess: true })) as unknown as { tranches: { montant: number }[]; dateLimite: string; statut: string }
    expect(e.tranches.map((t) => t.montant)).toEqual([52500, 37500])
    expect(new Date(e.dateLimite).getTime()).toBeLessThan(Date.now())
    // Paiement de la 1re tranche : rapproché automatiquement.
    const p = await payload.create({ collection: 'payments', overrideAccess: true, data: { membre: m.id, objet: 'tranche1', montant: 52500, mode: 'especes', statut: 'paye', datePaiement: new Date().toISOString() } as never })
    crees.payments.push(p.id as number)
    const apres = (await payload.findByID({ collection: 'dues', id, overrideAccess: true })) as unknown as { tranches: { statut: string }[]; statut: string }
    expect(apres.tranches.map((t) => t.statut)).toEqual(['paye', 'a-payer'])
    expect(apres.statut).toBe('en-relance')

    expect((await appeler(Dues.endpoints as Endpoint[], '/:id/relancer', id)).numero).toBe(1)
    await expect(appeler(Dues.endpoints as Endpoint[], '/:id/relancer', id)).rejects.toThrow(/15 jours/)
    await expect(appeler(Dues.endpoints as Endpoint[], '/:id/constater', id, { pv: 'PV test' })).rejects.toThrow(/troisième relance/)
    // Règle pure : 14 jours ne suffisent pas, 15 oui ; une quatrième est refusée.
    const r1 = new Date(Date.now() - 14 * 86400e3).toISOString()
    expect(refusRelance({ tranches: [{ numero: 2, montant: 1, echeance: '', statut: 'a-payer' }], dateLimite: r1, relances: [{ numero: 1, date: r1 }] })).toMatch(/15 jours/)
    const r2 = new Date(Date.now() - 15 * 86400e3 - 60e3).toISOString()
    expect(refusRelance({ tranches: [{ numero: 2, montant: 1, echeance: '', statut: 'a-payer' }], dateLimite: r2, relances: [{ numero: 1, date: r2 }] })).toBeNull()
    const trois = [1, 2, 3].map((numero) => ({ numero, date: new Date(Date.now() - (70 - numero * 16) * 86400e3).toISOString() }))
    expect(refusRelance({ tranches: [{ numero: 2, montant: 1, echeance: '', statut: 'a-payer' }], dateLimite: r2, relances: trois })).toMatch(/trois relances/)
    expect(refusConstat({ tranches: [{ numero: 2, montant: 1, echeance: '', statut: 'a-payer' }], relances: trois })).toBeNull()

    await payload.update({ collection: 'dues', id, overrideAccess: true, context: { rapprochement: true }, data: { relances: trois } as never })
    await appeler(Dues.endpoints as Endpoint[], '/:id/constater', id, { pv: 'PV-2026-12' })
    const fin = (await payload.findByID({ collection: 'members', id: m.id, overrideAccess: true })) as unknown as { statut: string; fin: { type: string } }
    expect(fin.statut).toBe('ancien')
    expect(fin.fin.type).toBe('perte')
    // Un montant émis ne change pas.
    await expect(payload.update({ collection: 'dues', id, overrideAccess: true, data: { montant: 50000 } as never })).rejects.toThrow(/ne se modifient pas/)
  })

  it('aucune sanction sans les étapes de l’article 15 ; un membre suspendu ne peut plus se connecter', async () => {
    const m = await membre(2)
    const c = await payload.create({ collection: 'disciplinaryCases', overrideAccess: true, data: { membre: m.id } as never })
    crees.disciplinaryCases.push(c.id as number)
    const id = c.id as number
    expect((c as unknown as { numero: string }).numero).toMatch(/^D-\d{4}-\d{3}$/)
    const E = DisciplinaryCases.endpoints as Endpoint[]
    await expect(appeler(E, '/:id/decision', id, { sanction: 'suspension', dureeMois: 2, motivation: 'Test' })).rejects.toThrow(/Aucune sanction/)
    await expect(appeler(E, '/:id/griefs', id, { griefs: [], faits: '' })).rejects.toThrow()
    await appeler(E, '/:id/griefs', id, { griefs: ['charte'], faits: 'Faits datés de test.', sanctionEnvisagee: 'suspension' })
    // Le délai de défense de 15 jours court : pas d'avis tant que la défense n'est pas reçue.
    await expect(appeler(E, '/:id/avis', id, { avis: 'Avis' })).rejects.toThrow(/délai de défense/)
    await appeler(E, '/:id/defense', id, { defense: 'Défense écrite du membre.' })
    await expect(appeler(E, '/:id/decision', id, { sanction: 'suspension', dureeMois: 2, motivation: 'Test' })).rejects.toThrow(/Aucune sanction/)
    await appeler(E, '/:id/avis', id, { avis: 'Avis consultatif de la commission.' })
    await expect(appeler(E, '/:id/decision', id, { sanction: 'suspension', dureeMois: 9, motivation: 'Test' })).rejects.toThrow(/1 à 6 mois/)
    await appeler(E, '/:id/decision', id, { sanction: 'suspension', dureeMois: 2, motivation: 'Manquement établi.' })
    const s = (await payload.findByID({ collection: 'members', id: m.id, overrideAccess: true })) as unknown as { statut: string; suspenduJusquau: string }
    expect(s.statut).toBe('suspendu')
    await expect(payload.login({ collection: 'members', data: { email: m.email, password: 'Mot-de-passe-test-1' } })).rejects.toThrow()
    // Fin de la suspension : levée automatique par le suivi quotidien.
    await payload.db.updateOne({ collection: 'members', id: m.id, data: { suspenduJusquau: new Date(Date.now() - 60e3).toISOString() }, returning: false })
    const bilan = await suiviAdhesions(payload)
    expect(bilan.suspensionsLevees).toBeGreaterThanOrEqual(1)
    const leve = (await payload.findByID({ collection: 'members', id: m.id, overrideAccess: true })) as unknown as { statut: string }
    expect(leve.statut).toBe('actif')
    expect(refusTransition({ statut: 'decision', finRecours: new Date(Date.now() - 86400e3).toISOString() }, 'recours')).toMatch(/recours/)
  })
})
