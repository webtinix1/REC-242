'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { api } from '../membres/api'
import { Scanner } from './Scanner'

export type Participant = {
  id: number
  statut: string
  position: number
  nom: string
  profil: string
  detail: string
  telephone: string
}

type Props = {
  id: number
  titre: string
  chapeau: string
  statut: string
  participantsSaisis: number | null
  actualite: number | null
  modifiable: boolean
  peutExporter: boolean
  lignes: Participant[]
}

const ONGLETS = ['Inscrits', 'Liste d’attente', 'Fiche', 'Après l’événement']

/** Onglets de l'écran 08 : inscrits et pointage, liste d'attente, fiche (annulation, report), après l'événement. */
export const EvenementGestion = (p: Props) => {
  const router = useRouter()
  const [onglet, setOnglet] = useState(ONGLETS[0])
  const [scan, setScan] = useState(false)
  const [occupe, setOccupe] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [mode, setMode] = useState<'' | 'annule' | 'reporte'>('')
  const [message, setMessage] = useState('')
  const [nouvelle, setNouvelle] = useState('')

  const inscrits = p.lignes.filter((l) => l.statut === 'inscrit' || l.statut === 'present')
  const attente = p.lignes.filter((l) => l.statut === 'attente').sort((a, b) => a.position - b.position)
  const presents = inscrits.filter((l) => l.statut === 'present').length
  const base = `/admin/collections/events/${p.id}`
  const clos = p.statut === 'annule' || p.statut === 'termine'

  const agir = async (fn: () => Promise<unknown>, succes = '') => {
    setOccupe(true)
    setErr('')
    setOk('')
    try {
      await fn()
      if (succes) setOk(succes)
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  const messages = (
    <>
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

  return (
    <>
      <div className="tabs" role="tablist">
        {ONGLETS.map((o) => (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={onglet === o}
            className={`tab${onglet === o ? ' is-on' : ''}`}
            onClick={() => {
              setOnglet(o)
              setErr('')
              setOk('')
            }}
          >
            {o}
          </button>
        ))}
      </div>

      {onglet === 'Inscrits' && (
        <>
          <div className="bar-actions">
            <p>
              <b>{presents}</b> présent(s) pointé(s) · pointage possible sur téléphone le jour J
            </p>
            <div className="rec-row">
              {p.modifiable && (
                <button type="button" className="rec-btn rec-btn--primary" onClick={() => setScan(true)}>
                  Scanner les cartes de membre
                </button>
              )}
              {p.peutExporter && (
                <a className="rec-btn rec-btn--secondary" href={`/api/registrations/export?evenement=${p.id}`}>
                  Exporter CSV
                </a>
              )}
            </div>
          </div>
          {scan && <Scanner evenement={p.id} onFermer={() => setScan(false)} onPointage={() => router.refresh()} />}
          {messages}
          {inscrits.length === 0 ? (
            <section className="panel">
              <p>Aucun inscrit pour le moment.</p>
            </section>
          ) : (
            <div className="tblwrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">Participant</th>
                    <th scope="col">Profil</th>
                    <th scope="col">Téléphone</th>
                    <th scope="col">Présence</th>
                  </tr>
                </thead>
                <tbody>
                  {inscrits.map((l) => {
                    const present = l.statut === 'present'
                    return (
                      <tr key={l.id}>
                        <td>
                          <b>{l.nom}</b>
                          {l.detail && <span className="small muted"> · {l.detail}</span>}
                        </td>
                        <td data-label="Profil">{l.profil}</td>
                        <td data-label="Téléphone" className="mono">
                          {l.telephone}
                        </td>
                        <td data-label="Présence">
                          <button
                            type="button"
                            className={`point${present ? ' is-on' : ''}`}
                            aria-pressed={present}
                            disabled={!p.modifiable || occupe}
                            onClick={() => agir(() => api(`/api/registrations/${l.id}`, { method: 'PATCH', body: JSON.stringify({ statut: present ? 'inscrit' : 'present' }) }))}
                          >
                            <span className="point-dot" aria-hidden="true"></span>
                            {present ? 'Présent' : 'Absent'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {onglet === 'Liste d’attente' && (
        <>
          {messages}
          {attente.length === 0 ? (
            <section className="panel">
              <p>
                Aucune personne en liste d&apos;attente pour cet événement. En cas de désistement, la première personne en attente est inscrite automatiquement et prévenue par e-mail.
              </p>
            </section>
          ) : (
            <div className="tblwrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">Ordre</th>
                    <th scope="col">Participant</th>
                    <th scope="col">Profil</th>
                    <th scope="col">Téléphone</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attente.map((l, i) => (
                    <tr key={l.id}>
                      <td data-label="Ordre" className="mono">
                        {l.position || i + 1}
                      </td>
                      <td>
                        <b>{l.nom}</b>
                        {l.detail && <span className="small muted"> · {l.detail}</span>}
                      </td>
                      <td data-label="Profil">{l.profil}</td>
                      <td data-label="Téléphone" className="mono">
                        {l.telephone}
                      </td>
                      <td data-label="Action">
                        {p.modifiable && (
                          <button
                            type="button"
                            className="rec-btn rec-btn--secondary"
                            disabled={occupe}
                            onClick={() => agir(() => api(`/api/registrations/${l.id}/promouvoir`, { method: 'POST', body: '{}' }), `${l.nom} est inscrit(e) et prévenu(e) par e-mail.`)}
                          >
                            Promouvoir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {onglet === 'Fiche' && (
        <>
          {messages}
          <div className="grid2">
            <section className="panel">
              <h3 className="h3">Fiche de l&apos;événement</h3>
              <p className="small muted">Titre, dates, lieu, programme, intervenants, capacité et publication se modifient dans le formulaire de l&apos;événement.</p>
              <div className="rec-row">
                <Link className="rec-btn rec-btn--secondary" href={`${base}?vue=formulaire`}>
                  Modifier la fiche
                </Link>
              </div>
            </section>
            <section className="panel">
              <h3 className="h3">Annuler ou reporter</h3>
              <p className="small muted">Annulé ou reporté : les inscrits sont prévenus automatiquement par e-mail et WhatsApp.</p>
              {clos ? (
                <p className="small">Cet événement est {p.statut === 'annule' ? 'annulé' : 'terminé'}.</p>
              ) : p.modifiable ? (
                <>
                  <div className="chips">
                    <button type="button" className={`chip${mode === 'annule' ? ' is-on' : ''}`} aria-pressed={mode === 'annule'} onClick={() => setMode(mode === 'annule' ? '' : 'annule')}>
                      Annuler l&apos;événement
                    </button>
                    <button type="button" className={`chip${mode === 'reporte' ? ' is-on' : ''}`} aria-pressed={mode === 'reporte'} onClick={() => setMode(mode === 'reporte' ? '' : 'reporte')}>
                      Reporter
                    </button>
                  </div>
                  {mode && (
                    <div className="stack" style={{ gap: 12 }}>
                      {mode === 'reporte' && (
                        <div className="rec-field">
                          <label htmlFor="ev-nd">Nouvelle date</label>
                          <input id="ev-nd" className="rec-input" type="datetime-local" value={nouvelle} onChange={(e) => setNouvelle(e.target.value)} />
                        </div>
                      )}
                      <div className="rec-field">
                        <label htmlFor="ev-msg">Message aux inscrits</label>
                        <textarea id="ev-msg" className="rec-input" value={message} onChange={(e) => setMessage(e.target.value)} />
                      </div>
                      <div className="rec-row">
                        <button
                          type="button"
                          className="rec-btn rec-btn--primary"
                          disabled={occupe || !message.trim() || (mode === 'reporte' && !nouvelle)}
                          onClick={() =>
                            agir(
                              async () => {
                                await api(`/api/events/${p.id}`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({
                                    statut: mode,
                                    messageInscrits: message.trim(),
                                    ...(mode === 'reporte' ? { nouvelleDate: new Date(nouvelle).toISOString() } : {}),
                                  }),
                                })
                                setMode('')
                                setMessage('')
                                setNouvelle('')
                              },
                              mode === 'annule' ? 'Événement annulé, les inscrits sont prévenus.' : 'Événement reporté, les inscrits sont prévenus.',
                            )
                          }
                        >
                          {mode === 'annule' ? 'Annuler et prévenir les inscrits' : 'Reporter et prévenir les inscrits'}
                        </button>
                        <button type="button" className="linkbtn" onClick={() => setMode('')}>
                          Fermer
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </section>
          </div>
        </>
      )}

      {onglet === 'Après l’événement' && (
        <>
          {messages}
          <div className="grid2">
            <section className="panel">
              <h3 className="h3">Participants</h3>
              <p>
                <b>{presents}</b> présent(s) pointé(s) sur {inscrits.length} inscrit(s).
              </p>
              <p className="small muted">
                Nombre affiché sur le site : {p.participantsSaisis !== null ? p.participantsSaisis : 'non renseigné'}. Le compte rendu, la galerie et les documents se renseignent dans le formulaire de l&apos;événement.
              </p>
              <div className="rec-row">
                <Link className="rec-btn rec-btn--secondary" href={`${base}?vue=formulaire`}>
                  Compte rendu, galerie et documents
                </Link>
              </div>
            </section>
            <section className="panel">
              <h3 className="h3">Actualité</h3>
              <p className="small muted">Un brouillon « Retour sur {p.titre} » est créé, à compléter avant publication.</p>
              <div className="rec-row">
                {p.actualite ? (
                  <Link className="rec-btn rec-btn--secondary" href={`/admin/collections/news/${p.actualite}`}>
                    Ouvrir l&apos;actualité liée
                  </Link>
                ) : (
                  p.modifiable && (
                    <button
                      type="button"
                      className="rec-btn rec-btn--primary"
                      disabled={occupe}
                      onClick={async () => {
                        setOccupe(true)
                        setErr('')
                        try {
                          const r = (await api('/api/news?draft=true', {
                            method: 'POST',
                            body: JSON.stringify({ titre: `Retour sur ${p.titre}`, chapeau: p.chapeau || p.titre, _status: 'draft' }),
                          })) as { doc?: { id: number } }
                          if (!r.doc?.id) throw new Error('L’actualité n’a pas été créée.')
                          await api(`/api/events/${p.id}`, { method: 'PATCH', body: JSON.stringify({ actualite: r.doc.id }) })
                          router.push(`/admin/collections/news/${r.doc.id}`)
                        } catch (e) {
                          setErr((e as Error).message)
                          setOccupe(false)
                        }
                      }}
                    >
                      Créer l&apos;actualité
                    </button>
                  )
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </>
  )
}
