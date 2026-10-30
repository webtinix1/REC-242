'use client'
import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

/** Titre d'une ligne de la liste des questions : le libellé saisi. */
export const LibelleQuestion = () => {
  const { data, rowNumber } = useRowLabel<{ libelle?: string }>()
  return <span>{data?.libelle || `Question ${(rowNumber ?? 0) + 1}`}</span>
}
