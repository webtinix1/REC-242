import { APIError, type CollectionConfig } from 'payload'

import { atLeast, extraRead } from '@/access/roles'
import { logAction } from '@/lib/audit'

export const FORMATS_ENCART = [
  { value: 'standard', label: 'Insertion standard', reglage: null },
  { value: 'logo', label: 'Encart logo agrandi', reglage: 'encartLogo' },
  { value: 'demi', label: 'Demi-page', reglage: 'encartDemiPage' },
  { value: 'pleine', label: 'Pleine page', reglage: 'encartPleinePage' },
] as const

/**
 * Encarts de l'annuaire imprimé (écran back-office 05, onglet « Import et export »).
 * Le montant est copié depuis Paramètres › Tarifs › Annuaire imprimé à la réservation et ne change plus ensuite.
 */
export const DirectoryAds: CollectionConfig = {
  slug: 'directoryAds',
  labels: { singular: 'Encart de l’annuaire imprimé', plural: 'Encarts de l’annuaire imprimé' },
  admin: { group: 'Adhésions', hidden: true, useAsTitle: 'format' },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) =>
      // Annuaire imprimé et encarts (docs/04, domaines ajoutés) : responsable membres et trésorier, pas le responsable événements.
      extraRead(req.user, 'annuaireImprime')
        ? true
        : (req.user as { collection?: string } | null)?.collection === 'members'
          ? { membre: { equals: req.user!.id } }
          : false,
    create: ({ req }) => atLeast(req.user, 'membres', 'partial'),
    update: ({ req }) => atLeast(req.user, 'membres', 'partial') || atLeast(req.user, 'cotisations', 'full'),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const format = FORMATS_ENCART.find((f) => f.value === (data.format ?? originalDoc?.format))
        if (!format) throw new APIError('Format inconnu.', 400, null, true)
        if (operation === 'create') {
          const s = (await req.payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true, req })) as {
            annuaire?: Record<string, number | string | undefined>
          }
          data.edition = data.edition || s.annuaire?.edition
          if (!data.edition) throw new APIError('Renseignez l’édition en cours dans Paramètres › Tarifs › Annuaire imprimé.', 400, null, true)
          const montant = format.reglage ? s.annuaire?.[format.reglage] : 0
          if (format.reglage && (montant == null || montant === '')) throw new APIError('Tarif de cet encart non renseigné dans les Paramètres.', 400, null, true)
          data.montant = Number(montant ?? 0)
          data.statut = format.reglage ? 'a-payer' : 'inclus'
        } else if (originalDoc && data.format && data.format !== originalDoc.format) {
          throw new APIError('Le format d’un encart réservé ne change pas : annulez-le et réservez-en un autre.', 400, null, true)
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'create' || previousDoc?.statut !== doc.statut)
          await logAction(req.payload, { req, categorie: 'validation', action: `Encart de l’annuaire ${doc.edition} : ${FORMATS_ENCART.find((f) => f.value === doc.format)?.label} (${doc.statut})` })
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'edition', label: 'Édition', type: 'text', index: true, admin: { readOnly: true } },
        { name: 'membre', label: 'Membre', type: 'relationship', relationTo: 'members', required: true, index: true },
        { name: 'format', label: 'Format', type: 'select', required: true, options: FORMATS_ENCART.map((f) => ({ value: f.value, label: f.label })) },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'montant', label: 'Montant (FCFA)', type: 'number', admin: { readOnly: true } },
        { name: 'paiement', label: 'Paiement', type: 'relationship', relationTo: 'payments' },
        {
          name: 'statut',
          label: 'Statut',
          type: 'select',
          defaultValue: 'a-payer',
          options: [
            { value: 'inclus', label: 'Incluse' },
            { value: 'a-payer', label: 'À payer' },
            { value: 'paye', label: 'Payé' },
            { value: 'annule', label: 'Annulé' },
          ],
        },
      ],
    },
  ],
}
