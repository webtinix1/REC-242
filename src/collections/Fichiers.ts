import path from 'path'
import { APIError, type CollectionConfig, type PayloadRequest, type Where } from 'payload'

import { atLeast, extraRead, isStaff } from '@/access/roles'

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
      // Pièces jointes des échanges entre membres : équipe des demandes des membres et modération des opportunités seulement.
      if (extraRead(req.user, 'demandesMembres') || atLeast(req.user, 'opportunites', 'read')) return true
      if (isStaff(req.user)) return { visibilite: { equals: 'public' } } as Where
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

/** Une pièce jointe envoyée par un membre doit être l'une des siennes (jamais le fichier privé d'un autre membre). */
export async function verifierPieceDuMembre(req: PayloadRequest, piece: unknown, membreId: number) {
  const id = piece && typeof piece === 'object' ? (piece as { id: number }).id : (piece as number | null | undefined)
  if (!id) return
  const f = (await req.payload.findByID({ collection: 'fichiers', id, depth: 0, overrideAccess: true, req }).catch(() => null)) as unknown as {
    proprietaire?: number | { id: number } | null
  } | null
  const proprietaire = f?.proprietaire && typeof f.proprietaire === 'object' ? f.proprietaire.id : f?.proprietaire
  if (proprietaire !== membreId) throw new APIError('Pièce jointe introuvable.', 400, null, true)
}
