import crypto from 'crypto'
import { APIError, type CollectionConfig } from 'payload'

import { atLeast, hasRole, isStaff, ROLES, type Role } from '@/access/roles'
import { renderEmail } from '@/emails/render'
import { getTemplate, sendTemplate } from '@/emails/send'
import { logAction } from '@/lib/audit'
import { clientCity, deviceKey, deviceLabel, userAgent } from '@/lib/request'

export const ADMIN_PASSWORD_MIN = 12
const INVITATION_VALIDITY_MS = 72 * 60 * 60 * 1000
const RESET_VALIDITY_MS = 60 * 60 * 1000

const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r
const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || ''

const dateFr = (d: Date) =>
  d.toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Africa/Brazzaville',
  })

type UserDoc = {
  id: number
  email: string
  name?: string
  roles?: Role[]
  statut?: 'actif' | 'invite' | 'desactive'
  knownDevices?: { key: string; label?: string; ville?: string; firstSeen?: string }[]
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Utilisateur', plural: 'Utilisateurs et rôles' },
  admin: {
    group: 'Administration',
    useAsTitle: 'name',
    hidden: ({ user }) => !atLeast(user as never, 'utilisateurs', 'read'),
    defaultColumns: ['name', 'roles', 'lastLogin', 'statut'],
    description:
      'Mot de passe de 12 caractères minimum, blocage après 5 essais, alerte par e-mail à chaque nouvel appareil. Chaque connexion est inscrite au journal.',
    components: {
      beforeListTable: ['@/components/admin/InviteUser#InviteUser'],
      afterList: ['@/components/admin/PermissionsMatrix#PermissionsMatrix'],
    },
  },
  auth: {
    tokenExpiration: 30 * 60, // 30 minutes d'inactivité
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
    forgotPassword: {
      expiration: RESET_VALIDITY_MS,
      generateEmailSubject: async (args) => {
        const tpl = await getTemplate(args!.req!.payload, 'reinitialisationMotDePasse')
        return renderEmail(tpl.objet, tpl.corps, {}).subject
      },
      generateEmailHTML: async (args) => {
        const req = args!.req!
        const tpl = await getTemplate(req.payload, 'reinitialisationMotDePasse')
        const lien = `${req.payload.config.serverURL}/admin/reset/${args!.token}`
        return renderEmail(tpl.objet, tpl.corps, { lien }).html
      },
    },
  },
  access: {
    admin: ({ req }) => isStaff(req.user),
    read: ({ req }) => {
      if (atLeast(req.user, 'utilisateurs', 'read')) return true
      if (isStaff(req.user)) return { id: { equals: req.user!.id } }
      return false
    },
    create: ({ req }) => hasRole(req.user, 'superadmin'),
    update: ({ req }) => {
      if (hasRole(req.user, 'superadmin')) return true
      if (isStaff(req.user)) return { id: { equals: req.user!.id } }
      return false
    },
    delete: () => false, // on désactive un compte, on ne le supprime pas
    unlock: ({ req }) => hasRole(req.user, 'superadmin'),
  },
  endpoints: [
    {
      // Invitation d'un nouvel utilisateur : compte créé sans mot de passe connu, lien de création valable 72 h.
      path: '/inviter',
      method: 'post',
      handler: async (req) => {
        if (!hasRole(req.user, 'superadmin'))
          throw new APIError('Seul un super administrateur peut inviter un utilisateur.', 403)
        const body = (await req.json?.()) as { name?: string; email?: string; roles?: Role[] }
        const name = (body?.name || '').trim()
        const email = (body?.email || '').trim().toLowerCase()
        const roles = (body?.roles || []).filter((r) => ROLES.some((x) => x.value === r))
        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || roles.length === 0) {
          throw new APIError('Nom, e-mail valide et au moins un rôle sont obligatoires.', 400)
        }
        const payload = req.payload
        const exists = await payload.count({
          collection: 'users',
          where: { email: { equals: email } },
          overrideAccess: true,
        })
        if (exists.totalDocs > 0)
          throw new APIError('Un utilisateur existe déjà avec cette adresse.', 409)

        const user = await payload.create({
          collection: 'users',
          overrideAccess: true,
          context: { invitation: true },
          data: {
            name,
            email,
            roles,
            statut: 'invite',
            password: crypto.randomBytes(24).toString('base64url'),
          },
        })
        const token = await payload.forgotPassword({
          collection: 'users',
          data: { email },
          disableEmail: true,
          overrideAccess: true,
        })
        await payload.db.updateOne({
          collection: 'users',
          id: user.id,
          data: {
            resetPasswordExpiration: new Date(Date.now() + INVITATION_VALIDITY_MS).toISOString(),
          },
        })
        await sendTemplate(payload, {
          to: email,
          template: 'invitationAdmin',
          vars: {
            prenom: firstName(name),
            invitant: (req.user as UserDoc).name || 'Un super administrateur',
            role: roles.map(roleLabel).join(', '),
            lien: `${payload.config.serverURL}/admin/reset/${token}`,
          },
        })
        await logAction(payload, {
          req,
          categorie: 'utilisateurs',
          action: `A invité ${name} (${roles.map(roleLabel).join(', ')})`,
          cible: email,
        })
        return Response.json({ id: user.id, message: 'Invitation envoyée.' })
      },
    },
  ],
  hooks: {
    beforeOperation: [
      ({ args, operation }) => {
        const pwd = (args as { data?: { password?: string } } | undefined)?.data?.password
        if (
          ['create', 'update', 'resetPassword'].includes(operation) &&
          typeof pwd === 'string' &&
          pwd.length < ADMIN_PASSWORD_MIN
        ) {
          throw new APIError(
            `Le mot de passe doit contenir au moins ${ADMIN_PASSWORD_MIN} caractères.`,
            400,
            null,
            true,
          )
        }
        return args
      },
    ],
    beforeChange: [
      async ({ data, operation, req, originalDoc }) => {
        // Le tout premier compte est forcément super administrateur.
        if (operation === 'create') {
          const count = await req.payload.count({ collection: 'users', overrideAccess: true })
          if (count.totalDocs === 0) {
            data.roles = ['superadmin']
            data.statut = 'actif'
          }
        }
        // Un super administrateur ne peut pas se retirer lui-même ses droits ni désactiver son propre compte.
        if (operation === 'update' && req.user && originalDoc && req.user.id === originalDoc.id) {
          const wasSuper = (originalDoc.roles || []).includes('superadmin')
          if (wasSuper && data.roles && !data.roles.includes('superadmin')) {
            throw new APIError(
              'Vous ne pouvez pas retirer votre propre rôle de super administrateur.',
              400,
              null,
              true,
            )
          }
          if (data.statut === 'desactive') {
            throw new APIError(
              'Vous ne pouvez pas désactiver votre propre compte.',
              400,
              null,
              true,
            )
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req, context }) => {
        if (operation !== 'update' || context?.skipAudit) return doc
        const before = (previousDoc?.roles || []).slice().sort().join(',')
        const after = (doc.roles || []).slice().sort().join(',')
        if (before !== after) {
          await logAction(req.payload, {
            req,
            categorie: 'utilisateurs',
            action: `A modifié les rôles de ${doc.name} : ${(doc.roles || []).map(roleLabel).join(', ') || 'aucun'}`,
            cible: doc.email,
          })
        }
        if (previousDoc?.statut !== doc.statut) {
          const lib =
            { actif: 'réactivé', invite: 'remis en invitation', desactive: 'désactivé' }[
              doc.statut as string
            ] ?? doc.statut
          await logAction(req.payload, {
            req,
            categorie: 'utilisateurs',
            action: `A ${lib} le compte de ${doc.name}`,
            cible: doc.email,
          })
        }
        return doc
      },
    ],
    beforeLogin: [
      ({ user }) => {
        if ((user as UserDoc).statut === 'desactive') {
          throw new APIError(
            'Ce compte est désactivé. Contactez le super administrateur.',
            403,
            null,
            true,
          )
        }
        return user
      },
    ],
    afterLogin: [
      async ({ req, user }) => {
        const u = user as UserDoc
        const ua = userAgent(req)
        const key = deviceKey(ua)
        const devices = u.knownDevices || []
        const known = devices.some((d) => d.key === key)
        const now = new Date()
        const ville = clientCity(req)

        await req.payload.update({
          collection: 'users',
          id: u.id,
          req,
          overrideAccess: true,
          context: { skipAudit: true },
          data: {
            lastLogin: now.toISOString(),
            ...(u.statut === 'invite' ? { statut: 'actif' } : {}),
            ...(known
              ? {}
              : {
                  knownDevices: [
                    ...devices,
                    { key, label: deviceLabel(ua), ville, firstSeen: now.toISOString() },
                  ],
                }),
          },
        })

        // Alerte seulement si l'utilisateur avait déjà au moins un appareil connu (pas à la toute première connexion).
        if (!known && devices.length > 0) {
          await sendTemplate(req.payload, {
            to: u.email,
            template: 'nouvelAppareil',
            vars: {
              prenom: firstName(u.name),
              date: dateFr(now),
              appareil: deviceLabel(ua),
              lieu: ville ? `, ${ville}` : '',
            },
          }).catch((err) => req.payload.logger.error({ err }, 'Alerte nouvel appareil non envoyée'))
        }
        await logAction(req.payload, {
          req,
          categorie: 'connexion',
          action:
            known || devices.length === 0 ? 'Connexion' : 'Connexion depuis un nouvel appareil',
          cible: u.email,
          author: { type: 'utilisateur', id: u.id, nom: u.name || u.email },
        })
        return user
      },
    ],
    afterLogout: [
      async ({ req }) => {
        await logAction(req.payload, { req, categorie: 'connexion', action: 'Déconnexion' })
      },
    ],
    afterError: [
      async ({ error, req }) => {
        const url = req?.url || ''
        if (!/\/users\/login(\?|$)/.test(url)) return
        const email = String((req as { data?: { email?: string } }).data?.email || '')
        const locked = error?.name === 'LockedAuth'
        await logAction(req.payload, {
          req,
          categorie: 'connexion',
          action: locked ? 'Connexion refusée : compte bloqué 15 minutes' : 'Échec de connexion',
          cible: email,
          author: { type: 'visiteur', nom: email },
          detached: true,
        })
      },
    ],
  },
  fields: [
    { name: 'name', label: 'Nom', type: 'text', required: true },
    { name: 'photo', label: 'Photo', type: 'upload', relationTo: 'media' },
    {
      name: 'roles',
      label: 'Rôles',
      type: 'select',
      hasMany: true,
      required: true,
      options: ROLES.map((r) => ({ ...r })),
      access: {
        create: ({ req }) => hasRole(req.user, 'superadmin'),
        update: ({ req }) => hasRole(req.user, 'superadmin'),
      },
      admin: {
        description:
          'Une personne peut cumuler plusieurs rôles ; ses droits sont l’union de ceux de ses rôles.',
      },
    },
    {
      name: 'statut',
      label: 'Statut',
      type: 'select',
      required: true,
      defaultValue: 'actif',
      options: [
        { value: 'actif', label: 'Actif' },
        { value: 'invite', label: 'Invitation envoyée' },
        { value: 'desactive', label: 'Désactivé' },
      ],
      access: {
        create: ({ req }) => hasRole(req.user, 'superadmin'),
        update: ({ req }) => hasRole(req.user, 'superadmin'),
      },
      admin: {
        position: 'sidebar',
        components: { Cell: '@/components/admin/StatusCell#StatusCell' },
      },
    },
    {
      name: 'lastLogin',
      label: 'Dernière connexion',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { displayFormat: 'd MMM yyyy, HH:mm' },
        components: { Cell: '@/components/admin/LastLoginCell#LastLoginCell' },
      },
    },
    {
      name: 'knownDevices',
      label: 'Appareils connus',
      type: 'array',
      admin: { readOnly: true, initCollapsed: true },
      access: { read: ({ req }) => hasRole(req.user, 'superadmin') || isStaff(req.user) },
      fields: [
        { name: 'key', type: 'text', required: true, admin: { hidden: true } },
        { name: 'label', label: 'Appareil', type: 'text' },
        { name: 'ville', label: 'Ville', type: 'text' },
        { name: 'firstSeen', label: 'Première connexion', type: 'date' },
      ],
    },
    {
      // Réservé à la double authentification d'une version ultérieure (docs/01-projet.md).
      name: 'twoFactor',
      type: 'json',
      admin: { hidden: true },
      access: { read: () => false, update: () => false, create: () => false },
    },
  ],
}
