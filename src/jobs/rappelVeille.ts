import type { TaskConfig } from 'payload'

import { notify } from '@/emails/send'
import { lienBillet } from '@/lib/evenements/billets'
import { emailDe, heureFr, lieuDe, type Evenement, type Inscription } from '@/lib/evenements/notifications'

/**
 * E-mail 8 « C'est demain » : envoyé une fois à chaque inscrit des événements qui commencent dans les 24 à 36 heures
 * et dont le rappel est activé. Tourne toutes les heures ; la case `rappelEnvoye` évite tout doublon.
 */
export const rappelVeille: TaskConfig<'rappelVeille'> = {
  slug: 'rappelVeille',
  label: 'Rappel la veille des événements',
  schedule: [{ cron: '0 * * * *', queue: 'minute' }],
  outputSchema: [{ name: 'envoyes', type: 'number' }],
  handler: async ({ req }) => {
    const { payload } = req
    const maintenant = Date.now()
    const evs = await payload.find({
      collection: 'events',
      where: {
        and: [
          { statut: { in: ['publie', 'complet'] } },
          { rappelVeille: { equals: true } },
          { debut: { greater_than: new Date(maintenant + 12 * 3600e3).toISOString() } },
          { debut: { less_than: new Date(maintenant + 36 * 3600e3).toISOString() } },
        ],
      },
      depth: 1,
      limit: 100,
      overrideAccess: true,
    })
    let envoyes = 0
    for (const e of evs.docs as unknown as (Evenement & { indicationsAcces?: string })[]) {
      const r = await payload.find({
        collection: 'registrations',
        where: { and: [{ evenement: { equals: e.id } }, { statut: { equals: 'inscrit' } }, { rappelEnvoye: { not_equals: true } }] },
        depth: 0,
        limit: 5000,
        overrideAccess: true,
      })
      for (const i of r.docs as unknown as Inscription[]) {
        const to = await emailDe(payload, i)
        if (to)
          await notify(payload, {
            to,
            template: 'rappelVeille',
            vars: { evenement: e.titre, heure: heureFr(e.debut), lieu: lieuDe(e), indications_acces: e.indicationsAcces ?? '', lien_billet: lienBillet(i.id) },
          })
        await payload.db.updateOne({ collection: 'registrations', id: i.id, data: { rappelEnvoye: true }, returning: false })
        envoyes++
      }
    }
    return { output: { envoyes } }
  },
}
