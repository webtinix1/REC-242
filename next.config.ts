import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

const config = withPayload(nextConfig, { devBundleServerPackages: false })

// Payload envoie « Critical-CH: Sec-CH-Prefers-Color-Scheme » sur toutes les adresses (thème de l'admin).
// Sur le site, cet en-tête fait recommencer chaque première requête par le navigateur (environ 0,7 s perdue) :
// on le limite à l'admin.
const payloadHeaders = config.headers
config.headers = async () =>
  (payloadHeaders ? await payloadHeaders() : []).map((h) =>
    h.source === '/:path*' && h.headers.some((x) => x.key === 'Critical-CH')
      ? { ...h, source: '/admin/:path*' }
      : h,
  )

export default config
