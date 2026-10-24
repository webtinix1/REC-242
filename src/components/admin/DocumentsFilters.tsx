'use client'
import { useListQuery } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

const RUBRIQUES = [
  { label: 'Tous' },
  { label: 'Textes officiels', value: 'textes' },
  { label: 'Vie du réseau', value: 'vie' },
  { label: 'Ateliers et formations', value: 'ateliers' },
  { label: 'Presse', value: 'presse' },
  { label: 'Événements', value: 'evenements' },
]

/** Filtres de rubrique avec compteurs (écran 18). */
export const DocumentsFilters = () => {
  const { query, refineListData } = useListQuery()
  const current = ((query?.where ?? {}) as { rubrique?: { equals?: string } }).rubrique?.equals
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/documents?limit=1000&depth=0&select[rubrique]=true', { credentials: 'include' })
      .then((r) => r.json())
      .then((j: { docs: { rubrique: string }[]; totalDocs: number }) => {
        const c: Record<string, number> = { Tous: j.totalDocs }
        for (const d of j.docs) c[d.rubrique] = (c[d.rubrique] || 0) + 1
        setCounts(c)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="rec-chips" role="group" aria-label="Filtrer par rubrique">
      {RUBRIQUES.filter((r) => !r.value || counts[r.value]).map((r) => (
        <button
          key={r.label}
          type="button"
          className={`rec-chip${current === r.value ? ' is-on' : ''}`}
          aria-pressed={current === r.value}
          onClick={() =>
            void refineListData({
              page: 1,
              where: r.value ? { rubrique: { equals: r.value } } : {},
            })
          }
        >
          {r.label} <span className="rec-cnt">{r.value ? counts[r.value] : counts.Tous}</span>
        </button>
      ))}
    </div>
  )
}
