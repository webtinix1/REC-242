import { APIError, type CollectionConfig, type Where } from 'payload'

import { atLeast, hasRole, levelFor, reservedFieldRead } from '@/access/roles'
import { NEWS_BLOCKS } from '@/blocks'
import { slugField } from '@/fields/slug'
import { logAction } from '@/lib/audit'

const server = () => process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export const NEWS_TYPES = [
  { value: 'article', label: 'Article' },
  { value: 'communique', label: 'Communiqué' },
  { value: 'interview', label: 'Interview' },
  { value: 'annonce', label: 'Annonce' },
  { value: 'retour', label: 'Retour sur événement' },
]

/**
 * Actualités : brouillon, relecture, programmation, publication, archivage.
 * Le responsable événements (droits partiels) rédige des « Retours sur événement » en brouillon seulement.
 */
export const News: CollectionConfig = {
  slug: 'news',
  labels: { singular: 'Actualité', plural: 'Actualités' },
  admin: {
    group: 'Contenus',
    useAsTitle: 'titre',
    defaultColumns: ['titre', 'type', 'auteur', 'datePublication', 'etat'],
    description: 'Brouillon, relecture, programmation et archivage.',
    livePreview: { url: ({ data }) => `${server()}/apercu?type=news&slug=${data?.slug ?? ''}` },
    preview: (doc) => `${server()}/apercu?type=news&slug=${(doc as { slug?: string }).slug ?? ''}`,
  },
  defaultSort: '-datePublication',
  versions: { drafts: { autosave: { interval: 2000 } }, maxPerDoc: 30 },
  access: {
    // Le site lit les actualités publiées ; le contrôle « réservé aux membres » se fait à l'affichage (chapeau seul pour un visiteur).
    read: ({ req }) =>
      atLeast(req.user, 'actualites', 'partial')
        ? true
        : ({
            and: [{ _status: { equals: 'published' } }, { etat: { not_equals: 'archive' } }],
          } as Where),
    create: ({ req }) => atLeast(req.user, 'actualites', 'partial'),
    update: ({ req }) => {
      if (atLeast(req.user, 'actualites', 'full')) return true
      if (levelFor(req.user, 'actualites') === 'partial')
        return { auteur: { equals: req.user!.id } }
      return false
    },
    delete: ({ req }) => hasRole(req.user, 'superadmin', 'admin'),
    readVersions: ({ req }) => atLeast(req.user, 'actualites', 'partial'),
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user?.collection === 'users' && !data.auteur)
          data.auteur = req.user.id
        if (levelFor(req.user, 'actualites') === 'partial') {
          if (data.type && data.type !== 'retour')
            throw new APIError(
              'Votre rôle permet de rédiger des retours sur événement.',
              403,
              null,
              true,
            )
          if (data._status === 'published')
            throw new APIError(
              'Votre rôle permet de préparer l’actualité en brouillon. Un éditeur la publie.',
              403,
              null,
              true,
            )
        }
        if (data.etat === 'programme') {
          if (!data.datePublication || new Date(data.datePublication) <= new Date()) {
            throw new APIError(
              'Pour programmer, choisissez une date de publication à venir.',
              400,
              null,
              true,
            )
          }
          if (levelFor(req.user, 'actualites') !== 'full' && req.user?.collection === 'users') {
            throw new APIError(
              'Seul un éditeur ou un administrateur peut programmer une publication.',
              403,
              null,
              true,
            )
          }
          data._status = 'draft'
        }
        if (data._status === 'published' && data.etat !== 'archive') data.etat = 'publie'
        if (data._status === 'published' && !data.datePublication)
          data.datePublication = new Date().toISOString()
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (doc._status === 'published' && previousDoc?._status !== 'published') {
          await logAction(req.payload, {
            req,
            categorie: 'publication',
            action: `A publié « ${doc.titre} »`,
            cible: doc.slug,
          })
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'titre', label: 'Titre', type: 'text', required: true },
    slugField('titre'),
    {
      name: 'chapeau',
      label: 'Chapeau',
      type: 'textarea',
      required: true,
      admin: { description: 'Visible par tous, même quand l’actualité est réservée aux membres.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'image',
          label: 'Image principale',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Le texte alternatif de l’image est obligatoire.' },
        },
      ],
    },
    // Réservé aux membres : le corps, les blocs et le PDF ne sont lus que par l'équipe et les membres actifs.
    {
      name: 'corps',
      label: 'Corps de l’article',
      type: 'richText',
      access: { read: reservedFieldRead },
    },
    {
      name: 'blocs',
      label: 'Blocs complémentaires',
      type: 'blocks',
      blocks: NEWS_BLOCKS,
      access: { read: reservedFieldRead },
    },
    {
      name: 'pdf',
      label: 'PDF (communiqué)',
      type: 'relationship',
      relationTo: 'documents',
      access: { read: reservedFieldRead },
      admin: { condition: (d) => d?.type === 'communique' },
    },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      defaultValue: 'article',
      options: NEWS_TYPES,
      admin: { position: 'sidebar' },
    },
    {
      name: 'secteurs',
      label: 'Secteurs',
      type: 'relationship',
      relationTo: 'sectors',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'etiquettes',
      label: 'Tags',
      type: 'text',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'datePublication',
      label: 'Date de publication',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, HH:mm' },
      },
    },
    {
      name: 'rang',
      label: 'Rang dans les listes du site',
      type: 'number',
      min: 1,
      admin: { position: 'sidebar', description: 'Facultatif. Les actualités avec un rang passent en premier, dans l’ordre croissant ; les autres suivent par date.' },
    },
    {
      name: 'aLaUne',
      label: 'À la une de la page Actualités',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Sans actualité à la une, la plus récente est mise en avant.' },
    },
    {
      name: 'reserveMembres',
      label: 'Réservé aux membres (le visiteur voit le chapeau)',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'etat',
      label: 'Statut',
      type: 'select',
      defaultValue: 'brouillon',
      options: [
        { value: 'brouillon', label: 'Brouillon' },
        { value: 'relecture', label: 'En relecture' },
        { value: 'programme', label: 'Programmé' },
        { value: 'publie', label: 'Publié' },
        { value: 'archive', label: 'Archivé' },
      ],
      admin: {
        position: 'sidebar',
        description:
          '« En relecture » signale l’article à un éditeur. « Programmé » le publie automatiquement à la date de publication. « Archivé » le retire du site sans le supprimer.',
        components: { Cell: '@/components/admin/NewsStatusCell#NewsStatusCell' },
      },
    },
    {
      name: 'auteur',
      label: 'Auteur',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'signature',
      label: 'Signature affichée',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Par exemple « la Communication ». Affichée après la date : « par … ».',
      },
    },
    {
      name: 'aLireAussi',
      label: 'À lire aussi',
      type: 'relationship',
      relationTo: ['news', 'pages'],
      admin: { description: 'Actualité ou page proposée en fin d’article.' },
    },
    {
      name: 'aLireAussiTitre',
      label: 'Intitulé affiché pour « À lire aussi »',
      type: 'text',
      admin: { description: 'Facultatif. Remplace le titre de la page ou de l’actualité liée dans le bloc de fin d’article.' },
    },
  ],
}
