import type { Field } from 'payload'

/** Transforme un texte en adresse : minuscules, sans accents, mots séparés par des tirets. */
export const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Champ « Adresse » rempli à partir du champ source s'il est vide. Unique et indexé. */
export const slugField = (
  source = 'title',
  label = 'Adresse',
  description = 'Rempli automatiquement à partir du titre. Modifiable.',
): Field => ({
  name: 'slug',
  label,
  type: 'text',
  index: true,
  unique: true,
  admin: {
    position: 'sidebar',
    description,
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (typeof value === 'string' && value.trim()) return slugify(value)
        const src = data?.[source]
        return typeof src === 'string' ? slugify(src) : value
      },
    ],
  },
})
