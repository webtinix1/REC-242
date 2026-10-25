import { APIError, type CollectionConfig, type Where } from 'payload'

import { atLeast } from '@/access/roles'
import { logAction } from '@/lib/audit'

type Moi = { id: number; collection?: string; name?: string } | null | undefined
const estMembre = (u: unknown) => (u as Moi)?.collection === 'members'
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))

/**
 * Demandes pour rejoindre une commission (écran membre 03, écran back-office 19). Seules les commissions « ouvertes aux
 * membres actifs » acceptent des candidatures ; Éthique et Vérification est sur désignation (article 17).
 * Une demande acceptée ajoute la commission à la fiche du membre ; le membre est prévenu par un message du réseau.
 */
export const CommissionRequests: CollectionConfig = {
  slug: 'commissionRequests',
  labels: { singular: 'Demande pour rejoindre une commission', plural: 'Demandes pour rejoindre une commission' },
  admin: { group: 'Activité', hidden: true },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => (atLeast(req.user, 'membres', 'read') ? true : estMembre(req.user) ? ({ membre: { equals: req.user!.id } } as Where) : false),
    create: ({ req }) => estMembre(req.user),
    update: ({ req }) => atLeast(req.user, 'membres', 'partial'),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const moi = req.user as Moi
        if (operation === 'create') {
          const m = (await req.payload.findByID({ collection: 'members', id: moi!.id, depth: 0, overrideAccess: true, req })) as unknown as {
            statut: string
            commissions?: number[]
          }
          if (m.statut !== 'actif') throw new APIError('Réservé aux membres actifs.', 403)
          const c = (await req.payload.findByID({ collection: 'commissions', id: idDe(data.commission) as number, depth: 0, overrideAccess: true, req }).catch(() => null)) as unknown as {
            id: number
            ouverture?: string
          } | null
          if (!c) throw new APIError('Commission introuvable.', 404)
          if (c.ouverture !== 'ouverte') throw new APIError('Cette commission n’est pas ouverte aux candidatures : ses membres sont désignés par le comité de direction.', 400, null, true)
          if ((m.commissions ?? []).map(idDe).includes(c.id)) throw new APIError('Vous êtes déjà membre de cette commission.', 400, null, true)
          const enCours = await req.payload.count({
            collection: 'commissionRequests',
            where: { and: [{ membre: { equals: moi!.id } }, { commission: { equals: c.id } }, { statut: { equals: 'attente' } }] },
            overrideAccess: true,
            req,
          })
          if (enCours.totalDocs) throw new APIError('Une demande est déjà en attente pour cette commission.', 400, null, true)
          return { ...data, membre: moi!.id, commission: c.id, apport: String(data.apport ?? '').trim().slice(0, 2000), statut: 'attente' }
        }
        if (data.statut && data.statut !== originalDoc?.statut) {
          if (originalDoc?.statut !== 'attente') throw new APIError('Cette demande a déjà été traitée.', 400, null, true)
          data.traitePar = moi?.name ?? ''
          data.dateTraitement = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (previousDoc?.statut !== 'attente' || previousDoc?.statut === doc.statut) return doc
        const membreId = idDe(doc.membre) as number
        const c = (await req.payload.findByID({ collection: 'commissions', id: idDe(doc.commission) as number, depth: 0, overrideAccess: true, req })) as unknown as { id: number; nom: string }
        if (doc.statut === 'acceptee') {
          const m = (await req.payload.findByID({ collection: 'members', id: membreId, depth: 0, overrideAccess: true, req })) as unknown as { commissions?: number[] }
          const ids = [...new Set([...(m.commissions ?? []).map(idDe), c.id])]
          await req.payload.update({ collection: 'members', id: membreId, data: { commissions: ids } as never, overrideAccess: true, req, context: { sansMotif: true } })
        }
        await req.payload.create({
          collection: 'networkMessages',
          overrideAccess: true,
          req,
          data: {
            membre: membreId,
            titre: `Commission ${c.nom}`,
            texte:
              doc.statut === 'acceptee'
                ? `Votre demande pour rejoindre la commission ${c.nom} est acceptée. Bienvenue !`
                : `Votre demande pour rejoindre la commission ${c.nom} n’a pas été retenue.`,
            lien: '/espace-membre/profil',
          } as never,
        })
        await logAction(req.payload, { req, categorie: 'validation', action: `Demande pour la commission ${c.nom} : ${doc.statut === 'acceptee' ? 'acceptée' : 'refusée'}` })
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'membre', label: 'Membre', type: 'relationship', relationTo: 'members', index: true, admin: { readOnly: true } },
        { name: 'commission', label: 'Commission', type: 'relationship', relationTo: 'commissions', required: true },
        {
          name: 'statut',
          label: 'Statut',
          type: 'select',
          defaultValue: 'attente',
          index: true,
          options: [
            { value: 'attente', label: 'En attente' },
            { value: 'acceptee', label: 'Acceptée' },
            { value: 'refusee', label: 'Refusée' },
          ],
        },
      ],
    },
    { name: 'apport', label: 'Ce que le membre peut apporter', type: 'textarea' },
    {
      type: 'row',
      fields: [
        { name: 'traitePar', label: 'Traitée par', type: 'text', admin: { readOnly: true } },
        { name: 'dateTraitement', label: 'Traitée le', type: 'date', admin: { readOnly: true } },
      ],
    },
  ],
}
