import { describe, expect, it } from 'vitest'

import { atLeast, levelFor, MATRIX } from '@/access/roles'

const staff = (roles: string[]) => ({ id: 1, collection: 'users', roles, statut: 'actif' }) as never

describe('Matrice des droits (docs/04-roles-et-droits.md)', () => {
  it('reprend la matrice de la maquette', () => {
    expect(MATRIX.candidatures).toEqual({
      superadmin: 'full',
      admin: 'full',
      editeur: 'none',
      evenements: 'none',
      membres: 'full',
      tresorier: 'read',
    })
    expect(MATRIX.utilisateurs.admin).toBe('read')
    expect(MATRIX.journal.admin).toBe('read')
    expect(MATRIX.pages.editeur).toBe('partial')
    expect(MATRIX.cotisations.tresorier).toBe('full')
  })

  it('donne l’union des droits quand une personne cumule plusieurs rôles', () => {
    const u = staff(['editeur', 'tresorier'])
    expect(levelFor(u, 'actualites')).toBe('full')
    expect(levelFor(u, 'cotisations')).toBe('full')
    expect(levelFor(u, 'candidatures')).toBe('read')
    expect(levelFor(u, 'utilisateurs')).toBe('none')
  })

  it('ne donne aucun droit à un compte désactivé ni à un membre', () => {
    expect(
      atLeast(
        { id: 1, collection: 'users', roles: ['superadmin'], statut: 'desactive' } as never,
        'journal',
        'read',
      ),
    ).toBe(false)
    expect(atLeast({ id: 1, collection: 'members' } as never, 'journal', 'read')).toBe(false)
  })
})
