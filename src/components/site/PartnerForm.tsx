'use client'
import React, { useActionState, useEffect, useRef, useState } from 'react'

import { envoyerPartenariat, type EtatFormulaire } from '@/app/(site)/contact/actions'
import { envoyer, Piege } from './ContactForm'
import { Toast } from './Toast'

const TYPES = [
  'Soutien à un événement',
  'Formation et expertise',
  'Accompagnement à la formalisation',
  'Partenariat financier',
  'Autre',
]

const Champ = ({
  id,
  name,
  label,
  erreur,
  type = 'text',
  full,
  ...rest
}: {
  id: string
  name: string
  label: string
  erreur?: string
  type?: string
  full?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className={`rec-field${full ? ' full' : ''}${erreur ? ' rec-field--error-true' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <input
      id={id}
      name={name}
      className="rec-input"
      type={type}
      aria-invalid={Boolean(erreur)}
      aria-describedby={erreur ? `${id}-e` : undefined}
      {...rest}
    />
    {erreur && (
      <span className="rec-error" id={`${id}-e`}>
        {erreur}
      </span>
    )}
  </div>
)

/** Formulaire « Devenir partenaire » (écran 08). */
export const PartnerForm = ({ jeton }: { jeton: string }) => {
  const [etat, action, envoi] = useActionState<EtatFormulaire, FormData>(envoyerPartenariat, {})
  const [toastFerme, setToastFerme] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const e = etat.erreurs ?? {}

  useEffect(() => {
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [etat])

  if (etat.ok)
    return (
      <>
        <div className="okbox">
          <span className="rec-badge rec-badge--active">Proposition envoyée</span>
          <p>
            La commission Partenariats vous recontacte. Un e-mail récapitulatif vous a été envoyé.
          </p>
        </div>
        <Toast
          message={toastFerme ? '' : 'Proposition envoyée à la commission Partenariats.'}
          onClose={() => setToastFerme(true)}
        />
      </>
    )

  return (
    <form ref={form} onSubmit={envoyer(action)} noValidate>
      <input type="hidden" name="jeton" value={jeton} />
      <Piege />
      {etat.general && (
        <div className="errbox" role="alert">
          <p>{etat.general}</p>
        </div>
      )}
      <div className="form">
        <Champ
          id="b-p-org"
          name="organisation"
          label="Organisation"
          erreur={e.organisation}
          autoComplete="organization"
        />
        <Champ
          id="b-p-nom"
          name="nom"
          label="Nom et fonction du contact"
          erreur={e.nom}
          autoComplete="name"
        />
        <Champ
          id="b-p-mail"
          name="email"
          label="E-mail"
          type="email"
          erreur={e.email}
          autoComplete="email"
        />
        <Champ
          id="b-p-tel"
          name="telephone"
          label="Téléphone"
          type="tel"
          placeholder="+242"
          autoComplete="tel"
        />
        <div className="rec-field full">
          <label htmlFor="b-p-type">Type de partenariat</label>
          <select id="b-p-type" name="type" className="rec-input" defaultValue={TYPES[0]}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className={`rec-field full${e.message ? ' rec-field--error-true' : ''}`}>
          <label htmlFor="b-p-msg">Votre proposition</label>
          <textarea
            id="b-p-msg"
            name="message"
            className="rec-input"
            aria-invalid={Boolean(e.message)}
          />
          {e.message && <span className="rec-error">{e.message}</span>}
        </div>
      </div>
      <button
        type="submit"
        className="rec-btn rec-btn--primary"
        style={{ width: 'max-content' }}
        disabled={envoi}
      >
        {envoi ? 'Envoi…' : 'Envoyer la proposition'}
      </button>
    </form>
  )
}
