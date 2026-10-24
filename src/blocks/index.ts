import type { Block } from 'payload'

/**
 * Blocs des pages et des actualités. Les pages institutionnelles de la maquette ont des mises en page
 * spécifiques : le site (lot 3) les rend comme des gabarits dont les textes et listes viennent de ces blocs.
 */

const titre = { name: 'titre', label: 'Titre', type: 'text' } as const
const surtitre = { name: 'surtitre', label: 'Surtitre', type: 'text' } as const

export const Entete: Block = {
  slug: 'entete',
  labels: { singular: 'En-tête', plural: 'En-têtes' },
  fields: [
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
  fields: [surtitre, titre, { name: 'contenu', label: 'Texte', type: 'richText', required: true }],
}

export const Image: Block = {
  slug: 'image',
  labels: { singular: 'Image', plural: 'Images' },
  fields: [
    { name: 'image', label: 'Image', type: 'upload', relationTo: 'media', required: true },
    { name: 'legende', label: 'Légende', type: 'text' },
  ],
}

export const ChiffresCles: Block = {
  slug: 'chiffresCles',
  labels: { singular: 'Chiffres clés', plural: 'Chiffres clés' },
  fields: [
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
  fields: [
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
      ],
    },
    {
      name: 'reference',
      label: 'Référence',
      type: 'text',
      admin: { description: 'Par exemple « Article 8 des statuts ».' },
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
      ],
    },
  ],
}

export const Faq: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ', plural: 'FAQ' },
  fields: [
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
  fields: [
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
  fields: [
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
  fields: [surtitre, titre, { name: 'note', label: 'Note', type: 'text' }],
}

export const Antennes: Block = {
  slug: 'antennes',
  labels: { singular: 'Antennes', plural: 'Antennes' },
  fields: [
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

export const PAGE_BLOCKS: Block[] = [
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
