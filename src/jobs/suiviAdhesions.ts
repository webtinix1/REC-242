import type { Payload, TaskConfig } from 'payload'

import { exclure } from '@/collections/DisciplinaryCases'
import { notify } from '@/emails/send'
import { categorie, montants, type Tarifs } from '@/lib/adhesion/categories'
import { creerEcheance } from '@/lib/cotisations/service'
import { finExercice } from '@/lib/membres/options'

const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))
const jour = (d: string | Date) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Brazzaville' })

/**
 * Suivi quotidien des adhésions :
 * - fin des suspensions disciplinaires arrivées à terme (le membre redevient actif) ;
 * - exclusion appliquée à la fin du délai de recours s'il n'y a pas eu de recours ;
 * - renouvellement : rappels 30 et 7 jours avant la date anniversaire (e-mail 10), puis nouvelle échéance au début du nouvel exercice.
 */
export async function suiviAdhesions(payload: Payload, maintenant = new Date()) {
  const bilan = { suspensionsLevees: 0, exclusions: 0, rappels: 0, echeances: 0 }

  const suspendus = await payload.find({
    collection: 'members',
    where: { and: [{ statut: { equals: 'suspendu' } }, { suspenduJusquau: { less_than: maintenant.toISOString() } }] },
    depth: 0,
    limit: 500,
    overrideAccess: true,
  })
  for (const m of suspendus.docs) {
    await payload.update({ collection: 'members', id: m.id, overrideAccess: true, context: { sansMotif: true }, data: { statut: 'actif', motifStatut: 'Fin de la suspension disciplinaire', suspenduJusquau: null } as never })
    bilan.suspensionsLevees++
  }

  const exclusions = await payload.find({
    collection: 'disciplinaryCases',
    where: { and: [{ statut: { equals: 'decision' } }, { sanction: { equals: 'exclusion' } }, { finRecours: { less_than: maintenant.toISOString() } }, { exclusionAppliquee: { not_equals: true } }] },
    depth: 0,
    limit: 100,
    overrideAccess: true,
  })
  for (const c of exclusions.docs as unknown as { id: number; numero: string; membre: number }[]) {
    const m = (await payload.findByID({ collection: 'members', id: idDe(c.membre) as number, depth: 0, overrideAccess: true })) as unknown as { id: number; entreprise?: number | null }
    await exclure(payload, m, c.numero)
    await payload.db.updateOne({ collection: 'disciplinaryCases', id: c.id, data: { exclusionAppliquee: true, statut: 'close', issue: 'exclusion définitive (pas de recours)', dateCloture: maintenant.toISOString() }, returning: false })
    bilan.exclusions++
  }

  const actifs = await payload.find({ collection: 'members', where: { statut: { in: ['actif', 'suspendu'] } }, depth: 0, limit: 5000, overrideAccess: true })
  for (const m of actifs.docs as unknown as { id: number; email: string; categorie: string; dateAdhesion?: string; notifications?: { cotisation?: boolean } }[]) {
    if (!m.dateAdhesion) continue
    const derniere = (await payload.find({ collection: 'dues', where: { membre: { equals: m.id } }, sort: '-exercice.debut', limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as
      | { id: number; exercice?: { debut?: string; fin?: string }; rappels?: Record<string, string> }
      | undefined
    const fin = derniere?.exercice?.fin ? new Date(derniere.exercice.fin) : finExercice(m.dateAdhesion)
    const anniversaire = new Date(fin.getTime() + 86400e3)
    const joursAvant = Math.ceil((anniversaire.getTime() - maintenant.getTime()) / 86400e3)
    if (derniere && (joursAvant === 30 || joursAvant === 7) && !derniere.rappels?.[`j${joursAvant}`] && m.notifications?.cotisation !== false) {
      const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })) as { tarifs?: Tarifs }
      const montant = montants(categorie(m.categorie), s.tarifs)?.cotisation
      await notify(payload, {
        to: m.email,
        template: 'echeanceCotisation',
        vars: { exercice: String(anniversaire.getFullYear()), montant: montant != null ? montant.toLocaleString('fr-FR').replace(/[  ]/g, ' ') : '', date_echeance: jour(anniversaire), lien_cotisation: `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/espace-membre/cotisation` },
      })
      await payload.db.updateOne({ collection: 'dues', id: derniere.id, data: { rappels: { ...(derniere.rappels ?? {}), [`j${joursAvant}`]: maintenant.toISOString() } }, returning: false })
      bilan.rappels++
    }
    if (derniere && anniversaire <= maintenant) {
      if (await creerEcheance(payload, m.id, anniversaire, false)) bilan.echeances++
    } else if (!derniere) {
      // Membre sans échéance (créé avant le lot 11) : échéance de l'exercice en cours.
      if (await creerEcheance(payload, m.id, new Date(m.dateAdhesion), true)) bilan.echeances++
    }
  }
  return bilan
}

export const suiviAdhesionsTache: TaskConfig<'suiviAdhesions'> = {
  slug: 'suiviAdhesions',
  label: 'Suivi des adhésions (suspensions, exclusions, renouvellements)',
  schedule: [{ cron: '15 6 * * *', queue: 'minute' }],
  outputSchema: [{ name: 'bilan', type: 'json' }],
  handler: async ({ req }) => ({ output: { bilan: await suiviAdhesions(req.payload) } }),
}

