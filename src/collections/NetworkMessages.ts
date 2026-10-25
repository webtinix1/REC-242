import type { CollectionConfig, Where } from 'payload'

import { atLeast } from '@/access/roles'

/** Messages du réseau aux membres (onglet « Messages du réseau » de Mes échanges, lot 10). */
export const NetworkMessages: CollectionConfig = {
  slug: 'networkMessages',
  labels: { singular: 'Message du réseau', plural: 'Messages du réseau' },
  admin: { group: 'Activité', hidden: true, useAsTitle: 'titre' },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => {
      if (atLeast(req.user, 'membres', 'read')) return true
      if ((req.user as { collection?: string } | null)?.collection === 'members')
        return { or: [{ membre: { equals: req.user!.id } }, { tous: { equals: true } }] } as Where
      return false
    },
    create: ({ req }) => atLeast(req.user, 'membres', 'partial'),
    update: ({ req }) => atLeast(req.user, 'membres', 'partial'),
    delete: ({ req }) => atLeast(req.user, 'membres', 'full'),
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'membre', label: 'Membre', type: 'relationship', relationTo: 'members', index: true },
        { name: 'tous', label: 'Pour tous les membres', type: 'checkbox', defaultValue: false },
      ],
    },
    { name: 'titre', label: 'Titre', type: 'text', required: true },
    { name: 'texte', label: 'Texte', type: 'textarea', required: true },
    { name: 'lien', label: 'Lien', type: 'text' },
    { name: 'luPar', label: 'Lu par', type: 'relationship', relationTo: 'members', hasMany: true, admin: { readOnly: true } },
  ],
}
