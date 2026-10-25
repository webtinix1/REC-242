import { pdfRecu } from '@/collections/Payments'
import { membreConnecte } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'

/** Reçu PDF d'un paiement du membre connecté (écran 11) : refusé si le paiement n'est pas à lui ou n'est pas « Payé ». */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') return new Response('Connexion requise.', { status: 403 })
  const { id } = await params
  const payload = await getPayloadClient()
  const p = (await payload.findByID({ collection: 'payments', id, depth: 0, overrideAccess: true }).catch(() => null)) as unknown as {
    id: number
    statut: string
    numero?: number | null
    membre?: number | { id: number } | null
  } | null
  const proprietaire = p && (typeof p.membre === 'object' ? p.membre?.id : p.membre)
  if (!p || proprietaire !== m.id || p.statut !== 'paye' || !p.numero) return new Response('Reçu indisponible.', { status: 403 })
  const recu = await pdfRecu(payload, p as never)
  return new Response(Buffer.from(recu.contenu), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${recu.nom}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
