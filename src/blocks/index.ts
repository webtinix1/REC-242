import type { Block, Field } from 'payload'

/**
 * Blocs des pages et des actualités. Les pages institutionnelles de la maquette ont des mises en page
 * spécifiques : le site (lot 3) les rend comme des gabarits dont les textes et listes viennent de ces blocs.
 */

const titre = { name: 'titre', label: 'Titre', type: 'text' } as const
const surtitre = { name: 'surtitre', label: 'Surtitre', type: 'text' } as const

/** Identifiant de section : le gabarit du site place le bloc grâce à lui. */
const ancre: Field = {
  name: 'ancre',
  label: 'Section',
  type: 'text',
  admin: {
    description:
      'Identifiant utilisé par la mise en page du site (par exemple « hero », « piliers »). Ne pas modifier.',
  },
}

const boutons: Field = {
  name: 'boutons',
  label: 'Boutons',
  type: 'array',
  maxRows: 2,
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'libelle', label: 'Libellé', type: 'text', required: true },
        { name: 'lien', label: 'Lien', type: 'text', required: true },
      ],
    },
  ],
}

/** Section générique : surtitre, titre, texte, image, boutons et note. */
export const Section: Block = {
  slug: 'section',
  labels: { singular: 'Section', plural: 'Sections' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    surtitre,
    titre,
    { name: 'texte', label: 'Texte', type: 'textarea' },
    { name: 'image', label: 'Image', type: 'upload', relationTo: 'media' },
    boutons,
    {
      name: 'note',
      label: 'Note',
      type: 'text',
      admin: { description: 'Petite ligne sous la section (référence, légende…).' },
    },
    {
      name: 'aValider',
      label: 'Afficher la mention « À valider »',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
}

export const Entete: Block = {
  slug: 'entete',
  labels: { singular: 'En-tête', plural: 'En-têtes' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    surtitre,
    { ...titre, required: true },
    { name: 'texte', label: 'Texte', type: 'textarea' },
    { name: 'image', label: 'Image', type: 'upload', relationTo: 'media' },
    {
      name: 'boutons',
      label: 'Boutons',
      type: 'array',
      maxRows: 2,
      fields: [
        { name: 'libelle', label: 'Libellé', type: 'text', required: true },
        { name: 'lien', label: 'Lien', type: 'text', required: true },
      ],
    },
  ],
}

export const Texte: Block = {
  slug: 'texte',
  labels: { singular: 'Texte', plural: 'Textes' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    surtitre,
    titre,
    { name: 'contenu', label: 'Texte', type: 'richText', required: true },
  ],
}

export const Image: Block = {
  slug: 'image',
  labels: { singular: 'Image', plural: 'Images' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    { name: 'image', label: 'Image', type: 'upload', relationTo: 'media', required: true },
    { name: 'legende', label: 'Légende', type: 'text' },
  ],
}

export const ChiffresCles: Block = {
  slug: 'chiffresCles',
  labels: { singular: 'Chiffres clés', plural: 'Chiffres clés' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    surtitre,
    titre,
    {
      name: 'note',
      label: 'Note',
      type: 'text',
      admin: { description: 'Les chiffres viennent des Paramètres.' },
    },
  ],
}

export const Cartes: Block = {
  slug: 'cartes',
  labels: { singular: 'Cartes', plural: 'Cartes' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    surtitre,
    titre,
    { name: 'intro', label: 'Introduction', type: 'textarea' },
    {
      name: 'style',
      label: 'Présentation',
      type: 'select',
      defaultValue: 'cartes',
      options: [
        { value: 'cartes', label: 'Cartes' },
        { value: 'numerotees', label: 'Étapes numérotées' },
        { value: 'liste', label: 'Liste lettrée (a, b, c…)' },
        { value: 'pastilles', label: 'Pastilles' },
        { value: 'legal', label: 'Rubriques (texte légal)' },
      ],
    },
    {
      name: 'reference',
      label: 'Référence',
      type: 'text',
      admin: { description: 'Par exemple « Article 8 des statuts ».' },
    },
    boutons,
    {
      name: 'note',
      label: 'Note',
      type: 'text',
      admin: { description: 'Petite ligne sous la liste.' },
    },
    {
      name: 'aValider',
      label: 'Afficher la mention « À valider »',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'cartes',
      label: 'Cartes',
      type: 'array',
      fields: [
        { name: 'titre', label: 'Titre', type: 'text', required: true },
        { name: 'texte', label: 'Texte', type: 'textarea' },
        { name: 'lien', label: 'Lien', type: 'text' },
        { name: 'libelleLien', label: 'Libellé du lien', type: 'text' },
        { name: 'image', label: 'Image', type: 'upload', relationTo: 'media' },
        { name: 'image2', label: 'Seconde vignette (facultatif)', type: 'upload', relationTo: 'media', admin: { description: 'Kit média : la carte affiche deux vignettes côte à côte.' } },
      ],
    },
  ],
}

export const Faq: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ', plural: 'FAQ' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    surtitre,
    titre,
    {
      name: 'emplacement',
      label: 'Questions de l’emplacement',
      type: 'select',
      options: [
        { value: 'accueil', label: 'Accueil' },
        { value: 'adherer', label: 'Adhérer' },
      ],
    },
  ],
}

export const AppelAction: Block = {
  slug: 'appelAction',
  labels: { singular: 'Appel à l’action', plural: 'Appels à l’action' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    { ...titre, required: true },
    { name: 'texte', label: 'Texte', type: 'textarea' },
    {
      name: 'boutons',
      label: 'Boutons',
      type: 'array',
      maxRows: 2,
      fields: [
        { name: 'libelle', label: 'Libellé', type: 'text', required: true },
        { name: 'lien', label: 'Lien', type: 'text', required: true },
      ],
    },
  ],
}

export const Temoignages: Block = {
  slug: 'temoignages',
  labels: { singular: 'Témoignages', plural: 'Témoignages' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    titre,
    {
      name: 'temoignages',
      label: 'Témoignages',
      type: 'relationship',
      relationTo: 'testimonials',
      hasMany: true,
    },
  ],
}

export const Logos: Block = {
  slug: 'logos',
  labels: { singular: 'Logos', plural: 'Logos' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [ancre, surtitre, titre, { name: 'note', label: 'Note', type: 'text' }],
}

export const Antennes: Block = {
  slug: 'antennes',
  labels: { singular: 'Antennes', plural: 'Antennes' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    {
      name: 'antennes',
      label: 'Antennes',
      type: 'array',
      labels: { singular: 'Antenne', plural: 'Antennes' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'ville', label: 'Ville', type: 'text', required: true },
            {
              name: 'statut',
              label: 'Statut',
              type: 'select',
              required: true,
              options: [
                { value: 'siege', label: 'Siège' },
                { value: 'active', label: 'Antenne active' },
                { value: 'creation', label: 'En création' },
                { value: 'projet', label: 'En projet' },
              ],
            },
          ],
        },
        { name: 'adresse', label: 'Adresse ou modalité', type: 'text' },
        {
          type: 'row',
          fields: [
            {
              name: 'referent',
              label: 'Référent',
              type: 'text',
              admin: { description: 'Vide : « À désigner ».' },
            },
            { name: 'contact', label: 'Contact', type: 'text' },
          ],
        },
      ],
    },
  ],
}

/** Tableau « Avec ou sans adhésion » (page Adhérer). */
export const Comparatif: Block = {
  slug: 'comparatif',
  labels: { singular: 'Comparatif visiteur / membre', plural: 'Comparatifs' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    titre,
    {
      name: 'lignes',
      label: 'Lignes',
      type: 'array',
      fields: [
        { name: 'libelle', label: 'Ce que vous pouvez faire', type: 'text', required: true },
        {
          type: 'row',
          fields: [
            { name: 'visiteur', label: 'Visiteur', type: 'checkbox', defaultValue: false },
            { name: 'membre', label: 'Membre', type: 'checkbox', defaultValue: true },
          ],
        },
      ],
    },
  ],
}

/** Tableau « Les statuts de membre » (page Adhérer) : les montants viennent des Paramètres, onglet Tarifs. */
export const StatutsMembres: Block = {
  slug: 'statutsMembres',
  labels: { singular: 'Statuts de membre', plural: 'Statuts de membre' },
  admin: { components: { Label: '@/components/admin/BlockLabel#BlockLabel' } },
  fields: [
    ancre,
    titre,
    {
      name: 'lignes',
      label: 'Statuts',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'nom', label: 'Statut', type: 'text', required: true },
            {
              name: 'categorie',
              label: 'Montant de la catégorie',
              type: 'select',
              required: true,
              options: [
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'expert', label: 'Expert' },
                { value: 'partenaire', label: 'Partenaire (convention)' },
                { value: 'honneur', label: 'Membre d’honneur (convention)' },
              ],
            },
          ],
        },
        { name: 'pour', label: 'Pour qui', type: 'text' },
        { name: 'droits', label: 'Ce qu’il ouvre', type: 'text' },
      ],
    },
  ],
}

export const PAGE_BLOCKS: Block[] = [
  Section,
  Comparatif,
  StatutsMembres,
  Entete,
  Texte,
  Image,
  ChiffresCles,
  Cartes,
  Faq,
  Temoignages,
  Logos,
  AppelAction,
  Antennes,
]
export const NEWS_BLOCKS: Block[] = [Texte, Image, ChiffresCles, Cartes, Faq, AppelAction]
