import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/**
 * Purge des données laissées par les tests automatisés (E2E, tests d'intégration) : membres, candidatures, fiches,
 * annonces, inscriptions, messages et leurs échanges. Exécutée en début de seed ; sans effet sur une base propre.
 */
export async function purgerTests(payload: Payload): Promise<void> {
  const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }).drizzle
  const run = (q: unknown) => db.execute(q)

  const MEM = sql`(SELECT id FROM members WHERE email LIKE '%@e2e.test' OR email LIKE '%@test.rec242.test' OR (prenom = 'Membre' AND nom = 'Parcours'))`
  const APPS = sql`(SELECT id FROM applications WHERE email LIKE '%@e2e.test' OR raison_sociale LIKE 'Boutique E2E%' OR raison_sociale ~ '^Boutique 17[0-9]+$' OR membre_id IN ${MEM})`
  const OPPS = sql`(SELECT id FROM opportunities WHERE titre LIKE 'Annonce E2E%' OR membre_id IN ${MEM})`

  await run(sql`DELETE FROM registrations WHERE visiteur_email LIKE '%@e2e.test' OR membre_id IN ${MEM}`)
  await run(sql`DELETE FROM registrations WHERE visiteur_email LIKE 'test-agent@%' OR visiteur_email LIKE '%@test.rec242.test'`)
  await run(sql`DELETE FROM expert_requests WHERE membre_id IN ${MEM}`)
  await run(sql`DELETE FROM connection_requests WHERE demandeur_id IN ${MEM} OR destinataire_id IN ${MEM}`)
  await run(sql`DELETE FROM opportunity_replies WHERE membre_id IN ${MEM} OR opportunite_id IN ${OPPS}`)
  await run(sql`DELETE FROM opportunities WHERE id IN ${OPPS}`)
  await run(sql`DELETE FROM network_messages WHERE membre_id IN ${MEM}`)
  await run(sql`DELETE FROM directory_ads WHERE membre_id IN ${MEM}`)
  await run(sql`DELETE FROM fichiers WHERE proprietaire_id IN ${MEM} OR destinataire_id IN ${MEM}`)
  await run(sql`DELETE FROM commission_requests WHERE membre_id IN ${MEM}`)
  await run(sql`DELETE FROM modification_requests WHERE membre_id IN ${MEM}`)
  await run(sql`DELETE FROM disciplinary_cases WHERE membre_id IN ${MEM}`)
  await run(sql`DELETE FROM payments WHERE membre_id IN ${MEM} OR candidature_id IN ${APPS}`)
  await run(sql`DELETE FROM dues WHERE membre_id IN ${MEM}`)
  await run(sql`DELETE FROM contact_messages WHERE email LIKE '%@e2e.test'`)
  await run(sql`DELETE FROM companies WHERE titulaire_id IN ${MEM} OR nom ~ '^(Atelier|Boutique|Fiche) 17[0-9]+$'`)
  await run(sql`DELETE FROM members WHERE id IN ${MEM}`)
  await run(sql`DELETE FROM applications WHERE id IN ${APPS}`)
  // Experts créés par les tests d'intégration (« Expert A 1793… »).
  await run(sql`DELETE FROM expert_requests WHERE personne_id IN (SELECT id FROM people WHERE nom ~ '^Expert [AB] [0-9]+$')`)
  await run(sql`DELETE FROM people WHERE nom ~ '^Expert [AB] [0-9]+$'`)
  // Versions orphelines (actualités et pages supprimées par les tests) : la liste de l'admin les affiche comme des brouillons.
  await run(sql`DELETE FROM _news_v WHERE parent_id IS NULL`)
  await run(sql`DELETE FROM _pages_v WHERE parent_id IS NULL`)
  // Comptes d'administration créés par les tests E2E (invitations).
  await run(sql`DELETE FROM users WHERE email LIKE '%@e2e.test'`)
  payload.logger.info('Données de test automatisé purgées.')
}
