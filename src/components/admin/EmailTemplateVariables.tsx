'use client'
import { useFormFields } from '@payloadcms/ui'
import React from 'react'

import { TEMPLATES, type TemplateKey } from '@/emails/defaults'

/** Liste des variables disponibles pour le modèle choisi, sous le texte. */
export const EmailTemplateVariables = ({ path }: { path?: string }) => {
  const base = (path || '').replace(/\.variables$/, '')
  const cle = useFormFields(([fields]) => fields[`${base}.cle`]?.value) as TemplateKey | undefined
  if (!cle || !TEMPLATES[cle]) return null
  return (
    <p className="rec-small rec-muted">
      Variables disponibles : {TEMPLATES[cle].variables.map((v) => `{{${v}}}`).join(', ')}
    </p>
  )
}
