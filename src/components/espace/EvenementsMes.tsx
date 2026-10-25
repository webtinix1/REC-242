'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { Toast } from '@/components/site/Toast'
import { annulerInscriptionMembre } from '@/lib/evenements/actions'

export type LigneInscription = {
  id: number
  evenementId: number
  jour: string
  mois: string
  titre: string
  type?: string
  lieu: string
  heure: string
  statut: string
  classe: 'active' | 'pending' | 'suspended'
  image?: string
  numero?: string
  qr?: string
  date: string
}

/** Mes inscriptions à venir (écran 04) : billet, calendrier, annulation. */
export function EvenementsMes({ lignes, qui }: { lignes: LigneInscription[]; qui: string }) {
  const router = useRouter()
  const [billet, setBillet] = useState<number | null>(null)
  const [confirme, setConfirme] = useState<number | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState('')
  const tk = lignes.find((l) => l.id === billet)

  async function annuler(id: number) {
    setEnCours(true)
    const r = await annulerInscriptionMembre(id)
    setEnCours(false)
    setConfirme(null)
    if (r.ok) {
      setBillet(null)
      setMessage('Inscription annulée. Votre place est libérée pour la liste d’attente.')
      router.refresh()
    } else setMessage(r.erreur ?? 'Annulation impossible pour le moment.')
  }

  return (
    <>
      {lignes.map((e) => (
        <div className="item ev" key={e.id}>
          <div className="datedisc">
            <b>{e.jour}</b>
            <span>{e.mois}</span>
          </div>
          {e.image && (
            <span className="pick evthumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.image} alt="" />
            </span>
          )}
          <div className="grow">
            {e.type && <span className="tag">{e.type}</span>}
            <p className="h3" style={{ marginTop: 4 }}>
              {e.titre}
            </p>
            <p className="small muted">
              {e.lieu} · {e.heure}
            </p>
            <span className={`rec-badge rec-badge--${e.classe}`} style={{ marginTop: 6 }}>
              {e.statut}
            </span>
          </div>
          <div className="stack-s">
            <button type="button" className="linkbtn" onClick={() => setBillet(e.id)}>
              Mon billet
            </button>
            <a className="rec-btn rec-btn--secondary" href={`/espace-membre/evenements/${e.evenementId}/ics`}>
              Ajouter au calendrier (.ics)
            </a>
            {confirme === e.id ? (
              <div className="stack-s" role="alertdialog" aria-label="Confirmer l’annulation">
                <p className="small">Annuler cette inscription ?</p>
                <div className="row">
                  <button type="button" className="rec-btn rec-btn--primary" disabled={enCours} onClick={() => annuler(e.id)}>
                    Confirmer
                  </button>
                  <button type="button" className="linkbtn" onClick={() => setConfirme(null)}>
                    Garder ma place
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="linkbtn" onClick={() => setConfirme(e.id)}>
                Annuler mon inscription
              </button>
            )}
          </div>
        </div>
      ))}
      {tk && (
        <>
          <div className="ticket">
            <div className="ticket-l">
              <span className="lbl">Billet</span>
              <p className="h3">{tk.titre}</p>
              <p className="small">
                {tk.date} · {tk.heure} · {tk.lieu}
              </p>
              <p className="small muted">
                {qui} · {tk.numero ? `billet n° ${tk.numero}` : 'Liste d’attente'}
              </p>
              <button type="button" className="linkbtn" onClick={() => setBillet(null)}>
                Fermer
              </button>
            </div>
            {tk.qr && <span className="qr qr-t" role="img" aria-label="QR code du billet" dangerouslySetInnerHTML={{ __html: tk.qr }} />}
          </div>
          {tk.qr && (
            <p className="xs muted">
              Présentez ce billet ou votre carte de membre à l&apos;entrée : le QR code est scanné pour confirmer votre présence.
            </p>
          )}
        </>
      )}
      <Toast message={message} onClose={() => setMessage('')} />
    </>
  )
}
