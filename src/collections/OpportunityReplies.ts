import { APIError, type CollectionConfig, type Where } from 'payload'

import { atLeast } from '@/access/roles'
import { notify } from '@/emails/send'

type Moi = { id: number; collection?: string } | null | undefined
const estMembre = (u: unknown) => (u as Moi)?.collection === 'members'
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))

/**
 * Réponses aux annonces de membres (écran membre 05, « Répondre »). Elles arrivent dans « Mes échanges » de l'auteur
 * (lot 10) ; l'auteur est prévenu par l'e-mail 16. Un membre lit ses réponses et celles reçues sur ses annonces.
 */
export const OpportunityReplies: CollectionConfig = {
  slug: 'opportunityReplies',
  labels: { singular: 'Réponse à une annonce', plural: 'Réponses aux annonces' },
  admin: { group: 'Activité', hidden: true },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => {
      if (atLeast(req.user, 'opportunites', 'read')) return true
      if (estMembre(req.user)) return { or: [{ membre: { equals: req.user!.id } }, { 'opportunite.membre': { equals: req.user!.id } }] } as Where
      return false
    },
    create: ({ req }) => estMembre(req.user),
    // L'auteur de l'annonce marque la réponse comme lue (champ « lue » seulement).
    update: ({ req }) => (atLeast(req.user, 'opportunites', 'partial') ? true : estMembre(req.user) ? ({ 'opportunite.membre': { equals: req.user!.id } } as Where) : false),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const moi = req.user as Moi
        if (operation === 'create') {
          const o = (await req.payload.findByID({ collection: 'opportunities', id: idDe(data.opportunite) as number, depth: 0, overrideAccess: true, req }).catch(() => null)) as unknown as {
            statut: string
            membre?: number
            type: string
          } | null
          if (!o || o.statut !== 'publiee' || !o.membre) throw new APIError('Cette annonce ne reçoit pas de réponse.', 400, null, true)
          if (o.membre === moi?.id) throw new APIError('Vous ne pouvez pas répondre à votre propre annonce.', 400, null, true)
          const m = (await req.payload.findByID({ collection: 'members', id: moi!.id, depth: 0, overrideAccess: true, req })) as unknown as { statut: string }
          if (m.statut !== 'actif') throw new APIError('Réservé aux membres actifs.', 403)
          const message = String(data.message ?? '').trim()
          if (message.length < 10) throw new APIError('Écrivez votre réponse (10 caractères au moins).', 400, null, true)
          return { ...data, membre: moi!.id, message: message.slice(0, 3000), lue: false }
        }
        if (estMembre(moi)) return { ...originalDoc, lue: Boolean(data.lue) }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        const o = (await req.payload.findByID({ collection: 'opportunities', id: idDe(doc.opportunite) as number, depth: 1, overrideAccess: true, req })) as unknown as {
          titre: string
          membre?: { email?: string } | null
        }
        const m = (await req.payload.findByID({ collection: 'members', id: idDe(doc.membre) as number, depth: 0, overrideAccess: true, req })) as unknown as {
          prenom?: string
          nom?: string
        }
        if (o.membre?.email)
          await notify(req.payload, {
            to: o.membre.email,
            template: 'reponseAnnonce',
            vars: { annonce: o.titre, membre: `${m.prenom ?? ''} ${m.nom ?? ''}`.trim(), lien: `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/espace-membre/echanges` },
          })
        return doc
      },
    ],
  },
  fields: [
    { name: 'opportunite', label: 'Annonce', type: 'relationship', relationTo: 'opportunities', required: true, index: true },
    { name: 'membre', label: 'Membre qui répond', type: 'relationship', relationTo: 'members', index: true },
    { name: 'message', label: 'Message', type: 'textarea', required: true },
    { name: 'pieceJointe', label: 'Pièce jointe', type: 'upload', relationTo: 'fichiers' },
    { name: 'lue', label: 'Lue', type: 'checkbox', defaultValue: false },
  ],
}
