/**
 * Chargement des données de démonstration (dossier seed/ à la racine).
 * Lancement : pnpm seed. Idempotent : peut être relancé sans créer de doublons.
 * Chaque lot ajoute ici le chargement des collections qu'il crée.
 */
import type { Payload } from 'payload'

import { seedEmailTemplates } from './emailTemplates'
import { seedUsers } from './users'

export async function seed(payload: Payload): Promise<void> {
  await seedUsers(payload)
  await seedEmailTemplates(payload)
}
