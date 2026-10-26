'use client'
import { Link, useListQuery } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

import '@/styles/back-office.css'

const RUBRIQUES = [
  { label: 'Tous' },
  { label: 'Textes officiels', value: 'textes' },
  { label: 'Vie du réseau', value: 'vie' },
  { label: 'Ateliers et formations', value: 'ateliers' },
  { label: 'Presse', value: 'presse' },
  { label: 'Événements', value: 'evenements' },
  { label: 'Formulaires d’adhésion', value: 'adhesion' },
]

/** Filtres de rubrique avec compteurs et « Déposer un document » (écran 18). Les documents personnels ont leur encadré. */
export const DocumentsFilters = ({
  hasCreatePermission,
  newDocumentURL,
}: {
  hasCreatePermission?: boolean
  newDocumentURL?: string
}) => {
  const { query, refineListData } = useListQuery()
  const current = ((query?.where ?? {}) as { rubrique?: { equals?: string } }).rubrique?.equals
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch(
      '/api/documents?limit=1000&depth=0&select[rubrique]=true&where[visibilite][not_equals]=personnel',
      { credentials: 'include' },
    )
      .then((r) => r.json())
      .then((j: { docs: { rubrique: string }[]; totalDocs: number }) => {
        const c: Record<string, number> = { Tous: j.totalDocs }
        for (const d of j.docs) c[d.rubrique] = (c[d.rubrique] || 0) + 1
        setCounts(c)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="bb rec-bloc">
      <div className="bar-actions">
        <div className="chips" role="group" aria-label="Filtrer par rubrique">
          {RUBRIQUES.filter((r) => !r.value || counts[r.value]).map((r) => (
            <button
              key={r.label}
              type="button"
              className={`chip${current === r.value ? ' is-on' : ''}`}
              aria-pressed={current === r.value}
              onClick={() =>
                void refineListData({
                  page: 1,
                  where: r.value ? { rubrique: { equals: r.value } } : {},
                })
              }
            >
              {r.label} <span className="cnt">{(r.value ? counts[r.value] : counts.Tous) ?? ''}</span>
            </button>
          ))}
        </div>
        {hasCreatePermission && newDocumentURL ? (
          <Link className="rec-btn rec-btn--primary" href={newDocumentURL}>
            Déposer un document
          </Link>
        ) : null}
      </div>
    </div>
  )
}
