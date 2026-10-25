import { APIError, type CollectionConfig, type PayloadRequest, type Where } from 'payload'

import { hasRole, isStaff, rolesOf, type Role } from '@/access/roles'
import { renderEmail } from '@/emails/render'
import { logAction } from '@/lib/audit'

/** Motifs du formulaire de contact (écran site 22). */
export const MOTIFS = [
  { value: 'adhesion', label: 'Adhésion' },
  { value: 'partenariat', label: 'Partenariat' },
  { value: 'presse', label: 'Presse' },
  { value: 'evenement', label: 'Événement' },
  { value: 'autre', label: 'Autre' },
] as const
export type Motif = (typeof MOTIFS)[number]['value']

/**
 * Destinataires et rôles qui les lisent (docs/05-regles-metier.md §11, docs/04-roles-et-droits.md).
 * Super administrateur et administrateur lisent tous les messages.
 */
export const DESTINATIONS = [
  { value: 'membres', label: 'Responsable membres', roles: ['membres'] },
  { value: 'partenariats', label: 'Commission Partenariats', roles: ['admin'] },
  { value: 'communication', label: 'Communication', roles: ['editeur'] },
  { value: 'evenements', label: 'Responsable événements', roles: ['evenements'] },
  { value: 'secretariat', label: 'Secrétariat', roles: ['admin'] },
] as const satisfies readonly { value: string; label: string; roles: Role[] }[]
export type Destination = (typeof DESTINATIONS)[number]['value']

export const ROUTAGE: Record<Motif, Destination> = {
  adhesion: 'membres',
  partenariat: 'partenariats',
  presse: 'communication',
  evenement: 'evenements',
  autre: 'secretariat',
}

export const TYPES_PARTENARIAT = [
  'Soutien à un événement',
  'Formation et expertise',
  'Accompagnement à la formalisation',
  'Partenariat financier',
  'Autre',
]

export const destinationLabel = (d?: string | null) =>
  DESTINATIONS.find((x) => x.value === d)?.label ?? ''
export const motifLabel = (m?: string | null) => MOTIFS.find((x) => x.value === m)?.label ?? ''

type U = PayloadRequest['user']

/** Destinations lues par l'utilisateur ; `true` : toutes. */
export const destinationsOf = (user: U): Destination[] | true => {
  if (hasRole(user, 'superadmin', 'admin')) return true
  const roles = rolesOf(user)
  return DESTINATIONS.filter((d) => d.roles.some((r) => roles.includes(r as Role))).map(
    (d) => d.value,
  )
}

const readWhere = (user: U): boolean | Where => {
  if (!isStaff(user)) return false
  const dest = destinationsOf(user)
  if (dest === true) return true
  return { or: [{ destination: { in: dest } }, { transmisUtilisateur: { equals: user!.id } }] }
}

type Msg = {
  id: number
  nom: string
  email?: string
  telephone?: string
  objet?: string
  motif: Motif
  destination: Destination
  statut: string
  notes?: { auteur?: number; date: string; texte: string }[]
  reponses?: { canal: string; texte: string; auteur?: number; auteurNom?: string; date: string }[]
  historique?: { date: string; auteur?: string; action: string }[]
  luPar?: (number | { id: number })[]
}

/** Lit le message avec les droits de l'utilisateur (404 s'il ne lui est pas transmis). */
const charger = async (req: PayloadRequest): Promise<Msg> => {
  if (!isStaff(req.user)) throw new APIError('Connexion requise.', 401)
  const id = req.routeParams?.id as string
  const doc = await req.payload
    .findByID({ collection: 'contactMessages', id, req, overrideAccess: false, depth: 0 })
    .catch(() => null)
  if (!doc) throw new APIError('Message introuvable.', 404)
  return doc as unknown as Msg
}

const corps = async (req: PayloadRequest): Promise<Record<string, unknown>> => {
  try {
    return ((await req.json?.()) ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}

const nomUtilisateur = (req: PayloadRequest) => {
  const u = req.user as { name?: string; email?: string } | null
  return u?.name || u?.email || ''
}

const enregistrer = (req: PayloadRequest, id: number, data: Record<string, unknown>) =>
  req.payload.update({
    collection: 'contactMessages',
    id,
    data: data as never,
    req,
    overrideAccess: false,
    context: { interne: true },
  })

const prenomDe = (nom: string) => nom.trim().split(/\s+/)[0] ?? ''

/** Messages des formulaires du site (écran back-office 13 : boîte de réception). */
export const ContactMessages: CollectionConfig = {
  slug: 'contactMessages',
  labels: { singular: 'Message', plural: 'Messages' },
  admin: {
    group: 'Activité',
    useAsTitle: 'objet',
    defaultColumns: ['nom', 'objet', 'motif', 'statut', 'createdAt'],
    components: {
      views: { list: { Component: '@/components/admin/messages/MessagesView#MessagesView' } },
    },
  },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => readWhere(req.user),
    // Les messages arrivent par les formulaires du site (action serveur, accès système) : pas de création par l'API.
    create: () => false,
    update: ({ req }) => readWhere(req.user),
    delete: ({ req }) => hasRole(req.user, 'superadmin'),
  },
  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation === 'create') {
          data.destination = data.destination || ROUTAGE[data.motif as Motif] || 'secretariat'
          data.statut = 'a-traiter'
          data.historique = [
            {
              date: new Date().toISOString(),
              action: `Reçu, transmis à ${destinationLabel(data.destination)}`,
            },
          ]
        }
        // Coordonnées et texte de l'expéditeur : jamais modifiés après réception.
        if (operation === 'update' && originalDoc) {
          for (const k of [
            'nom',
            'organisation',
            'telephone',
            'email',
            'message',
            'motif',
            'formulaire',
            'typePartenariat',
          ])
            data[k] = originalDoc[k]
        }
        return data
      },
    ],
  },
  endpoints: [
    {
      // Répondre par e-mail (part de l'adresse d'envoi des paramètres) ou enregistrer une réponse WhatsApp.
      path: '/:id/repondre',
      method: 'post',
      handler: async (req) => {
        const m = await charger(req)
        const b = await corps(req)
        const canal = b.canal === 'whatsapp' ? 'whatsapp' : 'email'
        const texte = String(b.texte ?? '').trim()
        if (!texte) throw new APIError('Le message est vide.', 400)
        if (canal === 'email') {
          const to = String(b.to ?? m.email ?? '').trim()
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))
            throw new APIError('Adresse e-mail invalide.', 400)
          const s = (await req.payload.findGlobal({
            slug: 'settings',
            depth: 0,
            req,
            overrideAccess: true,
          })) as {
            adresse?: string
            whatsapp?: { numero?: string }
          }
          const sujet = m.objet ? `Re : ${m.objet}` : 'Votre message à REC 242'
          const { html, text } = renderEmail(
            sujet,
            texte,
            {},
            { adresse: s.adresse, whatsapp: s.whatsapp?.numero },
          )
          await req.payload.sendEmail({ to, subject: sujet, html, text })
        }
        const now = new Date().toISOString()
        const traiter = b.traiter !== false
        await enregistrer(req, m.id, {
          reponses: [
            ...(m.reponses ?? []),
            { canal, texte, auteur: req.user!.id, auteurNom: nomUtilisateur(req), date: now },
          ],
          historique: [
            ...(m.historique ?? []),
            {
              date: now,
              auteur: nomUtilisateur(req),
              action: `Réponse envoyée par ${canal === 'email' ? 'e-mail' : 'WhatsApp'}`,
            },
          ],
          ...(traiter ? { statut: 'traite' } : {}),
        })
        await logAction(req.payload, {
          req,
          categorie: 'validation',
          action: `A répondu par ${canal === 'email' ? 'e-mail' : 'WhatsApp'} au message de ${m.nom}`,
          cible: String(m.id),
        })
        return Response.json({ ok: true })
      },
    },
    {
      path: '/:id/note',
      method: 'post',
      handler: async (req) => {
        const m = await charger(req)
        const texte = String((await corps(req)).texte ?? '').trim()
        if (!texte) throw new APIError('La note est vide.', 400)
        await enregistrer(req, m.id, {
          notes: [
            ...(m.notes ?? []),
            {
              auteur: req.user!.id,
              auteurNom: nomUtilisateur(req),
              date: new Date().toISOString(),
              texte,
            },
          ],
        })
        return Response.json({ ok: true })
      },
    },
    {
      path: '/:id/transmettre',
      method: 'post',
      handler: async (req) => {
        const m = await charger(req)
        const b = await corps(req)
        const dest = DESTINATIONS.find((d) => d.value === b.destination)
        if (!dest) throw new APIError('Choisissez à qui transmettre.', 400)
        const mot = String(b.mot ?? '').trim()
        const now = new Date().toISOString()
        await enregistrer(req, m.id, {
          destination: dest.value,
          historique: [
            ...(m.historique ?? []),
            { date: now, auteur: nomUtilisateur(req), action: `Transmis à ${dest.label}` },
          ],
          ...(mot
            ? {
                notes: [
                  ...(m.notes ?? []),
                  { auteur: req.user!.id, auteurNom: nomUtilisateur(req), date: now, texte: mot },
                ],
              }
            : {}),
        })
        return Response.json({ ok: true })
      },
    },
    {
      path: '/:id/statut',
      method: 'post',
      handler: async (req) => {
        const m = await charger(req)
        const statut = String((await corps(req)).statut ?? '')
        if (!['a-traiter', 'traite', 'archive'].includes(statut))
          throw new APIError('Statut inconnu.', 400)
        await enregistrer(req, m.id, {
          statut,
          historique: [
            ...(m.historique ?? []),
            {
              date: new Date().toISOString(),
              auteur: nomUtilisateur(req),
              action:
                statut === 'a-traiter'
                  ? 'Conversation rouverte'
                  : statut === 'traite'
                    ? 'Marqué comme traité'
                    : 'Archivé',
            },
          ],
        })
        return Response.json({ ok: true })
      },
    },
    {
      path: '/:id/lu',
      method: 'post',
      handler: async (req) => {
        const m = await charger(req)
        const ids = (m.luPar ?? []).map((x) => (typeof x === 'number' ? x : x.id))
        if (!ids.includes(req.user!.id as number))
          await req.payload.update({
            collection: 'contactMessages',
            id: m.id,
            data: { luPar: [...ids, req.user!.id] } as never,
            req,
            overrideAccess: false,
          })
        return Response.json({ ok: true })
      },
    },
    {
      // Export CSV des messages visibles par l'utilisateur (filtre de motif facultatif).
      path: '/export',
      method: 'get',
      handler: async (req) => {
        if (!isStaff(req.user)) throw new APIError('Connexion requise.', 401)
        const motif = new URL(req.url ?? '', 'http://x').searchParams.get('motif')
        const r = await req.payload.find({
          collection: 'contactMessages',
          req,
          overrideAccess: false,
          where: motif ? { motif: { equals: motif } } : undefined,
          limit: 5000,
          depth: 0,
          sort: '-createdAt',
        })
        const cols = [
          'Date',
          'Formulaire',
          'Motif',
          'Nom',
          'Organisation',
          'Téléphone',
          'E-mail',
          'Objet',
          'Message',
          'Transmis à',
          'Statut',
        ]
        const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const lignes = r.docs.map((d) => {
          const x = d as unknown as Record<string, string>
          return [
            new Date(x.createdAt).toLocaleString('fr-FR', { timeZone: 'Africa/Brazzaville' }),
            x.formulaire === 'partenariat' ? 'Partenariat' : 'Contact',
            motifLabel(x.motif),
            x.nom,
            x.organisation,
            x.telephone,
            x.email,
            x.objet,
            x.message,
            destinationLabel(x.destination),
            x.statut === 'traite' ? 'Traité' : x.statut === 'archive' ? 'Archivé' : 'À traiter',
          ]
            .map(esc)
            .join(';')
        })
        await logAction(req.payload, {
          req,
          categorie: 'export',
          action: `A exporté ${r.docs.length} message(s)`,
        })
        return new Response('﻿' + [cols.map(esc).join(';'), ...lignes].join('\r\n'), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="messages-rec242.csv"`,
            'Cache-Control': 'no-store',
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
          name: 'formulaire',
          label: 'Formulaire',
          type: 'select',
          required: true,
          defaultValue: 'contact',
          options: [
            { value: 'contact', label: 'Contact' },
            { value: 'partenariat', label: 'Devenir partenaire' },
          ],
        },
        { name: 'motif', label: 'Motif', type: 'select', required: true, options: [...MOTIFS] },
      ],
    },
    { name: 'objet', label: 'Objet', type: 'text' },
    {
      type: 'row',
      fields: [
        { name: 'nom', label: 'Nom', type: 'text', required: true },
        { name: 'organisation', label: 'Organisation', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'telephone', label: 'Téléphone', type: 'text' },
        { name: 'email', label: 'E-mail', type: 'email' },
      ],
    },
    { name: 'typePartenariat', label: 'Type de partenariat', type: 'text' },
    { name: 'message', label: 'Message', type: 'textarea', required: true },
    {
      name: 'qui',
      label: 'Qui écrit',
      type: 'text',
      admin: { description: 'Précision affichée sous le nom (visiteur, membre, candidat…).' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'destination',
          label: 'Transmis à',
          type: 'select',
          options: DESTINATIONS.map(({ value, label }) => ({ value, label })),
        },
        {
          name: 'transmisUtilisateur',
          label: 'Transmis à (personne)',
          type: 'relationship',
          relationTo: 'users',
        },
        {
          name: 'statut',
          label: 'Statut',
          type: 'select',
          defaultValue: 'a-traiter',
          options: [
            { value: 'a-traiter', label: 'À traiter' },
            { value: 'traite', label: 'Traité' },
            { value: 'archive', label: 'Archivé' },
          ],
        },
      ],
    },
    {
      name: 'luPar',
      label: 'Lu par',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: { readOnly: true },
    },
    {
      name: 'notes',
      label: 'Notes internes',
      type: 'array',
      admin: { description: 'Jamais envoyées à l’expéditeur.' },
      fields: [
        { name: 'auteur', type: 'relationship', relationTo: 'users' },
        { name: 'auteurNom', label: 'Auteur', type: 'text' },
        { name: 'date', type: 'date' },
        { name: 'texte', type: 'textarea', required: true },
      ],
    },
    {
      name: 'reponses',
      label: 'Réponses envoyées',
      type: 'array',
      fields: [
        {
          name: 'canal',
          type: 'select',
          options: [
            { value: 'email', label: 'E-mail' },
            { value: 'whatsapp', label: 'WhatsApp' },
          ],
        },
        { name: 'texte', type: 'textarea' },
        { name: 'auteur', type: 'relationship', relationTo: 'users' },
        { name: 'auteurNom', label: 'Auteur', type: 'text' },
        { name: 'date', type: 'date' },
      ],
    },
    {
      name: 'historique',
      label: 'Historique',
      type: 'array',
      admin: { readOnly: true },
      fields: [
        { name: 'date', type: 'date' },
        { name: 'auteur', type: 'text' },
        { name: 'action', type: 'text' },
      ],
    },
    { name: 'page', label: 'Envoyé depuis', type: 'text', admin: { readOnly: true } },
  ],
}

export const prenomExpediteur = prenomDe
