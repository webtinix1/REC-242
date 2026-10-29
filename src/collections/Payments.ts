import { APIError, type CollectionConfig, type Payload, type PayloadRequest } from 'payload'

import { atLeast, isStaff } from '@/access/roles'
import { notify } from '@/emails/send'
import { MODES_PAIEMENT, modeLabel, OBJETS_PAIEMENT, objetLabel } from '@/lib/adhesion/paiement'
import { logAction } from '@/lib/audit'
import { offreAbonnement, prolongerAbonnement } from '@/lib/abonnement/service'
import { rapprocherPaiement } from '@/lib/cotisations/service'
import { numeroDossierCandidat, numeroRecu, prochainNumero, verrouiller } from '@/lib/compteurs'
import { celluleCsv } from '@/lib/csv'
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
  membre?: number | { id: number; prenom?: string; nom?: string; email?: string; numeroAdherent?: string; entreprise?: number | { nom?: string } | null } | null
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
    depth: 2,
    overrideAccess: true,
    req,
  })) as unknown as Paiement
  const c = typeof full.candidature === 'object' ? full.candidature : null
  const m = typeof full.membre === 'object' ? full.membre : null
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
    payeur: m ? `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() : c ? `${c.prenom ?? ''} ${c.nom ?? ''}`.trim() : '',
    entreprise: m && typeof m.entreprise === 'object' ? m.entreprise?.nom : c?.raisonSociale,
    reference: m?.numeroAdherent ? `Adhérent ${m.numeroAdherent}` : c ? `Dossier ${numeroDossierCandidat(c.numero, c.createdAt)}` : undefined,
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
    // Un membre lit ses propres paiements (tableau de bord, reçus).
    read: ({ req }) =>
      lire(req) ? true : req.user?.collection === 'members' ? { membre: { equals: req.user.id } } : false,
    // Paiement au siège ou par virement : enregistré par le trésorier. Les paiements mobiles sont créés par le serveur.
    create: ({ req }) => atLeast(req.user, 'cotisations', 'full'),
    update: ({ req }) => atLeast(req.user, 'cotisations', 'full'),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ context, data, operation, originalDoc, req }) => {
        if (operation === 'create' && isStaff(req.user)) {
          data.enregistrePar = req.user!.id
          if (!data.statut && ['especes', 'virement'].includes(data.mode)) data.statut = 'paye'
        }
        // Marque posée par le serveur seulement (prolongation de l'abonnement appliquée), jamais par une saisie.
        if (operation === 'create') delete data.abonnementProlongeLe
        let actuel = originalDoc as Record<string, unknown> | undefined
        if (operation === 'update' && originalDoc?.id) {
          // `originalDoc` est lu avant tout verrou : deux mises à jour simultanées (rappel de l'opérateur, suivi,
          // tâche périodique, équipe) le verraient toutes deux « en attente ». On verrouille la ligne jusqu'à la fin
          // de la transaction et on relit le paiement : une seule attribue le numéro et déclenche les effets.
          await verrouiller(req.payload, 'payments', originalDoc.id, req)
          actuel =
            ((await req.payload.db.findOne({ collection: 'payments', where: { id: { equals: originalDoc.id } }, req })) as Record<string, unknown> | null) ??
            actuel
          // Payload complète les champs absents de `data` avec `originalDoc` : on les reprend de la version relue.
          for (const [k, v] of Object.entries(actuel ?? {}))
            if (data[k] === undefined && !['id', 'createdAt', 'updatedAt'].includes(k)) data[k] = v
          data.abonnementProlongeLe = actuel?.abonnementProlongeLe ?? null
        }
        const confirme = Boolean(actuel?.numero) || ['paye', 'remboursement', 'rembourse'].includes(String(actuel?.statut ?? ''))
        // Un paiement confirmé ne revient jamais en attente ni en échec (il peut seulement être remboursé).
        if (operation === 'update' && confirme && ['en-attente', 'echoue'].includes(data.statut))
          throw new APIError('Un paiement confirmé ne peut pas revenir « en attente » ni passer « échoué ».', 400)
        // Un reçu n'est jamais modifié une fois émis : montant, objet, mode, payeur et rattachements sont figés.
        if (operation === 'update' && actuel?.numero) {
          for (const k of ['montant', 'objet', 'mode', 'candidature', 'membre', 'echeance', 'numero', 'abonnementMois'])
            data[k] = actuel[k]
        }
        if (data.statut === 'paye' && !actuel?.numero && !confirme) {
          data.numero = await prochainNumero(req.payload, 'recu', req)
          data.datePaiement = data.datePaiement || new Date().toISOString()
          // Les effets de la confirmation (journal, rapprochement, abonnement, reçu) ne suivent que ce passage-là.
          ;((context.recusAttribues as Set<number> | undefined) ?? (context.recusAttribues = new Set<number>())).add(Number(data.numero))
        }
        return data
      },
    ],
    afterChange: [
      async ({ context, doc, req }) => {
        const p = doc as Paiement
        const attribues = context.recusAttribues as Set<number> | undefined
        if (p.statut === 'paye' && p.numero && attribues?.has(Number(p.numero))) {
          attribues.delete(Number(p.numero))
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
          const m = typeof full.membre === 'object' ? full.membre : null
          // Cotisation d'un membre : rapprochement avec son échéance (tranches payées).
          await rapprocherPaiement(req.payload, doc as never, req)
          // Abonnement « Annuaire détaillé » : prolongé de la durée enregistrée sur le paiement (ou de la durée en vigueur).
          if (p.objet === 'abonnement' && m) {
            const duree = Number((doc as { abonnementMois?: number }).abonnementMois) || (await offreAbonnement(req.payload, req))?.dureeMois
            // Idempotent par paiement : la prolongation n'est appliquée qu'une fois (marque `abonnementProlongeLe`).
            if (duree) await prolongerAbonnement(req.payload, m.id, duree, req, p.id)
            else req.payload.logger.error({ paiement: p.id }, 'Abonnement payé sans durée : à prolonger à la main')
          }
          const destinataire = m?.email ?? c?.email
          if (destinataire) {
            const recu = await pdfRecu(req.payload, full, req)
            await notify(req.payload, {
              to: destinataire,
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
      // Écran 12 : export comptable des paiements (droit « Exports » partiel du trésorier), sur une période.
      path: '/export',
      method: 'get',
      handler: async (req) => {
        if (!atLeast(req.user, 'cotisations', 'read') || !atLeast(req.user, 'exports', 'partial'))
          throw new APIError('Export non autorisé pour votre rôle.', 403)
        const q = new URL(req.url ?? '', 'http://x').searchParams
        const du = q.get('du') ? new Date(`${q.get('du')}T00:00:00+01:00`) : null
        const au = q.get('au') ? new Date(`${q.get('au')}T23:59:59+01:00`) : null
        const r = await req.payload.find({
          collection: 'payments',
          where: {
            and: [
              { statut: { in: ['paye', 'rembourse', 'remboursement'] } },
              ...(du ? [{ datePaiement: { greater_than_equal: du.toISOString() } }] : []),
              ...(au ? [{ datePaiement: { less_than_equal: au.toISOString() } }] : []),
            ],
          },
          sort: 'numero',
          depth: 2,
          limit: 10000,
          overrideAccess: false,
          req,
        })
        const lignes = (r.docs as unknown as Paiement[]).map((p) => {
          const m = typeof p.membre === 'object' ? p.membre : null
          const c = typeof p.candidature === 'object' ? p.candidature : null
          return [
            numeroRecu(p.numero),
            p.datePaiement ? new Date(p.datePaiement).toISOString().slice(0, 10) : '',
            m ? `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() : c ? `${c.prenom ?? ''} ${c.nom ?? ''}`.trim() : '',
            m?.numeroAdherent ?? (c ? numeroDossierCandidat(c.numero, c.createdAt) : ''),
            objetLabel(p.objet),
            p.montant,
            modeLabel(p.mode),
            p.referenceOperateur,
            p.statut,
          ]
            .map((v) => celluleCsv(v))
            .join(';')
        })
        await logAction(req.payload, { req, categorie: 'export', action: `Export comptable : ${r.docs.length} paiement(s)` })
        return new Response('﻿' + ['recu;date;payeur;reference;objet;montant_fcfa;mode;reference_operateur;statut', ...lignes].join('\r\n'), {
          headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="paiements-rec242.csv"' },
        })
      },
    },
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
      name: 'membre',
      label: 'Membre',
      type: 'relationship',
      relationTo: 'members',
      index: true,
    },
    { name: 'echeance', label: 'Échéance de cotisation', type: 'relationship', relationTo: 'dues', index: true },
    {
      name: 'abonnementMois',
      label: 'Durée de l’abonnement payé (mois)',
      type: 'number',
      min: 1,
      admin: { condition: (d) => d?.objet === 'abonnement', description: 'Laissé vide, la durée en vigueur dans Paramètres s’applique.' },
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
      // Marque technique : date à laquelle la prolongation de l'abonnement payé a été appliquée (une seule fois).
      // Posée par le serveur seulement ; jamais lisible par les membres.
      name: 'abonnementProlongeLe',
      label: 'Abonnement prolongé le',
      type: 'date',
      access: { read: ({ req }) => isStaff(req.user) },
      admin: { readOnly: true, hidden: true },
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
