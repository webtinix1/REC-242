import type { ServerProps } from 'payload'
import React from 'react'

import '@/styles/back-office.css'

const count = async (props: ServerProps, collection: string, where?: Record<string, unknown>) => {
  const { payload } = props
  if (!payload.config.collections.some((c) => c.slug === collection)) return 0
  return (
    await payload.count({
      collection: collection as never,
      where: where as never,
      overrideAccess: true,
    })
  ).totalDocs
}

/** Encadré des documents personnels générés automatiquement (écran 18), avec leurs compteurs. */
export const DocumentsPersonal = async (props: ServerProps) => {
  const recus = await count(props, 'payments', { statut: { equals: 'paye' } })
  const chartes = await count(props, 'applications', { charteSignee: { equals: true } })
  return (
    <div className="bb rec-bloc">
      <section className="panel">
        <h2 className="h3">Documents personnels, générés automatiquement</h2>
        <p className="small muted">
          Chaque membre retrouve dans son espace ses reçus de paiement, sa charte de l&apos;adhérent
          signée et sa carte de membre. Ils ne sont jamais publiés ailleurs.
        </p>
        <div className="vrow">
          <span>Reçus de paiement émis</span>
          <span className="mono">{recus}</span>
        </div>
        <div className="vrow">
          <span>Chartes signées archivées</span>
          <span className="mono">{chartes}</span>
        </div>
      </section>
    </div>
  )
}
