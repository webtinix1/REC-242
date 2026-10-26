import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import type { GroupField } from 'payload'

/**
 * Champs de référencement de l'extension SEO (groupe « meta », mêmes colonnes en base), placés là où la maquette
 * les montre : onglet « Référencement » de l'éditeur d'actualité (écran 10), panneau latéral de la page (écran 22).
 */
export const champsSeo = (label = 'Référencement', sidebar = false): GroupField => ({
  name: 'meta',
  label,
  type: 'group',
  admin: sidebar ? { position: 'sidebar' } : undefined,
  fields: [
    OverviewField({}),
    MetaTitleField({ hasGenerateFn: true, overrides: { label: 'Titre SEO' } }),
    MetaDescriptionField({ hasGenerateFn: true, overrides: { label: 'Description' } }),
    MetaImageField({ relationTo: 'media', hasGenerateFn: false }),
    PreviewField({ hasGenerateFn: false }),
  ],
})
