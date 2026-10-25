import type { CollectionConfig } from 'payload'

import { extraFull } from '@/access/roles'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: { singular: 'Témoignage', plural: 'Témoignages' },
  admin: {
    components: { beforeList: ['@/components/admin/ContenusTabs#ContenusTabs'] },
    group: 'Contenus',
    useAsTitle: 'personne',
    defaultColumns: ['personne', 'entreprise', 'accordPublication'],
  },
  access: {
    read: ({ req }) => (req.user ? true : { accordPublication: { equals: true } }),
    create: ({ req }) => extraFull(req.user, 'contenusAnnexes'),
    update: ({ req }) => extraFull(req.user, 'contenusAnnexes'),
    delete: ({ req }) => extraFull(req.user, 'contenusAnnexes'),
  },
  fields: [
    { name: 'citation', label: 'Citation', type: 'textarea', required: true },
    { name: 'personne', label: 'Personne', type: 'text', required: true },
    { name: 'entreprise', label: 'Entreprise', type: 'text' },
    { name: 'photo', label: 'Photo', type: 'upload', relationTo: 'media' },
    { name: 'logo', label: 'Logo de l’entreprise', type: 'upload', relationTo: 'media' },
    {
      name: 'accordPublication',
      label: 'Accord de publication',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Obligatoire pour que le témoignage paraisse sur le site.',
      },
    },
  ],
}
