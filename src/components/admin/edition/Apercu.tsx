'use client'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React from 'react'

/** Onglet « Aperçu » de l'éditeur d'actualité (écran 10) : la page telle qu'elle paraîtra, dans le site. */
export const Apercu = () => {
  const { collectionSlug } = useDocumentInfo()
  const slug = useFormFields(([fields]) => fields?.slug?.value as string | undefined)
  if (!slug) return null
  return (
    <iframe
      className="rec-apercu"
      src={`/apercu?type=${collectionSlug}&slug=${encodeURIComponent(slug)}`}
      title="Aperçu"
    />
  )
}
