'use server'
import { cookies } from 'next/headers'

import { autoriserEnvoi } from '@/lib/request'
import { COOKIE_MERCI, lireJetonMerci } from '@/lib/adhesion/merci'
import { numeroRecu } from '@/lib/compteurs'
import { verifierPaiement } from '@/lib/paiements/service'
import { getPayloadClient } from '@/lib/site/payload'

/** Statut du paiement mobile de la candidature qui vient d'être envoyée (cookie de la page Merci). */
export async function statutPaiementMerci(): Promise<{ statut: string; recu?: string }> {
  const id = lireJetonMerci((await cookies()).get(COOKIE_MERCI)?.value)
  if (!id) return { statut: 'inconnu' }
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'payments',
    where: { candidature: { equals: id } },
    overrideAccess: true,
    depth: 0,
    limit: 1,
    sort: '-createdAt',
  })
  const p = r.docs[0] as unknown as { id: number; statut: string; numero?: number } | undefined
  if (!p) return { statut: 'inconnu' }
  // Page interrogée toutes les 4 secondes : au-delà de 240 appels par heure, le statut enregistré suffit
  // (pas de nouvel appel à l'opérateur).
  const statut = autoriserEnvoi(`suivi-merci:${id}`, 240, 3600 * 1000) ? await verifierPaiement(payload, p as never) : p.statut
  if (statut === 'paye') {
    const frais = (await payload.findByID({
      collection: 'payments',
      id: p.id,
      depth: 0,
      overrideAccess: true,
    })) as unknown as { numero?: number }
    return { statut, recu: numeroRecu(frais.numero) }
  }
  return { statut }
}
