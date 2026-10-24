/**
 * Chargement des données de démonstration (dossier seed/ à la racine).
 * Lancement : pnpm seed
 * Chaque lot ajoute ici le chargement des collections qu'il crée.
 * Le script est idempotent : il peut être relancé sans créer de doublons.
 */
import type { Payload } from 'payload'

export async function seed(payload: Payload): Promise<void> {
  payload.logger.info('Données de démonstration : rien à charger pour l’instant (lot 0).')
}
