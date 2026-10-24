'use client'
import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

import { TEMPLATES, type TemplateKey } from '@/emails/defaults'

export const EmailTemplateRowLabel = () => {
  const { data } = useRowLabel<{ cle?: TemplateKey }>()
  return <span>{data?.cle ? TEMPLATES[data.cle]?.label : 'Nouveau modèle'}</span>
}
