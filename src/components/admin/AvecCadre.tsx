import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import React from 'react'

/**
 * Les vues d'admin ajoutées sur une route propre (ex. /admin/cotisations) sont rendues sans menu ni barre du haut :
 * Payload ne leur applique le cadre de l'admin que si la vue l'enveloppe elle-même.
 */
export const AvecCadre = ({ props, children }: { props: AdminViewServerProps; children: React.ReactNode }) => {
  const { initPageResult, params, searchParams } = props
  const { req, permissions, locale, visibleEntities } = initPageResult
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      {children}
    </DefaultTemplate>
  )
}
