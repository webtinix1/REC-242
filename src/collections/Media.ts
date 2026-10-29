import type { Access, CollectionAfterReadHook, CollectionConfig, PayloadRequest, Where } from 'payload'

import { atLeast, extraFull, isStaff } from '@/access/roles'

/**
 * Envoi d'une image depuis le back-office. Les médias sont gérés par super admin, admin et éditeur (docs/04, « médias ») ;
 * les autres rôles envoient seulement les images des contenus qu'ils éditent : couvertures et galeries d'événements
 * (responsable événements), retours sur événement (actualités, droit partiel), photos des fiches et images des
 * commissions (responsable membres). Le trésorier n'envoie rien. Les images des membres passent par le serveur.
 */
const envoiParLEquipe = (user: PayloadRequest['user']) =>
  extraFull(user, 'contenusAnnexes') ||
  atLeast(user, 'evenements', 'full') ||
  atLeast(user, 'actualites', 'partial') ||
  atLeast(user, 'membres', 'partial')

/** Identifiants à cacher aux visiteurs, recalculés au plus toutes les 30 secondes. */
let portraitsCaches: { ids: number[]; expire: number } | null = null

/** Vide le cache (tests). */
export const oublierPortraitsCaches = () => {
  portraitsCaches = null
}

const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id?: number }).id : (x as number | null | undefined))

/**
 * Portraits des membres (champ `photo` d'une fiche membre), sauf ceux que le site publie aussi sous un autre titre
 * (gouvernance, témoignages, intervenants d'un événement) : leur absence casserait ces pages pour les visiteurs.
 */
async function portraitsDeMembres(req: PayloadRequest): Promise<number[]> {
  if (portraitsCaches && portraitsCaches.expire > Date.now()) return portraitsCaches.ids
  const lire = async (collection: 'members' | 'people' | 'testimonials' | 'events', select: Record<string, unknown>) =>
    (
      await req.payload.find({ collection, depth: 0, pagination: false, limit: 0, overrideAccess: true, select: select as never, req })
    ).docs as unknown as Record<string, unknown>[]
  const [membres, personnes, temoignages, evenements] = await Promise.all([
    lire('members', { photo: true }),
    lire('people', { photo: true }),
    lire('testimonials', { photo: true }),
    lire('events', { intervenants: true }),
  ])
  const publics = new Set<number>()
  for (const d of [...personnes, ...temoignages]) {
    const id = idDe(d.photo)
    if (id) publics.add(id)
  }
  for (const e of evenements)
    for (const i of (e.intervenants ?? []) as { photo?: unknown }[]) {
      const id = idDe(i.photo)
      if (id) publics.add(id)
    }
  const ids = [...new Set(membres.map((m) => idDe(m.photo)).filter((id): id is number => Boolean(id) && !publics.has(id!)))]
  portraitsCaches = { ids, expire: Date.now() + 30_000 }
  return ids
}

/**
 * Lecture. Les fichiers (/api/media/file/…, optimiseur d'images de Next) restent servis à tous : le site affiche les
 * portraits des fiches publiques de l'annuaire. L'équipe et les membres connectés lisent toute la médiathèque.
 * Un visiteur ne liste ni ne cherche les portraits des membres : `GET /api/media` donnerait sinon le nom et la photo
 * de chacun, y compris d'un membre absent de l'annuaire ou suspendu.
 */
const lecture: Access = async ({ req, isReadingStaticFile }) => {
  if (isReadingStaticFile || isStaff(req.user) || req.user?.collection === 'members') return true
  const ids = await portraitsDeMembres(req)
  return ids.length ? ({ id: { not_in: ids } } as Where) : true
}

/**
 * Adresses des fichiers en chemin relatif (« /api/media/file/… ») : Payload les préfixe de `serverURL`, ce qui casse
 * toutes les images dès que le site est servi à une autre adresse (préproduction, port de prévisualisation).
 */
const relatif = (u?: string | null) => (u ? u.replace(/^https?:\/\/[^/]+(?=\/api\/media\/file\/)/, '') : u)

const urlsRelatives: CollectionAfterReadHook = ({ doc }) => {
  if (doc?.url) doc.url = relatif(doc.url)
  if (doc?.thumbnailURL) doc.thumbnailURL = relatif(doc.thumbnailURL)
  for (const t of Object.values((doc?.sizes ?? {}) as Record<string, { url?: string | null }>))
    if (t?.url) t.url = relatif(t.url)
  return doc
}

/**
 * Médiathèque. Les images sont converties en WebP et déclinées en trois tailles à l'import.
 * Les documents réservés (PDF) sont dans la collection « documents », pas ici.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  hooks: { afterRead: [urlsRelatives] },
  labels: { singular: 'Média', plural: 'Médias' },
  admin: {
    components: { beforeList: ['@/components/admin/ContenusTabs#ContenusTabs'] },
    group: 'Contenus',
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'credits', 'updatedAt'],
  },
  access: {
    read: lecture,
    create: ({ req }) => envoiParLEquipe(req.user),
    update: ({ req }) => extraFull(req.user, 'contenusAnnexes'),
    delete: ({ req }) => extraFull(req.user, 'contenusAnnexes'),
  },
  upload: {
    mimeTypes: ['image/*'],
    formatOptions: { format: 'webp', options: { quality: 80 } },
    resizeOptions: { width: 2400, withoutEnlargement: true },
    imageSizes: [
      { name: 'vignette', width: 400, formatOptions: { format: 'webp', options: { quality: 78 } } },
      { name: 'carte', width: 800, formatOptions: { format: 'webp', options: { quality: 78 } } },
      { name: 'grande', width: 1600, formatOptions: { format: 'webp', options: { quality: 80 } } },
    ],
    adminThumbnail: 'vignette',
    focalPoint: true,
  },
  fields: [
    {
      name: 'alt',
      label: 'Texte alternatif',
      type: 'text',
      required: true,
      admin: {
        description:
          'Décrit l’image pour les personnes qui ne la voient pas. Obligatoire pour publier.',
      },
    },
    { name: 'credits', label: 'Crédits', type: 'text' },
    {
      name: 'illustration',
      label: 'Photo d’illustration',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Cochée pour les photos de démonstration, à remplacer par de vraies photos de REC 242.',
      },
    },
  ],
}
