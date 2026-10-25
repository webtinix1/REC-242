import { APIError, type Access, type CollectionConfig, type FieldAccess } from 'payload'

import { atLeast, hasRole, isStaff } from '@/access/roles'
import { renderEmail } from '@/emails/render'
import { getTemplate } from '@/emails/send'
import { CATEGORIES } from '@/lib/adhesion/categories'
import { AGES, CIVILITES } from '@/lib/adhesion/options'
import { endpointsMembres } from '@/endpoints/membres'
import { logAction } from '@/lib/audit'
import { NOTIFICATIONS, STATUTS_MEMBRE } from '@/lib/membres/options'

export const MEMBER_PASSWORD_MIN = 10

type Moi = { id?: number | string; collection?: string } | null | undefined
const estMoi = (user: Moi, id?: number | string) => user?.collection === 'members' && id != null && String(user.id) === String(id)

/** L'équipe (droit « Fiches membres ») ou le membre lui-même. */
const lecture: Access = ({ req }) => {
  if (atLeast(req.user, 'membres', 'read')) return true
  if ((req.user as Moi)?.collection === 'members') return { id: { equals: req.user!.id } }
  return false
}

/** Champ vérifié ou géré par l'équipe : le membre le lit mais ne le modifie pas lui-même. */
const equipeSeulement: FieldAccess = ({ req }) => atLeast(req.user, 'membres', 'partial')

/** Champ interne (jetons) : jamais renvoyé par l'API. */
const interne: FieldAccess = () => false

/**
 * Membres (authentification de l'espace membre, séparée des comptes de l'administration).
 * Compte créé par « Convertir en membre » ; le membre choisit son mot de passe avec un lien de 72 h.
 */
export const Members: CollectionConfig = {
  slug: 'members',
  labels: { singular: 'Membre', plural: 'Membres et entreprises' },
  admin: {
    group: 'Adhésions',
    useAsTitle: 'nomComplet',
    defaultColumns: ['numeroAdherent', 'nomComplet', 'categorie', 'statut'],
    components: {
      views: {
        list: { Component: '@/components/admin/membres/MembresView#MembresView' },
        edit: { default: { Component: '@/components/admin/membres/MembreView#MembreView' } },
      },
    },
  },
  auth: {
    // 30 jours au plus (« Rester connecté ») ; sans cette case, le cookie ne vit que 30 minutes sans activité (src/proxy.ts).
    tokenExpiration: 30 * 24 * 3600,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
    forgotPassword: {
      expiration: 3600 * 1000,
      generateEmailSubject: async (args) => {
        const tpl = await getTemplate(args!.req!.payload, 'reinitialisationMotDePasse')
        return renderEmail(tpl.objet, tpl.corps, {}).subject
      },
      generateEmailHTML: async (args) => {
        const req = args!.req!
        const tpl = await getTemplate(req.payload, 'reinitialisationMotDePasse')
        const lien = `${req.payload.config.serverURL}/espace-membre/mot-de-passe/${args!.token}`
        const prenom = (args!.user as { prenom?: string } | undefined)?.prenom
        return renderEmail(tpl.objet, tpl.corps, { lien, prenom }).html
      },
    },
  },
  endpoints: endpointsMembres,
  access: {
    // Un membre n'entre jamais dans l'administration.
    admin: () => false,
    read: lecture,
    create: ({ req }) => atLeast(req.user, 'membres', 'partial'),
    update: ({ req, id }) => atLeast(req.user, 'membres', 'partial') || estMoi(req.user as Moi, id),
    delete: ({ req }) => hasRole(req.user, 'superadmin'),
    unlock: ({ req }) => atLeast(req.user, 'membres', 'partial'),
  },
  hooks: {
    beforeOperation: [
      ({ args, operation, req }) => {
        const data = (args as { data?: { password?: string; email?: string } } | undefined)?.data
        const pwd = data?.password
        if (['create', 'update', 'resetPassword'].includes(operation) && typeof pwd === 'string' && pwd.length < MEMBER_PASSWORD_MIN)
          throw new APIError(`Le mot de passe doit contenir au moins ${MEMBER_PASSWORD_MIN} caractères.`, 400, null, true)
        // Le membre change son mot de passe depuis Mon profil (ancien mot de passe vérifié) ; son e-mail ne change que par une demande validée.
        if (operation === 'update' && (req.user as Moi)?.collection === 'members' && !req.context?.parLeMembre) {
          if (pwd !== undefined) throw new APIError('Changez votre mot de passe depuis Mon profil.', 403, null, true)
          if (data?.email !== undefined) throw new APIError('L’e-mail se modifie par une demande de modification.', 403, null, true)
        }
        return args
      },
    ],
    beforeValidate: [
      ({ data }) => {
        if (data && (data.prenom !== undefined || data.nom !== undefined))
          data.nomComplet = `${data.prenom ?? ''} ${data.nom ?? ''}`.trim()
        if (data?.email) data.email = String(data.email).trim().toLowerCase()
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc, req, operation }) => {
        if (operation === 'update' && originalDoc && data.statut && data.statut !== originalDoc.statut && isStaff(req.user) && !req.context?.sansMotif) {
          if (!String(data.motifStatut ?? '').trim())
            throw new APIError('Indiquez le motif du changement de statut.', 400, null, true)
        }
        if (originalDoc && (data.prenom !== undefined || data.nom !== undefined))
          data.nomComplet = `${data.prenom ?? originalDoc.prenom ?? ''} ${data.nom ?? originalDoc.nom ?? ''}`.trim()
        return data
      },
    ],
    // Seul un membre actif ouvre son espace ; les autres états ont leur écran (docs/07, écran 01).
    beforeLogin: [
      ({ user }) => {
        const s = (user as { statut?: string }).statut
        if (s === 'suspendu' || s === 'ancien') throw new APIError('COMPTE_SUSPENDU', 403, null, true)
        if (s !== 'actif') throw new APIError('COMPTE_EN_ATTENTE', 403, null, true)
        return user
      },
    ],
    afterLogin: [
      async ({ req, user }) => {
        const u = user as { id: number; nomComplet?: string; email: string }
        await req.payload.db.updateOne({ collection: 'members', id: u.id, data: { derniereConnexion: new Date().toISOString() }, req, returning: false })
        await logAction(req.payload, { req, categorie: 'connexion', action: 'Connexion à l’espace membre', cible: u.email, author: { type: 'membre', nom: u.nomComplet || u.email } })
        return user
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (operation === 'update' && previousDoc?.statut !== doc.statut && isStaff(req.user)) {
          await logAction(req.payload, {
            req,
            categorie: doc.statut === 'suspendu' ? 'discipline' : 'validation',
            action: `Membre ${doc.numeroAdherent ?? ''} : statut « ${STATUTS_MEMBRE.find((s) => s.value === doc.statut)?.label} » (${doc.motifStatut ?? ''})`,
            cible: doc.numeroAdherent,
          })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'numeroAdherent', label: 'Numéro d’adhérent', type: 'text', unique: true, index: true, access: { update: equipeSeulement } },
        {
          name: 'statut',
          label: 'Statut',
          type: 'select',
          defaultValue: 'attente',
          options: STATUTS_MEMBRE,
          index: true,
          access: { update: equipeSeulement },
        },
        { name: 'motifStatut', label: 'Motif du dernier changement de statut', type: 'text', access: { update: equipeSeulement } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'civilite', label: 'Civilité', type: 'select', options: CIVILITES, access: { update: equipeSeulement } },
        { name: 'prenom', label: 'Prénom', type: 'text', required: true, access: { update: equipeSeulement } },
        { name: 'nom', label: 'Nom', type: 'text', required: true, access: { update: equipeSeulement } },
        { name: 'nomComplet', type: 'text', admin: { hidden: true }, access: { update: equipeSeulement } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'fonction', label: 'Fonction dans l’entreprise', type: 'text' },
        { name: 'telephone', label: 'Téléphone', type: 'text', index: true, access: { update: equipeSeulement } },
        { name: 'whatsapp', label: 'WhatsApp', type: 'text', access: { update: equipeSeulement } },
        { name: 'trancheAge', label: 'Tranche d’âge', type: 'select', options: AGES, access: { update: equipeSeulement } },
      ],
    },
    { name: 'photo', label: 'Photo', type: 'upload', relationTo: 'media' },
    { name: 'entreprise', label: 'Entreprise', type: 'relationship', relationTo: 'companies', access: { update: equipeSeulement } },
    {
      type: 'row',
      fields: [
        {
          name: 'categorie',
          label: 'Catégorie',
          type: 'select',
          required: true,
          options: CATEGORIES.map((c) => ({ value: c.valeur, label: c.convention || c.valeur === 'expert' ? c.nom : `${c.lettre} · ${c.nom}` })),
          access: { update: equipeSeulement },
        },
        { name: 'dateAdhesion', label: 'Date d’adhésion', type: 'date', access: { update: equipeSeulement } },
        { name: 'validiteCarte', label: 'Carte valable jusqu’au', type: 'date', access: { update: equipeSeulement } },
        { name: 'dateLimiteCotisation', label: 'Cotisation à solder avant le', type: 'date', access: { update: equipeSeulement } },
      ],
    },
    {
      name: 'cotisation',
      label: 'Montants de l’exercice (copiés à l’adhésion)',
      type: 'group',
      access: { update: equipeSeulement },
      admin: { description: 'Un changement de tarif ne modifie jamais une échéance déjà émise.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'droit', label: 'Droit d’adhésion', type: 'number' },
            { name: 'montant', label: 'Cotisation annuelle', type: 'number' },
            { name: 'tranches', label: 'Tranches', type: 'number' },
          ],
        },
      ],
    },
    { name: 'candidature', label: 'Candidature d’origine', type: 'relationship', relationTo: 'applications', access: { update: equipeSeulement } },
    { name: 'commissions', label: 'Commissions', type: 'relationship', relationTo: 'commissions', hasMany: true, access: { update: equipeSeulement } },
    {
      name: 'notifications',
      label: 'Préférences de notification',
      type: 'group',
      fields: NOTIFICATIONS.map((n) => ({ name: n.name, label: n.label, type: 'checkbox' as const, defaultValue: n.name !== 'lettre' })),
    },
    { name: 'consentementAnnuaire', label: 'Consentement à l’annuaire (date)', type: 'date' },
    {
      name: 'relationsSuspendues',
      label: 'Mises en relation suspendues (plus de 10 demandes en une semaine)',
      type: 'checkbox',
      defaultValue: false,
      access: { update: equipeSeulement },
    },
    { name: 'conditionsAcceptees', label: 'Conditions de l’espace membre acceptées le', type: 'date' },
    { name: 'derniereConnexion', label: 'Dernière connexion', type: 'date', admin: { readOnly: true }, access: { update: () => false } },
    {
      name: 'fin',
      label: 'Fin d’adhésion',
      type: 'group',
      access: { update: equipeSeulement },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'type',
              label: 'Motif',
              type: 'select',
              options: [
                { value: 'demission', label: 'Démission écrite' },
                { value: 'deces', label: 'Décès' },
                { value: 'perte', label: 'Non-paiement après trois relances' },
                { value: 'exclusion', label: 'Exclusion' },
              ],
            },
            { name: 'date', label: 'Date', type: 'date' },
          ],
        },
        { name: 'suppressionDemandee', label: 'Suppression du compte demandée le', type: 'date' },
      ],
    },
    // Jetons à usage unique (activation 72 h, lien de connexion 15 min) : seule leur empreinte est stockée.
    { name: 'activationHash', type: 'text', admin: { hidden: true }, access: { read: interne, update: interne, create: interne } },
    { name: 'activationExpire', type: 'date', admin: { hidden: true }, access: { read: interne, update: interne, create: interne } },
    { name: 'lienHash', type: 'text', admin: { hidden: true }, access: { read: interne, update: interne, create: interne } },
    { name: 'lienExpire', type: 'date', admin: { hidden: true }, access: { read: interne, update: interne, create: interne } },
  ],
}
