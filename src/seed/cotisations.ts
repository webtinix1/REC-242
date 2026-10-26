import { randomBytes } from 'crypto'
import type { Payload } from 'payload'

import { creerEcheance, recalculerTranches } from '@/lib/cotisations/service'

/**
 * Lot 11 : échéances de démonstration. Une échéance par membre pour son exercice en cours, à laquelle ses paiements sont rattachés.
 * Les Bretelles de Léon ont reçu leurs trois relances (seed/cotisations-et-paiements.json : « 3 / 3 », perte proposée).
 */
const ligne = <T extends object>(x: T) => ({ id: randomBytes(12).toString('hex'), ...x })
const jours = (n: number) => new Date(Date.now() - n * 86400e3).toISOString()

/** Encarts de l'annuaire imprimé de la maquette (écran 05, onglet Import et export) : deux payés, un à régler. */
async function seedEncarts(payload: Payload): Promise<void> {
  if ((await payload.count({ collection: 'directoryAds', overrideAccess: true })).totalDocs > 0) return
  for (const [numero, format, paye] of [['REC-2026-0014', 'pleine', true], ['REC-2026-0016', 'demi', true], ['REC-2026-0137', 'logo', false]] as const) {
    const m = (await payload.find({ collection: 'members', where: { numeroAdherent: { equals: numero } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
    if (!m) continue
    const a = await payload.create({ collection: 'directoryAds', overrideAccess: true, data: { membre: m.id, format } as never })
    if (paye) await payload.db.updateOne({ collection: 'directoryAds', id: a.id, data: { statut: 'paye' }, returning: false })
  }
}

export async function seedCotisations(payload: Payload): Promise<void> {
  await seedEncarts(payload)
  const membres = await payload.find({ collection: 'members', where: { statut: { in: ['actif', 'suspendu'] } }, limit: 500, depth: 0, overrideAccess: true })
  let n = 0
  for (const m of membres.docs as unknown as { id: number; dateAdhesion?: string; email: string }[]) {
    if (!m.dateAdhesion) continue
    const id = await creerEcheance(payload, m.id, new Date(m.dateAdhesion), true)
    if (!id) continue
    n++
    const paiements = await payload.find({ collection: 'payments', where: { membre: { equals: m.id } }, limit: 100, depth: 0, overrideAccess: true })
    for (const p of paiements.docs) await payload.db.updateOne({ collection: 'payments', id: p.id, data: { echeance: id }, returning: false })
    await recalculerTranches(payload, id)
    if (m.email === 'contact@bretellesdeleon.cg')
      await payload.update({
        collection: 'dues',
        id,
        overrideAccess: true,
        context: { rapprochement: true },
        data: { relances: [ligne({ numero: 1, date: jours(50), canal: 'email' }), ligne({ numero: 2, date: jours(34), canal: 'email' }), ligne({ numero: 3, date: jours(18), canal: 'email' })] } as never,
      })
  }
  payload.logger.info(`Échéances de démonstration : ${n}.`)
}
