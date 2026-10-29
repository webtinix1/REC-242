/**
 * Message d'erreur renvoyé par une action serveur au navigateur. Les refus métier sont levés par les hooks et les
 * fonctions d'accès avec `new APIError('…', 400 | 403 | 404 | 409 | 429, null, true)` : leur texte, en français, est
 * fait pour être lu par le membre et passe tel quel. Tout le reste (erreur de base de données, de stockage, erreur
 * interne de Payload en anglais, erreur JavaScript) est journalisé et remplacé par un message neutre.
 */
export const ERREUR_GENERIQUE = 'Une erreur est survenue. Réessayez dans un instant.'

type ErreurPayload = Error & { status?: number; isPublic?: boolean }

export function messagePublic(e: unknown, contexte = 'action'): string {
  const err = e as ErreurPayload
  // `name` vaut « APIError » seulement pour les erreurs levées par notre code : les sous-classes de Payload
  // (Forbidden, NotFound, ValidationError…) ont leur propre nom et un texte qui n'est pas destiné au membre.
  // Lecture par le nom plutôt que par `instanceof` : Payload peut être chargé deux fois (paquet externe et bundle).
  const publique = err instanceof Error && err.name === 'APIError' && err.isPublic === true
  if (publique && typeof err.status === 'number' && err.status >= 400 && err.status < 500 && err.message) return err.message
  if (err?.name === 'Forbidden') return 'Action non autorisée.'
  console.error(`[${contexte}]`, e)
  return ERREUR_GENERIQUE
}
