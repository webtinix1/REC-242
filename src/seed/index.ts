/**
 * Chargement des données de démonstration (dossier seed/ à la racine).
 * Lancement : pnpm seed. Idempotent : peut être relancé sans créer de doublons.
 * Chaque lot ajoute ici le chargement des collections qu'il crée.
 */
import type { Payload } from 'payload'

import { alignerSurMaquette, renumeroterRecus } from './alignement'
import { seedContenus } from './contenus'
import { seedEmailTemplates } from './emailTemplates'
import { seedCandidatures } from './candidatures'
import { seedCotisations } from './cotisations'
import { seedEchanges } from './echanges'
import { seedEvenements } from './evenements'
import { seedMembres } from './membres'
import { seedMessages } from './messages'
import { seedOpportunites } from './opportunites'
import { purgerTests } from './purge'
import { seedUsers } from './users'

export async function seed(payload: Payload): Promise<void> {
  await purgerTests(payload)
  await seedUsers(payload)
  await seedEmailTemplates(payload)
  const editeur = await payload.find({
    collection: 'users',
    where: { email: { equals: 'yohan.dinga@rec242.test' } },
    limit: 1,
    overrideAccess: true,
  })
  await seedContenus(payload, editeur.docs[0]?.id as number | undefined)
  await seedMessages(payload)
  await seedCandidatures(payload)
  await seedMembres(payload)
  await seedCotisations(payload)
  await renumeroterRecus(payload)
  await seedEvenements(payload)
  await seedOpportunites(payload)
  await seedEchanges(payload)
  await alignerSurMaquette(payload)
}
