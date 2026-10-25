'use client'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { api } from '../membres/api'

export type DemandeExpert = {
  id: number
  membre: string
  ini: string
  photo?: string
  entreprise: string
  quand: string
  date: string
  question: string
  etiquette: string
  statut: string
  statutLabel: string
  cls: string
  preference: string
  personne: string
  personneFonction: string
  personnePhoto?: string
  relances: number
  fil: { type: string; qui: string; texte: string; quand: string }[]
  alternatives: { id: number; nom: string }[]
}

const Avatar = ({ ini, photo, nom }: { ini: string; photo?: string; nom: string }) => (
  <span className="av av-photo">
    {ini}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photo && <img src={photo} alt={nom} />}
  </span>
)

/** Écran 21, onglet « Questions aux experts » : liste à gauche, détail et actions à droite. */
export const DemandesExperts = ({ demandes, selection, peutTraiter }: { demandes: DemandeExpert[]; selection?: number; peutTraiter: boolean }) => {
  const router = useRouter()
  const [choix, setChoix] = useState<number | undefined>(selection)
  const [panneau, setPanneau] = useState<'' | 'reattribuer' | 'repondre'>('')
  const [nouvelExpert, setNouvelExpert] = useState('')
  const [texte, setTexte] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [occupe, setOccupe] = useState(false)

  const d = demandes.find((x) => x.id === choix) ?? demandes.find((x) => x.statut === 'sans-reponse') ?? demandes[0]

  const ouvrir = (id: number) => {
    setChoix(id)
    setPanneau('')
    setOk('')
    setErr('')
  }

  const agir = async (action: string, corps: Record<string, unknown>, succes: string) => {
    if (!d) return
    setOccupe(true)
    setErr('')
    setOk('')
    try {
      await api(`/api/expertRequests/${d.id}/${action}`, { method: 'POST', body: JSON.stringify(corps) })
      setOk(succes)
      setPanneau('')
      setTexte('')
      setNouvelExpert('')
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  return (
    <>
      <p className="muted">Questions envoyées par les membres depuis « Solliciter un expert ». Sans réponse sous 5 jours ouvrés, la demande remonte ici en rouge.</p>
      <div className="inbox">
        <div className="inbox-list" role="list" aria-label="Questions aux experts">
          {demandes.length === 0 && <p className="empty-inbox">Aucune question pour le moment.</p>}
          {demandes.map((r) => (
            <button key={r.id} type="button" role="listitem" className={`ib-item${r.id === d?.id ? ' is-on' : ''}`} aria-current={r.id === d?.id ? 'true' : undefined} onClick={() => ouvrir(r.id)}>
              <Avatar ini={r.ini} photo={r.photo} nom={r.membre} />
              <span className="ib-txt">
                <span className="ib-top">
                  <b>{r.membre}</b>
                  <span className="xs muted">{r.quand}</span>
                </span>
                <span className="ib-obj">{r.question}</span>
                <span className="ib-meta">
                  <span className="pill">{r.etiquette}</span>
                  <span className={`rec-badge rec-badge--${r.cls}`}>{r.statutLabel}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
        {d && (
          <section className="panel conv" aria-label="Détail de la demande">
            <div className="conv-h">
              <div>
                <p className="small muted">
                  {d.etiquette} · envoyée {d.date} · réponse attendue sous 5 jours ouvrés
                </p>
                <h2 className="h2">{d.question}</h2>
              </div>
              <span className={`rec-badge rec-badge--${d.cls}`}>{d.statutLabel}</span>
            </div>
            <div className="duo-who">
              <div className="who">
                <Avatar ini={d.ini} photo={d.photo} nom={d.membre} />
                <div className="who-t">
                  <span className="xs muted">Membre</span>
                  <b>{d.membre}</b>
                  <span className="small muted">{d.entreprise}</span>
                </div>
              </div>
              <span className="arrow" aria-hidden="true">
                →
              </span>
              <div className="who">
                <Avatar ini={d.personne.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')} photo={d.personnePhoto} nom={d.personne} />
                <div className="who-t">
                  <span className="xs muted">Expert</span>
                  <b>{d.personne}</b>
                  <span className="small muted">{d.personneFonction}</span>
                </div>
              </div>
            </div>
            <div className="bubble in">
              <p className="xs muted">
                {d.membre} · {d.date}
                {d.preference && <> · réponse souhaitée par {d.preference}</>}
              </p>
              <p style={{ whiteSpace: 'pre-line' }}>{d.question}</p>
            </div>
            {d.fil.map((f, i) => (
              <div className={`bubble ${f.type === 'rec242' ? 'out' : f.type === 'expert' ? 'in' : 'note'}`} key={i}>
                <p className="xs muted">
                  {f.qui}
                  {f.quand ? ` · ${f.quand.toLowerCase()}` : ''}
                </p>
                <p style={{ whiteSpace: 'pre-line' }}>{f.texte}</p>
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
            {peutTraiter && d.statut !== 'cloturee' && (
              <div className="composer">
                <p className="h3">Que faire ?</p>
                <div className="rec-row">
                  <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={() => void agir('relancer', {}, 'Relance envoyée à l’expert.')}>
                    Relancer l’expert
                  </button>
                  <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={() => setPanneau(panneau === 'reattribuer' ? '' : 'reattribuer')}>
                    Réattribuer
                  </button>
                  <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={() => setPanneau(panneau === 'repondre' ? '' : 'repondre')}>
                    Répondre au membre
                  </button>
                  <button type="button" className="linkbtn" disabled={occupe} onClick={() => void agir('cloturer', {}, 'Demande clôturée.')}>
                    Clôturer
                  </button>
                </div>
                {panneau === 'reattribuer' && (
                  <div className="blk">
                    <div className="rec-field">
                      <label htmlFor="dx-reattr">Nouvel expert pour {d.etiquette}</label>
                      <select id="dx-reattr" className="rec-input" value={nouvelExpert} onChange={(e) => setNouvelExpert(e.target.value)}>
                        <option value="">{d.alternatives.length ? 'Choisir une personne' : 'Aucune autre personne ne porte cette étiquette'}</option>
                        {d.alternatives.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="button" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} disabled={occupe || !nouvelExpert} onClick={() => void agir('reattribuer', { personne: Number(nouvelExpert) }, 'Demande réattribuée, la nouvelle personne est prévenue.')}>
                      Confirmer la réattribution
                    </button>
                  </div>
                )}
                {panneau === 'repondre' && (
                  <div className="blk">
                    <div className="rec-field">
                      <label htmlFor="dx-rep">Message au membre, au nom de REC 242</label>
                      <textarea id="dx-rep" className="rec-input conv-ta" value={texte} onChange={(e) => setTexte(e.target.value)} />
                    </div>
                    <button type="button" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} disabled={occupe || texte.trim().length < 5} onClick={() => void agir('repondre', { texte: texte.trim() }, 'Message envoyé au membre.')}>
                      Envoyer au membre
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  )
}
