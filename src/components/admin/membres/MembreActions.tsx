'use client'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { api } from './api'
import { DisciplineProvider } from './Discipline'

type Props = {
  id: number
  modifiable: boolean
  statut: string
  motifStatut: string
  masquee: boolean
  aEntreprise: boolean
  commissions: { id: number; nom: string }[]
  commissionsMembre: number[]
  fin: string
  suppressionDemandee: string
  relationsSuspendues: boolean
  compte: string
  visibilite: React.ReactNode
  fiche: React.ReactNode
  cotisation: React.ReactNode
  discipline: React.ReactNode
  procedure: React.ReactNode
}

const STATUTS = [
  { value: 'actif', label: 'Actif' },
  { value: 'suspendu', label: 'Suspendu' },
  { value: 'ancien', label: 'Ancien membre' },
]

/** Colonnes de l'écran 06 : statut (confirmation et motif), visibilité, fiche, compte, cotisation, fin d'adhésion. */
export const MembreActions = (p: Props) => {
  const router = useRouter()
  const base = `/api/members/${p.id}`
  const [cible, setCible] = useState<string | null>(null)
  const [motif, setMotif] = useState('')
  const [coms, setComs] = useState(p.commissionsMembre)
  const [editComs, setEditComs] = useState(false)
  const [fin, setFin] = useState<'' | 'demission' | 'deces'>('')
  const [dateFin, setDateFin] = useState(() => new Date().toISOString().slice(0, 10))
  const [ok, setOk] = useState<{ zone: string; texte: string } | null>(null)
  const [err, setErr] = useState<{ zone: string; texte: string } | null>(null)
  const [occupe, setOccupe] = useState(false)

  const agir = async (zone: string, fn: () => Promise<unknown>, succes: string) => {
    setOccupe(true)
    setErr(null)
    setOk(null)
    try {
      await fn()
      setOk({ zone, texte: succes })
      router.refresh()
      return true
    } catch (e) {
      setErr({ zone, texte: (e as Error).message })
      return false
    } finally {
      setOccupe(false)
    }
  }
  const msg = (zone: string) => (
    <>
      {ok?.zone === zone && (
        <div className="ok" role="status">
          {ok.texte}
        </div>
      )}
      {err?.zone === zone && (
        <p className="err" role="alert">
          {err.texte}
        </p>
      )}
    </>
  )
  const post = (chemin: string, data: unknown) => api(`${base}${chemin}`, { method: 'POST', body: JSON.stringify(data) })
  const fini = p.statut === 'ancien'

  return (
    <DisciplineProvider>
    <div className="grid2 grid-wide">
      <div className="stack">
        <section className="panel">
          <h3 className="h3">Statut</h3>
          <div className="chips">
            {STATUTS.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`chip${(cible ?? p.statut) === s.value ? ' is-on' : ''}`}
                aria-pressed={p.statut === s.value}
                disabled={!p.modifiable || occupe || p.statut === 'attente'}
                onClick={() => {
                  setCible(s.value === p.statut ? null : s.value)
                  setMotif('')
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          {p.statut === 'attente' && <p className="small muted">En attente d&apos;activation : le membre active son espace avec le lien reçu par e-mail.</p>}
          {p.motifStatut && !cible && <p className="small muted">Dernier motif : {p.motifStatut}</p>}
          {cible && (
            <div className="stack">
              <div className="rec-field">
                <label htmlFor="st-motif">Motif du changement (obligatoire)</label>
                <input id="st-motif" className="rec-input" value={motif} onChange={(e) => setMotif(e.target.value)} />
              </div>
              <div className="rec-row">
                <button type="button" className="rec-btn rec-btn--secondary" onClick={() => setCible(null)} disabled={occupe}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="rec-btn rec-btn--primary"
                  disabled={occupe || !motif.trim()}
                  onClick={async () => {
                    if (await agir('statut', () => post('/statut', { statut: cible, motif: motif.trim() }), 'Statut modifié, inscrit au journal.')) setCible(null)
                  }}
                >
                  Confirmer : {STATUTS.find((s) => s.value === cible)?.label}
                </button>
              </div>
            </div>
          )}
          {msg('statut')}
        </section>

        <div className="stack" style={{ gap: 0 }}>
          {p.visibilite}
          {p.modifiable && p.aEntreprise && (
            <div className="rec-row" style={{ padding: '8px 4px 0' }}>
              <button
                type="button"
                className="linkbtn"
                disabled={occupe}
                onClick={() =>
                  void agir('visibilite', () => post('/masquer', { masquee: !p.masquee }), p.masquee ? 'Fiche réaffichée (selon le choix du membre).' : 'Fiche masquée dans l’annuaire.')
                }
              >
                {p.masquee ? 'Ne plus masquer la fiche' : 'Masquer la fiche dans l’annuaire'}
              </button>
              <span className="small muted">L&apos;administration peut masquer une fiche, jamais la publier sans consentement.</span>
            </div>
          )}
          {msg('visibilite')}
        </div>

        <div className="stack" style={{ gap: 0 }}>
          {p.fiche}
          {p.modifiable && (
            <div style={{ padding: '8px 4px 0' }}>
              {!editComs ? (
                <button type="button" className="linkbtn" onClick={() => setEditComs(true)}>
                  Modifier les commissions
                </button>
              ) : (
                <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="small" style={{ fontWeight: 600 }}>
                    Commissions du membre
                  </legend>
                  {p.commissions.map((c) => (
                    <label key={c.id} className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 32 }}>
                      <input
                        type="checkbox"
                        checked={coms.includes(c.id)}
                        onChange={(e) => setComs((x) => (e.target.checked ? [...x, c.id] : x.filter((y) => y !== c.id)))}
                      />
                      {c.nom}
                    </label>
                  ))}
                  <div className="rec-row">
                    <button type="button" className="rec-btn rec-btn--secondary" onClick={() => setEditComs(false)} disabled={occupe}>
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="rec-btn rec-btn--primary"
                      disabled={occupe}
                      onClick={async () => {
                        if (await agir('fiche', () => post('/commissions', { commissions: coms }), 'Commissions enregistrées.')) setEditComs(false)
                      }}
                    >
                      Enregistrer
                    </button>
                  </div>
                </fieldset>
              )}
            </div>
          )}
          {msg('fiche')}
        </div>
      </div>

      <div className="stack">
        <section className="panel">
          <h3 className="h3">Compte</h3>
          <p className="small">{p.compte}</p>
          {p.statut === 'attente' && p.modifiable && (
            <button
              type="button"
              className="rec-btn rec-btn--secondary"
              disabled={occupe}
              onClick={() => void agir('compte', () => post('/activation', {}), 'Lien d’activation renvoyé (valable 72 h).')}
            >
              Renvoyer le lien d&apos;activation
            </button>
          )}
          {p.relationsSuspendues && (
            <div className="stack">
              <p className="small" style={{ color: 'var(--text-danger)' }}>Mises en relation suspendues : plus de 10 demandes en une semaine.</p>
              {p.modifiable && (
                <button type="button" className="linkbtn" disabled={occupe} onClick={() => void agir('compte', () => post('/relations', {}), 'Mises en relation rétablies.')}>
                  Rétablir les mises en relation
                </button>
              )}
            </div>
          )}
          {p.suppressionDemandee && <p className="small" style={{ color: 'var(--text-danger)' }}>{p.suppressionDemandee}</p>}
          {msg('compte')}
        </section>

        {p.cotisation}

        {p.discipline}

        <section className="panel">
          <h3 className="h3">Fin d&apos;adhésion</h3>
          <p className="small muted">
            Démission écrite, décès, non-paiement après trois relances ou exclusion (article 14). La fiche quitte l&apos;annuaire, l&apos;historique est
            conservé.
          </p>
          {p.fin && <p className="small">{p.fin}</p>}
          {!fini && p.modifiable && !fin && (
            <div className="rec-row">
              <button type="button" className="linkbtn" onClick={() => setFin('demission')}>
                Enregistrer une démission
              </button>
              <button type="button" className="linkbtn" onClick={() => setFin('deces')}>
                Enregistrer un décès
              </button>
            </div>
          )}
          {fin && (
            <div className="stack">
              <div className="rec-field">
                <label htmlFor="fin-date">{fin === 'demission' ? 'Date de la démission écrite' : 'Date du décès'}</label>
                <input id="fin-date" className="rec-input" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
              </div>
              <div className="rec-row">
                <button type="button" className="rec-btn rec-btn--secondary" onClick={() => setFin('')} disabled={occupe}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="rec-btn rec-btn--primary"
                  disabled={occupe || !dateFin}
                  onClick={async () => {
                    if (await agir('fin', () => post('/fin', { type: fin, date: dateFin }), 'Fin d’adhésion enregistrée : la fiche a quitté l’annuaire.')) setFin('')
                  }}
                >
                  Confirmer
                </button>
              </div>
            </div>
          )}
          {msg('fin')}
        </section>
      </div>
    </div>
    {p.procedure}
    </DisciplineProvider>
  )
}
