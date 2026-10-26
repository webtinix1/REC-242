import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../../src/payload.config'
import { purgerTests } from '../../src/seed/purge'

/**
 * Après la suite d'intégration : retire les données créées par les tests (adresses `@test.rec242.test` et `@e2e.test`,
 * experts de test), pour que les écrans de démonstration restent ceux de la maquette.
 */
export async function teardown() {
  const payload = await getPayload({ config })
  await purgerTests(payload)
  await payload.destroy()
}
