import { createLocalReq, getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { jetonCarte, verifierJetonCarte } from '@/lib/membres/carte'
import { convertirCandidature, envoyerActivation } from '@/lib/membres/conversion'
import { situationCotisation } from '@/lib/membres/cotisation'
import { finExercice } from '@/lib/membres/options'
import { empreinte } from '@/lib/membres/session'

let payload: Payload
const unique = Date.now()
const crees: Record<'applications' | 'members' | 'companies' | 'payments' | 'modificationRequests', number[]> = {
  applications: [],
  members: [],
  companies: [],
  payments: [],
  modificationRequests: [],
}

const staffReq = async () => {
  const u = await payload.find({ collection: 'users', where: { email: { equals: 'beryl.bobanda@rec242.test' } }, limit: 1, overrideAccess: true })
  return createLocalReq({ user: { ...u.docs[0], collection: 'users' } as never }, payload)
}

const membreDirect = async (n: number) => {
  const e = await payload.create({ collection: 'companies', overrideAccess: true, data: { nom: `Entreprise isolée ${n} ${unique}` } as never })
  crees.companies.push(e.id as number)
  const m = await payload.create({
    collection: 'members',
    overrideAccess: true,
    data: {
      email: `isole${n}-${unique}@test.rec242.test`,
      password: 'Mot-de-passe-test-1',
      prenom: 'Isolé',
      nom: `Numéro${n}`,
      telephone: `+242 06 ${String(unique).slice(-3)} ${n}0 0${n}`,
      categorie: 'B',
      statut: 'actif',
      entreprise: e.id,
    } as never,
  })
  crees.members.push(m.id as number)
  await payload.update({ collection: 'companies', id: e.id, data: { titulaire: m.id } as never, overrideAccess: true })
  return { ...(m as unknown as { id: number; email: string }), collection: 'members' as const, entreprise: e.id as number }
}

beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  for (const c of ['modificationRequests', 'payments', 'applications', 'members', 'companies'] as const)
    for (const id of crees[c]) await payload.delete({ collection: c, id, overrideAccess: true }).catch(() => null)
})

describe('Lot 6 : membres', () => {
  it('« Convertir en membre » crée la fiche, le compte en attente et le numéro REC-AAAA-NNNN', async () => {
    const [loc, sec] = await Promise.all([
      payload.find({ collection: 'localities', limit: 1, overrideAccess: true }),
      payload.find({ collection: 'sectors', limit: 1, overrideAccess: true }),
    ])
    const a = await payload.create({
      collection: 'applications',
      overrideAccess: true,
      context: { sansEmail: true },
      data: {
        nom: 'Conversion',
        prenom: 'Test',
        email: `conversion-${unique}@test.rec242.test`,
        telephone: `+242 05 ${String(unique).slice(-3)} 11 22`,
        trancheAge: '26-35',
        raisonSociale: `Atelier ${unique}`,
        localite: loc.docs[0].id,
        description: 'Activité de test',
        secteurs: [sec.docs[0].id],
        anciennete: '1-3',
        objectifs: ['affaires'],
        categorie: 'B',
        consentement: true,
        acceptationTextes: true,
        autorisations: { annuaire: true, coordonnees: false },
      } as never,
    })
    crees.applications.push(a.id as number)
    const req = await staffReq()
    // Pas encore acceptée : refus.
    await expect(convertirCandidature(payload, a.id as number, req)).rejects.toThrow(/Acceptée/)
    await payload.update({
      collection: 'applications',
      id: a.id,
      overrideAccess: true,
      context: { sansEmail: true },
      data: { statut: 'acceptee', pieceVerifiee: true, charteSignee: true } as never,
    })
    const p = await payload.create({
      collection: 'payments',
      overrideAccess: true,
      data: { candidature: a.id, objet: 'adhesion-tranche', montant: 1000, mode: 'mtn', statut: 'paye', datePaiement: new Date().toISOString() } as never,
    })
    crees.payments.push(p.id as number)

    const m = (await convertirCandidature(payload, a.id as number, req)) as unknown as {
      id: number
      numeroAdherent: string
      statut: string
      entreprise: number | { id: number }
      validiteCarte: string
      dateAdhesion: string
    }
    crees.members.push(m.id)
    const eid = typeof m.entreprise === 'object' ? m.entreprise.id : m.entreprise
    crees.companies.push(eid)
    expect(m.numeroAdherent).toMatch(new RegExp(`^REC-${new Date().getFullYear()}-\\d{4}$`))
    expect(m.statut).toBe('attente')
    expect(new Date(m.validiteCarte).toISOString().slice(0, 10)).toBe(finExercice(m.dateAdhesion).toISOString().slice(0, 10))
    const e = (await payload.findByID({ collection: 'companies', id: eid, overrideAccess: true })) as unknown as {
      titulaire: { id: number }
      visibilite: { annuaire: boolean; telephone: boolean }
    }
    expect(e.titulaire.id).toBe(m.id)
    expect(e.visibilite.annuaire).toBe(true)
    expect(e.visibilite.telephone).toBe(false)
    const apres = (await payload.findByID({ collection: 'applications', id: a.id, depth: 0, overrideAccess: true })) as unknown as { statut: string; membre: number }
    expect(apres.statut).toBe('active')
    expect(apres.membre).toBe(m.id)
    const pay = (await payload.findByID({ collection: 'payments', id: p.id, depth: 0, overrideAccess: true })) as unknown as { membre: number }
    expect(pay.membre).toBe(m.id)
    // Le lien d'activation est enregistré sous forme d'empreinte seulement.
    const jeton = await envoyerActivation(payload, m.id)
    const brut = (await payload.db.findOne({ collection: 'members', where: { id: { equals: m.id } } })) as { activationHash: string; activationExpire: string }
    expect(brut.activationHash).toBe(empreinte(jeton))
    expect(new Date(brut.activationExpire).getTime() - Date.now()).toBeGreaterThan(71 * 3600 * 1000)
    // Pas de seconde conversion.
    await expect(convertirCandidature(payload, a.id as number, req)).rejects.toThrow()
  })

  it('un membre ne lit aucune donnée d’un autre membre par l’API', async () => {
    const m1 = await membreDirect(1)
    const m2 = await membreDirect(2)
    const membres = await payload.find({ collection: 'members', user: m1 as never, overrideAccess: false, limit: 100 })
    expect(membres.docs.map((d) => d.id)).toEqual([m1.id])
    await expect(payload.findByID({ collection: 'members', id: m2.id, user: m1 as never, overrideAccess: false })).rejects.toThrow()
    const entreprises = await payload.find({ collection: 'companies', user: m1 as never, overrideAccess: false, limit: 100 })
    expect(entreprises.docs.map((d) => d.id)).toEqual([m1.entreprise])
    const p = await payload.create({ collection: 'payments', overrideAccess: true, data: { membre: m2.id, objet: 'droit', montant: 10, mode: 'mtn', statut: 'paye' } as never })
    crees.payments.push(p.id as number)
    const paiements = await payload.find({ collection: 'payments', user: m1 as never, overrideAccess: false })
    expect(paiements.docs.some((d) => d.id === p.id)).toBe(false)
    const r = await payload.create({ collection: 'modificationRequests', user: m2 as never, overrideAccess: false, data: { champ: 'raisonSociale', nouvelleValeur: 'Autre nom' } as never })
    crees.modificationRequests.push(r.id as number)
    const demandes = await payload.find({ collection: 'modificationRequests', user: m1 as never, overrideAccess: false })
    expect(demandes.docs.some((d) => d.id === r.id)).toBe(false)
    // Ni modification d'un autre membre, ni de ses propres champs vérifiés.
    await expect(payload.update({ collection: 'members', id: m2.id, user: m1 as never, overrideAccess: false, data: { fonction: 'Pirate' } as never })).rejects.toThrow()
    const soi = (await payload.update({
      collection: 'members',
      id: m1.id,
      user: m1 as never,
      overrideAccess: false,
      data: { statut: 'suspendu', nom: 'Changé', fonction: 'Gérante' } as never,
    })) as unknown as { statut: string; nom: string; fonction: string }
    expect(soi.statut).toBe('actif')
    expect(soi.nom).toBe('Numéro1')
    expect(soi.fonction).toBe('Gérante')
    await expect(payload.update({ collection: 'members', id: m1.id, user: m1 as never, overrideAccess: false, data: { email: 'autre@test.rec242.test' } as never })).rejects.toThrow()
  })

  it('une demande de modification validée met à jour la fiche', async () => {
    const m = await membreDirect(3)
    const r = await payload.create({
      collection: 'modificationRequests',
      user: m as never,
      overrideAccess: false,
      data: { champ: 'raisonSociale', nouvelleValeur: `Nouveau nom ${unique}`, membre: 999999 } as never,
    })
    crees.modificationRequests.push(r.id as number)
    const d = r as unknown as { membre: number | { id: number }; valeurActuelle: string; statut: string }
    expect(typeof d.membre === 'object' ? d.membre.id : d.membre).toBe(m.id)
    expect(d.valeurActuelle).toBe(`Entreprise isolée 3 ${unique}`)
    // Le membre ne valide pas lui-même.
    await expect(payload.update({ collection: 'modificationRequests', id: r.id, user: m as never, overrideAccess: false, data: { statut: 'validee' } as never })).rejects.toThrow()
    const req = await staffReq()
    await expect(payload.update({ collection: 'modificationRequests', id: r.id, req, overrideAccess: false, data: { statut: 'refusee' } as never })).rejects.toThrow(/motif/)
    await payload.update({ collection: 'modificationRequests', id: r.id, req, overrideAccess: false, data: { statut: 'validee' } as never })
    const e = (await payload.findByID({ collection: 'companies', id: m.entreprise, overrideAccess: true })) as unknown as { nom: string }
    expect(e.nom).toBe(`Nouveau nom ${unique}`)
  })

  it('le QR de la carte est signé et la cotisation se calcule sur les paiements', () => {
    const j = jetonCarte('REC-2026-0137')
    expect(verifierJetonCarte(j)).toBe('REC-2026-0137')
    expect(verifierJetonCarte(j.replace('0137', '0138'))).toBeNull()
    const s = situationCotisation({ cotisation: { droit: 15000, montant: 75000, tranches: 2 } }, [
      { id: 1, objet: 'droit', montant: 15000, statut: 'paye' },
      { id: 2, objet: 'tranche1', montant: 37500, statut: 'paye' },
      { id: 3, objet: 'tranche2', montant: 37500, statut: 'echoue' },
    ])
    expect(s.reste).toBe(37500)
    expect(s.libelle).toBe('2e tranche due')
  })
})
