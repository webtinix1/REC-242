'use client'
import { useListQuery } from '@payloadcms/ui'
import React from 'react'

import '@/styles/back-office.css'

/** Filtres de docs/08 (écran 17) : les cinq de la maquette, puis connexions, paiements et discipline. */
const FILTERS: { label: string; value?: string }[] = [
  { label: 'Toutes les actions' },
  { label: 'Validations', value: 'validation' },
  { label: 'Publications', value: 'publication' },
  { label: 'Exports', value: 'export' },
  { label: 'Paramètres', value: 'parametres' },
  { label: 'Connexions', value: 'connexion' },
  { label: 'Paiements', value: 'paiement' },
  { label: 'Discipline', value: 'discipline' },
]

/** Filtres en pastilles et export du journal (écran 17). */
export const AuditLogFilters = () => {
  const { query, refineListData } = useListQuery()
  const where = (query?.where ?? {}) as { categorie?: { equals?: string } }
  const current = where.categorie?.equals

  const pick = (value?: string) => {
    void refineListData({ page: 1, where: value ? { categorie: { equals: value } } : {} })
  }

  return (
    <div className="bb rec-bloc">
      <div className="bar-actions">
        <div className="chips" role="group" aria-label="Filtrer le journal">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              className={`chip${current === f.value ? ' is-on' : ''}`}
              aria-pressed={current === f.value}
              onClick={() => pick(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <a
          className="rec-btn rec-btn--secondary"
          href={`/api/auditLog/export${current ? `?categorie=${current}` : ''}`}
        >
          Exporter le journal
        </a>
      </div>
    </div>
  )
}
