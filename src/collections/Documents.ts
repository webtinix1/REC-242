import { APIError, type CollectionConfig, type Where } from 'payload'
import fs from 'fs/promises'
import path from 'path'

import { extraFull, extraRead, hasRole, isStaff } from '@/access/roles'
import { logAction } from '@/lib/audit'

export const RUBRIQUES = [
  { value: 'textes', label: 'Textes officiels' },
  { value: 'vie', label: 'Vie du réseau' },
  { value: 'ateliers', label: 'Ateliers et formations' },
  { value: 'presse', label: 'Presse' },
  { value: 'evenements', label: 'Événements' },
]

export const VISIBILITES = [
  { value: 'public', label: 'Public' },
  { value: 'membres', label: 'Membres actifs' },
  { value: 'inscrits', label: 'Inscrits à un événement' },
  { value: 'comite', label: 'Comité de direction' },
]

const COMITE: Parameters<typeof hasRole>[1][] = ['superadmin', 'admin']

/**
 * Filtre de lecture : le public ne voit que les documents publics ; un membre actif voit aussi « membres »
 * (et « inscrits » pour ses événements, branché au lot 8) ; l'équipe voit selon son rôle.
 * Payload applique ce filtre aussi aux fichiers (route /api/documents/file/…).
 */
const readFilter = (user: unknown): boolean | Where => {
  if (extraRead(user as never, 'documents')) return true
  if (isStaff(user as never)) return { visibilite: { in: ['public', 'membres'] } }
  const u = user as { collection?: string; statut?: string } | null
  if (u?.collection === 'members' && u.statut === 'actif')
    return { visibilite: { in: ['public', 'membres'] } }
  return { visibilite: { equals: 'public' } }
}

export const Documents: CollectionConfig = {
  slug: 'documents',
  labels: { singular: 'Document', plural: 'Documents' },
  admin: {
    group: 'Contenus',
    useAsTitle: 'titre',
    defaultColumns: ['titre', 'rubrique', 'visibilite', 'version', 'updatedAt', 'telechargements'],
    components: {
      beforeListTable: ['@/components/admin/DocumentsFilters#DocumentsFilters'],
      afterListTable: ['@/components/admin/DocumentsPersonal#DocumentsPersonal'],
    },
  },
  access: {
    read: ({ req }) => readFilter(req.user),
    create: ({ req }) => extraFull(req.user, 'documents'),
    update: ({ req }) => extraFull(req.user, 'documents'),
    delete: ({ req }) => hasRole(req.user, ...COMITE),
  },
  upload: {
    staticDir: path.resolve(process.cwd(), 'private/documents'),
    mimeTypes: ['application/pdf'],
    // Pas d'URL publique directe : le téléchargement passe par /api/documents/:id/telecharger (droits + compteur).
    disableLocalStorage: false,
  },
  endpoints: [
    {
      path: '/:id/telecharger',
      method: 'get',
      handler: async (req) => {
        const id = req.routeParams?.id as string
        const doc = await req.payload
          .findByID({ collection: 'documents', id, req, overrideAccess: false, depth: 0 })
          .catch(() => null)
        if (!doc?.filename)
          return Response.json({ message: 'Document introuvable ou réservé.' }, { status: 404 })
        const file = path.resolve(process.cwd(), 'private/documents', doc.filename)
        const data = await fs.readFile(file).catch(() => null)
        if (!data) throw new APIError('Fichier manquant sur le serveur.', 500)
        await req.payload.db.updateOne({
          collection: 'documents',
          id: doc.id,
          data: { telechargements: (doc.telechargements || 0) + 1 },
          req,
        })
        if (doc.visibilite !== 'public') {
          await logAction(req.payload, {
            req,
            categorie: 'export',
            action: `A téléchargé « ${doc.titre} »`,
            cible: String(doc.id),
          })
        }
        return new Response(new Uint8Array(data), {
          headers: {
            'Content-Type': doc.mimeType || 'application/pdf',
            'Content-Disposition': `inline; filename="${encodeURIComponent(doc.filename)}"`,
            'Cache-Control':
              doc.visibilite === 'public' ? 'public, max-age=300' : 'private, no-store',
          },
        })
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        // Nouveau fichier sur un document existant : nouvelle version, l'ancienne passe dans l'historique.
        if (operation === 'update' && originalDoc && req.file && originalDoc.filename) {
          data.version = (originalDoc.version || 1) + 1
          data.historique = [
            ...(originalDoc.historique || []),
            {
              version: originalDoc.version || 1,
              fichier: originalDoc.filename,
              date: originalDoc.updatedAt,
            },
          ]
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'titre', label: 'Titre', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'rubrique', label: 'Rubrique', type: 'select', required: true, options: RUBRIQUES },
        {
          name: 'visibilite',
          label: 'Visibilité',
          type: 'select',
          required: true,
          defaultValue: 'membres',
          options: VISIBILITES,
          admin: { components: { Cell: '@/components/admin/VisibilityCell#VisibilityCell' } },
        },
      ],
    },
    {
      name: 'typePresse',
      label: 'Dans l’espace presse',
      type: 'select',
      options: [
        { value: 'communique', label: 'Communiqué' },
        { value: 'kit', label: 'Kit média' },
      ],
      admin: { condition: (d) => d?.rubrique === 'presse' },
    },
    {
      name: 'dateDocument',
      label: 'Date du document',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } },
    },
    {
      name: 'couverture',
      label: 'Couverture',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Image de la première page, affichée dans les listes.' },
    },
    {
      name: 'version',
      label: 'Version',
      type: 'number',
      defaultValue: 1,
      admin: {
        readOnly: true,
        position: 'sidebar',
        components: { Cell: '@/components/admin/VersionCell#VersionCell' },
      },
    },
    {
      name: 'telechargements',
      label: 'Téléchargements',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'annonceAuxMembres',
      label: 'Annoncer aux membres',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Envoie l’e-mail « Nouveau document » aux membres concernés (branché au lot 6).',
      },
    },
    {
      name: 'historique',
      label: 'Historique des versions',
      type: 'array',
      admin: { readOnly: true, initCollapsed: true },
      fields: [
        { name: 'version', type: 'number' },
        { name: 'fichier', type: 'text' },
        { name: 'date', type: 'date' },
      ],
    },
  ],
}
