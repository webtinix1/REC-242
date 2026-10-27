import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const prod = process.env.NODE_ENV === 'production'

/**
 * Politique de sécurité du contenu (lot 12). Tout est servi par le site lui-même (polices, images, scripts) ;
 * aucun service tiers n'est chargé par le navigateur (paiements mobiles appelés par le serveur).
 * - 'unsafe-inline' : scripts inline de Next (données du rendu, JSON-LD) sur des pages statiques ou revalidées,
 *   incompatibles avec un nonce par requête ; 'unsafe-eval' seulement en développement (React, rechargement à chaud).
 * - Admin : l'éditeur des champs JSON de Payload (Monaco) se charge depuis cdn.jsdelivr.net.
 * - frame-ancestors 'self' : l'aperçu en direct de l'admin affiche le site (/apercu) dans un cadre de la même origine.
 */
const csp = (admin: boolean) => {
  const cdn = admin ? ' https://cdn.jsdelivr.net' : ''
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${prod ? '' : " 'unsafe-eval'"}${cdn}`,
    `style-src 'self' 'unsafe-inline'${cdn}`,
    "img-src 'self' data: blob:",
    `font-src 'self' data:${cdn}`,
    `connect-src 'self'${prod ? '' : ' ws: wss:'}${cdn}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(prod ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

/** Caméra autorisée seulement dans l'admin (scanner de pointage des événements). */
const permissions = (camera: boolean) =>
  `camera=(${camera ? 'self' : ''}), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()`

const securite = (admin: boolean) => [
  { key: 'Content-Security-Policy', value: csp(admin) },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: permissions(admin) },
  // HTTPS seulement : en production (le développement tourne en http://localhost).
  ...(prod ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
]

const nextConfig: NextConfig = {
  // La règle de l'admin vient après la règle générale : pour une même clé, Next garde la dernière.
  headers: async () => [
    { source: '/:path*', headers: securite(false) },
    { source: '/admin', headers: securite(true) },
    { source: '/admin/:path*', headers: securite(true) },
    // Fichiers statiques du site public : polices (jamais modifiées à la même adresse), images et script d'animation, médiathèque publique.
    { source: '/fonts/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/images/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    { source: '/js/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=86400' }] },
    { source: '/api/media/file/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=86400' }] },
  ],
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
