import { createLocalReq, getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { jetonBillet, verifierJetonLien, jetonLien } from '@/lib/evenements/billets'
import { fichierIcs } from '@/lib/evenements/ics'
import { pointer } from '@/lib/evenements/pointage'
import { jetonCarte } from '@/lib/membres/carte'

let payload: Payload
const unique = Date.now()
const crees: Record<'events' | 'registrations' | 'members', number[]> = { events: [], registrations: [], members: [] }

const visiteur = async (evenement: number, n: number) => {
  const r = await payload.create({
    collection: 'registrations',
    overrideAccess: true,
    context: { visiteur: true, sansEmail: true },
    data: { evenement, visiteur: { nom: `Visiteur ${n}`, email: `visiteur${n}-${unique}@test.rec242.test` } } as never,
  })
  crees.registrations.push(r.id as number)
  return r as unknown as { id: number; statut: string; position?: number; numeroBillet?: string }
}
const lire = async (id: number) =>
  (await payload.findByID({ collection: 'registrations', id, overrideAccess: true, depth: 0 })) as unknown as { statut: string; position?: number; numeroBillet?: string }

beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  for (const id of crees.registrations) await payload.db.deleteOne({ collection: 'registrations', where: { id: { equals: id } } }).catch(() => null)
  for (const id of crees.events) await payload.delete({ collection: 'events', id, overrideAccess: true }).catch(() => null)
  for (const id of crees.members) await payload.delete({ collection: 'members', id, overrideAccess: true }).catch(() => null)
})

describe('Lot 8 : événements', () => {
  it('capacité de 2 : la troisième inscription part en liste d’attente et est promue à la première annulation', async () => {
    const e = await payload.create({
      collection: 'events',
      overrideAccess: true,
      data: { titre: `Atelier test ${unique}`, debut: new Date(Date.now() + 5 * 86400e3).toISOString(), capacite: 2, statut: 'publie', acces: 'tous' } as never,
    })
    crees.events.push(e.id as number)
    const a = await visiteur(e.id as number, 1)
    const b = await visiteur(e.id as number, 2)
    const c = await visiteur(e.id as number, 3)
    expect(a.statut).toBe('inscrit')
    expect(a.numeroBillet).toMatch(/^B-\d{4}-001$/)
    expect(b.statut).toBe('inscrit')
    expect(c.statut).toBe('attente')
    expect(c.position).toBe(1)
    expect(c.numeroBillet).toBeFalsy()
    const plein = (await payload.findByID({ collection: 'events', id: e.id, overrideAccess: true })) as unknown as { statut: string }
    expect(plein.statut).toBe('complet')
    // Doublon refusé.
    await expect(visiteur(e.id as number, 1)).rejects.toThrow(/déjà inscrit/)

    await payload.update({ collection: 'registrations', id: a.id, overrideAccess: true, data: { statut: 'annule' } as never, context: { sansEmail: true } })
    const promu = await lire(c.id)
    expect(promu.statut).toBe('inscrit')
    expect(promu.numeroBillet).toMatch(/^B-\d{4}-003$/)
    const apres = (await payload.findByID({ collection: 'events', id: e.id, overrideAccess: true })) as unknown as { statut: string }
    expect(apres.statut).toBe('complet')
  })

  it('un QR de carte ou de billet scanné marque la présence, une seule fois', async () => {
    const e = await payload.create({
      collection: 'events',
      overrideAccess: true,
      data: { titre: `Afterwork test ${unique}`, debut: new Date(Date.now() + 3 * 86400e3).toISOString(), statut: 'publie', acces: 'tous' } as never,
    })
    crees.events.push(e.id as number)
    const v = await visiteur(e.id as number, 10)
    const m = await payload.create({
      collection: 'members',
      overrideAccess: true,
      data: { email: `pointage-${unique}@test.rec242.test`, password: 'Mot-de-passe-test-1', prenom: 'Pointage', nom: 'Test', categorie: 'B', statut: 'actif', numeroAdherent: `REC-2099-${String(unique).slice(-4)}` } as never,
    })
    crees.members.push(m.id as number)
    const rm = await payload.create({
      collection: 'registrations',
      user: { ...m, collection: 'members' } as never,
      overrideAccess: false,
      context: { sansEmail: true },
      data: { evenement: e.id } as never,
    })
    crees.registrations.push(rm.id as number)

    const u = await payload.find({ collection: 'users', where: { email: { equals: 'ange.mouandza@rec242.test' } }, limit: 1, overrideAccess: true })
    const req = await createLocalReq({ user: { ...u.docs[0], collection: 'users' } as never }, payload)
    const r1 = await pointer(req, e.id as number, jetonBillet(v.id))
    expect(r1.ok).toBe(true)
    expect((await lire(v.id)).statut).toBe('present')
    const r2 = await pointer(req, e.id as number, jetonBillet(v.id))
    expect(r2.message).toBe('Déjà pointé.')
    const r3 = await pointer(req, e.id as number, jetonCarte((m as unknown as { numeroAdherent: string }).numeroAdherent))
    expect(r3.ok).toBe(true)
    expect((await lire(rm.id as number)).statut).toBe('present')
    expect((await pointer(req, e.id as number, 'REC242:B:1:faux-faux-faux-faux-faux')).ok).toBe(false)
  })

  it('jetons de lien signés et fichier .ics', () => {
    expect(verifierJetonLien('annulation', jetonLien('annulation', 42))).toBe(42)
    expect(verifierJetonLien('billet', jetonLien('annulation', 42))).toBeNull()
    const ics = fichierIcs({ id: 1, titre: 'Afterwork, Brazzaville', debut: '2026-11-14T17:00:00.000Z' })
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('DTSTART:20261114T170000Z')
    expect(ics).toContain('SUMMARY:Afterwork\\, Brazzaville')
  })
})
