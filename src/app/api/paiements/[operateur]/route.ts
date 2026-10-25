import config from '@payload-config'
import { getPayload } from 'payload'

import { verifierPaiement } from '@/lib/paiements/service'

/**
 * Rappel des opérateurs de paiement mobile (MTN MoMo : X-Reference-Id ; Airtel Money : transaction.id).
 * Le contenu du rappel ne fait pas foi : on retrouve le paiement puis on relit son statut chez l'opérateur.
 */
export async function POST(req: Request, { params }: { params: Promise<{ operateur: string }> }) {
  const { operateur } = await params
  if (operateur !== 'mtn' && operateur !== 'airtel') return Response.json({ ok: false }, { status: 404 })
  const corps = (await req.json().catch(() => ({}))) as {
    referenceId?: string
    externalId?: string
    transaction?: { id?: string }
  }
  const id = req.headers.get('x-reference-id') || corps.referenceId || corps.transaction?.id
  if (!id) return Response.json({ ok: false }, { status: 400 })
  const payload = await getPayload({ config })
  const r = await payload.find({
    collection: 'payments',
    where: { and: [{ idOperateur: { equals: id } }, { mode: { equals: operateur } }] },
    overrideAccess: true,
    depth: 0,
    limit: 1,
  })
  const p = r.docs[0]
  if (p) await verifierPaiement(payload, p as never)
  return Response.json({ ok: true })
}

// MTN MoMo envoie le rappel en PUT.
export const PUT = POST
