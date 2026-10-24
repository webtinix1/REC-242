import type { CollectionConfig } from 'payload'

import { isStaff } from '@/access/roles'

/** Médiathèque. Le détail (visibilité, crédits, formats WebP) est complété au lot 2. */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Média', plural: 'Médias' },
  admin: { group: 'Contenus' },
  access: {
    read: () => true,
    create: ({ req }) => isStaff(req.user),
    update: ({ req }) => isStaff(req.user),
    delete: ({ req }) => isStaff(req.user),
  },
  fields: [
    {
      name: 'alt',
      label: 'Texte alternatif',
      type: 'text',
      required: true,
      admin: { description: 'Décrit l’image pour les personnes qui ne la voient pas. Obligatoire.' },
    },
  ],
  upload: true,
}
