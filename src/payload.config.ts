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

import { Applications } from './collections/Applications'
import { AuditLog } from './collections/AuditLog'
import { Commissions } from './collections/Commissions'
import { Companies } from './collections/Companies'
import { ConnectionRequests } from './collections/ConnectionRequests'
import { DirectoryAds } from './collections/DirectoryAds'
import { Events } from './collections/Events'
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
import { expirerOpportunites } from './jobs/expirerOpportunites'
import { rappelVeille } from './jobs/rappelVeille'
import { verifierPaiements } from './jobs/verifierPaiements'
import { withSiteRevalidation } from './hooks/revalidate'
import { searchConfig } from './search/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  i18n: {
    supportedLanguages: { fr },
    fallbackLanguage: 'fr',
  },
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' · REC 242',
      icons: [{ rel: 'icon', url: '/images/logo-rec242.jpg' }],
    },
    dateFormat: 'd MMM yyyy, HH:mm',
    avatar: 'default',
    components: {
      Nav: '@/components/admin/Nav#Nav',
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
    tasks: [publierProgrammes, verifierPaiements, rappelVeille, expirerOpportunites],
    // En développement et sur le VPS (serveur Node permanent), les tâches tournent dans le processus de l'application.
    autoRun: [{ cron: '* * * * *', queue: 'minute' }],
    access: { run: ({ req }) => Boolean(req.user && req.user.collection === 'users') },
  },
  endpoints: [adminBadges],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
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
      collections: ['pages', 'news'],
      uploadsCollection: 'media',
      tabbedUI: false,
      generateTitle: ({ doc }) =>
        `${(doc as { title?: string; titre?: string }).title ?? (doc as { titre?: string }).titre ?? ''} · REC 242`,
      generateDescription: ({ doc }) => (doc as { chapeau?: string }).chapeau ?? '',
    }),
  ],
})
