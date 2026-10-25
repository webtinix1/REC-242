import type { CollectionConfig } from 'payload'

import { atLeast } from '@/access/roles'
import { slugField } from '@/fields/slug'

const taxonomy = (
  slug: string,
  singular: string,
  plural: string,
  description?: string,
  extraFields: CollectionConfig['fields'] = [],
): CollectionConfig => ({
  slug,
  labels: { singular, plural },
  admin: {
    components: { beforeList: ['@/components/admin/ContenusTabs#ContenusTabs'] },
    group: 'Taxonomies',
    useAsTitle: 'nom',
    defaultColumns: ['nom', 'ordre'],
    description,
  },
  defaultSort: 'ordre',
  access: {
    read: () => true,
    create: ({ req }) =>
      atLeast(req.user, 'pages', 'full') || atLeast(req.user, 'actualites', 'full'),
    update: ({ req }) =>
      atLeast(req.user, 'pages', 'full') || atLeast(req.user, 'actualites', 'full'),
    delete: ({ req }) => atLeast(req.user, 'pages', 'full'),
  },
  fields: [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    slugField('nom'),
    {
      name: 'ordre',
      label: 'Ordre',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    ...extraFields,
  ],
})

export const Sectors = taxonomy(
  'sectors',
  'Secteur',
  'Secteurs',
  'Secteurs d’activité : candidature, annuaire, opportunités, actualités.',
)
export const Localities = taxonomy(
  'localities',
  'Localité',
  'Localités',
  'Villes de la candidature et de l’annuaire.',
)
export const EventTypes = taxonomy('eventTypes', 'Type d’événement', 'Types d’événements')
export const ExpertiseTags = taxonomy(
  'expertiseTags',
  'Étiquette d’expertise',
  'Étiquettes d’expertise',
  'Relient les questions des membres au comité et aux experts.',
  [
    {
      name: 'filtreSite',
      label: 'Proposée comme filtre sur la page Gouvernance',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
  ],
)
