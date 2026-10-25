import { draftMode, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { isStaff } from '@/access/roles'
import { getPayloadClient } from '@/lib/site/payload'

/**
 * Aperçu des brouillons (bouton « Aperçu » et aperçu en direct de l'admin) : réservé à l'équipe connectée.
 * Active le mode brouillon de Next puis ouvre la page ou l'actualité.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const slug = url.searchParams.get('slug') ?? ''
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!isStaff(user))
    return new Response('Aperçu réservé à l’équipe connectée au back-office.', { status: 403 })
  ;(await draftMode()).enable()
  if (type === 'news') redirect(`/actualites/${encodeURIComponent(slug)}`)
  const page = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    draft: true,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  redirect((page.docs[0] as { chemin?: string } | undefined)?.chemin || '/')
}
