import { APIError, type CollectionConfig } from 'payload'

import { atLeast } from '@/access/roles'
import { PAGE_BLOCKS } from '@/blocks'
import { slugField } from '@/fields/slug'
import { logAction } from '@/lib/audit'

const server = () => process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/** Pages institutionnelles et légales. L'éditeur prépare en brouillon, seuls les administrateurs publient. */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: {
    components: { beforeList: ['@/components/admin/ContenusTabs#ContenusTabs'] },
    group: 'Contenus',
    useAsTitle: 'title',
    defaultColumns: ['title', '_status', 'updatedAt'],
    description: 'Édition par blocs dans la charte, prévisualisation avant publication.',
    livePreview: { url: ({ data }) => `${server()}/apercu?type=pages&slug=${data?.slug ?? ''}` },
    preview: (doc) => `${server()}/apercu?type=pages&slug=${(doc as { slug?: string }).slug ?? ''}`,
  },
  versions: { drafts: { autosave: { interval: 2000 } }, maxPerDoc: 30 },
  access: {
    read: ({ req }) =>
      atLeast(req.user, 'pages', 'partial') ? true : { _status: { equals: 'published' } },
    create: ({ req }) => atLeast(req.user, 'pages', 'partial'),
    update: ({ req }) => atLeast(req.user, 'pages', 'partial'),
    delete: ({ req }) => atLeast(req.user, 'pages', 'full'),
    readVersions: ({ req }) => atLeast(req.user, 'pages', 'partial'),
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        // Sans _status (enregistrement hors brouillon), la modification d'une page publiée paraîtrait directement.
        if ((data._status ?? originalDoc?._status) === 'published' && req.user && !atLeast(req.user, 'pages', 'full')) {
          throw new APIError(
            'Votre rôle permet de préparer la page en brouillon. La publication est faite par un administrateur.',
            403,
            null,
            true,
          )
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (doc._status === 'published' && previousDoc?._status !== 'published') {
          await logAction(req.payload, {
            req,
            categorie: 'publication',
            action: `A publié la page « ${doc.title} »`,
            cible: doc.slug,
          })
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    slugField('title'),
    {
      name: 'chemin',
      label: 'Adresse sur le site',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Par exemple /le-reseau/antennes. Utilisée par le menu et le plan du site.',
      },
    },
    { name: 'menu', label: 'Rubrique du menu', type: 'text', admin: { position: 'sidebar' } },
    { name: 'layout', label: 'Contenu', type: 'blocks', blocks: PAGE_BLOCKS },
  ],
}
