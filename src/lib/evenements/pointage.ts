import type { PayloadRequest } from 'payload'

import { verifierJetonCarte } from '@/lib/membres/carte'
import { verifierJetonBillet } from './billets'

export type ResultatScan = { ok: boolean; nom?: string; message: string; inscription?: number }

type Ligne = {
  id: number
  statut: string
  evenement: number | { id: number }
  numeroBillet?: string
  visiteur?: { nom?: string }
  membre?: { id: number; prenom?: string; nom?: string } | number | null
}

const nomDe = (r: Ligne) =>
  r.visiteur?.nom || (typeof r.membre === 'object' && r.membre ? `${r.membre.prenom ?? ''} ${r.membre.nom ?? ''}`.trim() : '') || r.numeroBillet || ''

/**
 * Pointage d'un QR code (billet ou carte de membre) pour un événement. Idempotent : un second scan
 * du même code répond « Déjà pointé » sans rien changer, ce qui permet de rejouer les scans faits hors connexion.
 */
export async function pointer(req: PayloadRequest, evenementId: number, code: string, quand?: string): Promise<ResultatScan> {
  const { payload } = req
  let r: Ligne | undefined
  const billet = verifierJetonBillet(code)
  if (billet) {
    r = (await payload.findByID({ collection: 'registrations', id: billet, depth: 1, overrideAccess: true, req }).catch(() => null)) as unknown as Ligne | undefined
    const ev = r && (typeof r.evenement === 'object' ? r.evenement.id : r.evenement)
    if (!r || ev !== evenementId) return { ok: false, message: 'Billet d’un autre événement.' }
  } else {
    const numero = verifierJetonCarte(code)
    if (!numero) return { ok: false, message: 'QR code non reconnu.' }
    const m = await payload.find({ collection: 'members', where: { numeroAdherent: { equals: numero } }, limit: 1, depth: 0, overrideAccess: true, req })
    const membre = m.docs[0] as unknown as { id: number; prenom?: string; nom?: string; statut: string } | undefined
    if (!membre) return { ok: false, message: 'Carte inconnue.' }
    const nom = `${membre.prenom ?? ''} ${membre.nom ?? ''}`.trim()
    if (membre.statut !== 'actif') return { ok: false, nom, message: 'Membre non actif.' }
    const i = await payload.find({
      collection: 'registrations',
      where: { and: [{ evenement: { equals: evenementId } }, { membre: { equals: membre.id } }, { statut: { not_equals: 'annule' } }] },
      limit: 1,
      depth: 1,
      overrideAccess: true,
      req,
    })
    r = i.docs[0] as unknown as Ligne | undefined
    if (!r) return { ok: false, nom, message: 'Pas inscrit à cet événement.' }
  }
  const nom = nomDe(r)
  if (r.statut === 'present') return { ok: true, nom, message: 'Déjà pointé.', inscription: r.id }
  if (r.statut === 'annule') return { ok: false, nom, message: 'Inscription annulée.', inscription: r.id }
  if (r.statut === 'attente') return { ok: false, nom, message: 'En liste d’attente.', inscription: r.id }
  await payload.update({ collection: 'registrations', id: r.id, data: { statut: 'present' } as never, overrideAccess: true, req })
  if (quand) await payload.db.updateOne({ collection: 'registrations', id: r.id, data: { pointeLe: new Date(quand).toISOString() }, req, returning: false })
  return { ok: true, nom, message: 'Présence enregistrée.', inscription: r.id }
}
