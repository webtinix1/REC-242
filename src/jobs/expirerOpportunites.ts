import type { Payload, TaskConfig } from 'payload'

import { finDuJour } from '@/lib/opportunites/regles'

/** Passe en « Expirée » les opportunités publiées dont la date limite est passée (le lendemain de la date limite, heure de Brazzaville). */
export const expirerOpportunites: TaskConfig<'expirerOpportunites'> = {
  slug: 'expirerOpportunites',
  label: 'Expiration des opportunités',
  schedule: [{ cron: '5 * * * *', queue: 'minute' }],
  outputSchema: [{ name: 'expirees', type: 'number' }],
  handler: async ({ req }) => ({ output: { expirees: await expirer(req.payload) } }),
}

export async function expirer(payload: Payload): Promise<number> {
  const r = await payload.find({
    collection: 'opportunities',
    where: { and: [{ statut: { equals: 'publiee' } }, { dateLimite: { less_than: new Date().toISOString() } }] },
    depth: 0,
    limit: 1000,
    overrideAccess: true,
  })
  let n = 0
  for (const o of r.docs as unknown as { id: number; dateLimite: string }[]) {
    if (finDuJour(o.dateLimite) >= new Date()) continue
    await payload.db.updateOne({ collection: 'opportunities', id: o.id, data: { statut: 'expiree' }, returning: false })
    n++
  }
  return n
}
