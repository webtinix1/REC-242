import type { CollectionConfig } from 'payload'

import { extraFull, extraRead } from '@/access/roles'
import { slugField } from '@/fields/slug'

/** Commissions thématiques. Les membres et les demandes pour les rejoindre arrivent aux lots 6 et 10. */
export const Commissions: CollectionConfig = {
  slug: 'commissions',
  labels: { singular: 'Commission', plural: 'Commissions' },
  admin: {
    group: 'Activité',
    useAsTitle: 'nom',
    defaultColumns: ['nom', 'responsable', 'ouverture', 'prochaineReunion'],
    description: 'Organes consultatifs créés par le comité de direction (article 17 des statuts).',
  },
  defaultSort: 'ordre',
  access: {
    read: ({ req }) =>
      extraRead(req.user, 'commissions') ? true : { afficheeSurSite: { equals: true } },
    create: ({ req }) => extraFull(req.user, 'commissions'),
    update: ({ req }) => extraFull(req.user, 'commissions'),
    delete: ({ req }) => extraFull(req.user, 'commissions'),
  },
  fields: [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    slugField('nom'),
    { name: 'objet', label: 'Objet', type: 'textarea', required: true },
    { name: 'responsable', label: 'Responsable', type: 'relationship', relationTo: 'people' },
    {
      name: 'ouverture',
      label: 'Ouverture',
      type: 'select',
      required: true,
      defaultValue: 'ouverte',
      options: [
        { value: 'ouverte', label: 'Ouverte aux membres actifs' },
        { value: 'designation', label: 'Sur désignation' },
      ],
    },
    {
      name: 'experts',
      label: 'Experts rattachés',
      type: 'relationship',
      relationTo: 'people',
      hasMany: true,
      filterOptions: { role: { equals: 'expert' } },
    },
    {
      name: 'etiquettes',
      label: 'Étiquettes liées',
      type: 'relationship',
      relationTo: 'expertiseTags',
      hasMany: true,
    },
    {
      name: 'prochaineReunion',
      label: 'Prochaine réunion',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } },
    },
    {
      name: 'afficheeSurSite',
      label: 'Affichée sur le site',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
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
