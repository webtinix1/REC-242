import type { Payload, PayloadRequest, Where } from 'payload'

import { emailNormalise, telephoneInternational } from './categories'

/**
 * Anti-doublon (docs/05-regles-metier.md §2) : l'e-mail (minuscules, sans espaces) et le téléphone (format international)
 * sont comparés à toutes les candidatures en cours ou validées et à tous les membres non radiés.
 * Une candidature refusée ou archivée, ou un ancien membre, n'empêche pas une nouvelle demande.
 */
export async function existeDoublon(
  payload: Payload,
  c: { email?: string | null; telephone?: string | null },
  opts: { sauf?: number | string; req?: Partial<PayloadRequest> } = {},
): Promise<boolean> {
  const email = emailNormalise(c.email)
  const telephone = telephoneInternational(c.telephone)
  if (!email && !telephone) return false
  const coords: Where[] = []
  if (email) coords.push({ email: { equals: email } })
  if (telephone) coords.push({ telephone: { equals: telephone } })

  const candidatures = await payload.count({
    collection: 'applications',
    overrideAccess: true,
    req: opts.req as PayloadRequest | undefined,
    where: {
      and: [
        { or: coords },
        { statut: { not_in: ['refusee', 'archivee'] } },
        ...(opts.sauf ? [{ id: { not_equals: opts.sauf } }] : []),
      ],
    },
  })
  if (candidatures.totalDocs) return true

  if (payload.config.collections.some((x) => (x.slug as string) === 'members')) {
    const membres = await payload.count({
      collection: 'members' as never,
      overrideAccess: true,
      req: opts.req as PayloadRequest | undefined,
      where: { and: [{ or: coords }, { statut: { not_equals: 'ancien' } }] } as never,
    })
    if (membres.totalDocs) return true
  }
  return false
}
