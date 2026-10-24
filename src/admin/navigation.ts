/**
 * Menu de gauche du back-office, dans l'ordre de la maquette (captures/back-office).
 * Une entrée n'apparaît que si sa collection, son global ou sa vue existe et si l'utilisateur y a accès.
 * Les collections visibles qui ne figurent pas ici sont regroupées en bas sous « Autres ».
 */
export type NavItem =
  | { label: string; collection: string; badge?: string }
  | { label: string; global: string; badge?: string }
  | { label: string; view: string; path: string; requires?: string; badge?: string }

export type NavGroupDef = { label: string; items: NavItem[] }

export const NAV: NavGroupDef[] = [
  { label: 'Pilotage', items: [{ label: 'Tableau de bord', view: 'dashboard', path: '' }] },
  {
    label: 'Adhésions',
    items: [
      { label: 'Candidatures', collection: 'applications', badge: 'candidatures' },
      { label: 'Membres et entreprises', collection: 'members', badge: 'membres' },
      { label: 'Cotisations', view: 'cotisations', path: '/cotisations', requires: 'dues' },
    ],
  },
  {
    label: 'Activité',
    items: [
      { label: 'Événements', collection: 'events' },
      { label: 'Commissions', collection: 'commissions', badge: 'commissions' },
      { label: 'Opportunités', collection: 'opportunities', badge: 'opportunites' },
      { label: 'Demandes des membres', view: 'demandes', path: '/demandes', requires: 'expertRequests', badge: 'demandes' },
      { label: 'Messages', collection: 'contactMessages', badge: 'messages' },
    ],
  },
  {
    label: 'Contenus',
    items: [
      { label: 'Actualités', collection: 'news' },
      { label: 'Pages, menus, médias', view: 'contenus', path: '/contenus', requires: 'pages' },
      { label: 'Documents', collection: 'documents' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Paramètres', global: 'settings' },
      { label: 'Utilisateurs et rôles', collection: 'users' },
      { label: 'Journal', collection: 'auditLog' },
    ],
  },
]
