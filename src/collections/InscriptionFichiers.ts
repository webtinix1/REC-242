import path from 'path'
import type { CollectionConfig } from 'payload'

import { atLeast } from '@/access/roles'

/**
 * Fichiers joints aux réponses du formulaire d'inscription d'un événement. Stockage hors du dossier public ; Payload sert
 * le fichier en appliquant la lecture ci-dessous : seule l'équipe qui suit les événements y a accès.
 * Créés par le serveur seulement (action d'inscription, format vérifié dans les octets du fichier).
 */
export const InscriptionFichiers: CollectionConfig = {
  slug: 'inscriptionFichiers',
  labels: { singular: 'Fichier d’inscription', plural: 'Fichiers d’inscription' },
  admin: { hidden: true, useAsTitle: 'filename' },
  access: {
    read: ({ req }) => atLeast(req.user, 'evenements', 'read'),
    create: () => false,
    update: () => false,
    delete: ({ req }) => atLeast(req.user, 'evenements', 'full'),
  },
  upload: {
    staticDir: path.resolve(process.cwd(), 'private/inscriptions'),
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  fields: [],
}
