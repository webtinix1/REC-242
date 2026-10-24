import type { Endpoint, Payload, PayloadRequest } from 'payload'

import { isStaff } from '@/access/roles'

/**
 * Compteurs des pastilles rouges du menu. Chaque compteur est calculé avec les droits de l'utilisateur
 * (overrideAccess: false) : un rôle qui ne voit pas une collection reçoit 0.
 * Les lots suivants ajoutent ici leurs compteurs.
 */
type Counter = (payload: Payload, req: PayloadRequest) => Promise<number>

const countIf =
  (collection: string, where: Record<string, unknown>): Counter =>
  async (payload, req) => {
    if (!payload.config.collections.some((c) => c.slug === collection)) return 0
    try {
      const r = await payload.count({
        collection: collection as never,
        where: where as never,
        req,
        overrideAccess: false,
      })
      return r.totalDocs
    } catch {
      return 0
    }
  }

export const BADGES: Record<string, Counter> = {
  candidatures: countIf('applications', { statut: { in: ['recue', 'en-examen', 'complement'] } }),
  membres: countIf('modificationRequests', { statut: { equals: 'en-attente' } }),
  commissions: countIf('commissionRequests', { statut: { equals: 'en-attente' } }),
  opportunites: countIf('opportunities', { statut: { equals: 'a-moderer' } }),
  demandes: countIf('expertRequests', { statut: { equals: 'sans-reponse' } }),
  messages: countIf('contactMessages', { statut: { equals: 'a-traiter' } }),
}

export const adminBadges: Endpoint = {
  path: '/admin-badges',
  method: 'get',
  handler: async (req) => {
    if (!isStaff(req.user)) return Response.json({}, { status: 401 })
    const entries = await Promise.all(
      Object.entries(BADGES).map(async ([k, fn]) => [k, await fn(req.payload, req)] as const),
    )
    return Response.json(Object.fromEntries(entries), { headers: { 'Cache-Control': 'no-store' } })
  },
}
