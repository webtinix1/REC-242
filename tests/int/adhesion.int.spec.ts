import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { pdfRecu } from '@/collections/Payments'
import {
  categorie,
  MESSAGE_DOUBLON,
  MESSAGE_SECTEURS,
  montants,
  telephoneInternational,
} from '@/lib/adhesion/categories'
import { situationPaiement } from '@/lib/adhesion/paiement'
import { numeroRecu, prochainNumero } from '@/lib/compteurs'

let payload: Payload
const created: { applications: number[]; payments: number[] } = { applications: [], payments: [] }
const unique = Date.now()

const base = async () => {
  const [loc, sec] = await Promise.all([
    payload.find({ collection: 'localities', limit: 1, overrideAccess: true }),
    payload.find({ collection: 'sectors', limit: 4, overrideAccess: true }),
  ])
  return { localite: loc.docs[0].id, secteurs: sec.docs.map((s) => s.id) }
}

const candidature = async (
  email: string,
  telephone: string,
  extra: Record<string, unknown> = {},
) => {
  const b = await base()
  const d = await payload.create({
    collection: 'applications',
    overrideAccess: true,
    context: { sansEmail: true },
    data: {
      nom: 'Test',
      prenom: 'Intégration',
      email,
      telephone,
      trancheAge: '26-35',
      raisonSociale: 'Entreprise test',
      localite: b.localite,
      description: 'Activité de test',
      secteurs: b.secteurs.slice(0, 1),
      anciennete: '1-3',
      objectifs: ['affaires'],
      categorie: 'B',
      consentement: true,
      acceptationTextes: true,
      ...extra,
    } as never,
  })
  created.applications.push(d.id)
  return d
}

describe('Lot 5 : adhésion', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })
  afterAll(async () => {
    if (created.payments.length)
      await payload.db.deleteMany({
        collection: 'payments',
        where: { id: { in: created.payments } },
      })
    if (created.applications.length)
      await payload.db.deleteMany({
        collection: 'applications',
        where: { id: { in: created.applications } },
      })
  })

  it('normalise e-mail et téléphone, et attribue un numéro de dossier', async () => {
    const d = await candidature(`  Test.${unique}@INT.test `, '06 111 22 33')
    expect(d.email).toBe(`test.${unique}@int.test`)
    expect(d.telephone).toBe('+242061112233')
    expect(d.numero).toBeGreaterThan(0)
    expect(d.statut).toBe('recue')
    expect(telephoneInternational('+242 06 111 22 33')).toBe('+242061112233')
  })

  it('refuse un doublon (même e-mail ou même téléphone) avec le message exact', async () => {
    await expect(candidature(`TEST.${unique}@int.test`, '+242 05 999 99 99')).rejects.toThrow(
      MESSAGE_DOUBLON,
    )
    await expect(candidature(`autre.${unique}@int.test`, '+242 06 111 22 33')).rejects.toThrow(
      MESSAGE_DOUBLON,
    )
  })

  it('une candidature refusée n’empêche pas une nouvelle demande', async () => {
    const d = await candidature(`refus.${unique}@int.test`, '+242 06 222 33 44')
    await payload.update({
      collection: 'applications',
      id: d.id,
      overrideAccess: true,
      data: { statut: 'refusee', motifRefus: 'Test' } as never,
    })
    const n = await candidature(`refus.${unique}@int.test`, '+242 06 222 33 44')
    expect(n.id).not.toBe(d.id)
  })

  it('refuse plus de trois secteurs, et un refus sans motif', async () => {
    const b = await base()
    await expect(
      candidature(`secteurs.${unique}@int.test`, '+242 06 333 44 55', {
        secteurs: b.secteurs.slice(0, 4),
      }),
    ).rejects.toThrow(MESSAGE_SECTEURS)
    const d = await candidature(`motif.${unique}@int.test`, '+242 06 444 55 66')
    await expect(
      payload.update({
        collection: 'applications',
        id: d.id,
        overrideAccess: true,
        data: { statut: 'refusee' } as never,
      }),
    ).rejects.toThrow(/motif/)
  })

  it('numérote les reçus sans trou, seulement à la confirmation du paiement', async () => {
    const d = await candidature(`paiement.${unique}@int.test`, '+242 06 555 66 77')
    const avant = await prochainNumero(payload, 'recu')
    // Le numéro tiré ci-dessus est consommé hors paiement : on le remet pour ne pas créer de trou.
    await payload.db.updateMany({
      collection: 'counters',
      where: { name: { equals: 'recu' } },
      data: { value: avant - 1 },
    })
    const p = await payload.create({
      collection: 'payments',
      overrideAccess: true,
      data: {
        candidature: d.id,
        objet: 'adhesion',
        montant: 90000,
        mode: 'mtn',
        statut: 'en-attente',
      } as never,
    })
    created.payments.push(p.id)
    expect(p.numero ?? null).toBeNull()
    const paye = await payload.update({
      collection: 'payments',
      id: p.id,
      overrideAccess: true,
      data: { statut: 'paye' } as never,
    })
    expect(paye.numero).toBe(avant)
    const recu = await pdfRecu(payload, paye as never)
    expect(recu.nom).toBe(`recu-${numeroRecu(avant)}.pdf`)
    expect(Buffer.from(recu.contenu).subarray(0, 4).toString()).toBe('%PDF')
    // Montant figé une fois le reçu émis.
    const fige = await payload.update({
      collection: 'payments',
      id: p.id,
      overrideAccess: true,
      data: { montant: 1 } as never,
    })
    expect(fige.montant).toBe(90000)
  })

  it('calcule les montants depuis les tarifs, et ne propose aucun montant sur convention', () => {
    const t = { droitB: 15000, cotisationB: 75000, tranchesMax: 2 }
    expect(montants(categorie('B'), t)).toMatchObject({
      total: 90000,
      tranche: 37500,
      premierVersement: 52500,
    })
    expect(montants(categorie('partenaire'), t)).toBeNull()
    expect(montants(categorie('C'), t)).toBeNull()
    expect(situationPaiement({ categorie: 'partenaire' })).toBe('Sur convention')
    expect(
      situationPaiement({ categorie: 'B' }, [{ objet: 'adhesion-tranche', statut: 'paye' }]),
    ).toBe('1re tranche payée')
  })
})
