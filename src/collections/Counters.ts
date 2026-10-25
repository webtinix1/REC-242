import type { CollectionConfig } from 'payload'

import { hasRole } from '@/access/roles'

/** Compteurs de numérotation sans trou (src/lib/compteurs.ts). Jamais modifiés à la main. */
export const Counters: CollectionConfig = {
  slug: 'counters',
  labels: { singular: 'Compteur', plural: 'Compteurs' },
  admin: { hidden: true, useAsTitle: 'name' },
  access: {
    read: ({ req }) => hasRole(req.user, 'superadmin'),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'name', label: 'Nom', type: 'text', required: true, unique: true },
    { name: 'value', label: 'Dernier numéro', type: 'number', required: true, defaultValue: 0 },
  ],
}
