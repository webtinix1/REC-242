import { APIError, type CollectionConfig, type Where } from 'payload'

import { extraFull, extraRead } from '@/access/roles'
import { notify } from '@/emails/send'
import { logAction } from '@/lib/audit'

export const PLAFOND_HEBDO = 10
export const MESSAGE_PLAFOND =
  'Vous avez atteint la limite de 10 demandes de mise en relation par semaine. L’envoi est suspendu jusqu’à vérification par l’équipe.'

type Moi = { id: number; collection?: string } | null | undefined
const estMembre = (u: unknown) => (u as Moi)?.collection === 'members'
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))

export const STATUTS_RELATION = [
  { value: 'attente', label: 'En attente' },
  { value: 'acceptee', label: 'Acceptée' },
  { value: 'refusee', label: 'Refusée' },
  { value: 'annulee', label: 'Annulée' },
  { value: 'signalee', label: 'Signalée' },
]

const lien = () => `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/espace-membre/echanges`

/**
 * Mises en relation entre membres (docs/05-regles-metier.md §9) : le membre contacté accepte ou refuse ;
 * une fois acceptée, les deux membres échangent par le fil de messages de la plateforme. Aucune coordonnée n'est
 * transmise (décision de Webtinix du 28/10/2026) ; super administrateur, administrateur et responsable membres
 * peuvent lire les conversations (domaine « demandes des membres »).
 * Toutes les règles (qui peut faire quoi, plafond hebdomadaire, transitions) sont dans les hooks.
 */
export const ConnectionRequests: CollectionConfig = {
  slug: 'connectionRequests',
  labels: { singular: 'Mise en relation', plural: 'Mises en relation' },
  admin: { group: 'Activité', hidden: true },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => {
      // Demandes des membres (docs/04-roles-et-droits.md, domaines ajoutés) : ni le trésorier ni le responsable événements.
      if (extraRead(req.user, 'demandesMembres')) return true
      if (estMembre(req.user)) return { or: [{ demandeur: { equals: req.user!.id } }, { destinataire: { equals: req.user!.id } }] } as Where
      return false
    },
    create: ({ req }) => estMembre(req.user),
    update: ({ req }) => {
      if (extraFull(req.user, 'demandesMembres')) return true
      if (estMembre(req.user)) return { or: [{ demandeur: { equals: req.user!.id } }, { destinataire: { equals: req.user!.id } }] } as Where
      return false
    },
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const moi = req.user as Moi
        if (operation === 'create') {
          if (!estMembre(moi)) throw new APIError('Réservé aux membres.', 403)
          const demandeur = (await req.payload.findByID({ collection: 'members', id: moi!.id, depth: 0, overrideAccess: true, req })) as unknown as {
            statut: string
            relationsSuspendues?: boolean
          }
          if (demandeur.statut !== 'actif') throw new APIError('Réservé aux membres actifs.', 403)
          if (demandeur.relationsSuspendues) throw new APIError(MESSAGE_PLAFOND, 429, null, true)
          const message = String(data.message ?? '').trim()
          if (message.length < 10) throw new APIError('Présentez-vous en quelques mots (10 caractères au moins).', 400, null, true)
          if (message.length > 2000) throw new APIError('2 000 caractères au maximum.', 400, null, true)
          // Le destinataire est le titulaire d'une fiche publiée dans l'annuaire, jamais choisi librement.
          const e = (await req.payload
            .findByID({ collection: 'companies', id: idDe(data.entreprise) as number, depth: 0, overrideAccess: true, req })
            .catch(() => null)) as unknown as { id: number; titulaire?: number; visibilite?: { annuaire?: boolean }; masqueeParAdmin?: boolean } | null
          if (!e?.titulaire || !e.visibilite?.annuaire || e.masqueeParAdmin) throw new APIError('Fiche introuvable.', 404)
          const dest = (await req.payload.findByID({ collection: 'members', id: e.titulaire, depth: 0, overrideAccess: true, req })) as unknown as { statut: string }
          if (dest.statut !== 'actif') throw new APIError('Fiche introuvable.', 404)
          if (e.titulaire === moi!.id) throw new APIError('Vous ne pouvez pas vous contacter vous-même.', 400, null, true)
          const enCours = await req.payload.count({
            collection: 'connectionRequests',
            where: { and: [{ demandeur: { equals: moi!.id } }, { destinataire: { equals: e.titulaire } }, { statut: { equals: 'attente' } }] },
            overrideAccess: true,
            req,
          })
          if (enCours.totalDocs) throw new APIError('Une demande est déjà en attente auprès de ce membre.', 400, null, true)
          const semaine = await req.payload.count({
            collection: 'connectionRequests',
            where: { and: [{ demandeur: { equals: moi!.id } }, { createdAt: { greater_than: new Date(Date.now() - 7 * 86400e3).toISOString() } }] },
            overrideAccess: true,
            req,
          })
          if (semaine.totalDocs >= PLAFOND_HEBDO) {
            // Hors de la transaction de la requête, qui est annulée par le refus ci-dessous.
            await req.payload.update({ collection: 'members', id: moi!.id, data: { relationsSuspendues: true } as never, overrideAccess: true, context: { sansMotif: true } })
            await logAction(req.payload, { categorie: 'validation', action: 'Mises en relation suspendues : plus de 10 demandes en une semaine', author: { type: 'membre', nom: String(moi!.id) } })
            throw new APIError(MESSAGE_PLAFOND, 429, null, true)
          }
          return { ...data, demandeur: moi!.id, destinataire: e.titulaire, entreprise: e.id, message, statut: 'attente', fil: [], nonLuPar: [e.titulaire] }
        }

        // Mise à jour : seules les transitions prévues, par la bonne personne.
        const avant = originalDoc?.statut
        const apres = data.statut ?? avant
        if (estMembre(moi) && !req.context?.systeme) {
          const dest = idDe(originalDoc?.destinataire) === moi!.id
          const dem = idDe(originalDoc?.demandeur) === moi!.id
          const permis =
            apres === avant ||
            (avant === 'attente' && dest && ['acceptee', 'refusee', 'signalee'].includes(apres)) ||
            (avant === 'attente' && dem && apres === 'annulee') ||
            (avant === 'acceptee' && (dest || dem) && apres === 'signalee')
          if (!permis) throw new APIError('Action non autorisée.', 403)
          // Le membre ne réécrit ni les parties ni le message d'origine.
          const garde: Record<string, unknown> = {
            ...data,
            demandeur: originalDoc?.demandeur,
            destinataire: originalDoc?.destinataire,
            entreprise: originalDoc?.entreprise,
            message: originalDoc?.message,
            objet: originalDoc?.objet,
            fil: originalDoc?.fil,
            statut: apres,
            dateReponse: originalDoc?.dateReponse,
            signalement: originalDoc?.signalement,
          }
          if (apres === 'signalee' && avant !== 'signalee') garde.signalement = { motif: String(data.signalement?.motif ?? '').trim(), par: moi!.id, date: new Date().toISOString() }
          if (apres !== avant && ['acceptee', 'refusee'].includes(apres)) {
            garde.dateReponse = new Date().toISOString()
            // La réponse apparaît comme non lue pour le demandeur (Mes échanges).
            garde.nonLuPar = [idDe(originalDoc?.demandeur)]
          }
          return garde
        }
        if (apres !== avant && ['acceptee', 'refusee'].includes(apres)) data.dateReponse = new Date().toISOString()
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const charger = (id: unknown) =>
          req.payload.findByID({ collection: 'members', id: idDe(id) as number, depth: 1, overrideAccess: true, req }) as unknown as Promise<{
            email: string
            prenom?: string
            nom?: string
            entreprise?: { nom?: string } | null
          }>
        if (operation === 'create') {
          const [dem, dest] = await Promise.all([charger(doc.demandeur), charger(doc.destinataire)])
          await notify(req.payload, {
            to: dest.email,
            template: 'miseEnRelationRecue',
            vars: { demandeur: `${dem.prenom ?? ''} ${dem.nom ?? ''}`.trim(), entreprise_demandeur: dem.entreprise?.nom, message: doc.message, lien: lien() },
          })
          return doc
        }
        if (previousDoc?.statut === 'attente' && ['acceptee', 'refusee'].includes(doc.statut)) {
          const [dem, dest] = await Promise.all([charger(doc.demandeur), charger(doc.destinataire)])
          const ok = doc.statut === 'acceptee'
          await notify(req.payload, {
            to: dem.email,
            template: 'miseEnRelationReponse',
            vars: {
              membre: `${dest.prenom ?? ''} ${dest.nom ?? ''}`.trim(),
              accepte_ou_refuse: ok ? 'accepté' : 'refusé',
              texte_reponse: ok ? 'Acceptée : vous pouvez maintenant échanger dans votre espace membre.' : 'Refusée : aucun motif n’est donné.',
              lien: lien(),
            },
          })
        }
        if (doc.statut === 'signalee' && previousDoc?.statut !== 'signalee')
          await logAction(req.payload, { req, categorie: 'validation', action: 'Mise en relation signalée par un membre' })
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'demandeur', label: 'Demandeur', type: 'relationship', relationTo: 'members', index: true, admin: { readOnly: true } },
        { name: 'destinataire', label: 'Membre contacté', type: 'relationship', relationTo: 'members', index: true, admin: { readOnly: true } },
        { name: 'entreprise', label: 'Fiche contactée', type: 'relationship', relationTo: 'companies', required: true },
      ],
    },
    { name: 'objet', label: 'Objet', type: 'text' },
    { name: 'message', label: 'Message', type: 'textarea', required: true },
    { name: 'statut', label: 'Statut', type: 'select', defaultValue: 'attente', index: true, options: STATUTS_RELATION },
    { name: 'dateReponse', label: 'Date de réponse', type: 'date', admin: { readOnly: true } },
    {
      name: 'fil',
      label: 'Fil des messages',
      type: 'array',
      admin: { readOnly: true },
      fields: [
        { name: 'auteur', type: 'relationship', relationTo: 'members' },
        { name: 'texte', type: 'textarea' },
        { name: 'date', type: 'date' },
      ],
    },
    { name: 'nonLuPar', label: 'Non lu par', type: 'relationship', relationTo: 'members', hasMany: true, admin: { readOnly: true } },
    {
      name: 'signalement',
      label: 'Signalement',
      type: 'group',
      fields: [
        { name: 'motif', label: 'Motif', type: 'text' },
        { name: 'par', label: 'Signalé par', type: 'relationship', relationTo: 'members', admin: { readOnly: true } },
        { name: 'date', label: 'Date', type: 'date', admin: { readOnly: true } },
      ],
    },
  ],
}
