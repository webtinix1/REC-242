import { fichierIcs } from '@/lib/evenements/ics'
import { lieuDe } from '@/lib/evenements/notifications'
import { evenementParSlug } from '@/lib/evenements/site'
import { siteUrl } from '@/lib/site/seo'

export const dynamic = 'force-dynamic'

/** Fichier calendrier (.ics) d'un événement visible du public. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const e = await evenementParSlug(slug)
  if (!e) return new Response('Événement introuvable', { status: 404 })
  const corps = fichierIcs({
    id: e.id,
    titre: e.titre,
    debut: e.debut,
    fin: e.fin,
    lieu: lieuDe({ ...e, ville: e.ville && typeof e.ville !== 'number' ? e.ville : null }),
    description: e.chapeau || undefined,
    url: `${siteUrl()}/agenda/${e.slug}`,
  })
  return new Response(corps, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${e.slug}.ics"`,
    },
  })
}
