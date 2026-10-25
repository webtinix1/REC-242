import { NextResponse } from 'next/server'

import { fichierIcs } from '@/lib/evenements/ics'
import { lieuDe, type Evenement } from '@/lib/evenements/notifications'
import { membreConnecte } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'

/** Fichier calendrier d'un événement auquel le membre connecté est inscrit (`id` : identifiant de l'événement). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const m = await membreConnecte()
  const id = Number((await params).id)
  if (!m || !Number.isInteger(id)) return new NextResponse('Accès refusé.', { status: 403 })
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'registrations',
    where: { and: [{ membre: { equals: m.id } }, { evenement: { equals: id } }, { statut: { in: ['inscrit', 'attente', 'present'] } }] },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })
  const e = (r.docs[0] as unknown as { evenement?: Evenement & { chapeau?: string } } | undefined)?.evenement
  if (!e || typeof e !== 'object') return new NextResponse('Accès refusé.', { status: 403 })
  const corps = fichierIcs({ id: e.id, titre: e.titre, debut: e.debut, fin: e.fin, lieu: lieuDe(e), description: e.chapeau })
  return new NextResponse(corps, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="evenement-${e.id}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
