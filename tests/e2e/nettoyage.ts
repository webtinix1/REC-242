import { getPayload, type Where } from 'payload'
import config from '../../src/payload.config'

/**
 * Après la suite E2E : retire les données créées par les tests (adresses `@e2e.test`, annonces « Annonce E2E »),
 * pour que les écrans de démonstration restent ceux de la maquette.
 */
export default async function nettoyage() {
  const payload = await getPayload({ config })
  const suppr = async (collection: string, where: Where) => {
    try {
      await payload.delete({ collection: collection as never, where, overrideAccess: true, context: { sansEmail: true } })
    } catch (err) {
      payload.logger.warn({ err, collection }, 'Nettoyage E2E incomplet')
    }
  }
  const membres = await payload.find({ collection: 'members', where: { email: { like: '@e2e.test' } }, depth: 0, limit: 1000, overrideAccess: true })
  const ids = membres.docs.map((m) => m.id)
  await suppr('opportunities', { titre: { like: 'Annonce E2E' } })
  await suppr('registrations', { 'visiteur.email': { like: '@e2e.test' } })
  if (ids.length) {
    for (const c of ['registrations', 'payments', 'dues', 'modificationRequests', 'expertRequests', 'commissionRequests', 'opportunityReplies', 'opportunities', 'networkMessages'])
      await suppr(c, { membre: { in: ids } })
    await suppr('connectionRequests', { or: [{ demandeur: { in: ids } }, { destinataire: { in: ids } }] })
    await suppr('companies', { titulaire: { in: ids } })
    await suppr('members', { id: { in: ids } })
  }
  const cands = await payload.find({ collection: 'applications', where: { email: { like: '@e2e.test' } }, depth: 0, limit: 1000, overrideAccess: true })
  if (cands.docs.length) {
    await suppr('payments', { candidature: { in: cands.docs.map((c) => c.id) } })
    await suppr('applications', { id: { in: cands.docs.map((c) => c.id) } })
  }
}
