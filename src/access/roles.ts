/**
 * Rôles d'administration et matrice des droits (docs/04-roles-et-droits.md).
 * La matrice est la source unique : les fonctions d'accès et l'écran « Utilisateurs et rôles » la lisent.
 */
import type { Access, FieldAccess, PayloadRequest } from 'payload'

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
  Boolean(
    user && user.collection === 'users' && (user as { statut?: string }).statut !== 'desactive',
  )

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

/**
 * Domaines ajoutés depuis la matrice de la maquette (docs/04-roles-et-droits.md, « Domaines ajoutés »).
 * full : accès complet · read : lecture dans le back-office.
 */
export const EXTRA_DOMAINS: Record<string, { full: Role[]; read: Role[] }> = {
  commissions: { full: ['superadmin', 'admin', 'membres'], read: ['editeur'] },
  gouvernance: { full: ['superadmin', 'admin'], read: ['editeur', 'membres'] },
  demandesMembres: { full: ['superadmin', 'admin', 'membres'], read: [] },
  documents: { full: ['superadmin', 'admin', 'editeur'], read: ['membres'] },
  discipline: { full: ['superadmin', 'admin'], read: ['membres'] },
  annuaireImprime: { full: ['superadmin', 'admin', 'membres'], read: ['tresorier'] },
  contenusAnnexes: { full: ['superadmin', 'admin', 'editeur'], read: [] },
}

export const extraFull = (user: MaybeUser, domain: keyof typeof EXTRA_DOMAINS): boolean =>
  hasRole(user, ...EXTRA_DOMAINS[domain].full)

export const extraRead = (user: MaybeUser, domain: keyof typeof EXTRA_DOMAINS): boolean =>
  hasRole(user, ...EXTRA_DOMAINS[domain].full, ...EXTRA_DOMAINS[domain].read)

/** Accès d'une collection publique (lecture libre côté site) gérée par un domaine ajouté. */
export const publicExtraAccess = (domain: keyof typeof EXTRA_DOMAINS) => ({
  read: (() => true) as Access,
  create: (({ req }) => extraFull(req.user, domain)) as Access,
  update: (({ req }) => extraFull(req.user, domain)) as Access,
  delete: (({ req }) => extraFull(req.user, domain)) as Access,
})

/** Membre au statut actif (collection `members`, lot 6). */
export const isActiveMember = (user: MaybeUser): boolean => {
  const u = user as { collection?: string; statut?: string } | null | undefined
  return u?.collection === 'members' && u.statut === 'actif'
}

/**
 * Champ d'un contenu « réservé aux membres » : lisible par l'équipe, les membres actifs, ou si le contenu est public.
 * Sans document (contrôle des filtres `where` de l'API), le champ est traité comme réservé : sinon un visiteur
 * reconstituerait le texte d'un contenu réservé par des filtres successifs.
 */
export const reservedFieldRead: FieldAccess = ({ req, doc }) =>
  isStaff(req.user) ||
  isActiveMember(req.user) ||
  (doc != null && !(doc as { reserveMembres?: boolean }).reserveMembres)
