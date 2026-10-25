'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

export type InboxMessage = {
  id: number
  nom: string
  ini: string
  qui: string
  telephone: string
  email: string
  objet: string
  message: string
  motif: string
  formulaire: string
  typePartenariat: string
  destination: string
  statut: string
  recu: string
  nonLu: boolean
  notes: { qui: string; quand: string; texte: string }[]
  reponses: { canal: string; texte: string; qui: string; quand: string }[]
}

type Props = {
  messages: InboxMessage[]
  motif?: string
  motifs: { value: string; label: string }[]
  selection?: number
  reponsesTypes: { titre: string; texte: string }[]
  transmettre: { value: string; label: string }[]
}

const BASE = '/admin/collections/contactMessages'

const post = async (id: number, action: string, body: Record<string, unknown>) => {
  const r = await fetch(`/api/contactMessages/${id}/${action}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as {
      errors?: { message: string }[]
      message?: string
    }
    throw new Error(j.errors?.[0]?.message || j.message || 'L’action n’a pas abouti.')
  }
}

const remplir = (t: string, m: InboxMessage) => {
  const prenom = m.nom.replace(/,.*$/, '').trim().split(/\s+/)[0] ?? ''
  return t
    .replace(/\{\{\s*prenom\s*\}\}/g, prenom)
    .replace(/\{\{\s*nom\s*\}\}/g, m.nom.replace(/,.*$/, ''))
}

/** Boîte de réception (écran 13) : liste, conversation, réponse par e-mail ou WhatsApp, transmission, notes. */
export const MessagesInbox = ({
  messages,
  motif,
  motifs,
  selection,
  reponsesTypes,
  transmettre,
}: Props) => {
  const router = useRouter()
  const [selId, setSelId] = useState<number | undefined>(selection ?? messages[0]?.id)
  const m = useMemo(() => messages.find((x) => x.id === selId) ?? messages[0], [messages, selId])
  const premier = reponsesTypes[0]
  const [canal, setCanalBrut] = useState<'email' | 'whatsapp'>('email')
  const [modele, setModele] = useState(premier?.titre ?? '')
  const [texte, setTexte] = useState(premier && m ? remplir(premier.texte, m) : '')
  const [dest, setDest] = useState(m?.email ?? '')
  const [traiter, setTraiter] = useState(true)
  const [panneau, setPanneau] = useState<'' | 'transmettre' | 'note'>('')
  const [note, setNote] = useState('')
  const [mot, setMot] = useState('')
  const [destT, setDestT] = useState(transmettre[0]?.value ?? '')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [occupe, setOccupe] = useState(false)

  /** Changement de message : composeur remis à zéro, destinataire par défaut. */
  const choisir = (x: InboxMessage) => {
    setSelId(x.id)
    setModele(premier?.titre ?? '')
    setTexte(premier ? remplir(premier.texte, x) : '')
    setDest(canal === 'email' ? x.email : x.telephone)
    setPanneau('')
    setErr('')
    setOk('')
  }

  const setCanal = (c: 'email' | 'whatsapp') => {
    setCanalBrut(c)
    if (m) setDest(c === 'email' ? m.email : m.telephone)
  }

  // Le message ouvert est marqué comme lu (pastille de la liste).
  useEffect(() => {
    if (m?.nonLu) void post(m.id, 'lu', {}).catch(() => undefined)
  }, [m?.id, m?.nonLu])

  const agir = async (fn: () => Promise<void>, succes: string) => {
    setOccupe(true)
    setErr('')
    try {
      await fn()
      setOk(succes)
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  const envoyer = () => {
    if (!m) return
    if (canal === 'whatsapp') {
      const digits = dest.replace(/\D/g, '')
      if (digits)
        window.open(
          `https://wa.me/${digits}?text=${encodeURIComponent(texte)}`,
          '_blank',
          'noopener',
        )
    }
    void agir(
      () => post(m.id, 'repondre', { canal, texte, to: dest, traiter }),
      `Réponse envoyée par ${canal === 'email' ? 'e-mail' : 'WhatsApp'} à ${m.nom}.${traiter ? ' Message marqué comme traité, envoi inscrit au journal.' : ' Envoi inscrit au journal.'}`,
    )
  }

  const filtres = [{ value: '', label: 'Tous' }, ...motifs]
  return (
    <>
      <div className="bar-actions">
        <div className="chips">
          {filtres.map((f) => (
            <Link
              key={f.value}
              href={f.value ? `${BASE}?motif=${f.value}` : BASE}
              className={`chip${(motif ?? '') === f.value ? ' is-on' : ''}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <a
          className="rec-btn rec-btn--secondary"
          href={`/api/contactMessages/export${motif ? `?motif=${motif}` : ''}`}
        >
          Exporter
        </a>
      </div>
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
      <div className="inbox">
        <div className="inbox-list" role="list" aria-label="Messages reçus">
          {messages.length === 0 && <p className="empty-inbox">Aucun message pour ce filtre.</p>}
          {messages.map((x) => (
            <button
              key={x.id}
              type="button"
              role="listitem"
              className={`ib-item${x.id === m?.id ? ' is-on' : ''}`}
              onClick={() => choisir(x)}
              aria-current={x.id === m?.id ? 'true' : undefined}
            >
              <span className="av av-photo ib-av">{x.ini}</span>
              <span className="ib-txt">
                <span className="ib-top">
                  <b>{x.nom}</b>
                  <span className="xs muted">{x.recu}</span>
                </span>
                <span className="ib-obj">{x.objet}</span>
                <span className="ib-meta">
                  <span className="pill">{x.motif}</span>
                  <span
                    className={`rec-badge rec-badge--${x.statut === 'traite' ? 'active' : 'pending'}`}
                  >
                    {x.statut === 'traite' ? 'Traité' : 'À traiter'}
                  </span>
                </span>
              </span>
              {x.nonLu && x.id !== m?.id && <span className="ib-dot" aria-label="Non lu" />}
            </button>
          ))}
        </div>
        {m && (
          <section className="panel conv" aria-label="Conversation">
            <div className="conv-h">
              <div>
                <p className="small muted">
                  {m.motif} · reçu {m.recu.toLowerCase()} par le formulaire {m.formulaire} du site
                </p>
                <h2 className="h2">{m.objet}</h2>
              </div>
              <span
                className={`rec-badge rec-badge--${m.statut === 'traite' ? 'active' : 'pending'}`}
              >
                {m.statut === 'traite' ? 'Traité' : 'À traiter'}
              </span>
            </div>
            <div className="who">
              <span className="av av-lg av-photo">{m.ini}</span>
              <div className="who-t">
                <b>{m.nom}</b>
                {m.qui && <span className="small muted">{m.qui}</span>}
                <span className="small">
                  {m.telephone && <span className="mono">{m.telephone}</span>}
                  {m.telephone && m.email ? ' · ' : ''}
                  {m.email}
                </span>
              </div>
              <div className="who-a">
                <span className="small muted">Transmis à</span>
                <b className="small">{m.destination}</b>
              </div>
            </div>
            <div className="bubble in">
              <p className="xs muted">
                {m.nom} · {m.recu}
              </p>
              {m.typePartenariat && (
                <p className="small">Type de partenariat : {m.typePartenariat}</p>
              )}
              <p style={{ whiteSpace: 'pre-line' }}>{m.message}</p>
            </div>
            {m.notes.map((n, i) => (
              <div className="bubble note" key={`n${i}`}>
                <p className="xs muted">
                  Note interne · {n.qui}
                  {n.quand ? `, ${n.quand.toLowerCase()}` : ''}
                </p>
                <p>{n.texte}</p>
              </div>
            ))}
            {m.reponses.map((x, i) => (
              <div className="bubble out" key={`r${i}`}>
                <p className="xs muted">
                  {x.qui} · {x.quand.toLowerCase()} · par {x.canal}
                </p>
                <p style={{ whiteSpace: 'pre-line' }}>{x.texte}</p>
              </div>
            ))}
            {m.statut !== 'traite' ? (
              <div className="composer">
                <div className="row between">
                  <p className="h3">Répondre</p>
                  <div className="chips">
                    {(['email', 'whatsapp'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`chip${canal === c ? ' is-on' : ''}`}
                        aria-pressed={canal === c}
                        onClick={() => setCanal(c)}
                      >
                        {c === 'email' ? 'E-mail' : 'WhatsApp'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rec-field">
                  <label htmlFor="bb-mto">À</label>
                  <input
                    id="bb-mto"
                    className="rec-input"
                    type="text"
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                  />
                </div>
                {reponsesTypes.length > 0 && (
                  <div className="rec-field">
                    <label htmlFor="bb-mmod">Réponse type</label>
                    <select
                      id="bb-mmod"
                      className="rec-input"
                      value={modele}
                      onChange={(e) => {
                        setModele(e.target.value)
                        const t = reponsesTypes.find((r) => r.titre === e.target.value)
                        if (t) setTexte(remplir(t.texte, m))
                      }}
                    >
                      {reponsesTypes.map((r) => (
                        <option key={r.titre}>{r.titre}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="rec-field">
                  <label htmlFor="bb-mrep">Message</label>
                  <textarea
                    id="bb-mrep"
                    className="rec-input conv-ta"
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                  />
                </div>
                <label className="check-inline">
                  <input
                    type="checkbox"
                    checked={traiter}
                    onChange={(e) => setTraiter(e.target.checked)}
                  />{' '}
                  Marquer comme traité après l’envoi
                </label>
                <div className="rec-row">
                  <button
                    type="button"
                    className="rec-btn rec-btn--primary"
                    onClick={envoyer}
                    disabled={occupe || !texte.trim() || !dest.trim()}
                  >
                    Envoyer la réponse
                  </button>
                  <button
                    type="button"
                    className="rec-btn rec-btn--secondary"
                    onClick={() => setPanneau(panneau === 'transmettre' ? '' : 'transmettre')}
                  >
                    Transmettre
                  </button>
                  <button
                    type="button"
                    className="linkbtn"
                    onClick={() => setPanneau(panneau === 'note' ? '' : 'note')}
                  >
                    Ajouter une note interne
                  </button>
                </div>
                {panneau === 'transmettre' && (
                  <div className="blk">
                    <div className="rec-field">
                      <label htmlFor="bb-mfw">Transmettre à</label>
                      <select
                        id="bb-mfw"
                        className="rec-input"
                        value={destT}
                        onChange={(e) => setDestT(e.target.value)}
                      >
                        {transmettre.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="rec-field">
                      <label htmlFor="bb-mfw-mot">Un mot pour la personne (facultatif)</label>
                      <input
                        id="bb-mfw-mot"
                        className="rec-input"
                        type="text"
                        value={mot}
                        onChange={(e) => setMot(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="rec-btn rec-btn--secondary"
                      style={{ width: 'max-content' }}
                      disabled={occupe}
                      onClick={() => {
                        void agir(
                          () => post(m.id, 'transmettre', { destination: destT, mot }),
                          'Message transmis avec l’historique.',
                        )
                        setMot('')
                        setPanneau('')
                      }}
                    >
                      Transmettre avec l’historique
                    </button>
                  </div>
                )}
                {panneau === 'note' && (
                  <div className="blk">
                    <div className="rec-field">
                      <label htmlFor="bb-mn">Note visible de l’équipe seulement</label>
                      <textarea
                        id="bb-mn"
                        className="rec-input"
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
                        void agir(() => post(m.id, 'note', { texte: note }), 'Note enregistrée.')
                        setNote('')
                        setPanneau('')
                      }}
                    >
                      Enregistrer la note
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rec-row">
                <button
                  type="button"
                  className="rec-btn rec-btn--secondary"
                  disabled={occupe}
                  onClick={() =>
                    void agir(
                      () => post(m.id, 'statut', { statut: 'a-traiter' }),
                      'Conversation rouverte.',
                    )
                  }
                >
                  Rouvrir la conversation
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  )
}
