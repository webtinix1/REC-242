import { createHmac, timingSafeEqual } from 'crypto'
import QRCode from 'qrcode'

/**
 * Contenu du QR code de la carte de membre (docs/07, écran 13) : numéro d'adhérent et signature.
 * Le scan à l'entrée d'un événement (lot 8) vérifie la signature puis relit la fiche : aucune donnée personnelle dans le QR.
 */
const signer = (numero: string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || 'rec242')
    .update(`carte:${numero}`)
    .digest('base64url')
    .slice(0, 22)

export const jetonCarte = (numero: string) => `REC242:M:${numero}:${signer(numero)}`

/** Numéro d'adhérent si le jeton est authentique, sinon null. */
export const verifierJetonCarte = (jeton: string): string | null => {
  const m = /^REC242:M:(REC-\d{4}-\d{4}):([\w-]{22})$/.exec(jeton.trim())
  if (!m) return null
  const attendu = signer(m[1])
  return timingSafeEqual(Buffer.from(m[2]), Buffer.from(attendu)) ? m[1] : null
}

/** QR code en SVG (modules sombres pleins, fond transparent : la carte fournit le fond). */
export const qrSvg = (texte: string) =>
  QRCode.toString(texte, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#171a17ff', light: '#00000000' } })

export const qrPng = (texte: string, largeur = 600) =>
  QRCode.toBuffer(texte, { type: 'png', margin: 1, width: largeur, errorCorrectionLevel: 'M' })
