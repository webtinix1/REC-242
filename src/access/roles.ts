/**
 * Rôles d'administration et matrice des droits (docs/04-roles-et-droits.md).
 * La matrice est la source unique : les fonctions d'accès et l'écran « Utilisateurs et rôles » la lisent.
 */
import type { Access, PayloadRequest } from 'payload'

export const ROLES = [
  { value: 'superadmin', label: 'Super administrateur' },
  { value: 'admin', label: 'Administrateur' },
  { value: 'editeur', label: 'Éditeur' },
  { value: 'evenements', label: 'Responsable événements' },
  { value: 'membres', label: 'Responsable membres' },
  { value: 'tresorier', label: 'Trésorier' },
] as const

export type Role = (typeof ROLES)[number]['value']

/** full : tous droits · partial : droits partiels · read : lecture seule · none : aucun accès */
export type Level = 'full' | 'partial' | 'read' | 'none'

export const DOMAINS = [
  { key: 'pages', label: 'Pages et menus' },
  { key: 'actualites', label: 'Actualités' },
  { key: 'evenements', label: 'Événements et inscrits' },
  { key: 'candidatures', label: 'Candidatures' },
  { key: 'membres', label: 'Fiches membres' },
  { key: 'exports', label: 'Exports de données personnelles' },
  { key: 'opportunites', label: 'Opportunités' },
  { key: 'cotisations', label: 'Cotisations et paiements' },
  { key: 'utilisateurs', label: 'Utilisateurs et rôles' },
  { key: 'parametres', label: 'Paramètres et SEO' },
  { key: 'journal', label: 'Journal des actions' },
] as const

export type Domain = (typeof DOMAINS)[number]['key']

const f: Level = 'full'
const p: Level = 'partial'
const r: Level = 'read'
const n: Level = 'none'

// Ordre des colonnes : superadmin, admin, editeur, evenements, membres, tresorier
const ROW = (...l: Level[]): Record<Role, Level> => ({
  superadmin: l[0],
  admin: l[1],
  editeur: l[2],
  evenements: l[3],
  membres: l[4],
  tresorier: l[5],
})

export const MATRIX: Record<Domain, Record<Role, Level>> = {
  pages: ROW(f, f, p, n, n, n),
  actualites: ROW(f, f, f, p, n, n),
  evenements: ROW(f, f, n, f, r, n),
  candidatures: ROW(f, f, n, n, f, r),
  membres: ROW(f, f, n, r, f, r),
  exports: ROW(f, f, n, p, f, p),
  opportunites: ROW(f, f, f, n, n, n),
  cotisations: ROW(f, f, n, n, r, f),
  utilisateurs: ROW(f, r, n, n, n, n),
  parametres: ROW(f, f, p, n, n, n),
  journal: ROW(f, r, n, n, n, n),
}

const RANK: Record<Level, number> = { none: 0, read: 1, partial: 2, full: 3 }

type MaybeUser = PayloadRequest['user'] | null | undefined

/** Vrai si l'utilisateur connecté appartient à l'équipe d'administration (collection users). */
export const isStaff = (user: MaybeUser): boolean =>
  Boolean(user && user.collection === 'users' && (user as { statut?: string }).statut !== 'desactive')

export const rolesOf = (user: MaybeUser): Role[] =>
  isStaff(user) ? (((user as { roles?: Role[] }).roles ?? []) as Role[]) : []

export const hasRole = (user: MaybeUser, ...roles: Role[]): boolean =>
  rolesOf(user).some((x) => roles.includes(x))

/** Niveau le plus élevé parmi les rôles de l'utilisateur (union des droits). */
export const levelFor = (user: MaybeUser, domain: Domain): Level =>
  rolesOf(user).reduce<Level>((best, role) => {
    const l = MATRIX[domain][role]
    return RANK[l] > RANK[best] ? l : best
  }, 'none')

export const atLeast = (user: MaybeUser, domain: Domain, level: Level): boolean =>
  RANK[levelFor(user, domain)] >= RANK[level]

/** Fonctions d'accès Payload générées pour un domaine. Les droits partiels se précisent dans chaque collection. */
export const domainAccess = (domain: Domain) => ({
  read: (({ req }) => atLeast(req.user, domain, 'read')) as Access,
  create: (({ req }) => atLeast(req.user, domain, 'partial')) as Access,
  update: (({ req }) => atLeast(req.user, domain, 'partial')) as Access,
  delete: (({ req }) => atLeast(req.user, domain, 'full')) as Access,
})

export const staffOnly: Access = ({ req }) => isStaff(req.user)
