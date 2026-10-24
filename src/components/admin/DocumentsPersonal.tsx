import type { ServerProps } from 'payload'
import React from 'react'

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

/** Encadré des documents personnels générés automatiquement (écran 18). Les compteurs s'alimentent aux lots 5 et 6. */
export const DocumentsPersonal = async (props: ServerProps) => {
  const recus = await count(props, 'payments', { statut: { equals: 'paye' } })
  const chartes = await count(props, 'members', { charteSignee: { exists: true } })
  return (
    <section className="rec-panel">
      <h2 className="rec-h3">Documents personnels, générés automatiquement</h2>
      <p className="rec-small rec-muted">
        Chaque membre retrouve dans son espace ses reçus de paiement, sa charte de l&apos;adhérent
        signée et sa carte de membre. Ils ne sont jamais publiés ailleurs.
      </p>
      <div className="rec-kpis">
        <div>
          <p className="rec-small rec-muted">Reçus de paiement émis</p>
          <p className="rec-kpi">{recus}</p>
        </div>
        <div>
          <p className="rec-small rec-muted">Chartes signées archivées</p>
          <p className="rec-kpi">{chartes}</p>
        </div>
      </div>
    </section>
  )
}
