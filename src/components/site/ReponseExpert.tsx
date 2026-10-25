'use client'
import React, { useActionState } from 'react'

import type { EtatEchange } from '@/lib/echanges/actions'

/** Formulaire « Votre réponse » de la personne sollicitée (lien de l'e-mail 14). */
export const ReponseExpert = ({ jeton, action }: { jeton: string; action: (r: EtatEchange, f: FormData) => Promise<EtatEchange> }) => {
  const [etat, agir, enCours] = useActionState(action, {})
  if (etat.ok)
    return (
      <div className="okbox" role="status">
        <span className="rec-badge rec-badge--active">Réponse envoyée</span>
        <p className="small">Merci. Votre réponse a été transmise au membre, qui sera prévenu.</p>
      </div>
    )
  return (
    <form className="card stack-s" action={agir} noValidate>
      <h2 className="h-s">Votre réponse</h2>
      <input type="hidden" name="jeton" value={jeton} />
      <div className={`rec-field${etat.erreurs?.reponse ? ' rec-field--error-true' : ''}`}>
        <label htmlFor="exp-rep">Votre réponse</label>
        <textarea id="exp-rep" name="reponse" className="rec-input" rows={6} required aria-describedby={etat.erreurs?.reponse ? 'exp-rep-e' : undefined} />
        {etat.erreurs?.reponse && (
          <span className="rec-error" id="exp-rep-e">
            {etat.erreurs.reponse}
          </span>
        )}
      </div>
      {etat.erreur && (
        <div className="errbox" role="alert">
          {etat.erreur}
        </div>
      )}
      <button type="submit" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} disabled={enCours}>
        Envoyer ma réponse
      </button>
    </form>
  )
}
