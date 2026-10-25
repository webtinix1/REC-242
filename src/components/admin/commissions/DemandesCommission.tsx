'use client'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { api } from '../membres/api'

type Demande = { id: number; nom: string; ini: string; photo?: string; entreprise: string; commission: string; apport: string }

/** Écran 19 : demandes pour rejoindre une commission. L’acceptation ajoute la commission à la fiche et prévient le membre (serveur). */
export const DemandesCommission = ({ demandes, peutTraiter }: { demandes: Demande[]; peutTraiter: boolean }) => {
  const router = useRouter()
  const [occupe, setOccupe] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  const traiter = async (id: number, statut: 'acceptee' | 'refusee') => {
    setOccupe(true)
    setErr('')
    setOk('')
    try {
      await api(`/api/commissionRequests/${id}`, { method: 'PATCH', body: JSON.stringify({ statut }) })
      setOk(statut === 'acceptee' ? 'Demande acceptée, membre prévenu.' : 'Demande refusée, membre prévenu.')
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="cr-t">
      <div className="panel-h">
        <h2 className="h2" id="cr-t">
          Demandes pour rejoindre une commission
        </h2>
        <span className="badge">{demandes.length}</span>
      </div>
      {demandes.length === 0 && <p className="muted">Aucune demande en attente.</p>}
      {demandes.map((j) => (
        <div className="row" key={j.id}>
          {j.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="face" src={j.photo} alt={j.nom} />
          ) : (
            <span className="av">{j.ini}</span>
          )}
          <span className="row-t">
            <b>{j.nom}</b>
            {j.entreprise && <> · {j.entreprise}</>}
            <br />
            <span className="small muted">
              {j.commission}
              {j.apport && <> · « {j.apport} »</>}
            </span>
          </span>
          {peutTraiter && (
            <span className="rec-row">
              <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={() => void traiter(j.id, 'refusee')}>
                Refuser
              </button>
              <button type="button" className="rec-btn rec-btn--primary" disabled={occupe} onClick={() => void traiter(j.id, 'acceptee')}>
                Accepter
              </button>
            </span>
          )}
        </div>
      ))}
      {ok && (
        <div className="ok" role="status">
          {ok}
        </div>
      )}
      {err && (
        <p className="err" role="alert">
          {err}
        </p>
      )}
    </section>
  )
}
