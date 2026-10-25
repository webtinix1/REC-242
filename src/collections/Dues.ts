import { APIError, type CollectionConfig, type Endpoint, type PayloadRequest } from 'payload'

import { atLeast } from '@/access/roles'
import { notify } from '@/emails/send'
import { fcfa } from '@/lib/adhesion/categories'
import { logAction } from '@/lib/audit'
import { refusConstat, refusRelance, resteDu, statutEcheance, type Echeance } from '@/lib/cotisations/regles'

const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))
const jour = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Brazzaville' }) : '')
const lienCotisation = () => `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/espace-membre/cotisation`

const corps = async (req: PayloadRequest): Promise<Record<string, unknown>> => {
  try {
    return ((await req.json?.()) ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}

type Due = Echeance & { id: number; membre: number | { id: number }; exercice?: { libelle?: string } }

const charger = async (req: PayloadRequest) => {
  if (!atLeast(req.user, 'cotisations', 'full')) throw new APIError('Action réservée au trésorier et aux administrateurs.', 403)
  const d = (await req.payload.findByID({ collection: 'dues', id: req.routeParams?.id as string, depth: 0, overrideAccess: false, req }).catch(() => null)) as unknown as Due | null
  if (!d) throw new APIError('Échéance introuvable.', 404)
  return d
}

/** Écran 12 : relance écrite (n° 1 à 3), refusée avant 15 jours après la précédente. */
const relancer: Endpoint = {
  path: '/:id/relancer',
  method: 'post',
  handler: async (req) => {
    const d = await charger(req)
    const refus = refusRelance(d)
    if (refus) throw new APIError(refus, 400, null, true)
    const numero = (d.relances ?? []).length + 1
    const m = (await req.payload.findByID({ collection: 'members', id: idDe(d.membre) as number, depth: 0, overrideAccess: true, req })) as unknown as { email: string; prenom?: string; numeroAdherent?: string }
    await notify(req.payload, {
      to: m.email,
      template: 'relanceCotisation',
      vars: { prenom: m.prenom, numero_relance: String(numero), montant_du: fcfa(resteDu(d)).replace(' FCFA', ''), exercice: d.exercice?.libelle ?? '', date_limite: jour(d.dateLimite), lien_cotisation: lienCotisation() },
    })
    await req.payload.update({
      collection: 'dues',
      id: d.id,
      overrideAccess: true,
      req,
      data: { relances: [...(d.relances ?? []), { numero, date: new Date().toISOString(), canal: 'email' }] } as never,
    })
    await logAction(req.payload, { req, categorie: 'paiement', action: `Relance ${numero}/3 de cotisation`, cible: m.numeroAdherent })
    return Response.json({ ok: true, numero })
  },
}

/** Écran 12 : constat de la perte de la qualité de membre (décision du comité, procès-verbal), après trois relances. */
const constater: Endpoint = {
  path: '/:id/constater',
  method: 'post',
  handler: async (req) => {
    const d = await charger(req)
    const b = await corps(req)
    const refus = refusConstat(d)
    if (refus) throw new APIError(refus, 400, null, true)
    const dateComite = b.dateComite ? new Date(String(b.dateComite)) : new Date()
    const pv = String(b.pv ?? '').trim()
    if (!pv) throw new APIError('Indiquez la référence du procès-verbal du comité.', 400, null, true)
    const membreId = idDe(d.membre) as number
    const m = (await req.payload.findByID({ collection: 'members', id: membreId, depth: 0, overrideAccess: true, req })) as unknown as {
      email: string
      prenom?: string
      numeroAdherent?: string
      entreprise?: number | null
    }
    await req.payload.update({ collection: 'dues', id: d.id, overrideAccess: true, req, data: { statut: 'perte', constat: { date: dateComite.toISOString(), pv } } as never })
    await req.payload.update({
      collection: 'members',
      id: membreId,
      overrideAccess: true,
      req,
      context: { sansMotif: true },
      data: { statut: 'ancien', motifStatut: 'Perte de la qualité de membre (non-paiement après trois relances)', fin: { type: 'perte', date: dateComite.toISOString() } } as never,
    })
    if (m.entreprise) await req.payload.update({ collection: 'companies', id: m.entreprise, overrideAccess: true, req, data: { masqueeParAdmin: true, selectionAccueil: false } as never })
    await notify(req.payload, { to: m.email, template: 'constatPerte', vars: { prenom: m.prenom, exercice: d.exercice?.libelle ?? '', date_comite: jour(dateComite.toISOString()) } })
    await logAction(req.payload, { req, categorie: 'paiement', action: `Perte de la qualité de membre constatée (PV ${pv})`, cible: m.numeroAdherent })
    return Response.json({ ok: true })
  },
}

/**
 * Cotisations : une échéance par membre et par exercice (docs/03-modele-de-donnees.md, `dues`). Montants figés à la création,
 * tranches recalculées à chaque paiement confirmé, relances et constat de perte par les endpoints ci-dessus.
 */
export const Dues: CollectionConfig = {
  slug: 'dues',
  labels: { singular: 'Cotisation', plural: 'Cotisations' },
  admin: { group: 'Adhésions', useAsTitle: 'id', hidden: true },
  defaultSort: '-createdAt',
  endpoints: [relancer, constater],
  access: {
    read: ({ req }) =>
      atLeast(req.user, 'cotisations', 'read') || atLeast(req.user, 'membres', 'read')
        ? true
        : (req.user as { collection?: string } | null)?.collection === 'members'
          ? { membre: { equals: req.user!.id } }
          : false,
    // Créées par le serveur (conversion, renouvellement) ; le trésorier corrige au besoin.
    create: ({ req }) => atLeast(req.user, 'cotisations', 'full'),
    update: ({ req }) => atLeast(req.user, 'cotisations', 'full'),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req, operation }) => {
        // Les montants d'une échéance émise ne changent pas (un changement de tarif ne s'applique qu'aux exercices suivants).
        if (operation === 'update' && originalDoc && !req.context?.rapprochement) {
          for (const k of ['droit', 'montant'] as const)
            if (data[k] !== undefined && data[k] !== originalDoc[k]) throw new APIError('Les montants d’une échéance émise ne se modifient pas.', 400, null, true)
        }
        const fusion = { ...(originalDoc ?? {}), ...data }
        if (fusion.statut !== 'perte') data.statut = statutEcheance(fusion)
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'membre', label: 'Membre', type: 'relationship', relationTo: 'members', required: true, index: true },
        { name: 'categorie', label: 'Catégorie', type: 'text' },
        {
          name: 'statut',
          label: 'Statut',
          type: 'select',
          defaultValue: 'a-venir',
          index: true,
          options: [
            { value: 'a-jour', label: 'À jour' },
            { value: 'a-venir', label: 'À venir' },
            { value: 'en-relance', label: 'En relance' },
            { value: 'perte', label: 'Perte constatée' },
          ],
        },
      ],
    },
    {
      name: 'exercice',
      label: 'Exercice',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'debut', label: 'Début', type: 'date', index: true },
            { name: 'fin', label: 'Fin (veille de la date anniversaire)', type: 'date' },
            { name: 'libelle', label: 'Libellé', type: 'text' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'droit', label: 'Droit d’adhésion (FCFA)', type: 'number' },
        { name: 'montant', label: 'Cotisation (FCFA)', type: 'number' },
        { name: 'dateLimite', label: 'Date limite', type: 'date' },
      ],
    },
    {
      name: 'tranches',
      label: 'Tranches',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'numero', label: 'N°', type: 'number' },
            { name: 'montant', label: 'Montant', type: 'number' },
            { name: 'echeance', label: 'Échéance', type: 'date' },
            {
              name: 'statut',
              label: 'Statut',
              type: 'select',
              defaultValue: 'a-payer',
              options: [
                { value: 'a-payer', label: 'À payer' },
                { value: 'paye', label: 'Payé' },
              ],
            },
            { name: 'paiement', label: 'Paiement', type: 'relationship', relationTo: 'payments' },
          ],
        },
      ],
    },
    {
      name: 'relances',
      label: 'Relances',
      type: 'array',
      admin: { readOnly: true },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'numero', label: 'N°', type: 'number' },
            { name: 'date', label: 'Date', type: 'date' },
            { name: 'canal', label: 'Canal', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'constat',
      label: 'Constat de perte',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'date', label: 'Date du comité', type: 'date' },
            { name: 'pv', label: 'Procès-verbal', type: 'text' },
          ],
        },
      ],
    },
    { name: 'rappels', label: 'Rappels de renouvellement envoyés', type: 'json', admin: { readOnly: true } },
  ],
}
