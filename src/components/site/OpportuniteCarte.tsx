import Link from 'next/link'
import React from 'react'

import type { OppCarte } from '@/components/site/OpportuniteDonnees'
import { dateLong } from '@/lib/site/format'

/** Carte d'opportunité : complète si publique, réduite (type et date limite) si réservée aux membres. */
export function OpportuniteCarte({ o }: { o: OppCarte }) {
  if (o.reservee) {
    return (
      <div className="card opp">
        <div className="rec-row" style={{ justifyContent: 'space-between' }}>
          <span className="rec-tag">{o.type}</span>
          <span className="vis mem">Membres</span>
        </div>
        <div className="lockbox">
          <p className="h-s blurred" aria-hidden="true">
            Opportunité réservée aux membres
          </p>
          <p className="small">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>{' '}
            Réservé aux membres. Date limite : {dateLong(o.dateLimite)}
          </p>
          <Link className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} href="/espace-membre/connexion?retour=/espace-membre/opportunites">
            Se connecter
          </Link>
        </div>
      </div>
    )
  }
  return (
    <div className="card opp">
      <div className="rec-row" style={{ justifyContent: 'space-between' }}>
        <span className="rec-tag">{o.type}</span>
        <span className="vis pub">Public</span>
      </div>
      <h2 className="h-s">{o.titre}</h2>
      <p className="small muted">
        {o.secteur} · {o.par}
      </p>
      <div className="rec-row">
        <span className="small">
          Date limite : <b>{dateLong(o.dateLimite)}</b>
        </span>
        {o.jours <= 7 && <span className="seat few">Expire bientôt</span>}
      </div>
      {o.lien ? (
        <a className="rec-btn rec-btn--secondary" style={{ width: 'max-content' }} href={o.lien} target="_blank" rel="noopener noreferrer">
          Répondre
        </a>
      ) : o.commentRepondre ? (
        <details className="opp-rep">
          <summary className="rec-btn rec-btn--secondary" style={{ width: "max-content" }}>
            Répondre
          </summary>
          <p className="small" style={{ marginTop: 10 }}>
            {o.commentRepondre}
          </p>
        </details>
      ) : null}
    </div>
  )
}
