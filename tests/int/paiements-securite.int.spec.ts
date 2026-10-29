import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { nouvelleFin, prolongerAbonnement } from '@/lib/abonnement/service'
import { MESSAGE_SIMULATION_INTERDITE, modePaiement, statutPaiement } from '@/lib/paiements/operateurs'
import { lancerPaiementMobile, MESSAGE_PAIEMENT_EN_COURS, verifierPaiement } from '@/lib/paiements/service'

/**
 * Sécurité des paiements mobiles : un seul passage à « payé » quand plusieurs vérifications arrivent en même temps
 * (rappel de l'opérateur, suivi, tâche périodique), reçu figé, demandes répétées refusées, simulation interdite
 * sur un serveur public.
 */
let payload: Payload
const unique = Date.now()
const crees: { members: number[]; payments: number[] } = { members: [], payments: [] }
let compteurAvant = 0
let recusAttribues = 0

const compteurRecu = async () =>
  ((await payload.find({ collection: 'counters', where: { name: { equals: 'recu' } }, limit: 1, overrideAccess: true })).docs[0] as unknown as { value: number } | undefined)?.value ?? 0

const membre = async (suffixe: string) => {
  const m = await payload.create({
    collection: 'members',
    overrideAccess: true,
    data: { email: `paiement-${suffixe}-${unique}@test.rec242.test`, password: 'Mot-de-passe-test-1', prenom: 'Paiement', nom: 'Test', categorie: 'B', statut: 'actif' } as never,
  })
  crees.members.push(m.id as number)
  return m.id as number
}

beforeAll(async () => {
  payload = await getPayload({ config })
  compteurAvant = await compteurRecu()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

afterAll(async () => {
  for (const id of crees.payments) await payload.db.deleteOne({ collection: 'payments', where: { id: { equals: id } } }).catch(() => null)
  // Les reçus de test ne laissent pas de trou dans la numérotation si personne d'autre n'a encaissé entre-temps.
  if ((await compteurRecu()) === compteurAvant + recusAttribues)
    await payload.db.updateMany({ collection: 'counters', where: { name: { equals: 'recu' } }, data: { value: compteurAvant } })
  for (const id of crees.members) await payload.delete({ collection: 'members', id, overrideAccess: true }).catch(() => null)
})

describe('Passage à « payé » : une seule fois', () => {
  it('deux vérifications simultanées ne prolongent qu’une fois et n’attribuent qu’un numéro', async () => {
    vi.stubEnv('PAIEMENT_MODE', 'simulation')
    const m = await membre('course')
    const avant = await compteurRecu()
    // Paiement d'abonnement en attente, demande de simulation déjà ancienne : l'« opérateur » répond « payé ».
    const p = (await payload.create({
      collection: 'payments',
      overrideAccess: true,
      data: {
        membre: m,
        objet: 'abonnement',
        montant: 1000,
        mode: 'mtn',
        statut: 'en-attente',
        abonnementMois: 12,
        telephonePayeur: '+242 06 555 66 77',
        idOperateur: `SIM-course-${unique}`,
      } as never,
    })) as unknown as { id: number; statut: string; mode: string; idOperateur: string; telephonePayeur: string }
    crees.payments.push(p.id)
    const enAttente = { ...p, createdAt: new Date(Date.now() - 60_000).toISOString() }

    const statuts = await Promise.all([verifierPaiement(payload, enAttente), verifierPaiement(payload, enAttente), verifierPaiement(payload, enAttente)])
    expect(statuts).toEqual(['paye', 'paye', 'paye'])
    recusAttribues++

    const relu = (await payload.findByID({ collection: 'payments', id: p.id, overrideAccess: true })) as unknown as { numero?: number; abonnementProlongeLe?: string }
    expect(await compteurRecu()).toBe(avant + 1)
    expect(Number(relu.numero)).toBe(avant + 1)
    expect(relu.abonnementProlongeLe).toBeTruthy()
    const apres = (await payload.findByID({ collection: 'members', id: m, overrideAccess: true })) as unknown as { abonnementJusquau?: string }
    // Une seule prolongation de 12 mois (trois l'auraient portée à 36 mois).
    expect(Math.abs(new Date(apres.abonnementJusquau!).getTime() - nouvelleFin(null, 12).getTime())).toBeLessThan(60_000)

    // Rejouer la prolongation pour ce paiement ne fait rien.
    expect(await prolongerAbonnement(payload, m, 12, undefined, p.id)).toBeNull()
    const encore = (await payload.findByID({ collection: 'members', id: m, overrideAccess: true })) as unknown as { abonnementJusquau?: string }
    expect(encore.abonnementJusquau).toBe(apres.abonnementJusquau)

    // Un paiement payé ne revient ni en attente ni en échec ; repasser par « remboursement » ne rejoue rien.
    await expect(payload.update({ collection: 'payments', id: p.id, overrideAccess: true, data: { statut: 'en-attente' } as never })).rejects.toThrow()
    await expect(payload.update({ collection: 'payments', id: p.id, overrideAccess: true, data: { statut: 'echoue' } as never })).rejects.toThrow()
    await payload.update({ collection: 'payments', id: p.id, overrideAccess: true, data: { statut: 'remboursement' } as never })
    const autre = await membre('autre')
    const repaye = (await payload.update({
      collection: 'payments',
      id: p.id,
      overrideAccess: true,
      data: { statut: 'paye', membre: autre, montant: 1, objet: 'cotisation' } as never,
    })) as unknown as { numero?: number; membre?: number | { id: number }; montant: number; objet: string }
    expect(Number(repaye.numero)).toBe(avant + 1)
    expect(typeof repaye.membre === 'object' ? repaye.membre?.id : repaye.membre).toBe(m)
    expect(repaye.montant).toBe(1000)
    expect(repaye.objet).toBe('abonnement')
    expect(await compteurRecu()).toBe(avant + 1)
    const fin = (await payload.findByID({ collection: 'members', id: m, overrideAccess: true })) as unknown as { abonnementJusquau?: string }
    expect(fin.abonnementJusquau).toBe(apres.abonnementJusquau)
  })

  it('refuse une seconde demande tant que la première attend la validation', async () => {
    vi.stubEnv('PAIEMENT_MODE', 'simulation')
    const m = await membre('double')
    const demande = () =>
      lancerPaiementMobile(payload, {
        membre: m,
        operateur: 'mtn',
        telephone: '+242 06 555 66 78',
        montant: 1000,
        objet: 'abonnement',
        libelle: 'Abonnement Annuaire détaillé REC 242',
        reference: `ABO-${m}-${Date.now()}`,
        abonnementMois: 12,
      })
    const p = await demande()
    crees.payments.push(p.id)
    expect(p.statut).toBe('en-attente')
    await expect(demande()).rejects.toThrow(MESSAGE_PAIEMENT_EN_COURS)
  })
})

describe('Simulation des paiements', () => {
  it('interdite en production sur un serveur public, sans repli silencieux', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://rec242.cg')
    vi.stubEnv('MTN_SUBSCRIPTION_KEY', '')
    vi.stubEnv('MTN_API_USER', '')
    vi.stubEnv('MTN_API_KEY', '')
    vi.stubEnv('PAIEMENT_MODE', 'simulation')
    expect(() => modePaiement('mtn')).toThrow(MESSAGE_SIMULATION_INTERDITE)
    // Mode test sans clés : plus de repli en simulation.
    vi.stubEnv('PAIEMENT_MODE', 'test')
    expect(() => modePaiement('mtn')).toThrow(MESSAGE_SIMULATION_INTERDITE)
    vi.stubEnv('PAIEMENT_MODE', 'production')
    expect(modePaiement('mtn')).toBe('indisponible')
    // Un identifiant de simulation n'est jamais validé sur un serveur public.
    vi.stubEnv('PAIEMENT_MODE', 'simulation')
    expect((await statutPaiement('mtn', 'SIM-public', { telephone: '+242 06 555 66 77', creeLe: new Date(0).toISOString() })).statut).toBe('echoue')
  })

  it('acceptée pour un essai local d’une compilation de production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PAIEMENT_MODE', 'simulation')
    for (const url of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
      vi.stubEnv('NEXT_PUBLIC_SERVER_URL', url)
      expect(modePaiement('mtn')).toBe('simulation')
    }
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'http://localhost.rec242.cg')
    expect(() => modePaiement('airtel')).toThrow(MESSAGE_SIMULATION_INTERDITE)
  })
})
