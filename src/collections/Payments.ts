import { APIError, type CollectionConfig, type Payload, type PayloadRequest } from 'payload'

import { atLeast, isStaff } from '@/access/roles'
import { notify } from '@/emails/send'
import { MODES_PAIEMENT, modeLabel, OBJETS_PAIEMENT, objetLabel } from '@/lib/adhesion/paiement'
import { logAction } from '@/lib/audit'
import { numeroDossierCandidat, numeroRecu, prochainNumero } from '@/lib/compteurs'
import { genererRecu } from '@/lib/paiements/recu'

type Paiement = {
  id: number
  numero?: number | null
  statut: string
  objet: string
  montant: number
  mode: string
  referenceOperateur?: string
  datePaiement?: string
  createdAt?: string
  candidature?:
    | number
    | {
        id: number
        numero?: number
        prenom?: string
        nom?: string
        raisonSociale?: string
        email?: string
        createdAt?: string
      }
    | null
}

const lire = (req: PayloadRequest) =>
  atLeast(req.user, 'cotisations', 'read') || atLeast(req.user, 'candidatures', 'read')

const dateFr = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Africa/Brazzaville',
      })
    : ''

/** PDF du reçu d'un paiement payé (ou remboursé), à partir des données enregistrées. */
export async function pdfRecu(
  payload: Payload,
  p: Paiement,
  req?: PayloadRequest,
): Promise<{ nom: string; contenu: Uint8Array }> {
  const full = (await payload.findByID({
    collection: 'payments',
    id: p.id,
    depth: 1,
    overrideAccess: true,
    req,
  })) as unknown as Paiement
  const c = typeof full.candidature === 'object' ? full.candidature : null
  const s = (await payload.findGlobal({
    slug: 'settings',
    depth: 0,
    overrideAccess: true,
    req,
  })) as {
    adresse?: string
    email?: string
    whatsapp?: { numero?: string }
  }
  const numero = numeroRecu(full.numero)
  const contenu = await genererRecu({
    numero,
    date: dateFr(full.datePaiement ?? full.createdAt),
    payeur: c ? `${c.prenom ?? ''} ${c.nom ?? ''}`.trim() : '',
    entreprise: c?.raisonSociale,
    reference: c ? `Dossier ${numeroDossierCandidat(c.numero, c.createdAt)}` : undefined,
    objet: objetLabel(full.objet),
    montant: full.montant,
    mode: modeLabel(full.mode),
    referenceOperateur: full.referenceOperateur,
    adresse: s.adresse,
    email: s.email,
    whatsapp: s.whatsapp?.numero,
  })
  return { nom: `recu-${numero}.pdf`, contenu }
}

/** Paiements et reçus (écran back-office 12 au lot 11 ; paiement de la candidature au lot 5). */
export const Payments: CollectionConfig = {
  slug: 'payments',
  labels: { singular: 'Paiement', plural: 'Paiements' },
  admin: {
    group: 'Adhésions',
    useAsTitle: 'numero',
    defaultColumns: ['numero', 'objet', 'montant', 'mode', 'statut', 'datePaiement'],
    // Les paiements se consultent depuis le dossier (écran 04) ; l'écran Cotisations (lot 11) les regroupe.
    hidden: true,
  },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => lire(req),
    // Paiement au siège ou par virement : enregistré par le trésorier. Les paiements mobiles sont créés par le serveur.
    create: ({ req }) => atLeast(req.user, 'cotisations', 'full'),
    update: ({ req }) => atLeast(req.user, 'cotisations', 'full'),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (operation === 'create' && isStaff(req.user)) {
          data.enregistrePar = req.user!.id
          if (!data.statut && ['especes', 'virement'].includes(data.mode)) data.statut = 'paye'
        }
        // Un reçu n'est jamais modifié une fois émis : montant, objet et mode sont figés.
        if (operation === 'update' && originalDoc?.numero) {
          for (const k of ['montant', 'objet', 'mode', 'candidature', 'numero'])
            data[k] = originalDoc[k]
        }
        const devientPaye = data.statut === 'paye' && originalDoc?.statut !== 'paye'
        if (devientPaye && !originalDoc?.numero) {
          data.numero = await prochainNumero(req.payload, 'recu', req)
          data.datePaiement = data.datePaiement || new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        const p = doc as Paiement
        if (p.statut === 'paye' && previousDoc?.statut !== 'paye') {
          await logAction(req.payload, {
            req,
            categorie: 'paiement',
            action: `Paiement ${numeroRecu(p.numero)} : ${p.montant.toLocaleString('fr-FR')} FCFA (${modeLabel(p.mode)})`,
            cible: numeroRecu(p.numero),
          })
          const full = (await req.payload.findByID({
            collection: 'payments',
            id: p.id,
            depth: 1,
            overrideAccess: true,
            req,
          })) as unknown as Paiement
          const c = typeof full.candidature === 'object' ? full.candidature : null
          if (c?.email) {
            const recu = await pdfRecu(req.payload, full, req)
            await notify(req.payload, {
              to: c.email,
              template: 'recuPaiement',
              vars: {
                numero_recu: numeroRecu(p.numero),
                objet_paiement: objetLabel(p.objet).toLowerCase(),
                montant: p.montant.toLocaleString('fr-FR').replace(/[  ]/g, ' '),
                mode: modeLabel(p.mode),
                date: dateFr(full.datePaiement),
              },
              attachments: [
                {
                  filename: recu.nom,
                  content: Buffer.from(recu.contenu),
                  contentType: 'application/pdf',
                },
              ],
            })
          }
        }
        return doc
      },
    ],
  },
  endpoints: [
    {
      path: '/:id/recu',
      method: 'get',
      handler: async (req) => {
        if (!lire(req)) throw new APIError('Accès réservé.', 403)
        const p = (await req.payload
          .findByID({
            collection: 'payments',
            id: req.routeParams?.id as string,
            depth: 0,
            overrideAccess: false,
            req,
          })
          .catch(() => null)) as Paiement | null
        if (!p || !p.numero) throw new APIError('Reçu introuvable.', 404)
        const recu = await pdfRecu(req.payload, p, req)
        return new Response(Buffer.from(recu.contenu), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${recu.nom}"`,
            'Cache-Control': 'private, no-store',
          },
        })
      },
    },
  ],
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'numero',
          label: 'Numéro de reçu',
          type: 'number',
          unique: true,
          admin: {
            readOnly: true,
            description: 'Attribué à la confirmation du paiement (PAY-0001…), sans trou.',
          },
        },
        {
          name: 'statut',
          label: 'Statut',
          type: 'select',
          defaultValue: 'en-attente',
          index: true,
          options: [
            { value: 'en-attente', label: 'En attente' },
            { value: 'paye', label: 'Payé' },
            { value: 'echoue', label: 'Échoué' },
            { value: 'remboursement', label: 'Remboursement à traiter' },
            { value: 'rembourse', label: 'Remboursé' },
          ],
        },
      ],
    },
    {
      name: 'candidature',
      label: 'Candidature',
      type: 'relationship',
      relationTo: 'applications',
      index: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'objet',
          label: 'Objet',
          type: 'select',
          required: true,
          options: [...OBJETS_PAIEMENT],
        },
        { name: 'exercice', label: 'Exercice', type: 'text' },
        { name: 'montant', label: 'Montant (FCFA)', type: 'number', required: true, min: 1 },
        {
          name: 'mode',
          label: 'Mode',
          type: 'select',
          required: true,
          options: [...MODES_PAIEMENT],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'referenceOperateur',
          label: 'Référence (opérateur, souche ou virement)',
          type: 'text',
        },
        { name: 'telephonePayeur', label: 'Numéro payeur', type: 'text' },
        { name: 'datePaiement', label: 'Date du paiement', type: 'date' },
      ],
    },
    {
      name: 'idOperateur',
      label: 'Identifiant de la demande chez l’opérateur',
      type: 'text',
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'journalOperateur',
      label: 'Dernière réponse de l’opérateur',
      type: 'json',
      admin: { readOnly: true },
    },
    {
      name: 'enregistrePar',
      label: 'Enregistré par',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
  ],
}
