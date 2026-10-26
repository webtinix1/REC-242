import { APIError, type CollectionConfig, type PayloadRequest, type Where } from 'payload'

import { atLeast, isStaff } from '@/access/roles'
import { emailNormalise, telephoneInternational } from '@/lib/adhesion/categories'
import { endpointsInscriptions } from '@/endpoints/evenements'
import { logAction } from '@/lib/audit'
import { prochainNumero, verrouiller } from '@/lib/compteurs'
import { numeroBillet } from '@/lib/evenements/billets'
import { promouvoir } from '@/lib/evenements/inscriptions'
import { envoyerConfirmation, type Evenement, type Inscription } from '@/lib/evenements/notifications'

export const STATUTS_INSCRIPTION = [
  { value: 'inscrit', label: 'Inscrit' },
  { value: 'attente', label: 'Liste d’attente' },
  { value: 'annule', label: 'Annulé' },
  { value: 'present', label: 'Présent' },
]
export const MESSAGE_COMPLET = 'L’événement est complet.'

type Moi = { id: number; collection?: string } | null | undefined
const estMembre = (u: unknown) => (u as Moi)?.collection === 'members'
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))

export const actives = (evenement: number): Where => ({ and: [{ evenement: { equals: evenement } }, { statut: { in: ['inscrit', 'present'] } }] })

/** Prochaine position sur la liste d'attente d'un événement. */
async function positionSuivante(req: PayloadRequest, evenement: number) {
  const r = await req.payload.find({
    collection: 'registrations',
    where: { and: [{ evenement: { equals: evenement } }, { statut: { equals: 'attente' } }] },
    sort: '-position',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return ((r.docs[0] as unknown as { position?: number } | undefined)?.position ?? 0) + 1
}

/** Statut « Complet » de l'événement, tenu à jour à chaque inscription ou désistement. */
async function majComplet(req: PayloadRequest, evenementId: number) {
  const e = (await req.payload.findByID({ collection: 'events', id: evenementId, depth: 0, overrideAccess: true, req })) as unknown as {
    statut: string
    capacite?: number | null
  }
  if (!e.capacite || !['publie', 'complet'].includes(e.statut)) return
  const n = await req.payload.count({ collection: 'registrations', where: actives(evenementId), overrideAccess: true, req })
  const statut = n.totalDocs >= e.capacite ? 'complet' : 'publie'
  if (statut !== e.statut) await req.payload.db.updateOne({ collection: 'events', id: evenementId, data: { statut }, req, returning: false })
}

/**
 * Inscriptions aux événements (docs/05-regles-metier.md §7). Capacité, liste d'attente, promotion, numéro de billet,
 * pointage : tout est appliqué ici. Un visiteur s'inscrit par l'action du site (anti-robots), jamais par l'API.
 */
export const Registrations: CollectionConfig = {
  slug: 'registrations',
  labels: { singular: 'Inscription', plural: 'Inscriptions' },
  admin: { group: 'Activité', hidden: true, useAsTitle: 'numeroBillet' },
  defaultSort: 'createdAt',
  endpoints: endpointsInscriptions,
  access: {
    read: ({ req }) => (atLeast(req.user, 'evenements', 'read') ? true : estMembre(req.user) ? { membre: { equals: req.user!.id } } : false),
    create: ({ req }) => estMembre(req.user) || atLeast(req.user, 'evenements', 'partial'),
    update: ({ req }) => (atLeast(req.user, 'evenements', 'partial') ? true : estMembre(req.user) ? { membre: { equals: req.user!.id } } : false),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const moi = req.user as Moi
        if (operation === 'create') {
          const evId = idDe(data.evenement)
          if (!evId) throw new APIError('Événement manquant.', 400)
          // Une inscription à la fois par événement : les places ne peuvent pas être dépassées.
          await verrouiller(req.payload, 'events', evId, req)
          const e = (await req.payload.findByID({ collection: 'events', id: evId, depth: 0, overrideAccess: true, req }).catch(() => null)) as unknown as
            | (Evenement & { acces: string; capacite?: number | null; cloture?: string | null; listeAttente?: boolean })
            | null
          if (!e || !['publie', 'complet'].includes(e.statut ?? '')) throw new APIError('Les inscriptions ne sont pas ouvertes.', 400, null, true)
          if (e.cloture && new Date(e.cloture) < new Date()) throw new APIError('Les inscriptions sont closes.', 400, null, true)
          if (new Date(e.debut) < new Date()) throw new APIError('Cet événement a déjà eu lieu.', 400, null, true)
          const staff = isStaff(req.user)
          // Billet, pointage et rappel sont attribués par le serveur, jamais repris de la demande (numérotation sans trou).
          if (!staff) for (const k of ['numeroBillet', 'pointeLe', 'pointePar', 'annuleLe', 'rappelEnvoye']) delete data[k]
          if (estMembre(moi)) {
            const m = (await req.payload.findByID({ collection: 'members', id: moi!.id, depth: 0, overrideAccess: true, req })) as unknown as { statut: string }
            if (m.statut !== 'actif') throw new APIError('Réservé aux membres actifs.', 403)
            data.membre = moi!.id
            data.visiteur = {}
          } else if (!staff) {
            // Visiteur : seulement par l'action du site (context.visiteur), jamais par l'API.
            if (!req.context?.visiteur) throw new APIError('Action non autorisée.', 403)
            if (e.acces !== 'tous') throw new APIError(e.acces === 'membres' ? 'Événement réservé aux membres : connectez-vous pour vous inscrire.' : 'Événement sur invitation.', 403, null, true)
            data.membre = null
          }
          if (e.acces === 'invitation' && !staff) throw new APIError('Événement sur invitation.', 403, null, true)
          if (!data.membre) {
            const v = data.visiteur ?? {}
            v.nom = String(v.nom ?? '').trim()
            v.email = emailNormalise(String(v.email ?? ''))
            v.telephone = v.telephone ? telephoneInternational(String(v.telephone)) : ''
            if (!v.nom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) throw new APIError('Nom et e-mail sont nécessaires.', 400, null, true)
            data.visiteur = v
          }
          const doublon = await req.payload.count({
            collection: 'registrations',
            where: {
              and: [
                { evenement: { equals: evId } },
                { statut: { not_equals: 'annule' } },
                data.membre ? { membre: { equals: data.membre } } : { 'visiteur.email': { equals: data.visiteur.email } },
              ],
            },
            overrideAccess: true,
            req,
          })
          if (doublon.totalDocs) throw new APIError('Vous êtes déjà inscrit à cet événement.', 400, null, true)
          const occupees = (await req.payload.count({ collection: 'registrations', where: actives(evId), overrideAccess: true, req })).totalDocs
          if (!e.capacite || occupees < e.capacite) {
            data.statut = 'inscrit'
            data.position = null
          } else if (e.listeAttente !== false) {
            data.statut = 'attente'
            data.position = await positionSuivante(req, evId)
          } else throw new APIError(MESSAGE_COMPLET, 409, null, true)
          data.evenement = evId
          return data
        }

        // Mise à jour.
        const avant = originalDoc?.statut
        const apres = data.statut ?? avant
        if (estMembre(moi) && !req.context?.promotion) {
          // Un membre ne peut qu'annuler sa propre inscription.
          if (apres !== avant && !(apres === 'annule' && ['inscrit', 'attente'].includes(avant))) throw new APIError('Action non autorisée.', 403)
          return {
            ...data,
            evenement: originalDoc?.evenement,
            membre: originalDoc?.membre,
            visiteur: originalDoc?.visiteur,
            numeroBillet: originalDoc?.numeroBillet,
            position: originalDoc?.position,
            pointeLe: originalDoc?.pointeLe,
            pointePar: originalDoc?.pointePar,
            statut: apres,
            annuleLe: apres === 'annule' ? new Date().toISOString() : originalDoc?.annuleLe,
          }
        }
        if (apres === 'annule' && avant !== 'annule') data.annuleLe = new Date().toISOString()
        if (apres === 'present' && avant !== 'present') {
          data.pointeLe = new Date().toISOString()
          data.pointePar = (req.user as { name?: string; email?: string } | null)?.name ?? (req.user as { email?: string } | null)?.email ?? 'Pointage'
        }
        if (apres === 'inscrit' && avant === 'present') data.pointeLe = null
        return data
      },
      // Numéro de billet attribué au passage au statut « Inscrit » (inscription directe ou promotion).
      async ({ data, originalDoc, req }) => {
        const statut = data.statut ?? originalDoc?.statut
        if (statut === 'inscrit' && !(data.numeroBillet ?? originalDoc?.numeroBillet)) {
          const evId = idDe(data.evenement ?? originalDoc?.evenement) as number
          const e = (await req.payload.findByID({ collection: 'events', id: evId, depth: 0, overrideAccess: true, req })) as unknown as { debut: string }
          data.numeroBillet = numeroBillet(e.debut, await prochainNumero(req.payload, `billet-${evId}`, req))
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const evId = idDe(doc.evenement) as number
        if (operation === 'create') {
          const e = (await req.payload.findByID({ collection: 'events', id: evId, depth: 1, overrideAccess: true, req })) as unknown as Evenement
          await majComplet(req, evId)
          if (!req.context?.sansEmail) await envoyerConfirmation(req.payload, e, doc as Inscription, req)
          return doc
        }
        if (previousDoc?.statut !== doc.statut) {
          if (doc.statut === 'annule' && ['inscrit', 'present'].includes(previousDoc?.statut)) await promouvoir(req, evId)
          if (doc.statut === 'annule' && previousDoc?.statut === 'attente') {
            // Les positions suivantes avancent.
            const suivants = await req.payload.find({
              collection: 'registrations',
              where: { and: [{ evenement: { equals: evId } }, { statut: { equals: 'attente' } }] },
              sort: 'position',
              limit: 1000,
              depth: 0,
              overrideAccess: true,
              req,
            })
            let p = 1
            for (const s of suivants.docs) await req.payload.db.updateOne({ collection: 'registrations', id: s.id, data: { position: p++ }, req, returning: false })
          }
          await majComplet(req, evId)
          if (doc.statut === 'annule') await logAction(req.payload, { req, categorie: 'validation', action: `Inscription annulée (${doc.numeroBillet ?? 'liste d’attente'})` })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'evenement', label: 'Événement', type: 'relationship', relationTo: 'events', required: true, index: true },
        { name: 'membre', label: 'Membre', type: 'relationship', relationTo: 'members', index: true },
        { name: 'statut', label: 'Statut', type: 'select', defaultValue: 'inscrit', index: true, options: STATUTS_INSCRIPTION },
      ],
    },
    {
      name: 'visiteur',
      label: 'Visiteur',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'nom', label: 'Nom', type: 'text' },
            { name: 'email', label: 'E-mail', type: 'email', index: true },
            { name: 'telephone', label: 'WhatsApp', type: 'text' },
            { name: 'entreprise', label: 'Entreprise', type: 'text' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'position', label: 'Position en liste d’attente', type: 'number', admin: { readOnly: true } },
        { name: 'numeroBillet', label: 'Numéro de billet', type: 'text', index: true, admin: { readOnly: true } },
        { name: 'pointeLe', label: 'Pointé le', type: 'date', admin: { readOnly: true } },
        { name: 'pointePar', label: 'Pointé par', type: 'text', admin: { readOnly: true } },
      ],
    },
    { name: 'annuleLe', label: 'Annulée le', type: 'date', admin: { readOnly: true } },
    { name: 'rappelEnvoye', label: 'Rappel de la veille envoyé', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
  ],
}
