import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { fr } from '@payloadcms/translations/languages/fr'

import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

import { searchPlugin } from '@payloadcms/plugin-search'
import { seoPlugin } from '@payloadcms/plugin-seo'

import { hasRole, isStaff } from './access/roles'
import { Applications } from './collections/Applications'
import { AuditLog } from './collections/AuditLog'
import { CommissionRequests } from './collections/CommissionRequests'
import { Commissions } from './collections/Commissions'
import { Companies } from './collections/Companies'
import { ConnectionRequests } from './collections/ConnectionRequests'
import { DirectoryAds } from './collections/DirectoryAds'
import { DisciplinaryCases } from './collections/DisciplinaryCases'
import { Dues } from './collections/Dues'
import { Events } from './collections/Events'
import { ExpertRequests } from './collections/ExpertRequests'
import { Fichiers } from './collections/Fichiers'
import { Opportunities } from './collections/Opportunities'
import { OpportunityReplies } from './collections/OpportunityReplies'
import { Registrations } from './collections/Registrations'
import { Counters } from './collections/Counters'
import { ContactMessages } from './collections/ContactMessages'
import { Documents } from './collections/Documents'
import { Faq } from './collections/Faq'
import { Media } from './collections/Media'
import { Members } from './collections/Members'
import { ModificationRequests } from './collections/ModificationRequests'
import { NetworkMessages } from './collections/NetworkMessages'
import { News } from './collections/News'
import { Pages } from './collections/Pages'
import { Partners } from './collections/Partners'
import { Payments } from './collections/Payments'
import { People } from './collections/People'
import { Pieces } from './collections/Pieces'
import { EventTypes, ExpertiseTags, Localities, Sectors } from './collections/taxonomies'
import { Testimonials } from './collections/Testimonials'
import { Users } from './collections/Users'
import { adminBadges } from './endpoints/adminBadges'
import { EmailTemplates } from './globals/EmailTemplates'
import { Navigation } from './globals/Navigation'
import { Settings } from './globals/Settings'
import { publierProgrammes } from './jobs/publierProgrammes'
import { demandesSansReponse } from './jobs/demandesSansReponse'
import { expirerOpportunites } from './jobs/expirerOpportunites'
import { rappelVeille } from './jobs/rappelVeille'
import { suiviAdhesionsTache } from './jobs/suiviAdhesions'
import { verifierPaiements } from './jobs/verifierPaiements'
import { withSiteRevalidation } from './hooks/revalidate'
import { searchConfig } from './search/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Secret de signature (sessions, jetons des liens) : en production, l'application refuse de démarrer avec la valeur
 * d'exemple ou un secret de moins de 32 caractères. La compilation (`next build`) n'est pas bloquée : le secret est
 * vérifié au démarrage du serveur.
 */
function secretVerifie(): string {
  const secret = process.env.PAYLOAD_SECRET || ''
  const compilation = process.env.NEXT_PHASE === 'phase-production-build'
  if (process.env.NODE_ENV === 'production' && !compilation) {
    if (['a-remplacer', 'YOUR_SECRET_HERE'].includes(secret.trim()) || secret.length < 32)
      throw new Error('PAYLOAD_SECRET doit être un secret aléatoire d’au moins 32 caractères en production (par exemple : openssl rand -hex 32).')
  }
  return secret
}

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  i18n: {
    supportedLanguages: { fr },
    fallbackLanguage: 'fr',
    // Libellés des boutons de la maquette du back-office (écrans 10, 15, 20, 22).
    translations: {
      fr: {
        general: { save: 'Enregistrer' },
        version: { preview: 'Prévisualiser', publishChanges: 'Publier' },
      },
    },
  },
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' · REC 242',
      icons: [{ rel: 'icon', url: '/images/logo-rec242.jpg' }],
    },
    dateFormat: 'd MMM yyyy, HH:mm',
    // La maquette n'a qu'un thème clair : sans ce réglage, Payload suit le thème sombre du système et le fond devient noir.
    theme: 'light',
    avatar: 'default',
    components: {
      Nav: '@/components/admin/Nav#Nav',
      header: ['@/components/admin/BarreHaut#BarreHaut'],
      providers: ['@/components/admin/AccessibiliteNative#AccessibiliteNative'],
      views: {
        dashboard: { Component: '@/components/admin/tableau/TableauDeBord#TableauDeBord' },
        cotisations: {
          Component: '@/components/admin/cotisations/CotisationsView#CotisationsView',
          path: '/cotisations',
          // Titre de l'onglet du navigateur (sans lui, Payload affiche « Payload »).
          meta: { title: 'Cotisations' },
        },
      },
      graphics: {
        Logo: '@/components/admin/Graphics#Logo',
        Icon: '@/components/admin/Graphics#Icon',
      },
      beforeLogin: ['@/components/admin/LoginNote#BeforeLogin'],
      afterLogin: ['@/components/admin/LoginNote#AfterLogin'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Members,
    Companies,
    ModificationRequests,
    NetworkMessages,
    ConnectionRequests,
    DirectoryAds,
    Events,
    Registrations,
    Opportunities,
    OpportunityReplies,
    Fichiers,
    ExpertRequests,
    CommissionRequests,
    Dues,
    DisciplinaryCases,
    Pages,
    News,
    Documents,
    Media,
    People,
    Commissions,
    Partners,
    Faq,
    Testimonials,
    ContactMessages,
    Applications,
    Payments,
    Pieces,
    Counters,
    Sectors,
    Localities,
    EventTypes,
    ExpertiseTags,
    AuditLog,
  ].map((c) => withSiteRevalidation(c, 'collection')),
  globals: [Settings, Navigation, EmailTemplates].map((g) => withSiteRevalidation(g, 'global')),
  jobs: {
    tasks: [publierProgrammes, verifierPaiements, rappelVeille, expirerOpportunites, demandesSansReponse, suiviAdhesionsTache],
    // En développement et sur le VPS (serveur Node permanent), les tâches tournent dans le processus de l'application.
    autoRun: [{ cron: '* * * * *', queue: 'minute' }],
    // Lancement manuel des tâches (/api/payload-jobs/run) : administrateurs actifs seulement (compte désactivé exclu).
    access: { run: ({ req }) => isStaff(req.user) && hasRole(req.user, 'superadmin', 'admin') },
  },
  endpoints: [adminBadges],
  editor: lexicalEditor(),
  secret: secretVerifie(),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  email: nodemailerAdapter({
    defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'contact@rec242.cg',
    defaultFromName: process.env.EMAIL_FROM_NAME || 'REC 242',
    transportOptions: {
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: Number(process.env.SMTP_PORT || 1025),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    },
  }),
  plugins: [
    searchPlugin(searchConfig),
    seoPlugin({
      // Les champs de référencement des pages et des actualités sont placés dans leurs formulaires (src/fields/seo.ts).
      collections: [],
      uploadsCollection: 'media',
      tabbedUI: false,
      generateTitle: ({ doc }) =>
        `${(doc as { title?: string; titre?: string }).title ?? (doc as { titre?: string }).titre ?? ''} · REC 242`,
      generateDescription: ({ doc }) => (doc as { chapeau?: string }).chapeau ?? '',
    }),
  ],
})
