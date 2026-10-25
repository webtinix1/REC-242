import { randomBytes } from 'crypto'
import type { Payload } from 'payload'

import { creerEcheance, recalculerTranches } from '@/lib/cotisations/service'

/**
 * Lot 11 : échéances de démonstration. Une échéance par membre pour son exercice en cours, à laquelle ses paiements sont rattachés.
 * Les Bretelles de Léon ont reçu leurs trois relances (seed/cotisations-et-paiements.json : « 3 / 3 », perte proposée).
 */
const ligne = <T extends object>(x: T) => ({ id: randomBytes(12).toString('hex'), ...x })
const jours = (n: number) => new Date(Date.now() - n * 86400e3).toISOString()

export async function seedCotisations(payload: Payload): Promise<void> {
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
