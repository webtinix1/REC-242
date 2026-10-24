import { createHash } from 'crypto'
import type { PayloadRequest } from 'payload'

/** Adresse IP du client (derrière Nginx : X-Forwarded-For). */
export const clientIp = (req?: Partial<PayloadRequest> | null): string => {
  const h = req?.headers
  const fwd = h?.get?.('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return h?.get?.('x-real-ip') ?? ''
}

/**
 * Ville du client si le frontal la transmet (en-tête posé par Nginx avec GeoIP, ou par un CDN).
 * Sans information, on renvoie une chaîne vide : on n'invente pas de ville.
 */
export const clientCity = (req?: Partial<PayloadRequest> | null): string => {
  const h = req?.headers
  const v = h?.get?.('x-geo-city') || h?.get?.('cf-ipcity') || h?.get?.('x-vercel-ip-city') || ''
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export const userAgent = (req?: Partial<PayloadRequest> | null): string => req?.headers?.get?.('user-agent') ?? ''

/** Empreinte d'appareil : navigateur et système, sans numéro de version mineure, pour reconnaître un appareil connu. */
export const deviceKey = (ua: string): string => {
  const simplified = ua.replace(/\d+(\.\d+)+/g, (m) => m.split('.')[0])
  return createHash('sha256').update(simplified).digest('hex').slice(0, 16)
}

/** Libellé lisible de l'appareil, pour l'e-mail d'alerte. */
export const deviceLabel = (ua: string): string => {
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'système inconnu'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'navigateur inconnu'
  return `${browser} sur ${os}`
}
