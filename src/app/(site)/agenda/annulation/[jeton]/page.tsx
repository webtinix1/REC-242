import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { AgendaAnnulation } from '@/components/site/AgendaAnnulation'
import { verifierJetonLien } from '@/lib/evenements/billets'
import { billetParId } from '@/lib/evenements/lecture'
import { jourLong } from '@/lib/evenements/notifications'
import { heure } from '@/lib/evenements/site'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Annuler mon inscription', robots: { index: false, follow: false } }

type Params = Promise<{ jeton: string }>

/** Confirmation d'annulation depuis le lien de l'e-mail : rien n'est annulé avant le clic sur le bouton. */
export default async function Annulation({ params }: { params: Params }) {
  const { jeton: brut } = await params
  const jeton = decodeURIComponent(brut)
  const id = verifierJetonLien('annulation', jeton)
  const b = id ? await billetParId(id) : null
  return (
    <section className="band bg-warm band-end">
      <div className="wrap stack" style={{ gap: 20, maxWidth: 640 }}>
        <h1 className="h-xl">Annuler mon inscription</h1>
        {!b ? (
          <div className="errbox" role="alert">
            <p>Ce lien d’annulation n’est pas valable.</p>
            <Link href="/agenda" className="linkbtn">
              Voir l’agenda
            </Link>
          </div>
        ) : (
          <div className="card">
            <h2 className="h-m">{b.evenement.titre}</h2>
            <p className="muted">
              {jourLong(b.evenement.debut)}, {heure(b.evenement.debut)}
            </p>
            {b.statut === 'annule' ? (
              <div className="okbox" role="status">
                <span className="rec-badge rec-badge--active">Inscription annulée</span>
                <p>Votre inscription est déjà annulée.</p>
              </div>
            ) : (
              <>
                <p>Vous êtes sur le point d’annuler l’inscription de {b.nom}. Cette action est définitive.</p>
                <AgendaAnnulation jeton={jeton} />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
