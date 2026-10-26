import 'server-only'

import { getPayloadClient } from '@/lib/site/payload'

export type InscriptionMembre = {
  id: number
  statut: 'inscrit' | 'attente' | 'annule' | 'present' | string
  position?: number | null
  numeroBillet?: string | null
  evenement: {
    id: number
    titre: string
    slug?: string
    debut: string
    fin?: string | null
    lieu?: string | null
    adresse?: string | null
    ville?: { nom?: string } | number | null
    type?: { nom?: string } | number | null
    image?: { url?: string | null; sizes?: Record<string, { url?: string | null }> } | number | null
    compteRendu?: unknown
    documents?: { document?: { id: number; titre?: string } | number | null; visibilite?: string }[] | null
  }
}

/** Inscriptions du membre (tous statuts), événement et type inclus. */
export async function inscriptionsDe(membreId: number): Promise<InscriptionMembre[]> {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'registrations',
    where: { membre: { equals: membreId } },
    limit: 200,
    depth: 2,
    overrideAccess: true,
  })
  return (r.docs as unknown as InscriptionMembre[]).filter((i) => i.evenement && typeof i.evenement === 'object')
}

const TZ = 'Africa/Brazzaville'
/** Pastille de date : « 14 » et « nov. ». */
export const jourMois = (iso: string) => ({
  jour: new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', timeZone: TZ }),
  mois: new Date(iso).toLocaleDateString('fr-FR', { month: 'short', timeZone: TZ }),
})

/** Libellé et teinte du statut d'une inscription. */
export function statutInscription(i: { statut: string; position?: number | null }): { libelle: string; classe: 'active' | 'pending' | 'suspended' } {
  if (i.statut === 'attente') return { libelle: `Liste d’attente, position ${i.position ?? 1}`, classe: 'pending' }
  if (i.statut === 'present') return { libelle: 'Présent', classe: 'active' }
  if (i.statut === 'annule') return { libelle: 'Annulé', classe: 'suspended' }
  return { libelle: 'Inscrit', classe: 'active' }
}

/** Instant courant (hors rendu, pour les règles de pureté de React). */
export const maintenantMs = () => Date.now()

/** Heure affichée dans l'espace membre : « 18 h », « 9 h 30 » (sans zéro de tête, comme la maquette). */
export const heureCourte = (iso: string) => {
  const p = new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZone: TZ }).formatToParts(new Date(iso))
  const h = p.find((x) => x.type === 'hour')?.value ?? ''
  const mn = p.find((x) => x.type === 'minute')?.value ?? '00'
  return mn === '00' ? `${h} h` : `${h} h ${mn}`
}

/** Lieu affiché dans l'espace membre : le lieu et l'adresse saisis ; la ville seulement quand rien d'autre n'est renseigné. */
export const lieuEspace = (e: { lieu?: string | null; adresse?: string | null; ville?: { nom?: string } | number | null }) => {
  const texte = [e.lieu, e.adresse].filter(Boolean).join(', ')
  return texte || (typeof e.ville === 'object' && e.ville ? (e.ville.nom ?? '') : '')
}
