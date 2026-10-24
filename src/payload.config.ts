import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { fr } from '@payloadcms/translations/languages/fr'

import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

import { AuditLog } from './collections/AuditLog'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { adminBadges } from './endpoints/adminBadges'
import { EmailTemplates } from './globals/EmailTemplates'

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
  collections: [Users, Media, AuditLog],
  globals: [EmailTemplates],
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
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    },
  }),
  plugins: [],
})
