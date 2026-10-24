import type { TaskConfig } from 'payload'

/** Publie les actualités programmées dont la date est arrivée (toutes les minutes). */
export const publierProgrammes: TaskConfig<'publierProgrammes'> = {
  slug: 'publierProgrammes',
  label: 'Publication des actualités programmées',
  schedule: [{ cron: '* * * * *', queue: 'minute' }],
  outputSchema: [{ name: 'publiees', type: 'number' }],
  handler: async ({ req }) => {
    const { docs } = await req.payload.find({
      collection: 'news',
      draft: true,
      overrideAccess: true,
      depth: 0,
      limit: 50,
      where: {
        and: [
          { etat: { equals: 'programme' } },
          { datePublication: { less_than_equal: new Date().toISOString() } },
        ],
      },
    })
    for (const d of docs) {
      await req.payload.update({
        collection: 'news',
        id: d.id,
        overrideAccess: true,
        draft: false,
        data: { _status: 'published', etat: 'publie' },
      })
    }
    return { output: { publiees: docs.length } }
  },
}
