import type { GlobalConfig } from 'payload'

import { atLeast } from '@/access/roles'
import { TEMPLATES, TEMPLATE_KEYS } from '@/emails/defaults'

/**
 * Objets et textes des e-mails automatiques, modifiables par l'équipe.
 * Un modèle absent de la liste utilise le texte par défaut de src/emails/defaults.ts.
 */
export const EmailTemplates: GlobalConfig = {
  slug: 'emailTemplates',
  label: 'E-mails automatiques',
  admin: {
    group: 'Administration',
    description:
      "Textes des e-mails envoyés aux candidats, aux membres et à l'équipe. Les mots entre doubles accolades sont remplacés à l'envoi. Une ligne « [bouton] Libellé | {{lien}} » crée le bouton principal.",
  },
  access: {
    read: ({ req }) => atLeast(req.user, 'parametres', 'read'),
    update: ({ req }) => atLeast(req.user, 'parametres', 'full'),
  },
  fields: [
    {
      name: 'modeles',
      label: 'Modèles',
      type: 'array',
      labels: { singular: 'Modèle', plural: 'Modèles' },
      admin: {
        initCollapsed: true,
        components: { RowLabel: '@/components/admin/EmailTemplateRowLabel#EmailTemplateRowLabel' },
      },
      validate: (value: unknown) => {
        const rows = (value as { cle?: string }[] | null) ?? []
        const keys = rows.map((r) => r.cle).filter(Boolean)
        return new Set(keys).size === keys.length || 'Chaque modèle ne peut apparaître qu’une fois.'
      },
      fields: [
        {
          name: 'cle',
          label: 'Modèle',
          type: 'select',
          required: true,
          options: TEMPLATE_KEYS.map((k) => ({ value: k, label: TEMPLATES[k].label })),
        },
        { name: 'objet', label: 'Objet', type: 'text', required: true },
        {
          name: 'corps',
          label: 'Texte',
          type: 'textarea',
          required: true,
          admin: { rows: 12 },
        },
        {
          name: 'variables',
          type: 'ui',
          admin: { components: { Field: '@/components/admin/EmailTemplateVariables#EmailTemplateVariables' } },
        },
      ],
    },
  ],
}
