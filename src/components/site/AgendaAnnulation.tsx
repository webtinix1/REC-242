'use client'
import Link from 'next/link'
import React, { useActionState } from 'react'

import { annulerParLien } from '@/lib/evenements/actions'

type Etat = { ok?: boolean; erreur?: string }

/** Confirmation d'annulation depuis le lien de l'e-mail : l'annulation n'a lieu qu'au clic sur le bouton. */
export const AgendaAnnulation = ({ jeton }: { jeton: string }) => {
  const [etat, action, envoi] = useActionState<Etat, FormData>(async () => annulerParLien(jeton), {})
  if (etat.ok)
    return (
      <div className="okbox" role="status">
        <span className="rec-badge rec-badge--active">Inscription annulée</span>
        <p>Votre inscription est annulée. La place est rendue aux personnes en liste d’attente.</p>
        <Link prefetch={false} className="rec-btn rec-btn--secondary" href="/agenda">
          Voir l’agenda
        </Link>
      </div>
    )
  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      {etat.erreur && (
        <div className="errbox" role="alert">
          <p>{etat.erreur}</p>
        </div>
      )}
      <button type="submit" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} disabled={envoi}>
        {envoi ? 'Annulation…' : 'Annuler mon inscription'}
      </button>
    </form>
  )
}
