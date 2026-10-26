/**
 * Titres de la barre du haut du back-office : ceux de la maquette (`data-title` de chaque écran),
 * déduits de l'adresse affichée. La liste d'une collection porte le titre du menu, sa fiche celui de l'écran de détail.
 */
type Regle = { liste: string; fiche?: string }

const CONTENUS = 'Pages, menus et médias'

const COLLECTIONS: Record<string, Regle> = {
  applications: { liste: 'Candidatures', fiche: 'Candidature' },
  members: { liste: 'Membres et entreprises', fiche: 'Fiche membre' },
  events: { liste: 'Événements', fiche: 'Événement' },
  news: { liste: 'Actualités', fiche: 'Rédiger une actualité' },
  opportunities: { liste: 'Opportunités', fiche: 'Publier une opportunité' },
  contactMessages: { liste: 'Messages' },
  pages: { liste: CONTENUS, fiche: 'Modifier une page' },
  users: { liste: 'Utilisateurs et rôles' },
  auditLog: { liste: 'Journal des actions' },
  documents: { liste: 'Documents' },
  commissions: { liste: 'Commissions' },
  expertRequests: { liste: 'Demandes des membres' },
  // Les autres listes de l'écran « Pages, menus et médias » (onglets de la maquette).
  people: { liste: CONTENUS },
  faq: { liste: CONTENUS },
  partners: { liste: CONTENUS },
  testimonials: { liste: CONTENUS },
  media: { liste: CONTENUS },
  sectors: { liste: CONTENUS },
  localities: { liste: CONTENUS },
  eventTypes: { liste: CONTENUS },
  expertiseTags: { liste: CONTENUS },
}

const GLOBALS: Record<string, string> = {
  settings: 'Paramètres',
  emailTemplates: 'Paramètres',
  navigation: CONTENUS,
}

export const titreEcran = (pathname: string, adminRoute = '/admin'): string | null => {
  const chemin = pathname.startsWith(adminRoute) ? pathname.slice(adminRoute.length) : pathname
  const seg = chemin.split('/').filter(Boolean)
  if (seg.length === 0) return 'Tableau de bord'
  if (seg[0] === 'cotisations') return 'Cotisations'
  if (seg[0] === 'collections' && seg[1]) {
    const r = COLLECTIONS[seg[1]]
    if (!r) return null
    return seg[2] ? (r.fiche ?? r.liste) : r.liste
  }
  if (seg[0] === 'globals' && seg[1]) return GLOBALS[seg[1]] ?? null
  if (seg[0] === 'account') return 'Mon compte'
  return null
}
