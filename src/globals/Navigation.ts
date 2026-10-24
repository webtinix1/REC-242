import type { Field, GlobalConfig } from 'payload'

import { atLeast } from '@/access/roles'

const lien: Field[] = [
  {
    type: 'row',
    fields: [
      { name: 'libelle', label: 'Libellé', type: 'text', required: true },
      { name: 'page', label: 'Page', type: 'relationship', relationTo: 'pages' },
      {
        name: 'url',
        label: 'Ou adresse',
        type: 'text',
        admin: { description: 'Par exemple /agenda ou https://…' },
      },
    ],
  },
]

/** Menu principal (sept entrées au plus) et pied de page. Réservé aux administrateurs (l'éditeur ne touche pas aux menus). */
export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Menus',
  admin: { group: 'Contenus' },
  access: {
    read: () => true,
    update: ({ req }) => atLeast(req.user, 'pages', 'full'),
  },
  fields: [
    {
      name: 'principal',
      label: 'Menu principal',
      type: 'array',
      maxRows: 7,
      labels: { singular: 'Entrée', plural: 'Entrées' },
      admin: { description: 'Sept entrées au plus.' },
      fields: [...lien, { name: 'sousMenu', label: 'Sous-menu', type: 'array', fields: lien }],
    },
    {
      name: 'piedDePage',
      label: 'Pied de page',
      type: 'array',
      labels: { singular: 'Colonne', plural: 'Colonnes' },
      fields: [
        { name: 'titre', label: 'Titre de la colonne', type: 'text', required: true },
        { name: 'liens', label: 'Liens', type: 'array', fields: lien },
      ],
    },
  ],
}
