/**
 * Cellule d'un export CSV (séparateur « ; »).
 * Une valeur saisie par un visiteur ou un membre qui commence par = + - @, une tabulation ou un retour chariot
 * serait exécutée comme formule par le tableur : elle est préfixée d'une apostrophe. Les numéros de téléphone
 * (« +242 06 … ») restent tels quels.
 */
export function celluleCsv(v: unknown, toujoursGuillemets = false): string {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s) && !/^\+?[\d\s.()-]+$/.test(s)) s = `'${s}`
  return toujoursGuillemets || /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
