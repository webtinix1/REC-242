import type { CollectionConfig } from 'payload'

import { extraFull, isStaff } from '@/access/roles'

export const Faq: CollectionConfig = {
  slug: 'faq',
  labels: { singular: 'Question', plural: 'FAQ' },
  admin: {
    components: { beforeList: ['@/components/admin/ContenusTabs#ContenusTabs'] },
    group: 'Contenus',
    useAsTitle: 'question',
    defaultColumns: ['question', 'emplacements', 'ordre', 'visible'],
  },
  defaultSort: 'ordre',
  access: {
    read: ({ req }) => (isStaff(req.user) ? true : { visible: { equals: true } }),
    create: ({ req }) => extraFull(req.user, 'contenusAnnexes'),
    update: ({ req }) => extraFull(req.user, 'contenusAnnexes'),
    delete: ({ req }) => extraFull(req.user, 'contenusAnnexes'),
  },
  fields: [
    { name: 'question', label: 'Question', type: 'text', required: true },
    { name: 'reponse', label: 'Réponse', type: 'textarea', required: true },
    {
      name: 'emplacements',
      label: 'Emplacements',
      type: 'select',
      hasMany: true,
      options: [
        { value: 'accueil', label: 'Accueil' },
        { value: 'adherer', label: 'Adhérer' },
      ],
    },
    {
      name: 'ordre',
      label: 'Ordre',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'visible',
      label: 'Visible',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
