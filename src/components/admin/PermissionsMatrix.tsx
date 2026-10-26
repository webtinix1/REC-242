'use client'
import React, { useState } from 'react'

import { DOMAINS, MATRIX, ROLES, type Level, type Role } from '@/access/roles'

import '@/styles/back-office.css'

const TEXT: Record<Level, string> = {
  full: 'tous droits',
  partial: 'droits partiels',
  read: 'lecture seule',
  none: 'aucun accès',
}
const SYMBOLE: Record<Level, string> = { full: '●', partial: '◐', read: '○', none: '·' }
const CLASSE: Record<Level, string> = { full: 'full', partial: 'part', read: 'read', none: 'none' }

/** Matrice des permissions, générée depuis src/access/roles.ts (écran 16 de la maquette). */
export const PermissionsMatrix = () => {
  // La maquette met l'administrateur en évidence à l'ouverture ; le sélecteur change le rôle mis en évidence.
  const [focus, setFocus] = useState<Role>('admin')

  return (
    <div className="bb rec-bloc rec-apres-liste">
      <h2 className="h2">Matrice des permissions</h2>
      <div className="chips" role="group" aria-label="Rôle mis en évidence">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            className={`chip${focus === r.value ? ' is-on' : ''}`}
            aria-pressed={focus === r.value}
            onClick={() => setFocus(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="tblwrap tblwrap-x">
        <table className="tbl mtx">
          <thead>
            <tr>
              <th scope="col">Domaine</th>
              {ROLES.map((r) => (
                <th scope="col" key={r.value}>
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((d) => (
              <tr key={d.key}>
                <td>
                  <b>{d.label}</b>
                </td>
                {ROLES.map((r) => {
                  const l = MATRIX[d.key][r.value]
                  return (
                    <td
                      key={r.value}
                      className={`perm ${CLASSE[l]}${focus === r.value ? ' is-sel' : ''}`}
                      title={TEXT[l]}
                    >
                      <span aria-hidden="true">{SYMBOLE[l]}</span>
                      <span className="sr">{TEXT[l]}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        ● tous droits · ◐ droits partiels (brouillon sans publication, ou ses propres éléments) · ○
        lecture seule · · aucun accès. Rôle mis en évidence :{' '}
        {ROLES.find((r) => r.value === focus)?.label}.
      </p>
    </div>
  )
}
