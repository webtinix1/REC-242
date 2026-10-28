import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { MESSAGE_PLAFOND } from '@/collections/ConnectionRequests'
import { ficheAnnuaire, listerAnnuaire } from '@/lib/annuaire/donnees'

let payload: Payload
const unique = Date.now()
const crees: Record<'members' | 'companies' | 'connectionRequests', number[]> = { members: [], companies: [], connectionRequests: [] }

type Membre = { id: number; collection: 'members'; entreprise: number; slug: string }

const membre = async (n: number, vis: Record<string, boolean>, extra: Record<string, unknown> = {}): Promise<Membre> => {
  const e = await payload.create({
    collection: 'companies',
    overrideAccess: true,
    data: { nom: `Annuaire test ${n} ${unique}`, visibilite: vis } as never,
  })
  crees.companies.push(e.id as number)
  const m = await payload.create({
    collection: 'members',
    overrideAccess: true,
    data: {
      email: `annuaire${n}-${unique}@test.rec242.test`,
      password: 'Mot-de-passe-test-1',
      prenom: 'Annuaire',
      nom: `Test${n}`,
      telephone: `+242 06 ${String(unique).slice(-3)} ${n}1 1${n}`,
      categorie: 'B',
      statut: 'actif',
      entreprise: e.id,
      ...extra,
    } as never,
  })
  crees.members.push(m.id as number)
  await payload.update({ collection: 'companies', id: e.id, data: { titulaire: m.id } as never, overrideAccess: true })
  return { id: m.id as number, collection: 'members', entreprise: e.id as number, slug: (e as unknown as { slug: string }).slug }
}

beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  for (const id of crees.connectionRequests) await payload.db.deleteOne({ collection: 'connectionRequests', where: { id: { equals: id } } }).catch(() => null)
  for (const c of ['members', 'companies'] as const)
    for (const id of crees[c]) await payload.delete({ collection: c, id, overrideAccess: true }).catch(() => null)
})

describe('Lot 7 : annuaire et mises en relation', () => {
  it('visibilité : consentement obligatoire ; aucune coordonnée pour personne ; fiche détaillée avec l’abonnement seulement', async () => {
    const visible = await membre(1, { annuaire: true, telephone: true, whatsapp: false, email: false })
    const sansAccord = await membre(2, { annuaire: false, telephone: true })
    const q = String(unique)
    const pub = await listerAnnuaire({ q, page: 1 }, false)
    expect(pub.cartes.map((c) => c.slug)).toEqual([visible.slug])
    const json = JSON.stringify(pub)
    expect(json).not.toContain('+242')
    expect(json).not.toContain('@test.rec242.test')
    expect(json).not.toContain('Annuaire Test1')
    expect(await ficheAnnuaire(sansAccord.slug, false)).toBeNull()

    // Membre sans abonnement : la fiche de base et de quoi écrire, ni dirigeant ni coordonnées (décision du 28/10/2026).
    const base = await ficheAnnuaire(visible.slug, true, false)
    expect(base?.id).toBe(visible.entreprise)
    expect(base?.detaille).toBe(false)
    expect(base?.dirigeant).toBe('')
    expect(JSON.stringify(base)).not.toContain('+242')
    // Abonné « Annuaire détaillé » : dirigeant, taille, commissions… jamais le téléphone, même si le membre l'affichait.
    const detail = await ficheAnnuaire(visible.slug, true, true)
    expect(detail?.detaille).toBe(true)
    expect(detail?.dirigeant).toBe('Annuaire Test1')
    expect(JSON.stringify(detail)).not.toContain('+242')
    expect(JSON.stringify(detail)).not.toContain('@test.rec242.test')
    // Un membre suspendu disparaît de l'annuaire.
    await payload.update({ collection: 'members', id: visible.id, overrideAccess: true, context: { sansMotif: true }, data: { statut: 'suspendu' } as never })
    expect(await ficheAnnuaire(visible.slug, false)).toBeNull()
  })

  it('écrire directement : le premier message ouvre la conversation, coordonnées masquées, une seule conversation par paire ; plafond', async () => {
    const a = await membre(3, { annuaire: true, telephone: false, whatsapp: false, email: true })
    const b = await membre(4, { annuaire: true, telephone: true, whatsapp: false, email: false })
    await expect(
      payload.create({ collection: 'connectionRequests', user: a as never, overrideAccess: false, data: { entreprise: a.entreprise, message: 'Bonjour à moi-même' } as never }),
    ).rejects.toThrow(/vous-même/)
    const r = await payload.create({
      collection: 'connectionRequests',
      user: a as never,
      overrideAccess: false,
      data: { entreprise: b.entreprise, message: 'Bonjour, je cherche un partenaire. Appelez-moi au 06 903 47 25 ou a@b.cg', demandeur: b.id, statut: 'refusee' } as never,
    })
    crees.connectionRequests.push(r.id as number)
    const d = r as unknown as { statut: string; message: string; demandeur: number | { id: number }; destinataire: number | { id: number } }
    // Sans demande à accepter (décision du 28/10/2026) : la conversation est ouverte dès le premier message.
    expect(d.statut).toBe('acceptee')
    expect(typeof d.demandeur === 'object' ? d.demandeur.id : d.demandeur).toBe(a.id)
    expect(d.message).not.toContain('06 903 47 25')
    expect(d.message).not.toContain('a@b.cg')
    expect(d.message).toContain('[coordonnée masquée]')
    // Une seule conversation par paire de membres, dans un sens comme dans l'autre.
    await expect(
      payload.create({ collection: 'connectionRequests', user: a as never, overrideAccess: false, data: { entreprise: b.entreprise, message: 'Deuxième conversation, refusée.' } as never }),
    ).rejects.toThrow(/déjà ouverte/)
    await expect(
      payload.create({ collection: 'connectionRequests', user: b as never, overrideAccess: false, data: { entreprise: a.entreprise, message: 'Conversation dans l’autre sens, refusée.' } as never }),
    ).rejects.toThrow(/déjà ouverte/)
    // Aucune coordonnée n'est transmise par la conversation.
    const vuParA = JSON.stringify(await payload.findByID({ collection: 'connectionRequests', id: r.id, user: a as never, overrideAccess: false, depth: 2 }))
    expect(vuParA).not.toContain(`annuaire4-${unique}@test.rec242.test`)
    const vuParB = JSON.stringify(await payload.findByID({ collection: 'connectionRequests', id: r.id, user: b as never, overrideAccess: false, depth: 2 }))
    expect(vuParB).not.toContain(`annuaire3-${unique}@test.rec242.test`)
    // Un tiers ne voit rien.
    const c = await membre(5, { annuaire: true })
    const lus = await payload.find({ collection: 'connectionRequests', user: c as never, overrideAccess: false })
    expect(lus.docs.some((x) => x.id === r.id)).toBe(false)

    // Plafond : 10 demandes en 7 jours, la onzième suspend l'envoi.
    const cibles: Membre[] = []
    for (let i = 0; i < 11; i++) cibles.push(await membre(100 + i, { annuaire: true }))
    for (let i = 0; i < 9; i++) {
      const x = await payload.create({ collection: 'connectionRequests', user: c as never, overrideAccess: false, data: { entreprise: cibles[i].entreprise, message: 'Bonjour, demande de test.' } as never })
      crees.connectionRequests.push(x.id as number)
    }
    const dixieme = await payload.create({ collection: 'connectionRequests', user: c as never, overrideAccess: false, data: { entreprise: cibles[9].entreprise, message: 'Bonjour, demande de test.' } as never })
    crees.connectionRequests.push(dixieme.id as number)
    await expect(
      payload.create({ collection: 'connectionRequests', user: c as never, overrideAccess: false, data: { entreprise: cibles[10].entreprise, message: 'Bonjour, demande de test.' } as never }),
    ).rejects.toThrow(MESSAGE_PLAFOND)
    const apres = (await payload.findByID({ collection: 'members', id: c.id, overrideAccess: true })) as unknown as { relationsSuspendues: boolean }
    expect(apres.relationsSuspendues).toBe(true)
  })
})
