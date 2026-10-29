import path from 'path'
import { APIError, type CollectionConfig } from 'payload'

import { atLeast } from '@/access/roles'

export const TAILLE_MAX_PIECE = 5 * 1024 * 1024

/**
 * Pièces des dossiers d'adhésion (pièces justificatives, bulletin papier scanné).
 * Stockage hors du dossier public ; Payload sert les fichiers par /api/pieces/file/… en appliquant l'accès en lecture.
 */
export const Pieces: CollectionConfig = {
  slug: 'pieces',
  labels: { singular: 'Pièce de dossier', plural: 'Pièces de dossier' },
  admin: { hidden: true, useAsTitle: 'filename' },
  access: {
    // Justificatifs des demandes de modification : lus aussi par le responsable membres (droit complet sur les fiches).
    // Le responsable événements lit les fiches membres mais jamais les pièces d'identité des candidats.
    read: ({ req }) => atLeast(req.user, 'candidatures', 'read') || atLeast(req.user, 'membres', 'partial'),
    // Les pièces envoyées avec une candidature en ligne sont créées par le serveur (accès système).
    create: ({ req }) => atLeast(req.user, 'candidatures', 'partial'),
    update: () => false,
    delete: ({ req }) => atLeast(req.user, 'candidatures', 'full'),
  },
  upload: {
    staticDir: path.resolve(process.cwd(), 'private/pieces'),
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  hooks: {
    beforeOperation: [
      ({ req, operation }) => {
        if (operation === 'create' && req.file && req.file.size > TAILLE_MAX_PIECE)
          throw new APIError('Fichier trop lourd : 5 Mo maximum.', 400, null, true)
      },
    ],
  },
  fields: [
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      defaultValue: 'justificatif',
      options: [
        { value: 'justificatif', label: 'Pièce justificative' },
        { value: 'bulletin', label: 'Bulletin papier scanné' },
      ],
    },
  ],
}
