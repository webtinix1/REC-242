'use client'

import Link from 'next/link'
import React, { useActionState, useState } from 'react'

import { repondreOpportunite } from '@/lib/opportunites/actions'

export type CarteOpportunite = {
  id: number
  image?: string
  imageAlt?: string
  type: string
  visibilite: string
  bientot: boolean
  titre: string
  secteur: string
  source: string
  limite: string
  description: string
  commentRepondre?: string
  pieceJointe?: { nom: string; url: string }
  lienOfficiel?: string
  aider: boolean
  peutRepondre: boolean
}

/** Carte d'opportunité (écran membre 05) : détail, réponse à l'auteur, avis officiel. */
export function OpportuniteCarte({ o }: { o: CarteOpportunite }) {
  const [detail, setDetail] = useState(false)
  const [repond, setRepond] = useState(false)
  const [etat, envoyer, enCours] = useActionState(repondreOpportunite, {})
  return (
    <div className="card">
      {o.image && (
        <span className="pick oppimg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={o.image} alt={o.imageAlt ?? ''} />
        </span>
      )}
      <div className="row between">
        <span className="tag">{o.type}</span>
        <span className="row" style={{ gap: 6 }}>
          <span className="tag vis-m">{o.visibilite}</span>
          {o.bientot && <span className="tag soon">Expire bientôt</span>}
        </span>
      </div>
      <h2 className="h3">{o.titre}</h2>
      <p className="small muted">
        {o.secteur} · {o.source}
      </p>
      <p className="small">
        Date limite : <b>{o.limite}</b>
      </p>
      <button type="button" className="linkbtn" aria-expanded={detail} onClick={() => setDetail((v) => !v)}>
        {detail ? 'Masquer le détail' : 'Voir le détail'}
      </button>
      {detail && (
        <div className="odet">
          <p className="small" style={{ whiteSpace: 'pre-line' }}>
            {o.description}
          </p>
          {o.pieceJointe && (
            <p className="small">
              <a className="linkbtn" href={o.pieceJointe.url} target="_blank" rel="noopener noreferrer">
                Pièce jointe : {o.pieceJointe.nom}
              </a>
            </p>
          )}
          {o.commentRepondre && <p className="xs muted">{o.commentRepondre}</p>}
        </div>
      )}
      {repond && !etat.ok && (
        <form className="blk" action={envoyer} noValidate>
          <input type="hidden" name="opportunite" value={o.id} />
          <div className={`rec-field${etat.erreurs?.message ? ' rec-field--error' : ''}`}>
            <label htmlFor={`mb-rep-${o.id}`}>Votre réponse à l&apos;auteur</label>
            <textarea id={`mb-rep-${o.id}`} name="message" className="rec-input" required />
            {etat.erreurs?.message && <span className="rec-error">{etat.erreurs.message}</span>}
          </div>
          <div className={`rec-field${etat.erreurs?.pieceJointe ? ' rec-field--error' : ''}`}>
            <label htmlFor={`mb-pj-${o.id}`}>Joindre une présentation ou un devis (PDF, 5 Mo)</label>
            <input id={`mb-pj-${o.id}`} name="pieceJointe" type="file" className="rec-input" accept="application/pdf,image/jpeg,image/png" />
            {etat.erreurs?.pieceJointe && <span className="rec-error">{etat.erreurs.pieceJointe}</span>}
          </div>
          {etat.erreur && (
            <p className="erreur" role="alert">
              {etat.erreur}
            </p>
          )}
          <div className="row">
            <button type="submit" className="rec-btn rec-btn--primary" disabled={enCours}>
              Envoyer ma réponse
            </button>
            <button type="button" className="linkbtn" onClick={() => setRepond(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}
      {etat.ok && (
        <div className="okbox" role="status">
          <span className="rec-badge rec-badge--active">Réponse envoyée</span>
          <p className="small">Votre message est transmis à l&apos;auteur. Sa réponse arrivera dans Mes échanges.</p>
        </div>
      )}
      <div className="row">
        {o.peutRepondre && !repond && !etat.ok && (
          <button type="button" className="rec-btn rec-btn--secondary" style={{ width: 'max-content' }} onClick={() => setRepond(true)}>
            Répondre
          </button>
        )}
        {o.lienOfficiel && (
          <a className="rec-btn rec-btn--secondary" style={{ width: 'max-content' }} href={o.lienOfficiel} target="_blank" rel="noopener noreferrer">
            Consulter l&apos;avis officiel
          </a>
        )}
        {o.aider && (
          <Link className="linkbtn" href={`/espace-membre/experts?opportunite=${o.id}`}>
            Me faire aider
          </Link>
        )}
      </div>
    </div>
  )
}
