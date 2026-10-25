'use client'

import React, { useActionState, useState } from 'react'

import type { RetourRelation } from '@/app/(espace-membre)/espace-membre/(app)/annuaire/actions'

type Act = (r: RetourRelation, f: FormData) => Promise<RetourRelation>

/** Carte « Mise en relation » et signalement de la fiche (écran membre 08). */
export function AnnuaireRelation({
  entreprise,
  nom,
  soiMeme,
  demander,
  signaler,
}: {
  entreprise: number
  nom: string
  soiMeme: boolean
  demander: Act
  signaler: Act
}) {
  const [rel, envoyer, relEnCours] = useActionState(demander, {})
  const [sig, signalerAction, sigEnCours] = useActionState(signaler, {})
  const [ouvert, setOuvert] = useState(false)
  if (soiMeme) return null
  return (
    <div className="stack">
      <div className="card-soft">
        <h2 className="h3">Mise en relation</h2>
        {rel.ok ? (
          <div className="okbox" role="status">
            <span className="rec-badge rec-badge--active">Demande envoyée</span>
            <p className="small">{nom} a reçu votre demande. Vous serez prévenu de sa réponse par e-mail.</p>
          </div>
        ) : (
          <form className="stack-s" action={envoyer} noValidate>
            <p className="small muted">Le membre reçoit votre demande et choisit d&apos;y répondre.</p>
            <input type="hidden" name="entreprise" value={entreprise} />
            <div className={`rec-field${rel.erreurs?.message ? ' rec-field--error' : ''}`}>
              <label htmlFor="mb-rel">Votre message</label>
              <textarea id="mb-rel" name="message" className="rec-input" placeholder="Présentez-vous et dites ce que vous cherchez" required />
              {rel.erreurs?.message && (
                <span id="mb-rel-err" className="rec-error">
                  {rel.erreurs.message}
                </span>
              )}
            </div>
            {rel.erreur && (
              <p className="erreur" role="alert">
                {rel.erreur}
              </p>
            )}
            <button type="submit" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} disabled={relEnCours}>
              Demander une mise en relation
            </button>
          </form>
        )}
      </div>
      <div className="stack-s">
        {sig.ok ? (
          <div className="okbox" role="status">
            <span className="rec-badge rec-badge--active">Signalement envoyé</span>
            <p className="small">Merci, le responsable membres examinera cette fiche.</p>
          </div>
        ) : (
          <>
            <button type="button" className="linkbtn" aria-expanded={ouvert} onClick={() => setOuvert((v) => !v)}>
              Signaler cette fiche
            </button>
            {ouvert && (
              <form className="stack-s" action={signalerAction} noValidate>
                <input type="hidden" name="entreprise" value={entreprise} />
                <div className={`rec-field${sig.erreurs?.message ? ' rec-field--error' : ''}`}>
                  <label htmlFor="mb-sig">Ce qui pose problème</label>
                  <textarea id="mb-sig" name="motif" className="rec-input" required />
                  {sig.erreurs?.message && (
                    <span id="mb-sig-err" className="rec-error">
                      {sig.erreurs.message}
                    </span>
                  )}
                </div>
                {sig.erreur && (
                  <p className="erreur" role="alert">
                    {sig.erreur}
                  </p>
                )}
                <button type="submit" className="rec-btn rec-btn--secondary" style={{ width: 'max-content' }} disabled={sigEnCours}>
                  Envoyer le signalement
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
