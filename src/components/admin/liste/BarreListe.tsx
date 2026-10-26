import type { SanitizedCollectionConfig } from 'payload'
import Link from 'next/link'
import React from 'react'

import '@/styles/back-office.css'

type Props = {
  /** Libellé du bouton de création de la maquette (« Rédiger une actualité », « Nouvelle page »…). */
  bouton?: string
  collectionConfig?: SanitizedCollectionConfig
  hasCreatePermission?: boolean
  newDocumentURL?: string
}

/** Texte de présentation de la collection (admin.description), tel que la maquette l'affiche au-dessus du tableau. */
export const descriptionCollection = (c?: SanitizedCollectionConfig): string => {
  const d = c?.admin?.description
  if (typeof d === 'string') return d
  if (d && typeof d === 'object') return (d as Record<string, string>).fr ?? Object.values(d)[0] ?? ''
  return ''
}

/**
 * Barre d'action des listes natives (écrans 09, 14) : description à gauche, bouton de création à droite (.bar-actions).
 * Le bouton n'apparaît que si l'utilisateur peut créer un document (droits de la collection).
 */
export const BarreListe = ({ bouton, collectionConfig, hasCreatePermission, newDocumentURL }: Props) => {
  const texte = descriptionCollection(collectionConfig)
  if (!texte && !(bouton && hasCreatePermission)) return null
  return (
    <div className="bb rec-bloc">
      <div className="bar-actions">
        {texte ? <p className="muted">{texte}</p> : <span />}
        {bouton && hasCreatePermission && newDocumentURL ? (
          <Link className="rec-btn rec-btn--primary" href={newDocumentURL}>
            {bouton}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
