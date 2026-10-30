'use client'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React from 'react'

/** Onglet « Aperçu » des éditeurs d'actualité et d'événement : la page telle qu'elle paraîtra, rechargée à chaque enregistrement. */
export const Apercu = () => {
  const { collectionSlug, id, lastUpdateTime } = useDocumentInfo()
  const slug = useFormFields(([fields]) => fields?.slug?.value as string | undefined)
  if (!id || !slug) return <p>Enregistrez d’abord le brouillon pour voir l’aperçu.</p>
  return (
    <iframe
      key={lastUpdateTime}
      className="rec-apercu"
      src={`/apercu?type=${collectionSlug}&slug=${encodeURIComponent(slug)}`}
      title="Aperçu"
    />
  )
}
