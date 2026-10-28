import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { estAbonne, nouvelleFin, offreAbonnement } from '@/lib/abonnement/service'
import { COORDONNEE_MASQUEE, masquerCoordonnees } from '@/lib/echanges/masquage'

/**
 * Décision de Webtinix du 28/10/2026 : les échanges entre membres restent sur la plateforme (coordonnées masquées)
 * et l'abonnement « Annuaire détaillé », payé en plus de la cotisation, montre les fiches détaillées.
 */
let payload: Payload
const unique = Date.now()
const crees: { members: number[]; payments: number[] } = { members: [], payments: [] }
let reglagesAvant: { montant?: number | null; dureeMois?: number | null } | undefined
let compteurAvant = 0

const compteurRecu = async () =>
  ((await payload.find({ collection: 'counters', where: { name: { equals: 'recu' } }, limit: 1, overrideAccess: true })).docs[0] as unknown as { value: number } | undefined)?.value ?? 0

beforeAll(async () => {
  payload = await getPayload({ config })
  reglagesAvant = ((await payload.findGlobal({ slug: 'settings', overrideAccess: true })) as { abonnement?: { montant?: number | null; dureeMois?: number | null } }).abonnement
  compteurAvant = await compteurRecu()
})

afterAll(async () => {
  await payload.updateGlobal({ slug: 'settings', overrideAccess: true, data: { abonnement: { montant: reglagesAvant?.montant ?? null, dureeMois: reglagesAvant?.dureeMois ?? null } } as never })
  for (const id of crees.payments) await payload.db.deleteOne({ collection: 'payments', where: { id: { equals: id } } }).catch(() => null)
  // Les reçus de test ne laissent pas de trou dans la numérotation si personne d'autre n'a encaissé entre-temps.
  if ((await compteurRecu()) === compteurAvant + crees.payments.length)
    await payload.db.updateMany({ collection: 'counters', where: { name: { equals: 'recu' } }, data: { value: compteurAvant } })
  for (const id of crees.members) await payload.delete({ collection: 'members', id, overrideAccess: true }).catch(() => null)
})

describe('Échanges entre membres : coordonnées masquées', () => {
  it('masque numéros, e-mails et liens de messagerie, garde dates et montants', () => {
    expect(masquerCoordonnees('WhatsApp : +242 06 903 47 25.')).toBe(`WhatsApp : ${COORDONNEE_MASQUEE}.`)
    expect(masquerCoordonnees('Appelez le 065123418')).toBe(`Appelez le ${COORDONNEE_MASQUEE}`)
    expect(masquerCoordonnees('Tél 06-903-47-25 svp')).toBe(`Tél ${COORDONNEE_MASQUEE} svp`)
    expect(masquerCoordonnees('écrivez à herve.ondongo@fakodrop.cg')).toBe(`écrivez à ${COORDONNEE_MASQUEE}`)
    expect(masquerCoordonnees('herve (at) fakodrop (dot) cg')).toBe(COORDONNEE_MASQUEE)
    expect(masquerCoordonnees('lien wa.me/242069034725')).toBe(`lien ${COORDONNEE_MASQUEE}`)
    expect(masquerCoordonnees('https://chat.whatsapp.com/AbCdEf')).toBe(COORDONNEE_MASQUEE)
    const neutre = 'Budget de 10 000 000 FCFA, livraison le 12/11/2026 ou le 12.11.2026, salle 12.'
    expect(masquerCoordonnees(neutre)).toBe(neutre)
  })
})

describe('Abonnement « Annuaire détaillé »', () => {
  it('pas d’offre tant que le prix ou la durée est vide (aucun montant fixé dans le code)', async () => {
    await payload.updateGlobal({ slug: 'settings', overrideAccess: true, data: { abonnement: { montant: null, dureeMois: null } } as never })
    expect(await offreAbonnement(payload)).toBeNull()
    await payload.updateGlobal({ slug: 'settings', overrideAccess: true, data: { abonnement: { montant: 1000, dureeMois: null } } as never })
    expect(await offreAbonnement(payload)).toBeNull()
  })

  it('un paiement confirmé prolonge l’abonnement de la durée payée, à partir de la fin en cours', async () => {
    // Montant et durée de test : la valeur réelle est fixée par REC 242 dans Paramètres.
    await payload.updateGlobal({ slug: 'settings', overrideAccess: true, data: { abonnement: { montant: 1000, dureeMois: 12 } } as never })
    expect(await offreAbonnement(payload)).toEqual({ montant: 1000, dureeMois: 12 })
    const m = await payload.create({
      collection: 'members',
      overrideAccess: true,
      data: { email: `abonnement-${unique}@test.rec242.test`, password: 'Mot-de-passe-test-1', prenom: 'Abonnement', nom: 'Test', categorie: 'B', statut: 'actif' } as never,
    })
    crees.members.push(m.id as number)
    expect(estAbonne(m as never)).toBe(false)

    const payer = async (mois?: number) => {
      const p = await payload.create({
        collection: 'payments',
        overrideAccess: true,
        data: { membre: m.id, objet: 'abonnement', montant: 1000, mode: 'especes', statut: 'paye', abonnementMois: mois } as never,
      })
      crees.payments.push(p.id as number)
      return (await payload.findByID({ collection: 'members', id: m.id, overrideAccess: true })) as unknown as { abonnementJusquau?: string }
    }
    const apres1 = await payer(12)
    const attendu1 = nouvelleFin(null, 12)
    expect(Math.abs(new Date(apres1.abonnementJusquau!).getTime() - attendu1.getTime())).toBeLessThan(60_000)
    expect(estAbonne(apres1)).toBe(true)
    // Second paiement (durée en vigueur) : la durée s'ajoute à la fin en cours.
    const apres2 = await payer()
    const attendu2 = nouvelleFin(apres1.abonnementJusquau, 12)
    expect(new Date(apres2.abonnementJusquau!).toISOString()).toBe(attendu2.toISOString())
  })

  it('un membre ne peut pas s’attribuer l’abonnement lui-même', async () => {
    const m = await payload.create({
      collection: 'members',
      overrideAccess: true,
      data: { email: `abonnement2-${unique}@test.rec242.test`, password: 'Mot-de-passe-test-1', prenom: 'Abonnement', nom: 'Test2', categorie: 'B', statut: 'actif' } as never,
    })
    crees.members.push(m.id as number)
    const futur = new Date(Date.now() + 365 * 86400e3).toISOString()
    await payload
      .update({ collection: 'members', id: m.id, user: { ...m, collection: 'members' } as never, overrideAccess: false, data: { abonnementJusquau: futur } as never })
      .catch(() => null)
    const relu = (await payload.findByID({ collection: 'members', id: m.id, overrideAccess: true })) as unknown as { abonnementJusquau?: string | null }
    expect(relu.abonnementJusquau ?? null).toBeNull()
  })
})
