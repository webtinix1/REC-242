import { NextResponse, type NextRequest } from 'next/server'

import { logAction } from '@/lib/audit'
import { COOKIE_SESSION, DUREE_COURTE, DUREE_LONGUE, empreinte, optionsCookie, ouvrirSession } from '@/lib/membres/session'
import { getPayloadClient } from '@/lib/site/payload'

/** Lien de connexion reçu par e-mail : valable 15 minutes, utilisable une seule fois. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params
  const payload = await getPayloadClient()
  const m = (await payload.db.findOne({ collection: 'members', where: { lienHash: { equals: empreinte(jeton) } } })) as {
    id: number
    email: string
    statut: string
    lienExpire?: string
  } | null
  const base = process.env.NEXT_PUBLIC_SERVER_URL || req.nextUrl.origin
  if (!m || !m.lienExpire || new Date(m.lienExpire) < new Date())
    return NextResponse.redirect(new URL('/espace-membre/connexion?etat=lien', base))
  await payload.db.updateOne({ collection: 'members', id: m.id, data: { lienHash: null, lienExpire: null }, returning: false })
  if (m.statut !== 'actif')
    return NextResponse.redirect(new URL(`/espace-membre/connexion?etat=${m.statut === 'attente' ? 'attente' : 'suspendu'}`, base))
  const { token } = await ouvrirSession(payload, m.id)
  await logAction(payload, { categorie: 'connexion', action: 'Connexion à l’espace membre par lien', cible: m.email, author: { type: 'membre', nom: m.email } })
  const res = NextResponse.redirect(new URL('/espace-membre', base))
  res.cookies.set('payload-token', token, optionsCookie(DUREE_COURTE))
  res.cookies.set(COOKIE_SESSION, 'court', optionsCookie(DUREE_LONGUE))
  return res
}
