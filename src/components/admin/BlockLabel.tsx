'use client'
import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

import { NEWS_BLOCKS, PAGE_BLOCKS } from '@/blocks'

const LIBELLES: Record<string, string> = Object.fromEntries(
  [...PAGE_BLOCKS, ...NEWS_BLOCKS].map((b) => [
    b.slug,
    typeof b.labels?.singular === 'string' ? b.labels.singular : b.slug,
  ]),
)

/**
 * Titre d'un bloc dans l'éditeur, comme la maquette (écran 22) : « Bloc · En-tête », suivi du titre du bloc
 * pour s'y retrouver dans les longues pages.
 */
export const BlockLabel = () => {
  const { data } = useRowLabel<{ blockType?: string; titre?: string; ancre?: string }>()
  const titre = data?.titre?.trim()
  return (
    <span className="rec-bloc-titre">
      Bloc · {LIBELLES[data?.blockType ?? ''] ?? data?.blockType}
      {titre ? ` · ${titre.length > 60 ? `${titre.slice(0, 60)}…` : titre}` : ''}
    </span>
  )
}
