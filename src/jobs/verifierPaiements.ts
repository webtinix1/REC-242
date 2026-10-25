import type { TaskConfig } from 'payload'

import { verifierPaiementsEnAttente } from '@/lib/paiements/service'

/** Relit auprès des opérateurs les paiements mobiles en attente (toutes les minutes), si le rappel n'est pas arrivé. */
export const verifierPaiements: TaskConfig<'verifierPaiements'> = {
  slug: 'verifierPaiements',
  label: 'Vérification des paiements mobiles en attente',
  schedule: [{ cron: '* * * * *', queue: 'minute' }],
  outputSchema: [{ name: 'traites', type: 'number' }],
  handler: async ({ req }) => ({
    output: { traites: await verifierPaiementsEnAttente(req.payload) },
  }),
}
