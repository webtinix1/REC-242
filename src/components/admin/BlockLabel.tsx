'use client'
import { useFormFields } from '@payloadcms/ui'
import React from 'react'

/** Libellé d'un bloc dans l'éditeur : type, section et titre, pour s'y retrouver dans les longues pages. */
export const BlockLabel = ({ path, blockType }: { path?: string; blockType?: string }) => {
  const ancre = useFormFields(([f]) => f[`${path}.ancre`]?.value) as string | undefined
  const titre = useFormFields(([f]) => f[`${path}.titre`]?.value) as string | undefined
  return (
    <span>
      {blockType}
      {ancre ? ` · ${ancre}` : ''}
      {titre ? ` · ${titre.length > 60 ? `${titre.slice(0, 60)}…` : titre}` : ''}
    </span>
  )
}
