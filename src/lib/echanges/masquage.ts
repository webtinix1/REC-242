/**
 * Les échanges entre membres restent sur la plateforme (décision de Webtinix du 28/10/2026) : numéros de téléphone,
 * adresses e-mail et liens de messagerie écrits dans un message sont remplacés, pour tout le monde, équipe comprise.
 * Appliqué par le serveur à l'enregistrement, puis de nouveau à l'affichage pour les messages plus anciens.
 */
export const COORDONNEE_MASQUEE = '[coordonnée masquée]'

// Adresse e-mail, y compris écrite « nom (at) domaine (dot) cg » pour contourner le filtre.
const EMAIL = /[\p{L}\d._%+-]+\s*(?:@|\(at\)|\[at\]|\s+at\s+|\s+arobase\s+)\s*[\p{L}\d-]+(?:\s*(?:\.|\(dot\)|\[dot\]|\s+dot\s+|\s+point\s+)\s*[\p{L}\d-]+)+/giu

// Liens qui ouvrent une conversation hors de la plateforme.
const LIEN = /\b(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|web\.whatsapp\.com|t\.me|telegram\.me|m\.me|signal\.me)\/?\S*/giu

// Numéro de téléphone : au moins 8 chiffres, séparés ou non (espaces, points, tirets, parenthèses), avec ou sans indicatif.
// Un montant (« 10 000 000 FCFA ») n'est pas un numéro.
const TELEPHONE = /(?:\+|\b00)?\d(?:[\s.\-()]{0,3}\d){7,}(?!\s*(?:FCFA|F\s?CFA|XAF|francs?\b|F\b))/giu
// Une date (« 12.11.2026 », « 12-11-2026 ») n'est pas un numéro.
const DATE = /^\d{1,2}[.\-]\d{1,2}[.\-]\d{2,4}$/

export function masquerCoordonnees(texte: string): string {
  return texte
    .replace(LIEN, COORDONNEE_MASQUEE)
    .replace(EMAIL, COORDONNEE_MASQUEE)
    .replace(TELEPHONE, (x) => (DATE.test(x.trim()) ? x : COORDONNEE_MASQUEE))
}
