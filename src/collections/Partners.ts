import type { CollectionConfig } from 'payload'

import { extraFull, isStaff } from '@/access/roles'

/** Partenaires. Seuls les partenaires dont la convention est signée apparaissent sur le site. */
export const Partners: CollectionConfig = {
  slug: 'partners',
  labels: { singular: 'Partenaire', plural: 'Partenaires' },
  admin: {
    components: { beforeList: ['@/components/admin/ContenusTabs#ContenusTabs'] },
    group: 'Contenus',
    useAsTitle: 'nom',
    defaultColumns: ['nom', 'type', 'conventionSignee', 'ordre'],
  },
  defaultSort: 'ordre',
  access: {
    read: ({ req }) => (isStaff(req.user) ? true : { conventionSignee: { equals: true } }),
    create: ({ req }) => extraFull(req.user, 'contenusAnnexes'),
    update: ({ req }) => extraFull(req.user, 'contenusAnnexes'),
    delete: ({ req }) => extraFull(req.user, 'contenusAnnexes'),
  },
  fields: [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'logo', label: 'Logo', type: 'upload', relationTo: 'media' },
    {
      name: 'lien',
      label: 'Site du partenaire',
      type: 'text',
      admin: { description: 'Adresse complète, avec https://' },
    },
    { name: 'type', label: 'Type de partenariat', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' },
    {
      name: 'conventionSignee',
      label: 'Convention signée',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Le partenaire n’apparaît sur le site qu’une fois la convention signée.',
      },
    },
    {
      name: 'ordre',
      label: 'Ordre',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
  ],
}
