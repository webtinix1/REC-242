/**
 * Chargement des données de démonstration (dossier seed/ à la racine).
 * Lancement : pnpm seed. Idempotent : peut être relancé sans créer de doublons.
 * Chaque lot ajoute ici le chargement des collections qu'il crée.
 */
import type { Payload } from 'payload'

import { seedContenus } from './contenus'
import { seedEmailTemplates } from './emailTemplates'
import { seedUsers } from './users'

export async function seed(payload: Payload): Promise<void> {
  await seedUsers(payload)
  await seedEmailTemplates(payload)
  const editeur = await payload.find({
    collection: 'users',
    where: { email: { equals: 'yohan.dinga@rec242.test' } },
    limit: 1,
    overrideAccess: true,
  })
  await seedContenus(payload, editeur.docs[0]?.id as number | undefined)
}
