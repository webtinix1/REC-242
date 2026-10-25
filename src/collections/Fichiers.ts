import path from 'path'
import { APIError, type CollectionConfig, type Where } from 'payload'

import { isStaff } from '@/access/roles'

export const TAILLE_MAX_FICHIER = 5 * 1024 * 1024

/**
 * Pièces jointes déposées par les membres (annonces, réponses aux annonces). Stockage hors du dossier public ;
 * Payload sert le fichier en appliquant la lecture ci-dessous :
 * public → tout le monde ; membres → membres actifs ; privé → le déposant et le destinataire (auteur de l'annonce).
 */
export const Fichiers: CollectionConfig = {
  slug: 'fichiers',
  labels: { singular: 'Pièce jointe', plural: 'Pièces jointes' },
  admin: { hidden: true, useAsTitle: 'filename' },
  access: {
    read: ({ req }) => {
      if (isStaff(req.user)) return true
      const ou: Where[] = [{ visibilite: { equals: 'public' } }]
      if ((req.user as { collection?: string } | null)?.collection === 'members') {
        ou.push({ visibilite: { equals: 'membres' } }, { proprietaire: { equals: req.user!.id } }, { destinataire: { equals: req.user!.id } })
      }
      return { or: ou }
    },
    // Créés par le serveur (actions de l'espace membre, accès système) ou par l'équipe.
    create: ({ req }) => isStaff(req.user),
    update: () => false,
    delete: ({ req }) => isStaff(req.user),
  },
  upload: {
    staticDir: path.resolve(process.cwd(), 'private/fichiers'),
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  hooks: {
    beforeOperation: [
      ({ req, operation }) => {
        if (operation === 'create' && req.file && req.file.size > TAILLE_MAX_FICHIER) throw new APIError('Fichier trop lourd : 5 Mo maximum.', 400, null, true)
      },
    ],
  },
  fields: [
    {
      name: 'visibilite',
      label: 'Visible par',
      type: 'select',
      defaultValue: 'prive',
      options: [
        { value: 'public', label: 'Tout le monde' },
        { value: 'membres', label: 'Membres actifs' },
        { value: 'prive', label: 'Déposant et destinataire' },
      ],
    },
    { name: 'proprietaire', label: 'Déposé par', type: 'relationship', relationTo: 'members' },
    { name: 'destinataire', label: 'Destinataire', type: 'relationship', relationTo: 'members' },
  ],
}
