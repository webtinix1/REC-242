'use client'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { api } from './api'

type Demande = { id: number; qui: string; quand: string; champ: string; avant: string; apres: string; motif: string; justificatif?: { url: string; nom: string } }
type Presentation = { id: number; qui: string; quand: string; avant: string; apres: string }

/** Écran 05, onglet « Demandes de modification » : valider (met à jour la fiche, prévient le membre) ou refuser (motif). */
export const DemandesMembres = ({ demandes, presentations, peutTraiter }: { demandes: Demande[]; presentations: Presentation[]; peutTraiter: boolean }) => {
  const router = useRouter()
  const [refus, setRefus] = useState<number | null>(null)
  const [motif, setMotif] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [occupe, setOccupe] = useState(false)

  const agir = async (fn: () => Promise<unknown>, succes: string) => {
    setOccupe(true)
    setErr('')
    setOk('')
    try {
      await fn()
      setOk(succes)
      setRefus(null)
      setMotif('')
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }
  const traiter = (id: number, data: Record<string, string>) =>
    api(`/api/modificationRequests/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

  if (!demandes.length && !presentations.length)
    return (
      <>
        {ok && <div className="ok" role="status">{ok}</div>}
        <p className="muted">Aucune demande en attente.</p>
      </>
    )

  return (
    <>
      {demandes.map((d) => (
        <section className="panel req" key={d.id}>
          <div>
            <p className="small muted">
              {d.qui} · {d.quand}
            </p>
            <p>
              <b>{d.champ}</b> : <span className="del">{d.avant}</span> → <span className="ins">{d.apres}</span>
            </p>
            {d.motif && <p className="small muted">Motif : {d.motif}</p>}
            {d.justificatif && (
              <a className="linkbtn" href={d.justificatif.url} target="_blank" rel="noopener noreferrer">
                {d.justificatif.nom}
              </a>
            )}
            {refus === d.id && (
              <div className="rec-field" style={{ marginTop: 10 }}>
                <label htmlFor={`refus-${d.id}`}>Motif du refus (envoyé au membre)</label>
                <input id={`refus-${d.id}`} className="rec-input" value={motif} onChange={(e) => setMotif(e.target.value)} />
              </div>
            )}
          </div>
          {peutTraiter && (
            <div className="rec-row">
              {refus === d.id ? (
                <>
                  <button type="button" className="rec-btn rec-btn--secondary" onClick={() => setRefus(null)} disabled={occupe}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="rec-btn rec-btn--primary"
                    disabled={occupe || !motif.trim()}
                    onClick={() => void agir(() => traiter(d.id, { statut: 'refusee', motifRefus: motif.trim() }), 'Demande refusée, membre prévenu par e-mail.')}
                  >
                    Confirmer le refus
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="rec-btn rec-btn--secondary" onClick={() => setRefus(d.id)} disabled={occupe}>
                    Refuser
                  </button>
                  <button
                    type="button"
                    className="rec-btn rec-btn--primary"
                    disabled={occupe}
                    onClick={() => void agir(() => traiter(d.id, { statut: 'validee' }), 'Modification appliquée, historique mis à jour, membre prévenu par e-mail.')}
                  >
                    Valider
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      ))}
      {presentations.map((p) => (
        <section className="panel req" key={`p-${p.id}`}>
          <div>
            <p className="small muted">
              {p.qui} · {p.quand}
            </p>
            <p>
              <b>Présentation</b> : {p.avant && <span className="del">{p.avant}</span>} {p.avant && '→ '}
              <span className="ins">{p.apres}</span>
            </p>
          </div>
          {peutTraiter && (
            <div className="rec-row">
              <button
                type="button"
                className="rec-btn rec-btn--secondary"
                disabled={occupe}
                onClick={() =>
                  void agir(() => api(`/api/companies/${p.id}/presentation`, { method: 'POST', body: JSON.stringify({ decision: 'ecarter' }) }), 'Présentation écartée.')
                }
              >
                Refuser
              </button>
              <button
                type="button"
                className="rec-btn rec-btn--primary"
                disabled={occupe}
                onClick={() =>
                  void agir(() => api(`/api/companies/${p.id}/presentation`, { method: 'POST', body: JSON.stringify({ decision: 'publier' }) }), 'Présentation publiée sur la fiche.')
                }
              >
                Valider
              </button>
            </div>
          )}
        </section>
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
    </>
  )
}
