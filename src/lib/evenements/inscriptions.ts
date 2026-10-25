import type { PayloadRequest, Where } from 'payload'

import { envoyerPlaceLiberee, type Evenement, type Inscription } from './notifications'

const actives = (evenement: number): Where => ({ and: [{ evenement: { equals: evenement } }, { statut: { in: ['inscrit', 'present'] } }] })

/** Promotion de la première personne en attente quand une place se libère (e-mail 7). */
export async function promouvoir(req: PayloadRequest, evenementId: number, cible?: number) {
  const e = (await req.payload.findByID({ collection: 'events', id: evenementId, depth: 0, overrideAccess: true, req })) as unknown as Evenement & {
    capacite?: number | null
  }
  if (e.capacite) {
    const n = await req.payload.count({ collection: 'registrations', where: actives(evenementId), overrideAccess: true, req })
    if (n.totalDocs >= e.capacite && !cible) return null
  }
  const r = await req.payload.find({
    collection: 'registrations',
    where: { and: [{ evenement: { equals: evenementId } }, { statut: { equals: 'attente' } }, ...(cible ? [{ id: { equals: cible } }] : [])] },
    sort: 'position',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const premier = r.docs[0] as unknown as Inscription | undefined
  if (!premier) return null
  const promu = (await req.payload.update({
    collection: 'registrations',
    id: premier.id,
    data: { statut: 'inscrit', position: null } as never,
    overrideAccess: true,
    req,
    context: { promotion: true },
  })) as unknown as Inscription
  await envoyerPlaceLiberee(req.payload, e, promu, req)
  // Les positions suivantes avancent d'un rang.
  const suivants = await req.payload.find({
    collection: 'registrations',
    where: { and: [{ evenement: { equals: evenementId } }, { statut: { equals: 'attente' } }] },
    sort: 'position',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    req,
  })
  let p = 1
  for (const s of suivants.docs) await req.payload.db.updateOne({ collection: 'registrations', id: s.id, data: { position: p++ }, req, returning: false })
  return promu
}

