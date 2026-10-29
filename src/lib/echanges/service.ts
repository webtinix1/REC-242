import 'server-only'
import type { Payload, Where } from 'payload'

/**
 * « Mes échanges » (écran membre 10) : quatre sources, une boîte de réception. Ce n'est pas une messagerie libre :
 * on n'écrit que dans un fil ouvert par une mise en relation acceptée, une réponse à une annonce ou une demande à un expert.
 * Les non-lus sont tenus par `nonLuPar` (mises en relation, réponses aux annonces), `nonLuMembre` (experts) et `luPar` (messages du réseau).
 */
export type Onglet = 'relations' | 'annonces' | 'experts' | 'reseau'

const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))

export const whereNonLus = (membre: number): Record<Onglet, { collection: string; where: Where }> => ({
  relations: { collection: 'connectionRequests', where: { nonLuPar: { in: [membre] } } },
  annonces: { collection: 'opportunityReplies', where: { nonLuPar: { in: [membre] } } },
  experts: { collection: 'expertRequests', where: { and: [{ membre: { equals: membre } }, { nonLuMembre: { equals: true } }] } },
  reseau: {
    collection: 'networkMessages',
    // Le filtre « pas encore lu » est appliqué ensuite en code (luPar est une liste).
    where: { or: [{ membre: { equals: membre } }, { tous: { equals: true } }] },
  },
})

/** Compteurs de non-lus par onglet (pastille du menu et des onglets). */
export async function nonLus(payload: Payload, membre: number): Promise<Record<Onglet, number> & { total: number }> {
  const w = whereNonLus(membre)
  const entrees = await Promise.all(
    (Object.keys(w) as Onglet[]).map(async (k) => {
      if (k !== 'reseau') return [k, (await payload.count({ collection: w[k].collection as never, where: w[k].where, overrideAccess: true })).totalDocs] as const
      const r = await payload.find({ collection: 'networkMessages', where: w.reseau.where, depth: 0, limit: 500, overrideAccess: true, select: { luPar: true } })
      return [k, r.docs.filter((d) => !((d as unknown as { luPar?: unknown[] }).luPar ?? []).map(idDe).includes(membre)).length] as const
    }),
  )
  const r = Object.fromEntries(entrees) as Record<Onglet, number>
  return { ...r, total: Object.values(r).reduce((a, b) => a + b, 0) }
}

/** Retire le membre de la liste des non-lus d'un fil, seulement si ce fil est le sien (sinon rien n'est écrit). */
export async function marquerLu(payload: Payload, onglet: Onglet, id: number, membre: number) {
  const collection =
    onglet === 'experts' ? 'expertRequests' : onglet === 'relations' ? 'connectionRequests' : onglet === 'annonces' ? 'opportunityReplies' : 'networkMessages'
  const doc = (await payload
    .findByID({ collection: collection as never, id, depth: onglet === 'annonces' ? 1 : 0, overrideAccess: true })
    .catch(() => null)) as unknown as {
    nonLuPar?: unknown[]
    luPar?: unknown[]
    membre?: unknown
    tous?: boolean
    demandeur?: unknown
    destinataire?: unknown
    opportunite?: { membre?: unknown } | null
  } | null
  if (!doc) return
  const sien =
    onglet === 'experts'
      ? idDe(doc.membre) === membre
      : onglet === 'relations'
        ? idDe(doc.demandeur) === membre || idDe(doc.destinataire) === membre
        : onglet === 'annonces'
          ? idDe(doc.membre) === membre || idDe(doc.opportunite?.membre) === membre
          : Boolean(doc.tous) || idDe(doc.membre) === membre
  if (!sien) return
  if (onglet === 'experts') {
    await payload.db.updateOne({ collection: 'expertRequests', id, data: { nonLuMembre: false }, returning: false })
    return
  }
  if (onglet === 'reseau') {
    const lus = (doc.luPar ?? []).map(idDe)
    if (!lus.includes(membre)) await payload.update({ collection: 'networkMessages', id, data: { luPar: [...lus, membre] } as never, overrideAccess: true })
    return
  }
  const reste = (doc.nonLuPar ?? []).map(idDe).filter((x) => x !== membre)
  await payload.update({ collection: collection as never, id, data: { nonLuPar: reste } as never, overrideAccess: true, context: { systeme: true } })
}
