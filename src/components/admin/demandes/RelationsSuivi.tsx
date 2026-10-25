'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { api } from '../membres/api'

export type LigneRelation = { id: number; demandeur: string; demandeurEnt: string; contacte: string; contacteEnt: string; statut: string; cls: string; date: string }
export type Signalement = { id: number; demandeur: string; demandeurId?: number; contacte: string; signalePar: string; motif: string; date: string }
export type MembreSuspendu = { id: number; nom: string; entreprise: string }

/** Écran 21, onglet « Mises en relation » : suivi en lecture, signalements à traiter, membres dont l’envoi est suspendu. */
export const RelationsSuivi = ({ lignes, signalements, suspendus, peutTraiter }: { lignes: LigneRelation[]; signalements: Signalement[]; suspendus: MembreSuspendu[]; peutTraiter: boolean }) => {
  const router = useRouter()
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [occupe, setOccupe] = useState(false)

  const retablir = async (id: number) => {
    setOccupe(true)
    setErr('')
    setOk('')
    try {
      await api(`/api/members/${id}/relations`, { method: 'POST', body: '{}' })
      setOk('Mises en relation rétablies.')
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  return (
    <>
      <p className="muted">Demandes de mise en relation entre membres. Les coordonnées ne sont partagées que si le membre contacté accepte.</p>
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Demandeur</th>
              <th scope="col">Membre contacté</th>
              <th scope="col">Statut</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Aucune demande de mise en relation.
                </td>
              </tr>
            )}
            {lignes.map((r) => (
              <tr key={r.id}>
                <td data-label="Demandeur">
                  <b>{r.demandeur}</b>
                  <br />
                  <span className="small muted">{r.demandeurEnt}</span>
                </td>
                <td data-label="Membre contacté">
                  <b>{r.contacte}</b>
                  <br />
                  <span className="small muted">{r.contacteEnt}</span>
                </td>
                <td data-label="Statut">
                  <span className={`rec-badge rec-badge--${r.cls}`}>{r.statut}</span>
                </td>
                <td data-label="Date">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <section className="panel" aria-labelledby="rs-t">
        <div className="panel-h">
          <h2 className="h2" id="rs-t">
            Signalements à traiter
          </h2>
          <span className="badge">{signalements.length}</span>
        </div>
        <p className="small muted">Un membre peut signaler une demande abusive (prospection de masse, revente de données). Au-delà de 10 demandes par semaine, l’envoi est suspendu jusqu’à vérification.</p>
        {signalements.length === 0 && <p className="muted">Aucun signalement ouvert.</p>}
        {signalements.map((s) => (
          <div className="row" key={s.id}>
            <span className="row-t">
              <b>{s.demandeur}</b> → {s.contacte}
              <br />
              <span className="small muted">
                {s.motif ? `« ${s.motif} »` : 'Sans motif précisé'}
                {s.signalePar && <> · signalé par {s.signalePar}</>} · {s.date}
              </span>
            </span>
            {s.demandeurId && (
              <Link className="linkbtn" href={`/admin/collections/members/${s.demandeurId}`}>
                Ouvrir la fiche du demandeur
              </Link>
            )}
          </div>
        ))}
      </section>
      <section className="panel" aria-labelledby="rsu-t">
        <div className="panel-h">
          <h2 className="h2" id="rsu-t">
            Mises en relation suspendues
          </h2>
          <span className="badge">{suspendus.length}</span>
        </div>
        {suspendus.length === 0 && <p className="muted">Aucun membre suspendu.</p>}
        {suspendus.map((m) => (
          <div className="row" key={m.id}>
            <span className="row-t">
              <b>{m.nom}</b>
              {m.entreprise && <> · {m.entreprise}</>}
              <br />
              <span className="small muted">Plafond de demandes dépassé</span>
            </span>
            <span className="rec-row">
              <Link className="linkbtn" href={`/admin/collections/members/${m.id}`}>
                Ouvrir la fiche
              </Link>
              {peutTraiter && (
                <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={() => void retablir(m.id)}>
                  Rétablir les mises en relation
                </button>
              )}
            </span>
          </div>
        ))}
      </section>
    </>
  )
}
