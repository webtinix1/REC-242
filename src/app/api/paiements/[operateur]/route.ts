import config from '@payload-config'
import { getPayload } from 'payload'

import { autoriserEnvoi, ipDe } from '@/lib/antispam'
import { verifierPaiement } from '@/lib/paiements/service'

/**
 * Rappel des opérateurs de paiement mobile (MTN MoMo : X-Reference-Id ; Airtel Money : transaction.id).
 * Le contenu du rappel ne fait pas foi : on retrouve le paiement puis on relit son statut chez l'opérateur.
 * Route publique : nombre de rappels limité par adresse IP et par identifiant, pour qu'elle ne serve pas à
 * faire interroger l'opérateur en boucle.
 */
export async function POST(req: Request, { params }: { params: Promise<{ operateur: string }> }) {
  const { operateur } = await params
  if (operateur !== 'mtn' && operateur !== 'airtel') return Response.json({ ok: false }, { status: 404 })
  if (!autoriserEnvoi(`rappel-paiement:${ipDe(req.headers)}`, 300, 60 * 1000)) return Response.json({ ok: false }, { status: 429 })
  const corps = (await req.json().catch(() => ({}))) as {
    referenceId?: string
    externalId?: string
    transaction?: { id?: string }
  }
  const id = req.headers.get('x-reference-id') || corps.referenceId || corps.transaction?.id
  if (!id || id.length > 100) return Response.json({ ok: false }, { status: 400 })
  if (!autoriserEnvoi(`rappel-paiement:${operateur}:${id}`, 10, 10 * 60 * 1000)) return Response.json({ ok: false }, { status: 429 })
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
