/**
 * Format réel d'un fichier envoyé par un membre, lu dans ses premiers octets (« octets magiques ») : le type annoncé par
 * le navigateur ne compte pas. Rien n'est analysé au-delà, pour qu'un fichier piégé (un SVG nommé « photo.png », par
 * exemple) n'atteigne jamais une bibliothèque de traitement d'image.
 */
export type FormatReel = 'jpeg' | 'png' | 'webp' | 'pdf'

export const MIME: Record<FormatReel, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' }

export function formatReel(octets: Uint8Array): FormatReel | null {
  const debut = (...attendus: number[]) => attendus.every((v, i) => octets[i] === v)
  if (debut(0xff, 0xd8, 0xff)) return 'jpeg'
  if (debut(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png'
  // « RIFF » … « WEBP »
  if (debut(0x52, 0x49, 0x46, 0x46) && octets[8] === 0x57 && octets[9] === 0x45 && octets[10] === 0x42 && octets[11] === 0x50) return 'webp'
  if (debut(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'pdf'
  return null
}
