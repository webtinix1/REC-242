'use client'
import { Link, useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

type Props = {
  /** Libellé du lien de retour vers la liste (« Actualités », « Pages », « Opportunités »). */
  retour: string
  /** Actualités : bouton « Programmer » (statut programmé, publication automatique à la date choisie). */
  programmer?: boolean
}

/**
 * Barre d'actions de l'éditeur (écrans 10, 20, 22) : retour à la liste à gauche, version enregistrée automatiquement
 * et, pour les actualités, « Programmer » ; les boutons natifs (Publier, Enregistrer…) suivent.
 */
export const BarreDocument = ({ retour, programmer }: Props) => {
  const { collectionSlug, id, hasPublishPermission } = useDocumentInfo()
  const { dispatchFields, setModified } = useForm()
  const etat = useFormFields(([fields]) => fields?.etat?.value as string | undefined)
  const [version, setVersion] = useState<number | null>(null)

  useEffect(() => {
    if (!id || !collectionSlug) return
    let vivant = true
    fetch(`/api/${collectionSlug}/versions?where[parent][equals]=${id}&limit=1&depth=0`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { totalDocs?: number } | null) => vivant && j?.totalDocs && setVersion(j.totalDocs))
      .catch(() => {})
    return () => {
      vivant = false
    }
  }, [collectionSlug, id])

  return (
    <div className="rec-barre-doc">
      <Link className="rec-linkbtn rec-barre-doc__retour" href={`/admin/collections/${collectionSlug}`}>
        ← {retour}
      </Link>
      {version ? (
        <span className="rec-barre-doc__version">Enregistré automatiquement · version {version}</span>
      ) : null}
      {programmer && hasPublishPermission && etat !== 'programme' ? (
        <button
          type="button"
          className="rec-btn rec-btn--secondary"
          onClick={() => {
            // Le hook de la collection vérifie la date et garde l'actualité en brouillon jusqu'à la publication.
            dispatchFields({ type: 'UPDATE', path: 'etat', value: 'programme' })
            setModified(true)
          }}
        >
          Programmer
        </button>
      ) : null}
    </div>
  )
}

/** Bouton « Prévisualiser » (écran 22) : ouvre l'aperçu de la page dans un nouvel onglet. */
export const BoutonPrevisualiser = () => {
  const { collectionSlug } = useDocumentInfo()
  const slug = useFormFields(([fields]) => fields?.slug?.value as string | undefined)
  if (!slug) return null
  return (
    <a
      className="rec-btn rec-btn--secondary"
      href={`/apercu?type=${collectionSlug}&slug=${encodeURIComponent(slug)}`}
      target="_blank"
      rel="noopener"
    >
      Prévisualiser
    </a>
  )
}

/** Pas de bouton d'aperçu dans la barre (l'aperçu de l'actualité a son onglet). */
export const SansBoutonApercu = () => null
