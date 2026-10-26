import { APIError, type CollectionConfig, type PayloadRequest, type Where } from 'payload'

import { atLeast, isStaff } from '@/access/roles'
import { slugField } from '@/fields/slug'
import { dupliquer } from '@/endpoints/evenements'
import { logAction } from '@/lib/audit'
import { prevenirInscrits } from '@/lib/evenements/notifications'

export const STATUTS_EVENEMENT = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'publie', label: 'Publié' },
  { value: 'complet', label: 'Complet' },
  { value: 'annule', label: 'Annulé' },
  { value: 'reporte', label: 'Reporté' },
  { value: 'termine', label: 'Terminé' },
]
export const VISIBLES = ['publie', 'complet', 'annule', 'reporte', 'termine']

export const ACCES = [
  { value: 'tous', label: 'Ouvert à tous' },
  { value: 'membres', label: 'Réservé aux membres' },
  { value: 'invitation', label: 'Sur invitation' },
]
export const FORMATS = [
  { value: 'sur-place', label: 'Sur place' },
  { value: 'visio', label: 'Visioconférence' },
  { value: 'communique', label: 'Lieu communiqué aux inscrits' },
]

const gestion = (req: PayloadRequest) => atLeast(req.user, 'evenements', 'partial')

/** Événements (docs/03-modele-de-donnees.md, `events` ; docs/05-regles-metier.md §7). */
export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Événement', plural: 'Événements' },
  admin: {
    group: 'Activité',
    useAsTitle: 'titre',
    defaultColumns: ['titre', 'debut', 'statut'],
    components: {
      views: {
        list: { Component: '@/components/admin/evenements/EvenementsView#EvenementsView' },
        edit: { default: { Component: '@/components/admin/evenements/EvenementView#EvenementView' } },
      },
    },
  },
  defaultSort: '-debut',
  endpoints: [dupliquer],
  access: {
    // Le public ne voit que les événements publiés (ou annulés, reportés, terminés) ; l'équipe voit aussi les brouillons.
    read: ({ req }) => (isStaff(req.user) ? true : ({ statut: { in: VISIBLES } } as Where)),
    create: ({ req }) => gestion(req),
    update: ({ req }) => gestion(req),
    delete: ({ req }) => atLeast(req.user, 'evenements', 'full'),
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const debut = data.debut ?? originalDoc?.debut
        const fin = data.fin ?? originalDoc?.fin
        if (debut && fin && new Date(fin) < new Date(debut)) throw new APIError('La fin doit suivre le début.', 400, null, true)
        if (data.capacite != null && data.capacite !== '' && Number(data.capacite) < 1) throw new APIError('Capacité : 1 place au moins, ou vide pour illimité.', 400, null, true)
        if ((data.statut === 'annule' || data.statut === 'reporte') && data.statut !== originalDoc?.statut && !String(data.messageInscrits ?? '').trim())
          throw new APIError('Écrivez le message envoyé aux inscrits.', 400, null, true)
        if (data.statut === 'reporte' && data.statut !== originalDoc?.statut && !data.nouvelleDate) throw new APIError('Indiquez la nouvelle date.', 400, null, true)
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'update' && previousDoc?.statut !== doc.statut && (doc.statut === 'annule' || doc.statut === 'reporte')) {
          await prevenirInscrits(req.payload, doc, req)
          await logAction(req.payload, { req, categorie: 'publication', action: `Événement ${doc.statut === 'annule' ? 'annulé' : 'reporté'} : ${doc.titre}` })
        } else if (previousDoc?.statut !== doc.statut && doc.statut === 'publie' && previousDoc?.statut !== 'complet') {
          await logAction(req.payload, { req, categorie: 'publication', action: `Événement publié : ${doc.titre}` })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Fiche',
          fields: [
            { name: 'titre', label: 'Titre', type: 'text', required: true },
            slugField('titre'),
            {
              type: 'row',
              fields: [
                { name: 'type', label: 'Type', type: 'relationship', relationTo: 'eventTypes' },
                { name: 'commission', label: 'Commission organisatrice', type: 'relationship', relationTo: 'commissions' },
                { name: 'secteurs', label: 'Secteurs', type: 'relationship', relationTo: 'sectors', hasMany: true },
              ],
            },
            { name: 'chapeau', label: 'Chapeau', type: 'textarea' },
            { name: 'description', label: 'Description', type: 'richText' },
            {
              type: 'row',
              fields: [
                { name: 'debut', label: 'Début', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy HH:mm' } } },
                { name: 'fin', label: 'Fin', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy HH:mm' } } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'format', label: 'Format', type: 'select', defaultValue: 'sur-place', options: FORMATS },
                { name: 'lieu', label: 'Nom du lieu', type: 'text' },
                { name: 'ville', label: 'Ville', type: 'relationship', relationTo: 'localities' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'adresse', label: 'Adresse', type: 'text' },
                { name: 'lienCarte', label: 'Lien de carte ou de visioconférence', type: 'text', admin: { description: 'Communiqué aux inscrits seulement.' }, access: { read: ({ req }) => isStaff(req.user) } },
              ],
            },
            { name: 'indicationsAcces', label: 'Indications d’accès (rappel de la veille)', type: 'textarea' },
            { name: 'image', label: 'Image principale (vignettes)', type: 'upload', relationTo: 'media' },
            { name: 'bandeau', label: 'Photo du bandeau de la fiche', type: 'upload', relationTo: 'media', admin: { description: 'Vide : l’image principale.' } },
          ],
        },
        {
          label: 'Inscriptions',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'acces', label: 'Accès', type: 'select', defaultValue: 'tous', options: ACCES },
                { name: 'capacite', label: 'Capacité', type: 'number', min: 1, admin: { description: 'Vide : places illimitées.' } },
                { name: 'cloture', label: 'Clôture des inscriptions', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'listeAttente', label: 'Liste d’attente automatique', type: 'checkbox', defaultValue: true },
                { name: 'rappelVeille', label: 'Rappel la veille', type: 'checkbox', defaultValue: true },
                { name: 'billetQr', label: 'Billet avec QR code', type: 'checkbox', defaultValue: true },
              ],
            },
            { name: 'tarif', label: 'Tarif', type: 'text', admin: { description: 'Texte libre, par exemple « Gratuit ». Vide : « À préciser ».' } },
            {
              name: 'programme',
              label: 'Programme',
              type: 'array',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'heure', label: 'Heure', type: 'text' },
                    { name: 'intitule', label: 'Intitulé', type: 'text', required: true },
                  ],
                },
              ],
            },
            {
              name: 'intervenants',
              label: 'Intervenants',
              type: 'array',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'nom', label: 'Nom', type: 'text', required: true },
                    { name: 'fonction', label: 'Fonction', type: 'text' },
                    { name: 'photo', label: 'Photo', type: 'upload', relationTo: 'media' },
                  ],
                },
              ],
            },
            {
              name: 'documents',
              label: 'Documents',
              type: 'array',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'document', label: 'Document', type: 'relationship', relationTo: 'documents', required: true },
                    {
                      name: 'visibilite',
                      label: 'Visible par',
                      type: 'select',
                      defaultValue: 'tous',
                      options: [
                        { value: 'tous', label: 'Tous' },
                        { value: 'inscrits', label: 'Inscrits' },
                      ],
                    },
                  ],
                },
                { name: 'libelle', label: 'Intitulé affiché (facultatif)', type: 'text', admin: { description: 'Remplace le titre du document sur la fiche de l’événement.' } },
              ],
            },
          ],
        },
        {
          label: 'Après l’événement',
          fields: [
            { name: 'compteRendu', label: 'Compte rendu', type: 'richText' },
            { name: 'participants', label: 'Nombre de participants (affiché s’il est renseigné)', type: 'number', min: 0 },
            {
              name: 'galerie',
              label: 'Galerie',
              type: 'array',
              fields: [{ name: 'image', label: 'Image', type: 'upload', relationTo: 'media', required: true }],
            },
            { name: 'actualite', label: 'Actualité liée', type: 'relationship', relationTo: 'news' },
          ],
        },
      ],
    },
    {
      name: 'statut',
      label: 'Statut',
      type: 'select',
      defaultValue: 'brouillon',
      index: true,
      options: STATUTS_EVENEMENT,
      admin: { position: 'sidebar' },
    },
    { name: 'messageInscrits', label: 'Message aux inscrits (annulation ou report)', type: 'textarea', admin: { position: 'sidebar' } },
    { name: 'nouvelleDate', label: 'Nouvelle date (report)', type: 'date', admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } } },
  ],
}
