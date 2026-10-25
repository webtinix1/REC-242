'use client'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

type Props = {
  id: number
  modifiable: boolean
  statut: string
  statuts: { value: string; label: string }[]
  email: string
  nom: string
  rdv: { pieceVerifiee: boolean; charteSignee: boolean; avisCommission: boolean }
  motifRefus: string
  notes: { qui: string; quand: string; texte: string }[]
  historique: { t: string; d: string; who: string }[]
  dossier: React.ReactNode
}

const MODELES: [string, string][] = [
  ['accuse', 'Accusé de réception'],
  ['complement', 'Demande de complément'],
  ['bienvenue', 'Bienvenue et activation'],
  ['refus', 'Refus motivé'],
]

const appel = async (url: string, init?: RequestInit) => {
  const r = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const j = (await r.json().catch(() => ({}))) as {
    errors?: { message: string }[]
    message?: string
  } & Record<string, unknown>
  if (!r.ok) throw new Error(j.errors?.[0]?.message || j.message || 'L’action n’a pas abouti.')
  return j
}

// Les écritures sur un dossier passent l'une après l'autre : deux mises à jour simultanées s'écraseraient.
let file: Promise<unknown> = Promise.resolve()
const api = (url: string, init?: RequestInit) => {
  const suivant = file.catch(() => undefined).then(() => appel(url, init))
  if (init?.method && init.method !== 'GET') file = suivant
  return suivant
}

/** Colonnes de l'écran 04 : statut, rendez-vous, notes, e-mails modèles, historique. */
export const CandidatureActions = (p: Props) => {
  const router = useRouter()
  const base = `/api/applications/${p.id}`
  const [refus, setRefus] = useState(p.statut === 'refusee')
  const [motif, setMotif] = useState(p.motifRefus)
  const [rdv, setRdv] = useState(p.rdv)
  const [note, setNote] = useState('')
  const [brouillon, setBrouillon] = useState<{
    modele: string
    nom: string
    objet: string
    corps: string
  } | null>(null)
  const [ok, setOk] = useState('')
  const [okMail, setOkMail] = useState('')
  const [err, setErr] = useState('')
  const [occupe, setOccupe] = useState(false)

  const agir = async (
    fn: () => Promise<unknown>,
    succes?: string,
    cible: 'statut' | 'mail' = 'statut',
  ) => {
    setOccupe(true)
    setErr('')
    try {
      await fn()
      if (succes) (cible === 'mail' ? setOkMail : setOk)(succes)
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  const choisirStatut = (s: string) => {
    setOk('')
    if (s === 'refusee') return setRefus(true)
    setRefus(false)
    if (s === p.statut) return
    void agir(
      () => api(`${base}/statut`, { method: 'POST', body: JSON.stringify({ statut: s }) }),
      'Statut mis à jour.',
    )
  }

  const ouvrirModele = (modele: string) => {
    setOkMail('')
    void agir(async () => {
      const j = (await api(`${base}/email/${modele}`)) as {
        nom: string
        objet: string
        corps: string
      }
      setBrouillon({ modele, ...j })
    })
  }

  const envoyerRefus = () =>
    agir(async () => {
      if (!motif.trim()) throw new Error('Indiquez le motif du refus : il est obligatoire.')
      const j = (await api(`${base}/email/refus`)) as { objet: string; corps: string }
      const corps = j.corps.replace(
        /Motif : [^\n]*?\./,
        `Motif : ${motif.trim().replace(/\.$/, '')}.`,
      )
      await api(`${base}/statut`, {
        method: 'POST',
        body: JSON.stringify({ statut: 'refusee', motif, objet: j.objet, corps }),
      })
    }, `Dossier refusé. L’e-mail de refus a été envoyé à ${p.nom}.`)

  const majRdv = (k: keyof Props['rdv'], v: boolean) => {
    const suivant = { ...rdv, [k]: v }
    setRdv(suivant)
    // Enregistrement en arrière-plan : les autres actions du dossier restent disponibles.
    api(`${base}/rendez-vous`, { method: 'POST', body: JSON.stringify({ [k]: v }) })
      .then(() => router.refresh())
      .catch((e: Error) => {
        setRdv((r) => ({ ...r, [k]: !v }))
        setErr(e.message)
      })
  }

  const convertible = p.statut === 'acceptee' && rdv.pieceVerifiee && rdv.charteSignee
  const actif = p.statut === 'active'

  return (
    <div className="grid2 grid-wide">
      <div className="stack">
        <section className="panel">
          <h3 className="h3">Statut du dossier</h3>
          <div className="chips">
            {p.statuts.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`chip${(refus ? 'refusee' : p.statut) === s.value ? ' is-on' : ''}`}
                aria-pressed={(refus ? 'refusee' : p.statut) === s.value}
                title={s.value === 'active' ? 'Posé par « Convertir en membre ».' : undefined}
                disabled={!p.modifiable || occupe || actif || s.value === 'active'}
                onClick={() => choisirStatut(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
          {refus && p.statut !== 'refusee' && (
            <div className="warn">
              <div className="rec-field">
                <label htmlFor="bb-motif">Motif du refus (obligatoire)</label>
                <textarea
                  id="bb-motif"
                  className="rec-input"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                />
              </div>
              <p className="small">
                Un e-mail courtois, reprenant ce motif, sera envoyé au candidat. Le remboursement
                éventuel suit la règle fixée par le comité de direction.
              </p>
              <button
                type="button"
                className="rec-btn rec-btn--secondary"
                onClick={() => void envoyerRefus()}
                disabled={occupe}
              >
                Envoyer l’e-mail de refus
              </button>
            </div>
          )}
          {p.statut === 'refusee' && p.motifRefus && (
            <p className="small muted">Motif : {p.motifRefus}</p>
          )}
          <div className="rec-row">
            <button
              type="button"
              className="rec-btn rec-btn--secondary"
              onClick={() => ouvrirModele('complement')}
              disabled={!p.modifiable || occupe}
            >
              Demander un complément
            </button>
            <button
              type="button"
              className="rec-btn rec-btn--primary"
              disabled={!p.modifiable || !convertible || occupe}
              title={
                convertible
                  ? undefined
                  : 'Disponible quand le dossier est « Acceptée », la pièce vérifiée et la charte signée.'
              }
              onClick={() =>
                void agir(
                  () => api(`${base}/convertir`, { method: 'POST', body: '{}' }),
                  'Fiche membre créée, lien d’activation envoyé (valable 72 h).',
                )
              }
            >
              Convertir en membre
            </button>
          </div>
          {!convertible && !actif && (
            <p className="small muted">
              « Convertir en membre » est actif quand le dossier est « Acceptée », la pièce vérifiée
              et la charte signée.
            </p>
          )}
          {actif && (
            <div className="ok">Fiche membre créée, lien d’activation envoyé (valable 72 h).</div>
          )}
          {ok && (
            <div className="ok" role="status">
              {ok}
            </div>
          )}
          {err && (
            <div className="err" role="alert">
              {err}
            </div>
          )}
        </section>
        {p.dossier}
        <section className="panel">
          <h3 className="h3">Rendez-vous avec le comité de direction</h3>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={rdv.pieceVerifiee}
              disabled={!p.modifiable}
              onChange={(e) => majRdv('pieceVerifiee', e.target.checked)}
            />{' '}
            Pièce d’identité vérifiée en main propre
          </label>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={rdv.charteSignee}
              disabled={!p.modifiable}
              onChange={(e) => majRdv('charteSignee', e.target.checked)}
            />{' '}
            Charte de l’adhérent signée
          </label>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={rdv.avisCommission}
              disabled={!p.modifiable}
              onChange={(e) => majRdv('avisCommission', e.target.checked)}
            />{' '}
            Avis de la commission Éthique et Vérification
          </label>
        </section>
      </div>
      <div className="stack">
        <section className="panel">
          <h3 className="h3">Notes internes</h3>
          {p.modifiable && (
            <>
              <div className="rec-field">
                <label htmlFor="bb-note">Nouvelle note</label>
                <textarea
                  id="bb-note"
                  className="rec-input"
                  placeholder="Visible uniquement par l’équipe"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="rec-btn rec-btn--secondary"
                style={{ width: 'max-content' }}
                disabled={occupe || !note.trim()}
                onClick={() => {
                  void agir(() =>
                    api(`${base}/note`, { method: 'POST', body: JSON.stringify({ texte: note }) }),
                  )
                  setNote('')
                }}
              >
                Ajouter la note
              </button>
            </>
          )}
          {p.notes.map((n, i) => (
            <div className="note" key={i}>
              <b>{n.qui}</b>
              <p className="small">{n.texte}</p>
              <p className="xs muted">{n.quand}</p>
            </div>
          ))}
        </section>
        <section className="panel">
          <h3 className="h3">E-mails modèles</h3>
          {MODELES.map(([k, l]) => (
            <button
              key={k}
              type="button"
              className="linkbtn"
              disabled={!p.modifiable || occupe || (k === 'bienvenue' && !actif)}
              onClick={() => ouvrirModele(k)}
            >
              {l}
            </button>
          ))}
          {brouillon && (
            <div className="blk">
              <p className="small muted">À : {p.email} · depuis l’adresse d’envoi de REC 242</p>
              <div className="rec-field">
                <label htmlFor="bb-cmo">Objet</label>
                <input
                  id="bb-cmo"
                  className="rec-input"
                  type="text"
                  value={brouillon.objet}
                  onChange={(e) => setBrouillon({ ...brouillon, objet: e.target.value })}
                />
              </div>
              <div className="rec-field">
                <label htmlFor="bb-cmt">Message</label>
                <textarea
                  id="bb-cmt"
                  className="rec-input conv-ta"
                  value={brouillon.corps}
                  onChange={(e) => setBrouillon({ ...brouillon, corps: e.target.value })}
                />
              </div>
              <div className="rec-row">
                <button
                  type="button"
                  className="rec-btn rec-btn--primary"
                  disabled={occupe}
                  onClick={() =>
                    void agir(
                      async () => {
                        await api(`${base}/email`, {
                          method: 'POST',
                          body: JSON.stringify({
                            modele: brouillon.modele,
                            objet: brouillon.objet,
                            corps: brouillon.corps,
                          }),
                        })
                        setBrouillon(null)
                      },
                      `E-mail « ${brouillon.nom} » envoyé à ${p.nom}. Il apparaît dans l’historique du dossier.`,
                      'mail',
                    )
                  }
                >
                  Envoyer au candidat
                </button>
                <button type="button" className="linkbtn" onClick={() => setBrouillon(null)}>
                  Annuler
                </button>
              </div>
            </div>
          )}
          {okMail && (
            <div className="ok" role="status">
              {okMail}
            </div>
          )}
        </section>
        <section className="panel">
          <h3 className="h3">Historique</h3>
          {p.historique.map((h, i) => (
            <div className="tl" key={i}>
              <span className="tl-dot" />
              <div>
                <p className="small">
                  <b>{h.t}</b>
                </p>
                <p className="small muted">
                  {h.d} · {h.who}
                </p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
