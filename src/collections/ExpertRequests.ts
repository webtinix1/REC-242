import { APIError, type CollectionConfig, type Payload, type PayloadRequest, type Where } from 'payload'

import { extraFull, extraRead } from '@/access/roles'
import { notify } from '@/emails/send'
import { endpointsExperts } from '@/endpoints/experts'
import { logAction } from '@/lib/audit'
import { ajouterJoursOuvres, DELAI_JOURS_OUVRES, lienExpert } from '@/lib/experts/delais'

type Moi = { id: number; collection?: string; name?: string; email?: string } | null | undefined
const estMembre = (u: unknown) => (u as Moi)?.collection === 'members'
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))

export const PREFERENCES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'siege', label: 'Rendez-vous au siège' },
]
export const STATUTS_EXPERT = [
  { value: 'envoyee', label: 'Envoyée' },
  { value: 'en-cours', label: 'En cours' },
  { value: 'repondue', label: 'Répondue' },
  { value: 'sans-reponse', label: 'Sans réponse' },
  { value: 'reattribuee', label: 'Réattribuée' },
  { value: 'cloturee', label: 'Clôturée' },
]

/** E-mail 14 (ou 14 bis pour une relance) à la personne sollicitée, avec son lien de réponse. */
export async function solliciter(payload: Payload, demandeId: number, relance = false, req?: PayloadRequest) {
  const d = (await payload.findByID({ collection: 'expertRequests', id: demandeId, depth: 2, overrideAccess: true, req })) as unknown as {
    id: number
    question: string
    preference: string
    etiquette?: { nom?: string } | null
    personne?: { id: number; email?: string; nom?: string } | null
    membre?: { prenom?: string; nom?: string; entreprise?: { nom?: string } | null } | null
  }
  if (!d.personne?.email) return false
  const lien = lienExpert(d.id, d.personne.id)
  const etiquette = d.etiquette?.nom ?? ''
  if (relance) await notify(payload, { to: d.personne.email, template: 'relanceExpert', vars: { etiquette, question: d.question, lien } })
  else
    await notify(payload, {
      to: d.personne.email,
      template: 'demandeExpert',
      vars: {
        membre: `${d.membre?.prenom ?? ''} ${d.membre?.nom ?? ''}`.trim(),
        entreprise: d.membre?.entreprise?.nom ?? '',
        etiquette,
        question: d.question,
        preference: PREFERENCES.find((p) => p.value === d.preference)?.label ?? '',
        lien,
      },
    })
  return true
}

/**
 * Questions aux experts (docs/05-regles-metier.md §9). La personne sollicitée porte l'étiquette choisie ; réponse attendue
 * sous 5 jours ouvrés, sinon « Sans réponse » (tâche horaire). Le back-office relance, réattribue, répond au nom de REC 242 ou clôture.
 */
export const ExpertRequests: CollectionConfig = {
  slug: 'expertRequests',
  labels: { singular: 'Question à un expert', plural: 'Demandes des membres' },
  admin: {
    group: 'Activité',
    components: { views: { list: { Component: '@/components/admin/demandes/DemandesView#DemandesView' } } },
  },
  defaultSort: '-createdAt',
  endpoints: endpointsExperts,
  access: {
    // Demandes des membres (docs/04-roles-et-droits.md, domaines ajoutés) : ni le trésorier ni le responsable événements.
    read: ({ req }) => (extraRead(req.user, 'demandesMembres') ? true : estMembre(req.user) ? ({ membre: { equals: req.user!.id } } as Where) : false),
    create: ({ req }) => estMembre(req.user),
    update: ({ req }) => (extraFull(req.user, 'demandesMembres') ? true : estMembre(req.user) ? ({ membre: { equals: req.user!.id } } as Where) : false),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const moi = req.user as Moi
        if (operation === 'create') {
          const m = (await req.payload.findByID({ collection: 'members', id: moi!.id, depth: 0, overrideAccess: true, req })) as unknown as { statut: string }
          if (m.statut !== 'actif') throw new APIError('Réservé aux membres actifs.', 403)
          const question = String(data.question ?? '').trim()
          if (question.length < 10) throw new APIError('Posez votre question (10 caractères au moins).', 400, null, true)
          const p = (await req.payload.findByID({ collection: 'people', id: idDe(data.personne) as number, depth: 0, overrideAccess: true, req }).catch(() => null)) as unknown as {
            etiquettes?: number[]
            visible?: boolean
          } | null
          if (!p || !(p.etiquettes ?? []).map(idDe).includes(idDe(data.etiquette))) throw new APIError('Cette personne ne porte pas cette étiquette.', 400, null, true)
          // Une personne retirée du site (comme sur l'écran « Solliciter un expert ») ne reçoit plus de question.
          if (p.visible === false) throw new APIError('Cette personne ne reçoit pas de question pour le moment.', 400, null, true)
          // « Me faire aider » : seulement une opportunité que le membre peut lire (publiée ou la sienne) ; sinon aucune.
          const opp = idDe(data.opportunite)
          const opportunite = opp
            ? ((await req.payload.findByID({ collection: 'opportunities', id: opp, depth: 0, overrideAccess: false, user: req.user, req }).catch(() => null)) as { id: number } | null)?.id
            : undefined
          return {
            ...data,
            opportunite: opportunite ?? null,
            membre: moi!.id,
            question: question.slice(0, 3000),
            statut: 'envoyee',
            echeance: ajouterJoursOuvres(new Date(), DELAI_JOURS_OUVRES).toISOString(),
            fil: [{ auteurType: 'membre', auteurNom: '', texte: question.slice(0, 3000), date: new Date().toISOString() }],
            nonLuMembre: false,
            relances: 0,
          }
        }
        if (estMembre(moi) && !req.context?.systeme) {
          // Le membre peut seulement clôturer sa demande ou marquer la réponse comme lue (les messages passent par l'action dédiée).
          const statut = data.statut === 'cloturee' ? 'cloturee' : originalDoc?.statut
          return { ...originalDoc, statut, nonLuMembre: data.nonLuMembre === false ? false : originalDoc?.nonLuMembre, fil: originalDoc?.fil }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          const ok = await solliciter(req.payload, doc.id, false, req)
          if (!ok) await logAction(req.payload, { req, categorie: 'validation', action: 'Question à un expert sans adresse e-mail : à transmettre par l’équipe' })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'membre', label: 'Membre', type: 'relationship', relationTo: 'members', index: true, admin: { readOnly: true } },
        { name: 'etiquette', label: 'Étiquette', type: 'relationship', relationTo: 'expertiseTags', required: true },
        { name: 'personne', label: 'Personne sollicitée', type: 'relationship', relationTo: 'people', required: true },
      ],
    },
    { name: 'question', label: 'Question', type: 'textarea', required: true },
    {
      type: 'row',
      fields: [
        { name: 'preference', label: 'Préférence de réponse', type: 'select', defaultValue: 'email', options: PREFERENCES },
        { name: 'statut', label: 'Statut', type: 'select', defaultValue: 'envoyee', index: true, options: STATUTS_EXPERT },
        { name: 'echeance', label: 'Réponse attendue avant le', type: 'date', admin: { readOnly: true } },
      ],
    },
    { name: 'opportunite', label: 'Opportunité concernée', type: 'relationship', relationTo: 'opportunities' },
    {
      name: 'fil',
      label: 'Fil de la demande',
      type: 'array',
      admin: { readOnly: true },
      fields: [
        {
          name: 'auteurType',
          type: 'select',
          options: [
            { value: 'membre', label: 'Membre' },
            { value: 'expert', label: 'Expert' },
            { value: 'rec242', label: 'REC 242' },
            { value: 'systeme', label: 'Système' },
          ],
        },
        { name: 'auteurNom', type: 'text' },
        { name: 'texte', type: 'textarea' },
        { name: 'date', type: 'date' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'relances', label: 'Relances', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'nonLuMembre', label: 'Réponse non lue par le membre', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
      ],
    },
  ],
}
