import { APIError, type CollectionConfig, type PayloadRequest, type Where } from 'payload'

import { atLeast } from '@/access/roles'
import { notify } from '@/emails/send'
import { verifierPieceDuMembre } from '@/collections/Fichiers'
import { logAction } from '@/lib/audit'
import { alerterSecteurs } from '@/lib/opportunites/alertes'
import { coordonneesDetectees, finDuJour, STATUTS_OPPORTUNITE, TYPES_OPPORTUNITE } from '@/lib/opportunites/regles'

type Moi = { id: number; collection?: string } | null | undefined
const estMembre = (u: unknown) => (u as Moi)?.collection === 'members'
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))
const moderateur = (req: PayloadRequest) => atLeast(req.user, 'opportunites', 'partial')
const lienPublications = () => `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/espace-membre/opportunites`
const jourFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Brazzaville' })

/**
 * Opportunités (docs/05-regles-metier.md §8). Une annonce de membre passe toujours par « À modérer » ;
 * seule l'équipe publie, demande une modification ou refuse. Expiration automatique le lendemain de la date limite.
 */
export const Opportunities: CollectionConfig = {
  slug: 'opportunities',
  labels: { singular: 'Opportunité', plural: 'Opportunités' },
  admin: {
    group: 'Activité',
    useAsTitle: 'titre',
    defaultColumns: ['titre', 'type', 'visibilite', 'dateLimite', 'statut'],
    components: { views: { list: { Component: '@/components/admin/opportunites/OpportunitesView#OpportunitesView' } } },
  },
  defaultSort: 'dateLimite',
  access: {
    read: ({ req }) => {
      if (atLeast(req.user, 'opportunites', 'read')) return true
      if (estMembre(req.user)) return { or: [{ statut: { equals: 'publiee' } }, { membre: { equals: req.user!.id } }] } as Where
      return { and: [{ statut: { equals: 'publiee' } }, { visibilite: { equals: 'public' } }] } as Where
    },
    create: ({ req }) => estMembre(req.user) || moderateur(req),
    update: ({ req }) => (moderateur(req) ? true : estMembre(req.user) ? { membre: { equals: req.user!.id } } : false),
    delete: ({ req }) => atLeast(req.user, 'opportunites', 'full'),
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const moi = req.user as Moi
        const fusion = { ...(originalDoc ?? {}), ...data }
        if (estMembre(moi)) {
          const m = (await req.payload.findByID({ collection: 'members', id: moi!.id, depth: 0, overrideAccess: true, req })) as unknown as { statut: string }
          if (m.statut !== 'actif') throw new APIError('Réservé aux membres actifs.', 403)
          if (operation === 'update' && !['brouillon', 'modification', 'expiree', 'a-moderer', 'refusee'].includes(originalDoc?.statut))
            throw new APIError('Une annonce publiée ne se modifie plus : écrivez à l’équipe.', 403, null, true)
          if (data.pieceJointe !== undefined) await verifierPieceDuMembre(req, data.pieceJointe, moi!.id)
          // Le membre ne publie jamais lui-même : toute soumission repart en modération.
          data.membre = moi!.id
          data.auteur = 'membre'
          data.statut = data.statut === 'brouillon' ? 'brouillon' : 'a-moderer'
          data.miseEnAvant = false
          data.prevenirSecteurs = false
          data.messageModeration = operation === 'create' ? undefined : originalDoc?.messageModeration
          data.motifRefus = undefined
        } else if (operation === 'create' && !data.membre) {
          data.auteur = data.auteur || 'rec242'
        }
        const soumise = ['a-moderer', 'publiee'].includes(String(fusion.statut ?? data.statut))
        if (soumise) {
          if (!fusion.dateLimite) throw new APIError('La date limite est obligatoire.', 400, null, true)
          const changeDeStatut = data.statut && data.statut !== originalDoc?.statut
          if ((operation === 'create' || changeDeStatut || data.dateLimite) && finDuJour(String(fusion.dateLimite)) < new Date())
            throw new APIError('La date limite doit être aujourd’hui ou plus tard.', 400, null, true)
          if (fusion.type === 'appel-offres' && !String(fusion.source?.lien ?? '').trim())
            throw new APIError('Un appel d’offres relayé exige le lien de la source officielle.', 400, null, true)
        }
        if (data.miseEnAvant && (fusion.visibilite ?? 'membres') !== 'public') data.miseEnAvant = false
        // Vérification automatique pour la modération.
        data.coordonnees = coordonneesDetectees(fusion.titre, fusion.description, fusion.commentRepondre).join(', ')
        if (!estMembre(moi) && data.statut && data.statut !== originalDoc?.statut) {
          if (data.statut === 'refusee' && !String(data.motifRefus ?? '').trim()) throw new APIError('Indiquez le motif du refus.', 400, null, true)
          if (data.statut === 'modification' && !String(data.messageModeration ?? '').trim())
            throw new APIError('Écrivez le message envoyé au membre.', 400, null, true)
          if (data.statut === 'publiee') data.publieLe = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (previousDoc?.statut === doc.statut || estMembre(req.user)) return doc
        const membre = idDe(doc.membre)
        if (membre && ['publiee', 'modification', 'refusee'].includes(doc.statut) && !req.context?.sansEmail) {
          const m = (await req.payload.findByID({ collection: 'members', id: membre, depth: 0, overrideAccess: true, req })) as unknown as { email: string }
          const decision = doc.statut === 'publiee' ? 'publiée' : doc.statut === 'refusee' ? 'refusée' : 'modification demandée'
          const texte =
            doc.statut === 'publiee'
              ? `Publiée : visible par ${doc.visibilite === 'public' ? 'tous les visiteurs' : 'les membres actifs'} jusqu’au ${jourFr(doc.dateLimite)}.`
              : doc.statut === 'refusee'
                ? `Refusée : ${doc.motifRefus}.`
                : `Modification demandée : ${doc.messageModeration}.`
          await notify(req.payload, { to: m.email, template: 'decisionModeration', vars: { annonce: doc.titre, decision, texte_decision: texte, lien: lienPublications() } })
        }
        if (doc.statut === 'publiee' && doc.prevenirSecteurs && !doc.alerteEnvoyee) {
          await alerterSecteurs(req.payload, doc, req)
          await req.payload.db.updateOne({ collection: 'opportunities', id: doc.id, data: { alerteEnvoyee: true }, req, returning: false })
        }
        if (['publiee', 'refusee', 'modification'].includes(doc.statut))
          await logAction(req.payload, { req, categorie: 'publication', action: `Opportunité « ${doc.titre} » : ${STATUTS_OPPORTUNITE.find((s) => s.value === doc.statut)?.label}` })
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'type', label: 'Type', type: 'select', required: true, options: [...TYPES_OPPORTUNITE] },
        {
          name: 'visibilite',
          label: 'Visibilité',
          type: 'select',
          defaultValue: 'membres',
          options: [
            { value: 'public', label: 'Public' },
            { value: 'membres', label: 'Membres actifs' },
          ],
        },
        { name: 'dateLimite', label: 'Date limite', type: 'date', index: true, admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' }, description: 'Obligatoire. L’annonce passe en « Expirée » le lendemain.' } },
      ],
    },
    { name: 'titre', label: 'Titre', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'secteurs', label: 'Secteurs', type: 'relationship', relationTo: 'sectors', hasMany: true },
    {
      name: 'source',
      label: 'Source officielle',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'lien', label: 'Lien', type: 'text', admin: { description: 'Obligatoire pour un appel d’offres relayé.' } },
            { name: 'libelle', label: 'Libellé (par exemple « Avis officiel, réf. AO-2026-118 »)', type: 'text' },
          ],
        },
      ],
    },
    { name: 'commentRepondre', label: 'Comment répondre', type: 'textarea' },
    { name: 'image', label: 'Photo de la carte', type: 'upload', relationTo: 'media' },
    { name: 'pieceJointe', label: 'Pièce jointe', type: 'upload', relationTo: 'fichiers' },
    {
      type: 'row',
      fields: [
        {
          name: 'auteur',
          label: 'Auteur',
          type: 'select',
          defaultValue: 'rec242',
          options: [
            { value: 'rec242', label: 'REC 242' },
            { value: 'membre', label: 'Membre' },
          ],
        },
        { name: 'membre', label: 'Membre auteur', type: 'relationship', relationTo: 'members', index: true },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'prevenirSecteurs', label: 'Prévenir les membres des secteurs concernés', type: 'checkbox', defaultValue: false },
        { name: 'miseEnAvant', label: 'Mettre en avant sur l’accueil (public seulement)', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'rang',
      label: 'Rang dans les listes du site',
      type: 'number',
      min: 1,
      admin: { position: 'sidebar', description: 'Facultatif. Les opportunités avec un rang passent en premier, dans l’ordre croissant ; les autres suivent par date.' },
    },
    { name: 'reponses', label: 'Réponses', type: 'join', collection: 'opportunityReplies', on: 'opportunite' },
    { name: 'statut', label: 'Statut', type: 'select', defaultValue: 'brouillon', index: true, options: [...STATUTS_OPPORTUNITE], admin: { position: 'sidebar' } },
    { name: 'messageModeration', label: 'Message au membre (modification demandée)', type: 'textarea', admin: { position: 'sidebar' } },
    { name: 'motifRefus', label: 'Motif du refus', type: 'textarea', admin: { position: 'sidebar' } },
    { name: 'coordonnees', label: 'Coordonnées détectées', type: 'text', admin: { position: 'sidebar', readOnly: true } },
    { name: 'publieLe', label: 'Publiée le', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    { name: 'alerteEnvoyee', type: 'checkbox', defaultValue: false, admin: { hidden: true } },
  ],
}
