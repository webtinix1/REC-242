'use client'
import { toast, useAuth } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { ROLES, type Role } from '@/access/roles'

/** Bouton « Inviter un utilisateur » et son formulaire (écran 16). Visible pour le super administrateur seulement. */
export const InviteUser = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [roles, setRoles] = useState<Role[]>([])
  const isSuper = ((user as { roles?: Role[] } | null)?.roles ?? []).includes('superadmin')

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    const res = await fetch('/api/users/inviter', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fd.get('name'), email: fd.get('email'), roles }),
    })
    setBusy(false)
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { errors?: { message: string }[] }
      setError(j.errors?.[0]?.message || 'L’invitation n’a pas pu être envoyée.')
      return
    }
    toast.success('Invitation envoyée. Le lien est valable 72 heures.')
    setOpen(false)
    setRoles([])
    router.refresh()
  }

  return (
    <div className="rec-invite">
      {isSuper && !open && (
        <button type="button" className="rec-btn rec-btn--primary" onClick={() => setOpen(true)}>
          Inviter un utilisateur
        </button>
      )}
      {open && (
        <form className="rec-panel rec-form" onSubmit={submit} noValidate>
          <h2 className="rec-h3">Inviter un utilisateur</h2>
          <div className="rec-field">
            <label htmlFor="inv-name">Nom</label>
            <input id="inv-name" name="name" className="rec-input" required autoComplete="name" />
          </div>
          <div className="rec-field">
            <label htmlFor="inv-email">E-mail</label>
            <input id="inv-email" name="email" type="email" className="rec-input" required autoComplete="email" />
          </div>
          <fieldset className="rec-fieldset">
            <legend>Rôles</legend>
            {ROLES.map((r) => (
              <label key={r.value} className="rec-check">
                <input
                  type="checkbox"
                  checked={roles.includes(r.value)}
                  onChange={(ev) => setRoles(ev.target.checked ? [...roles, r.value] : roles.filter((x) => x !== r.value))}
                />{' '}
                {r.label}
              </label>
            ))}
          </fieldset>
          {error && (
            <p className="rec-error" role="alert">
              {error}
            </p>
          )}
          <div className="rec-row">
            <button type="submit" className="rec-btn rec-btn--primary" disabled={busy}>
              {busy ? 'Envoi…' : 'Envoyer l’invitation'}
            </button>
            <button type="button" className="rec-btn rec-btn--ghost" onClick={() => setOpen(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
