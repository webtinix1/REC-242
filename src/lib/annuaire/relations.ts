import type { Payload } from 'payload'

import { telephoneAffiche } from '@/lib/adhesion/categories'

export type Coordonnees = { nom: string; entreprise?: string; telephone?: string; whatsapp?: string; email?: string }

const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number))

/**
 * Coordonnées de l'autre membre d'une mise en relation, vues par `lecteurId`.
 * Rien tant que la demande n'est pas acceptée ; ensuite, seulement les coordonnées que ce membre a choisi d'afficher.
 */
export async function coordonneesPartagees(payload: Payload, relationId: number, lecteurId: number): Promise<Coordonnees | null> {
  const r = (await payload.findByID({ collection: 'connectionRequests', id: relationId, depth: 0, overrideAccess: true })) as unknown as {
    statut: string
    demandeur: number
    destinataire: number
  }
  const dem = idDe(r.demandeur)
  const dest = idDe(r.destinataire)
  if (r.statut !== 'acceptee' || (lecteurId !== dem && lecteurId !== dest)) return null
  const autre = (await payload.findByID({ collection: 'members', id: lecteurId === dem ? dest : dem, depth: 1, overrideAccess: true })) as unknown as {
    prenom?: string
    nom?: string
    email: string
    telephone?: string
    whatsapp?: string
    entreprise?: { nom?: string; visibilite?: { telephone?: boolean; whatsapp?: boolean; email?: boolean } } | null
  }
  const v = autre.entreprise?.visibilite ?? {}
  return {
    nom: `${autre.prenom ?? ''} ${autre.nom ?? ''}`.trim(),
    entreprise: autre.entreprise?.nom,
    telephone: v.telephone && autre.telephone ? telephoneAffiche(autre.telephone) : undefined,
    whatsapp: v.whatsapp && (autre.whatsapp || autre.telephone) ? telephoneAffiche(autre.whatsapp || autre.telephone) : undefined,
    email: v.email ? autre.email : undefined,
  }
}
