'use client'
import { useAuth } from '@payloadcms/ui'
import React, { useState } from 'react'

import { DOMAINS, MATRIX, ROLES, type Level, type Role } from '@/access/roles'

const TEXT: Record<Level, string> = {
  full: 'tous droits',
  partial: 'droits partiels',
  read: 'lecture seule',
  none: 'aucun accès',
}

/** Matrice des permissions, générée depuis src/access/roles.ts (écran 16 de la maquette). */
export const PermissionsMatrix = () => {
  const { user } = useAuth()
  const mine = ((user as { roles?: Role[] } | null)?.roles ?? [])[0] ?? 'admin'
  const [focus, setFocus] = useState<Role>(mine)

  return (
    <section className="rec-panel rec-matrix" aria-labelledby="rec-matrix-title">
      <h2 id="rec-matrix-title" className="rec-h3">
        Matrice des permissions
      </h2>
      <div className="rec-chips" role="group" aria-label="Rôle mis en évidence">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            className={`rec-chip${focus === r.value ? ' is-on' : ''}`}
            aria-pressed={focus === r.value}
            onClick={() => setFocus(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="rec-tblwrap">
        <table className="rec-tbl">
          <thead>
            <tr>
              <th scope="col">Domaine</th>
              {ROLES.map((r) => (
                <th
                  scope="col"
                  key={r.value}
                  className={focus === r.value ? 'is-focus' : undefined}
                >
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((d) => (
              <tr key={d.key}>
                <th scope="row">{d.label}</th>
                {ROLES.map((r) => {
                  const l = MATRIX[d.key][r.value]
                  return (
                    <td
                      key={r.value}
                      className={focus === r.value ? 'is-focus' : undefined}
                      title={TEXT[l]}
                    >
                      <span className={`rec-lvl rec-lvl--${l}`} aria-hidden="true" />
                      <span className="rec-sr">{TEXT[l]}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rec-small rec-muted">
        <span className="rec-lvl rec-lvl--full" aria-hidden="true" /> tous droits ·{' '}
        <span className="rec-lvl rec-lvl--partial" aria-hidden="true" /> droits partiels (brouillon
        sans publication, ou ses propres éléments) ·{' '}
        <span className="rec-lvl rec-lvl--read" aria-hidden="true" /> lecture seule ·{' '}
        <span className="rec-lvl rec-lvl--none" aria-hidden="true" /> aucun accès. Rôle mis en
        évidence : {ROLES.find((r) => r.value === focus)?.label}.
      </p>
    </section>
  )
}
