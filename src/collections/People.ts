import type { CollectionConfig } from 'payload'

import { isStaff, publicExtraAccess } from '@/access/roles'

export const POLES = [
  { value: 'direction', label: 'Direction' },
  { value: 'numerique', label: 'Numérique et données' },
  { value: 'juridique', label: 'Juridique' },
  { value: 'programme', label: 'Programme et relations avec les adhérents' },
  { value: 'communication', label: 'Communication et stratégie' },
  { value: 'relations', label: 'Relations extérieures' },
]

/** Gouvernance et experts (pages Gouvernance, Commissions, écran Experts de l'espace membre). */
export const People: CollectionConfig = {
  slug: 'people',
  labels: { singular: 'Personne', plural: 'Gouvernance et experts' },
  admin: {
    components: { beforeList: ['@/components/admin/ContenusTabs#ContenusTabs'] },
    group: 'Contenus',
    useAsTitle: 'nom',
    defaultColumns: ['nom', 'fonction', 'role', 'pole', 'visible'],
    description:
      'Fondatrice, comité de direction et experts du réseau, avec leurs étiquettes d’expertise.',
  },
  defaultSort: 'ordre',
  access: {
    ...publicExtraAccess('gouvernance'),
    // Un membre connecté ne voit que les fiches visibles, comme le public.
    read: ({ req }) => (isStaff(req.user) ? true : { visible: { equals: true } }),
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'nom', label: 'Nom', type: 'text', required: true },
        {
          name: 'initiales',
          label: 'Initiales',
          type: 'text',
          maxLength: 3,
          admin: { description: 'Affichées sans photo.' },
        },
      ],
    },
    { name: 'photo', label: 'Photo', type: 'upload', relationTo: 'media' },
    { name: 'fonction', label: 'Fonction', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'role',
          label: 'Rôle',
          type: 'select',
          required: true,
          options: [
            { value: 'fondatrice', label: 'Fondatrice' },
            { value: 'comite', label: 'Comité de direction' },
            { value: 'expert', label: 'Expert du réseau' },
          ],
        },
        {
          name: 'pole',
          label: 'Pôle',
          type: 'select',
          options: POLES,
          admin: { condition: (d) => d?.role !== 'expert' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'email',
          label: 'E-mail (questions des membres)',
          type: 'email',
          // Jamais publié : sert à transmettre les questions des membres (lot 10).
          access: { read: ({ req }) => isStaff(req.user) },
          admin: { description: 'Reçoit les questions posées depuis « Solliciter un expert ». Jamais affiché sur le site.' },
        },
        {
          name: 'membre',
          label: 'Membre lié',
          type: 'relationship',
          relationTo: 'members',
          admin: { description: 'Pour un expert qui est aussi membre du réseau.' },
        },
      ],
    },
    {
      name: 'etiquettes',
      label: 'Étiquettes d’expertise',
      type: 'relationship',
      relationTo: 'expertiseTags',
      hasMany: true,
    },
    {
      name: 'ordre',
      label: 'Ordre d’affichage',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'visible',
      label: 'Visible sur le site',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
