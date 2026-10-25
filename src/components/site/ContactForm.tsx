'use client'
import React, { startTransition, useActionState, useEffect, useRef, useState } from 'react'

import { envoyerContact, type EtatFormulaire } from '@/app/(site)/contact/actions'
import { Toast } from './Toast'

const MOTIFS = [
  { value: 'adhesion', label: 'Adhésion' },
  { value: 'partenariat', label: 'Partenariat' },
  { value: 'presse', label: 'Presse' },
  { value: 'evenement', label: 'Événement' },
  { value: 'autre', label: 'Autre' },
]

/**
 * Envoi sans réinitialisation du formulaire (React vide les champs après une action de formulaire) :
 * en cas d’erreur, la saisie reste en place.
 */
export const envoyer =
  (action: (f: FormData) => void) => (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    startTransition(() => action(fd))
  }

/** Champ piège invisible pour les robots (l'humain ne le voit pas et ne le remplit pas). */
export const Piege = () => (
  <div
    aria-hidden="true"
    style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}
  >
    <label htmlFor="site_web">Ne pas remplir</label>
    <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
  </div>
)

/** Formulaire de contact (écran 22) : motif en pastilles, erreurs sous les champs, focus sur le premier champ en erreur. */
export const ContactForm = ({
  jeton,
  motifInitial,
  objet,
}: {
  jeton: string
  motifInitial?: string
  objet?: string
}) => {
  const [etat, action, envoi] = useActionState<EtatFormulaire, FormData>(envoyerContact, {})
  const [motif, setMotif] = useState(
    MOTIFS.some((m) => m.value === motifInitial) ? motifInitial! : 'adhesion',
  )
  const [toastFerme, setToastFerme] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const e = etat.erreurs ?? {}
  const nbErreurs = (e.nom ? 1 : 0) + (e.telephone ? 1 : 0)

  useEffect(() => {
    const premier = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    premier?.focus()
  }, [etat])

  if (etat.ok)
    return (
      <>
        <div className="okbox">
          <span className="rec-badge rec-badge--active">Message envoyé</span>
          <p>
            Le secrétariat vous répond rapidement.
            {etat.avecEmail ? ' Une copie vous a été envoyée par e-mail.' : ''}
          </p>
        </div>
        <Toast
          message={toastFerme ? '' : 'Message envoyé. Le secrétariat vous répond rapidement.'}
          onClose={() => setToastFerme(true)}
        />
      </>
    )

  const label = MOTIFS.find((m) => m.value === motif)?.label
  return (
    <form ref={form} onSubmit={envoyer(action)} noValidate>
      <input type="hidden" name="jeton" value={jeton} />
      <input type="hidden" name="motif" value={motif} />
      {objet && <input type="hidden" name="objet" value={objet} />}
      <Piege />
      <fieldset className="fs">
        <legend className="h-s">Je vous écris pour</legend>
        <div className="chips">
          {MOTIFS.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`chip${motif === m.value ? ' is-on' : ''}`}
              aria-pressed={motif === m.value}
              onClick={() => setMotif(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>
      {nbErreurs > 0 && (
        <div className="errbox" role="alert">
          <b>{nbErreurs > 1 ? 'Deux champs sont à compléter' : 'Un champ est à compléter'}</b>
          <p>Indiquez votre nom et un moyen de vous répondre (téléphone ou e-mail).</p>
        </div>
      )}
      {etat.general && (
        <div className="errbox" role="alert">
          <p>{etat.general}</p>
        </div>
      )}
      <div className="form">
        <div className={`rec-field${e.nom ? ' rec-field--error-true' : ''}`}>
          <label htmlFor="b-c-nom">Nom et prénom</label>
          <input
            id="b-c-nom"
            name="nom"
            className="rec-input"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(e.nom)}
            aria-describedby={e.nom ? 'b-c-nom-e' : undefined}
          />
          {e.nom && (
            <span className="rec-error" id="b-c-nom-e">
              {e.nom}
            </span>
          )}
        </div>
        <div className={`rec-field${e.telephone ? ' rec-field--error-true' : ''}`}>
          <label htmlFor="b-c-tel">Téléphone</label>
          <input
            id="b-c-tel"
            name="telephone"
            className="rec-input"
            type="tel"
            placeholder="+242"
            autoComplete="tel"
            aria-invalid={Boolean(e.telephone)}
            aria-describedby={e.telephone ? 'b-c-tel-e' : undefined}
          />
          {e.telephone && (
            <span className="rec-error" id="b-c-tel-e">
              {e.telephone}
            </span>
          )}
        </div>
        <div className={`rec-field full${e.email ? ' rec-field--error-true' : ''}`}>
          <label htmlFor="b-c-mail">E-mail</label>
          <input
            id="b-c-mail"
            name="email"
            className="rec-input"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(e.email)}
          />
          {e.email && <span className="rec-error">{e.email}</span>}
        </div>
        <div className={`rec-field full${e.message ? ' rec-field--error-true' : ''}`}>
          <label htmlFor="b-c-msg">Message</label>
          <textarea
            id="b-c-msg"
            name="message"
            className="rec-input"
            aria-invalid={Boolean(e.message)}
          />
          {e.message && <span className="rec-error">{e.message}</span>}
        </div>
      </div>
      <p className="small muted">
        Votre message est transmis au bon interlocuteur selon le motif choisi ({label}).
      </p>
      <button
        type="submit"
        className="rec-btn rec-btn--primary"
        style={{ width: 'max-content' }}
        disabled={envoi}
      >
        {envoi ? 'Envoi…' : 'Envoyer'}
      </button>
    </form>
  )
}
