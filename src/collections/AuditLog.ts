import type { CollectionConfig } from 'payload'

import { atLeast } from '@/access/roles'
import { logAction } from '@/lib/audit'

export const AUDIT_CATEGORIES = [
  { value: 'connexion', label: 'Connexions' },
  { value: 'validation', label: 'Validations' },
  { value: 'publication', label: 'Publications' },
  { value: 'export', label: 'Exports' },
  { value: 'parametres', label: 'Paramètres' },
  { value: 'utilisateurs', label: 'Utilisateurs' },
  { value: 'paiement', label: 'Paiements' },
  { value: 'discipline', label: 'Discipline' },
] as const

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number]['value']

/**
 * Journal des actions. Écrit uniquement par le code serveur (src/lib/audit.ts), jamais modifiable ni supprimable,
 * même par un super administrateur.
 */
export const AuditLog: CollectionConfig = {
  slug: 'auditLog',
  labels: { singular: 'Entrée du journal', plural: 'Journal des actions' },
  admin: {
    group: 'Administration',
    useAsTitle: 'action',
    defaultColumns: ['action', 'createdAt', 'auteurNom', 'ville', 'categorie'],
    disableCopyToLocale: true,
    components: {
      beforeListTable: ['@/components/admin/AuditLogFilters#AuditLogFilters'],
    },
  },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => atLeast(req.user, 'journal', 'read'),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  endpoints: [
    {
      path: '/export',
      method: 'get',
      handler: async (req) => {
        if (!atLeast(req.user, 'journal', 'read')) return Response.json({ message: 'Accès refusé' }, { status: 403 })
        const categorie = new URL(req.url || '', 'http://x').searchParams.get('categorie')
        const { docs } = await req.payload.find({
          collection: 'auditLog',
          where: categorie ? { categorie: { equals: categorie } } : {},
          sort: '-createdAt',
          limit: 10000,
          depth: 0,
          req,
          overrideAccess: false,
        })
        const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const lines = [
          ['Date', 'Auteur', 'Catégorie', 'Action', 'Cible', 'Adresse IP', 'Ville'].map(esc).join(';'),
          ...docs.map((d) => [d.createdAt, d.auteurNom, d.categorie, d.action, d.cible, d.ip, d.ville].map(esc).join(';')),
        ]
        await logAction(req.payload, { req, categorie: 'export', action: 'A exporté le journal des actions', cible: categorie || 'toutes' })
        return new Response('\uFEFF' + lines.join('\r\n'), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="journal-rec242-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        })
      },
    },
  ],
  fields: [
    { name: 'action', label: 'Action', type: 'text', required: true, admin: { readOnly: true } },
    {
      name: 'categorie',
      label: 'Catégorie',
      type: 'select',
      required: true,
      index: true,
      options: AUDIT_CATEGORIES.map((c) => ({ ...c })),
      admin: { readOnly: true },
    },
    { name: 'cible', label: 'Cible', type: 'text', admin: { readOnly: true } },
    {
      name: 'auteurType',
      label: 'Type d’auteur',
      type: 'select',
      options: [
        { value: 'utilisateur', label: 'Utilisateur' },
        { value: 'membre', label: 'Membre' },
        { value: 'systeme', label: 'Système' },
        { value: 'visiteur', label: 'Visiteur' },
      ],
      admin: { readOnly: true },
    },
    { name: 'auteur', label: 'Utilisateur', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'auteurNom', label: 'Auteur', type: 'text', admin: { readOnly: true } },
    { name: 'ip', label: 'Adresse IP', type: 'text', admin: { readOnly: true } },
    { name: 'ville', label: 'Ville', type: 'text', admin: { readOnly: true } },
  ],
}
