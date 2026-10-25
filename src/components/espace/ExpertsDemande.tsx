'use client'

import React, { useState, useTransition } from 'react'

import type { EtatEchange } from '@/lib/echanges/actions'
import { Toast } from '@/components/site/Toast'

export type PersonneExpert = { id: number; nom: string; ini: string; photo?: string; fonction: string; role: string; tags: string[] }

const PREFS = [
  { v: 'whatsapp', l: 'WhatsApp', apres: 'WhatsApp' },
  { v: 'email', l: 'E-mail', apres: 'e-mail' },
  { v: 'siege', l: 'Rendez-vous au siège', apres: 'un rendez-vous au siège' },
] as const

/** Étapes 2 et 3 de « Solliciter un expert » (écran 09) : personne à solliciter puis demande. */
export function ExpertsDemande({
  tag,
  personnes,
  opportunite,
  action,
}: {
  tag: { id: number; nom: string }
  personnes: PersonneExpert[]
  opportunite?: { id: number; titre: string }
  action: (r: EtatEchange, f: FormData) => Promise<EtatEchange>
}) {
  const [choix, setChoix] = useState(personnes[0]?.id)
  const [pref, setPref] = useState<(typeof PREFS)[number]['v']>('whatsapp')
  const [etat, setEtat] = useState<EtatEchange>({})
  const [enCours, demarrer] = useTransition()
  const [message, setMessage] = useState('')
  const [envoye, setEnvoye] = useState<{ nom: string; apres: string } | null>(null)
  const [essai, setEssai] = useState(0)
  const sel = personnes.find((p) => p.id === choix) ?? personnes[0]
  const agir = (f: FormData) =>
    demarrer(async () => {
      const r = await action({}, f)
      setEtat(r)
      if (r.ok) {
        setMessage('Demande transmise.')
        setEnvoye({ nom: sel?.nom ?? '', apres: PREFS.find((p) => p.v === pref)?.apres ?? '' })
        setEssai((n) => n + 1)
      } else if (r.erreur) setMessage(r.erreur)
    })

  return (
    <div className="split">
      <div className="card">
        <div className="row between">
          <h2 className="h3">2. La personne à solliciter</h2>
          <span className="xs muted">
            {personnes.length} pour #{tag.nom}
          </span>
        </div>
        {personnes.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`item xitem ${sel?.id === p.id ? 'is-on' : ''}`}
            aria-pressed={sel?.id === p.id}
            onClick={() => {
              setChoix(p.id)
              setEnvoye(null)
            }}
          >
            <span className="av av-photo">
              {p.ini}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.photo && <img src={p.photo} alt="" />}
            </span>
            <span className="grow">
              <b>{p.nom}</b>
              <span className="xs muted" style={{ display: 'block' }}>
                {p.fonction}
              </span>
              <span className="xtags">
                {p.tags.map((t) => (
                  <span className="xtag" key={t}>
                    #{t}
                  </span>
                ))}
              </span>
            </span>
            <span className="tag vis-m">{p.role}</span>
          </button>
        ))}
      </div>
      <div className="card">
        <h2 className="h3">3. Votre demande</h2>
        {sel && (
          <form key={essai} className="stack-s" action={agir} noValidate>
            <input type="hidden" name="etiquette" value={tag.id} />
            <input type="hidden" name="personne" value={sel.id} />
            <input type="hidden" name="preference" value={pref} />
            {opportunite && <input type="hidden" name="opportunite" value={opportunite.id} />}
            <p className="small">
              Pour : <b>{sel.nom}</b>
            </p>
            <div className={`rec-field${etat.erreurs?.question ? ' rec-field--error' : ''}`}>
              <label htmlFor="mb-xq">Votre question</label>
              <textarea
                id="mb-xq"
                name="question"
                className="rec-input"
                placeholder="Décrivez votre situation en quelques lignes"
                defaultValue={opportunite ? `Opportunité : ${opportunite.titre}\n` : ''}
                required
              />
              {etat.erreurs?.question && <span className="rec-error">{etat.erreurs.question}</span>}
            </div>
            <p className="small" style={{ fontWeight: 600 }} id="mb-xp-l">
              Je préfère une réponse
            </p>
            <div className="chips" role="radiogroup" aria-labelledby="mb-xp-l">
              {PREFS.map((x) => (
                <button key={x.v} type="button" role="radio" aria-checked={pref === x.v} className={`chip ${pref === x.v ? 'is-on' : ''}`} onClick={() => setPref(x.v)}>
                  {x.l}
                </button>
              ))}
            </div>
            {etat.erreur && (
              <p className="erreur" role="alert">
                {etat.erreur}
              </p>
            )}
            <button type="submit" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} disabled={enCours}>
              Envoyer ma demande
            </button>
            <p className="xs muted">Réponse habituelle sous 5 jours ouvrés. Un premier avis est gratuit pour les membres actifs.</p>
          </form>
        )}
        {envoye && (
          <div className="okbox" role="status">
            <span className="rec-badge rec-badge--active">Demande transmise</span>
            <p className="small">
              {envoye.nom} a reçu votre question. Vous serez prévenu(e) par {envoye.apres}. Suivez la réponse ci-dessous.
            </p>
          </div>
        )}
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  )
}
