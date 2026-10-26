import type { UIField } from 'payload'

const CELLS = '@/components/admin/liste/cells'

/**
 * Colonne d'affichage d'un tableau natif du back-office (maquette) : champ d'interface sans donnée, qui n'apparaît que
 * dans la liste, avec l'intitulé de colonne de la maquette et une cellule rendue côté serveur (src/components/admin/liste).
 */
export const colonne = (name: string, label: string, cell: string): UIField => ({
  name,
  label,
  type: 'ui',
  admin: { disableBulkEdit: true, components: { Cell: `${CELLS}#${cell}` } },
})

/**
 * Dernière colonne des tableaux : « Modifier », « Modifier » et « Prévisualiser » ou « Désactiver ».
 * L'intitulé reste lisible par les lecteurs d'écran seulement, comme dans la maquette.
 */
export const colonneActions = (
  variante: 'modifier' | 'page' | 'desactiver' = 'modifier',
  label = 'Action',
): UIField => ({
  name: 'actions',
  label,
  type: 'ui',
  admin: {
    disableBulkEdit: true,
    components: {
      Cell: { path: '@/components/admin/liste/ActionCell#ActionCell', clientProps: { variante } },
      Label: `${CELLS}#LibelleMasque`,
    },
  },
})
