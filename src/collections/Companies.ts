import { APIError, type Access, type CollectionConfig, type Field, type FieldAccess, type Validate } from 'payload'

import { atLeast, hasRole } from '@/access/roles'
import { masquerCoordonnees } from '@/lib/echanges/masquage'
import { logAction } from '@/lib/audit'
import { slugField } from '@/fields/slug'
import { EFFECTIFS, FORMES } from '@/lib/adhesion/options'
import { VISIBILITES } from '@/lib/membres/options'

/** L'équipe (droit « Fiches membres ») ou le membre titulaire de la fiche. L'annuaire public (lot 7) n'en lit que les champs publics. */
const lecture: Access = ({ req }) => {
  if (atLeast(req.user, 'membres', 'read')) return true
  if ((req.user as { collection?: string } | null)?.collection === 'members') return { titulaire: { equals: req.user!.id } }
  return false
}

const equipeSeulement: FieldAccess = ({ req }) => atLeast(req.user, 'membres', 'partial')

/** Réglages de visibilité : le membre seul (ou le serveur, sans utilisateur, à l'activation). */
const choixDuMembre: FieldAccess = ({ req }) => !req.user || (req.user as { collection?: string }).collection === 'members'

const estMembre = (u: unknown) => (u as { collection?: string } | null)?.collection === 'members'

/** Longueur maximale des textes écrits par le membre (celle de la présentation dans l'espace membre). */
const TEXTE_MAX = 1200
const LIEN_MAX = 300

/** Valeur inchangée : jamais bloquée, pour ne pas empêcher l'équipe d'enregistrer une fiche plus ancienne. */
const inchange = (value: unknown, previousValue: unknown) => (value ?? '') === (previousValue ?? '')

const texteBorne: Validate = (value, { previousValue }) =>
  inchange(value, previousValue) || String(value ?? '').length <= TEXTE_MAX || `${TEXTE_MAX.toLocaleString('fr-FR')} caractères au maximum.`

/** Lien public de la fiche : adresse http ou https seulement (ni « javascript: », ni « data: »), longueur bornée. */
const lienValide: Validate = (value, { previousValue }) => {
  if (inchange(value, previousValue)) return true
  const s = String(value ?? '').trim()
  if (!s) return true
  if (s.length > LIEN_MAX) return `${LIEN_MAX} caractères au maximum.`
  return /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(s) || 'Adresse invalide : elle doit commencer par http:// ou https://.'
}

const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id?: number }).id : (x as number | null | undefined))

/** Entreprises (fiches de l'annuaire). Les champs vérifiés ne changent que par une demande validée. */
export const Companies: CollectionConfig = {
  slug: 'companies',
  labels: { singular: 'Entreprise', plural: 'Entreprises' },
  admin: { group: 'Adhésions', useAsTitle: 'nom', hidden: true },
  access: {
    read: lecture,
    create: ({ req }) => atLeast(req.user, 'membres', 'partial'),
    update: ({ req }) => {
      if (atLeast(req.user, 'membres', 'partial')) return true
      if ((req.user as { collection?: string } | null)?.collection === 'members') return { titulaire: { equals: req.user!.id } }
      return false
    },
    delete: ({ req }) => hasRole(req.user, 'superadmin'),
  },
  endpoints: [
    {
      // Écran 05, onglet « Demandes de modification » : la présentation proposée est publiée ou écartée.
      path: '/:id/presentation',
      method: 'post',
      handler: async (req) => {
        if (!atLeast(req.user, 'membres', 'partial')) throw new APIError('Action non autorisée.', 403)
        const e = (await req.payload.findByID({ collection: 'companies', id: req.routeParams?.id as string, depth: 0, overrideAccess: false, req }).catch(() => null)) as {
          id: number
          nom: string
          presentationProposee?: string
        } | null
        if (!e) throw new APIError('Fiche introuvable.', 404)
        const b = ((await req.json?.().catch(() => ({}))) ?? {}) as { decision?: string }
        const publier = b.decision === 'publier'
        await req.payload.update({
          collection: 'companies',
          id: e.id,
          data: (publier ? { presentation: e.presentationProposee ?? '', presentationEnRelecture: false } : { presentationEnRelecture: false, presentationProposee: null }) as never,
          overrideAccess: false,
          req,
        })
        await logAction(req.payload, { req, categorie: 'validation', action: `Présentation ${publier ? 'publiée' : 'écartée'} : ${e.nom}`, cible: e.nom })
        return Response.json({ ok: true })
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        // Le membre propose une présentation : elle est relue par le secrétariat avant publication.
        const membre = estMembre(req.user)
        if (membre) {
          // Textes publiés écrits par le membre : les coordonnées restent sur la plateforme (annuaire détaillé).
          for (const k of ['presentationProposee', 'services'] as const)
            if (typeof data[k] === 'string') data[k] = masquerCoordonnees(data[k])
          // Le logo ne change que depuis l'espace membre : l'action serveur crée le média puis le rattache par l'API
          // locale. Par l'API REST, le membre pourrait désigner n'importe quel média de la médiathèque.
          if (data.logo !== undefined && idDe(data.logo) !== idDe(originalDoc?.logo) && data.logo !== null && req.payloadAPI !== 'local')
            throw new APIError('Le logo se change depuis votre espace membre.', 403, null, true)
        }
        if (membre && data.presentationProposee !== undefined && data.presentationProposee !== (originalDoc?.presentation ?? '')) {
          data.presentationEnRelecture = true
        }
        // Retirer le consentement à l'annuaire retire la fiche immédiatement (et la mise en avant avec elle).
        if (data.visibilite && data.visibilite.annuaire === false) data.visibilite.miseEnAvant = false
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'nom', label: 'Raison sociale', type: 'text', required: true, access: { update: equipeSeulement } },
        { name: 'titulaire', label: 'Membre titulaire', type: 'relationship', relationTo: 'members', index: true, access: { update: equipeSeulement } },
      ],
    },
    { ...slugField('nom'), access: { update: equipeSeulement } } as Field,
    { name: 'logo', label: 'Logo', type: 'upload', relationTo: 'media' },
    {
      name: 'photo',
      label: 'Photo d’illustration',
      type: 'upload',
      relationTo: 'media',
      access: { update: equipeSeulement },
      admin: { description: 'Bandeau photo de la fiche (site et espace membre). Facultatif : sans photo, le bandeau n’est pas affiché.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'secteurs', label: 'Secteurs', type: 'relationship', relationTo: 'sectors', hasMany: true, maxRows: 3, access: { update: equipeSeulement } },
        { name: 'localite', label: 'Ville', type: 'relationship', relationTo: 'localities', access: { update: equipeSeulement } },
        { name: 'quartier', label: 'Quartier', type: 'text', access: { update: equipeSeulement } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'effectif', label: 'Taille', type: 'select', options: EFFECTIFS, access: { update: equipeSeulement } },
        { name: 'formeJuridique', label: 'Forme juridique', type: 'select', options: FORMES, access: { update: equipeSeulement } },
        { name: 'rccm', label: 'RCCM', type: 'text', access: { update: equipeSeulement } },
      ],
    },
    { name: 'presentation', label: 'Présentation publiée', type: 'textarea', access: { update: equipeSeulement } },
    { name: 'presentationProposee', label: 'Présentation proposée par le membre', type: 'textarea', validate: texteBorne },
    { name: 'presentationEnRelecture', label: 'Présentation en relecture', type: 'checkbox', defaultValue: false, access: { update: equipeSeulement } },
    { name: 'services', label: 'Services proposés', type: 'textarea', validate: texteBorne },
    // Absent de la liste des champs que le membre modifie lui-même (docs/04-roles-et-droits.md, « Le membre »).
    { name: 'recherches', label: 'Ce que l’entreprise recherche', type: 'textarea', validate: texteBorne, access: { update: equipeSeulement } },
    {
      type: 'row',
      fields: [
        { name: 'siteWeb', label: 'Site internet', type: 'text', validate: lienValide },
        { name: 'linkedin', label: 'LinkedIn', type: 'text', validate: lienValide },
        { name: 'facebook', label: 'Facebook', type: 'text', validate: lienValide },
      ],
    },
    {
      name: 'visibilite',
      label: 'Visibilité (choix du membre)',
      type: 'group',
      // Choix du membre seul : l'administration peut masquer une fiche (masqueeParAdmin), jamais la publier sans consentement.
      fields: VISIBILITES.map((v) => ({ name: v.name, label: v.label, type: 'checkbox' as const, defaultValue: v.name === 'annuaire', access: { update: choixDuMembre } })),
    },
    {
      type: 'row',
      fields: [
        {
          name: 'masqueeParAdmin',
          label: 'Fiche masquée par l’administration',
          type: 'checkbox',
          defaultValue: false,
          access: { update: equipeSeulement },
          admin: { description: 'L’administration peut masquer une fiche, jamais la publier sans consentement.' },
        },
        { name: 'selectionAccueil', label: 'Sélectionnée pour l’accueil par le bureau', type: 'checkbox', defaultValue: false, access: { update: equipeSeulement } },
      ],
    },
  ],
}
