import { APIError, type CollectionConfig } from 'payload'

import { atLeast } from '@/access/roles'
import { notify } from '@/emails/send'
import { logAction } from '@/lib/audit'
import { appliquerModification, valeurActuelle } from '@/lib/membres/modifications'
import { CHAMPS_DEMANDE, champLabel, type ChampVerifie } from '@/lib/membres/options'

const estMembre = (u: unknown) => (u as { collection?: string } | null)?.collection === 'members'

/** Demandes de modification des champs vérifiés (écran membre 03, écran back-office 05). */
export const ModificationRequests: CollectionConfig = {
  slug: 'modificationRequests',
  labels: { singular: 'Demande de modification', plural: 'Demandes de modification' },
  admin: { group: 'Adhésions', hidden: true },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => (atLeast(req.user, 'membres', 'read') ? true : estMembre(req.user) ? { membre: { equals: req.user!.id } } : false),
    create: ({ req }) => estMembre(req.user) || atLeast(req.user, 'membres', 'partial'),
    // Seul le responsable membres (ou l'administration) traite une demande.
    update: ({ req }) => atLeast(req.user, 'membres', 'partial'),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (operation === 'create') {
          if (estMembre(req.user)) data.membre = req.user!.id
          if (!data.membre) throw new APIError('Membre manquant.', 400)
          if (!CHAMPS_DEMANDE.some((c) => c.value === data.champ)) throw new APIError('Champ inconnu.', 400, null, true)
          if (!String(data.nouvelleValeur ?? '').trim()) throw new APIError('Indiquez la nouvelle valeur.', 400, null, true)
          // La valeur actuelle est relue sur la fiche, jamais prise de la demande.
          data.valeurActuelle = await valeurActuelle(req.payload, data.membre, data.champ as ChampVerifie, req)
          data.statut = 'attente'
          return data
        }
        if (originalDoc?.statut !== 'attente' && data.statut && data.statut !== originalDoc?.statut)
          throw new APIError('Cette demande a déjà été traitée.', 400, null, true)
        if (data.statut === 'refusee' && !String(data.motifRefus ?? '').trim())
          throw new APIError('Indiquez le motif du refus.', 400, null, true)
        if (data.statut === 'validee' && originalDoc?.statut === 'attente') {
          await appliquerModification(
            req.payload,
            { membre: typeof originalDoc.membre === 'object' ? originalDoc.membre.id : originalDoc.membre, champ: originalDoc.champ, nouvelleValeur: originalDoc.nouvelleValeur },
            req,
          )
        }
        if (data.statut && data.statut !== originalDoc?.statut) {
          data.traitePar = req.user?.id
          data.traiteParNom = (req.user as { name?: string } | null)?.name
          data.dateTraitement = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || previousDoc?.statut === doc.statut) return doc
        const m = (await req.payload.findByID({ collection: 'members', id: typeof doc.membre === 'object' ? doc.membre.id : doc.membre, depth: 0, overrideAccess: true, req })) as unknown as {
          email: string
          prenom?: string
          numeroAdherent?: string
        }
        await logAction(req.payload, { req, categorie: 'validation', action: `Demande de modification (${champLabel(doc.champ)}) ${doc.statut === 'validee' ? 'validée' : 'refusée'}`, cible: m.numeroAdherent })
        await notify(req.payload, {
          to: m.email,
          template: 'demandeModificationTraitee',
          vars: {
            champ: champLabel(doc.champ).toLowerCase(),
            // Textes de docs/09-emails-et-notifications.md, modèle 18.
            texte_decision:
              doc.statut === 'validee'
                ? `Validée : ${champLabel(doc.champ).toLowerCase()} est maintenant « ${doc.nouvelleValeur} ».`
                : `Refusée : ${doc.motifRefus}.`,
          },
        })
        return doc
      },
    ],
  },
  fields: [
    { name: 'membre', label: 'Membre', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'champ', label: 'Champ', type: 'select', required: true, options: [...CHAMPS_DEMANDE] },
    { name: 'valeurActuelle', label: 'Valeur actuelle', type: 'text', admin: { readOnly: true } },
    { name: 'nouvelleValeur', label: 'Nouvelle valeur', type: 'text', required: true },
    { name: 'motif', label: 'Motif', type: 'text' },
    { name: 'justificatif', label: 'Justificatif', type: 'upload', relationTo: 'pieces' },
    {
      name: 'statut',
      label: 'Statut',
      type: 'select',
      defaultValue: 'attente',
      index: true,
      options: [
        { value: 'attente', label: 'En attente' },
        { value: 'validee', label: 'Validée' },
        { value: 'refusee', label: 'Refusée' },
      ],
    },
    { name: 'motifRefus', label: 'Motif du refus', type: 'text' },
    { name: 'traitePar', label: 'Traitée par', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'traiteParNom', type: 'text', admin: { hidden: true } },
    { name: 'dateTraitement', label: 'Traitée le', type: 'date', admin: { readOnly: true } },
  ],
}
