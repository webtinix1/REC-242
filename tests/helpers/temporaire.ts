import { getPayload, type CollectionSlug } from 'payload'

import config from '../../src/payload.config.js'

/**
 * Modifie un document de démonstration le temps d'un test, puis remet ses valeurs d'origine, même si le test échoue.
 * Écriture directe en base (sans hooks) : seulement des champs simples, au premier niveau.
 */
export async function temporairement<T>(
  collection: CollectionSlug,
  champ: string,
  valeur: string,
  data: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const payload = await getPayload({ config })
  const doc = (await payload.find({ collection, where: { [champ]: { equals: valeur } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as
    | (Record<string, unknown> & { id: number })
    | undefined
  if (!doc) throw new Error(`${collection} : aucun document où ${champ} = ${valeur}`)
  const origine = Object.fromEntries(Object.keys(data).map((k) => [k, doc[k] ?? null]))
  await payload.db.updateOne({ collection, id: doc.id, data, returning: false })
  try {
    return await fn()
  } finally {
    await payload.db.updateOne({ collection, id: doc.id, data: origine, returning: false })
  }
}
