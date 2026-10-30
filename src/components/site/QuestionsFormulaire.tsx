import React from 'react'

import { cleChamp, type QuestionAffichee } from '@/lib/evenements/formulaire'

const Etoile = ({ q }: { q: QuestionAffichee }) => (q.obligatoire ? <span aria-hidden="true"> *</span> : null)

const Aide = ({ q, id, extra }: { q: QuestionAffichee; id: string; extra?: string }) =>
  q.aide || extra ? (
    <span className="rec-help" id={`${id}-a`}>
      {[q.aide, extra].filter(Boolean).join(' ')}
    </span>
  ) : null

const Erreur = ({ id, texte }: { id: string; texte?: string }) =>
  texte ? (
    <span className="rec-error" id={`${id}-e`}>
      {texte}
    </span>
  ) : null

/** Une question ajoutée par l'équipe. La saisie reste en place en cas d'erreur (formulaire non contrôlé, jamais réinitialisé). */
function Question({ q, erreur }: { q: QuestionAffichee; erreur?: string }) {
  const nom = cleChamp(q.id)
  const id = `b-ev-${nom}`
  const fichier = q.type === 'fichier'
  const aDesAides = Boolean(q.aide || fichier)
  const decrit = [aDesAides ? `${id}-a` : '', erreur ? `${id}-e` : ''].filter(Boolean).join(' ') || undefined
  const communs = { id, name: nom, 'aria-invalid': Boolean(erreur), 'aria-required': q.obligatoire, 'aria-describedby': decrit }

  if (q.type === 'choix-unique' || q.type === 'choix-multiple') {
    const multiple = q.type === 'choix-multiple'
    return (
      <fieldset className={`fs q-groupe${erreur ? ' rec-field--error-true' : ''}`} aria-describedby={decrit}>
        <legend>
          {q.libelle}
          <Etoile q={q} />
        </legend>
        <Aide q={q} id={id} />
        {q.options.map((o, i) => (
          <label className="q-choix" key={o}>
            <input type={multiple ? 'checkbox' : 'radio'} name={nom} value={o} id={`${id}-${i}`} />
            <span>{o}</span>
          </label>
        ))}
        <Erreur id={id} texte={erreur} />
      </fieldset>
    )
  }
  if (q.type === 'case')
    return (
      <div className={`q-groupe${erreur ? ' rec-field--error-true' : ''}`}>
        <label className="q-choix">
          <input type="checkbox" value="Oui" {...communs} />
          <span>
            {q.libelle}
            <Etoile q={q} />
          </span>
        </label>
        <Aide q={q} id={id} />
        <Erreur id={id} texte={erreur} />
      </div>
    )
  return (
    <div className={`rec-field${erreur ? ' rec-field--error-true' : ''}`}>
      <label htmlFor={id}>
        {q.libelle}
        <Etoile q={q} />
      </label>
      {q.type === 'paragraphe' ? (
        <textarea className="rec-input" maxLength={3000} {...communs} />
      ) : q.type === 'liste' ? (
        <select className="rec-input" defaultValue="" {...communs}>
          <option value="">Choisir</option>
          {q.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : fichier ? (
        <input className="rec-input" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ paddingTop: 10 }} {...communs} />
      ) : (
        <input
          className="rec-input"
          type={q.type === 'date' ? 'date' : q.type === 'email' ? 'email' : q.type === 'telephone' ? 'tel' : 'text'}
          inputMode={q.type === 'nombre' ? 'decimal' : undefined}
          {...communs}
        />
      )}
      <Aide q={q} id={id} extra={fichier ? 'PDF, JPG ou PNG, 5 Mo maximum.' : undefined} />
      <Erreur id={id} texte={erreur} />
    </div>
  )
}

/** Questions ajoutées par l'équipe au formulaire d'inscription d'un événement. */
export function QuestionsFormulaire({ questions, erreurs }: { questions: QuestionAffichee[]; erreurs?: Record<string, string> }) {
  if (!questions.length) return null
  return (
    <>
      {questions.some((q) => q.obligatoire) && <p className="small muted">* Réponse obligatoire</p>}
      {questions.map((q) => (
        <Question key={q.id} q={q} erreur={erreurs?.[cleChamp(q.id)]} />
      ))}
    </>
  )
}
