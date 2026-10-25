import type { Payload, PayloadRequest } from 'payload'

import { notify } from '@/emails/send'
import { typeLabel } from './regles'

const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number))

/**
 * E-mail 25 : membres actifs dont l'entreprise est dans un secteur de l'opportunité et qui ont gardé
 * la préférence « Opportunités de mes secteurs ». Sans secteur précisé, personne n'est prévenu.
 */
export async function alerterSecteurs(
  payload: Payload,
  o: { id: number; titre: string; type: string; dateLimite: string; secteurs?: unknown[]; membre?: unknown },
  req?: PayloadRequest,
): Promise<number> {
  const secteurs = (o.secteurs ?? []).map(idDe).filter(Boolean)
  if (!secteurs.length) return 0
  const [entreprises, noms] = await Promise.all([
    payload.find({ collection: 'companies', where: { secteurs: { in: secteurs } }, depth: 0, limit: 5000, overrideAccess: true, req, select: { titulaire: true } }),
    payload.find({ collection: 'sectors', where: { id: { in: secteurs } }, depth: 0, limit: 50, overrideAccess: true, req }),
  ])
  const titulaires = entreprises.docs.map((e) => idDe((e as unknown as { titulaire?: unknown }).titulaire)).filter(Boolean)
  if (!titulaires.length) return 0
  const membres = await payload.find({
    collection: 'members',
    where: {
      and: [
        { id: { in: titulaires } },
        { statut: { equals: 'actif' } },
        { 'notifications.opportunites': { not_equals: false } },
        ...(o.membre ? [{ id: { not_equals: idDe(o.membre) } }] : []),
      ],
    },
    depth: 0,
    limit: 5000,
    overrideAccess: true,
    req,
  })
  const lien = `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/espace-membre/opportunites`
  const vars = {
    titre: o.titre,
    type: typeLabel(o.type),
    secteurs: noms.docs.map((s) => (s as unknown as { nom: string }).nom).join(', '),
    date_limite: new Date(o.dateLimite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Brazzaville' }),
    lien,
  }
  for (const m of membres.docs) await notify(payload, { to: (m as unknown as { email: string }).email, template: 'opportuniteSecteur', vars })
  return membres.docs.length
}
