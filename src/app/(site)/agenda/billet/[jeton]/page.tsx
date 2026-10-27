import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { jourLong } from '@/lib/evenements/notifications'
import { heure } from '@/lib/evenements/site'
import { billetParLien } from '@/lib/evenements/lecture'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Votre billet', robots: { index: false, follow: false } }

type Params = Promise<{ jeton: string }>

/** Billet consulté depuis l'e-mail de confirmation (lien signé). */
export default async function Billet({ params }: { params: Params }) {
  const { jeton } = await params
  const b = await billetParLien(decodeURIComponent(jeton))
  if (!b) notFound()
  const e = b.evenement
  const lieu = [e.lieu, e.adresse, e.ville].filter(Boolean).join(', ')
  const etat =
    b.statut === 'attente'
      ? { cls: 'pending', texte: `Liste d’attente, position ${b.position ?? ''}`.trim() }
      : b.statut === 'annule'
        ? { cls: 'suspended', texte: 'Inscription annulée' }
        : b.statut === 'present'
          ? { cls: 'active', texte: 'Présence enregistrée' }
          : { cls: 'active', texte: 'Inscription confirmée' }
  return (
    <section className="band bg-warm band-end">
      <div className="wrap stack" style={{ gap: 20, maxWidth: 640 }}>
        <Link prefetch={false} href="/agenda" className="linkbtn">
          ← Agenda
        </Link>
        <h1 className="h-xl">Votre billet</h1>
        <div className="card">
          <span className={`rec-badge rec-badge--${etat.cls}`}>{etat.texte}</span>
          <h2 className="h-m">{e.titre}</h2>
          <div className="line">
            <span className="muted">Date</span>
            <span>
              {jourLong(e.debut)}, {heure(e.debut)}
            </span>
          </div>
          {lieu && (
            <div className="line">
              <span className="muted">Lieu</span>
              <span>{lieu}</span>
            </div>
          )}
          <div className="line">
            <span className="muted">Nom</span>
            <span>{b.nom}</span>
          </div>
          {b.numero && (
            <div className="line" style={{ borderBottom: 0 }}>
              <span className="muted">Numéro de billet</span>
              <b>{b.numero}</b>
            </div>
          )}
          {b.qr && (
            <div
              className="qr-grand"
              role="img"
              aria-label={`QR code du billet ${b.numero ?? ''}`.trim()}
              dangerouslySetInnerHTML={{ __html: b.qr }}
            />
          )}
          {e.lienCarte && (
            <a className="rec-btn rec-btn--primary" href={e.lienCarte} target="_blank" rel="noopener noreferrer">
              Accéder au lieu ou à la visioconférence
            </a>
          )}
          {e.slug && b.statut !== 'annule' && (
            <a className="rec-btn rec-btn--secondary" href={`/agenda/${e.slug}/ics`}>
              Ajouter à mon calendrier (.ics)
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
