import type { CollectionConfig } from 'payload'

import { isStaff } from '@/access/roles'

/**
 * Médiathèque. Les images sont converties en WebP et déclinées en trois tailles à l'import.
 * Les documents réservés (PDF) sont dans la collection « documents », pas ici.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Média', plural: 'Médias' },
  admin: {
    components: { beforeList: ['@/components/admin/ContenusTabs#ContenusTabs'] },
    group: 'Contenus',
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'credits', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req }) => isStaff(req.user),
    update: ({ req }) => isStaff(req.user),
    delete: ({ req }) => isStaff(req.user),
  },
  upload: {
    mimeTypes: ['image/*'],
    formatOptions: { format: 'webp', options: { quality: 80 } },
    resizeOptions: { width: 2400, withoutEnlargement: true },
    imageSizes: [
      { name: 'vignette', width: 400, formatOptions: { format: 'webp', options: { quality: 78 } } },
      { name: 'carte', width: 800, formatOptions: { format: 'webp', options: { quality: 78 } } },
      { name: 'grande', width: 1600, formatOptions: { format: 'webp', options: { quality: 80 } } },
    ],
    adminThumbnail: 'vignette',
    focalPoint: true,
  },
  fields: [
    {
      name: 'alt',
      label: 'Texte alternatif',
      type: 'text',
      required: true,
      admin: {
        description:
          'Décrit l’image pour les personnes qui ne la voient pas. Obligatoire pour publier.',
      },
    },
    { name: 'credits', label: 'Crédits', type: 'text' },
    {
      name: 'illustration',
      label: 'Photo d’illustration',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Cochée pour les photos de démonstration, à remplacer par de vraies photos de REC 242.',
      },
    },
  ],
}
