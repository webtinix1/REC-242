import type { CollectionConfig } from 'payload'

import { isStaff, publicExtraAccess } from '@/access/roles'
import { slugField } from '@/fields/slug'

export const POLES = [
  { value: 'direction', label: 'Direction' },
  { value: 'numerique', label: 'Numérique et données' },
  { value: 'juridique', label: 'Juridique' },
  { value: 'programme', label: 'Programme et relations avec les adhérents' },
  { value: 'communication', label: 'Communication et stratégie' },
  { value: 'relations', label: 'Relations extérieures' },
]

const estExpert = (d?: Partial<{ role: string }>) => d?.role === 'expert'

/** Gouvernance et experts (pages Gouvernance, Commissions, écran Experts de l'espace membre). */
export const People: CollectionConfig = {
  slug: 'people',
  labels: { singular: 'Personne', plural: 'Gouvernance et experts' },
  admin: {
    components: { beforeList: ['@/components/admin/ContenusTabs#ContenusTabs'] },
    group: 'Contenus',
    useAsTitle: 'nom',
    defaultColumns: ['nom', 'fonction', 'role', 'pole', 'visible'],
    description:
      'Fondatrice, comité de direction et experts du réseau, avec leurs étiquettes d’expertise. Chaque membre du comité a sa page de profil.',
  },
  defaultSort: 'ordre',
  access: {
    ...publicExtraAccess('gouvernance'),
    // Un membre connecté ne voit que les fiches visibles, comme le public.
    read: ({ req }) => (isStaff(req.user) ? true : { visible: { equals: true } }),
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Fiche',
          fields: [
          {
            type: 'row',
            fields: [
              { name: 'nom', label: 'Nom', type: 'text', required: true },
              {
                name: 'initiales',
                label: 'Initiales',
                type: 'text',
                maxLength: 3,
                admin: { description: 'Affichées sans photo.' },
              },
            ],
          },
          { name: 'photo', label: 'Photo', type: 'upload', relationTo: 'media' },
          { name: 'fonction', label: 'Fonction', type: 'text', required: true },
          {
            type: 'row',
            fields: [
              {
                name: 'role',
                label: 'Rôle',
                type: 'select',
                required: true,
                options: [
                  { value: 'fondatrice', label: 'Fondatrice' },
                  { value: 'comite', label: 'Comité de direction' },
                  { value: 'expert', label: 'Expert du réseau' },
                ],
              },
              {
                name: 'pole',
                label: 'Pôle',
                type: 'select',
                options: POLES,
                admin: { condition: (d) => d?.role !== 'expert' },
              },
            ],
          },
          {
            type: 'row',
            fields: [
              {
                name: 'email',
                label: 'E-mail (questions des membres)',
                type: 'email',
                // Jamais publié : sert à transmettre les questions des membres (lot 10).
                access: { read: ({ req }) => isStaff(req.user) },
                admin: { description: 'Reçoit les questions posées depuis « Solliciter un expert ». Jamais affiché sur le site.' },
              },
              {
                name: 'membre',
                label: 'Membre lié',
                type: 'relationship',
                relationTo: 'members',
                admin: { description: 'Pour un expert qui est aussi membre du réseau.' },
              },
            ],
          },
          {
            name: 'etiquettes',
            label: 'Étiquettes d’expertise',
            type: 'relationship',
            relationTo: 'expertiseTags',
            hasMany: true,
          },
          ],
        },
        {
          label: 'Profil',
          description: 'Page publique de la personne, ouverte depuis la page Gouvernance. Les rubriques vides ne s’affichent pas.',
          admin: { condition: (d) => !estExpert(d) },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'accroche', label: 'Surtitre', type: 'text', admin: { description: 'Au-dessus du nom. Exemple : le métier et le pays.' } },
                { name: 'lieu', label: 'Lieu', type: 'text' },
              ],
            },
            { name: 'presentation', label: 'Présentation', type: 'textarea', admin: { rows: 6 } },
            {
              name: 'chiffres',
              label: 'Chiffres clés',
              labels: { singular: 'Chiffre', plural: 'Chiffres' },
              type: 'array',
              maxRows: 4,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'valeur', label: 'Valeur', type: 'text', required: true },
                    { name: 'libelle', label: 'Libellé', type: 'text', required: true },
                  ],
                },
              ],
            },
            {
              name: 'rubriques',
              label: 'Rubriques du parcours',
              labels: { singular: 'Rubrique', plural: 'Rubriques' },
              type: 'array',
              admin: { description: 'Exemples : engagements, parcours, formation.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'titre', label: 'Titre', type: 'text', required: true },
                    {
                      name: 'disposition',
                      label: 'Présentation',
                      type: 'select',
                      required: true,
                      defaultValue: 'chronologie',
                      options: [
                        { value: 'chronologie', label: 'Chronologie' },
                        { value: 'cartes', label: 'Cartes' },
                      ],
                    },
                  ],
                },
                {
                  name: 'entrees',
                  label: 'Entrées',
                  labels: { singular: 'Entrée', plural: 'Entrées' },
                  type: 'array',
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'periode', label: 'Période', type: 'text' },
                        { name: 'lieu', label: 'Lieu', type: 'text' },
                      ],
                    },
                    {
                      type: 'row',
                      fields: [
                        { name: 'titre', label: 'Titre', type: 'text', required: true },
                        { name: 'organisation', label: 'Organisation', type: 'text' },
                      ],
                    },
                    { name: 'description', label: 'Description', type: 'text' },
                    { name: 'points', label: 'Points clés', type: 'textarea', admin: { description: 'Un point par ligne.' } },
                  ],
                },
              ],
            },
            {
              name: 'competences',
              label: 'Compétences',
              labels: { singular: 'Compétence', plural: 'Compétences' },
              type: 'array',
              fields: [
                { name: 'titre', label: 'Titre', type: 'text', required: true },
                { name: 'texte', label: 'Texte', type: 'text' },
              ],
            },
            { name: 'domaines', label: 'Domaines et outils', type: 'textarea', admin: { description: 'Un domaine par ligne.' } },
          ],
        },
        {
          label: 'Aperçu',
          description: 'La page telle qu’elle paraîtra. Enregistrez pour y voir vos derniers changements.',
          admin: { condition: (d) => !estExpert(d) },
          fields: [{ name: 'apercu', type: 'ui', admin: { components: { Field: '@/components/admin/edition/Apercu#Apercu' } } }],
        },
      ],
    },
    slugField('nom', 'Adresse', 'Fin de l’adresse de la page de profil, remplie à partir du nom. Modifiable.'),
    {
      name: 'ordre',
      label: 'Ordre d’affichage',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'visible',
      label: 'Visible sur le site',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
