import type { Payload, TaskConfig } from 'payload'

/**
 * Passe en « Sans réponse » les questions aux experts restées sans réponse après 5 jours ouvrés (échéance dépassée).
 * Le back-office les voit en rouge et peut relancer, réattribuer ou répondre au nom de REC 242.
 */
export const demandesSansReponse: TaskConfig<'demandesSansReponse'> = {
  slug: 'demandesSansReponse',
  label: 'Questions aux experts sans réponse',
  schedule: [{ cron: '10 * * * *', queue: 'minute' }],
  outputSchema: [{ name: 'signalees', type: 'number' }],
  handler: async ({ req }) => ({ output: { signalees: await signalerSansReponse(req.payload) } }),
}

export async function signalerSansReponse(payload: Payload): Promise<number> {
  const r = await payload.find({
    collection: 'expertRequests',
    where: { and: [{ statut: { in: ['envoyee', 'en-cours', 'reattribuee'] } }, { echeance: { less_than: new Date().toISOString() } }] },
    depth: 0,
    limit: 1000,
    overrideAccess: true,
  })
  for (const d of r.docs) await payload.db.updateOne({ collection: 'expertRequests', id: d.id, data: { statut: 'sans-reponse' }, returning: false })
  return r.docs.length
}
