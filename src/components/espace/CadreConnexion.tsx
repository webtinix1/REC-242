import Link from 'next/link'
import React from 'react'

/** Écran de connexion autonome : illustration du cercle à gauche, formulaire à droite (écran 01). */
export function CadreConnexion({ children }: { children: React.ReactNode }) {
  return (
    <div className="login">
      <div className="login-art">
        <Link className="plate" href="/" aria-label="Retour au site REC 242">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-site-327.webp" srcSet="/images/logo-site-327.webp 327w, /images/logo-site-490.webp 490w" sizes="164px" alt="REC 242" width={327} height={96} style={{ height: 40, width: 'auto' }} />
        </Link>
        <div className="orbit" aria-hidden="true">
          <span className="o o1" />
          <span className="o o2" />
          <span className="o o3" />
          <span className="o o4" />
          <span className="o o5" />
          <div className="core">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/espace-membre-cercle.webp" alt="" />
          </div>
        </div>
        <div className="stack-s art-text">
          <p className="h2">Votre espace dans le cercle</p>
          <p className="muted">
            Votre fiche, vos rendez-vous, votre cotisation et les opportunités réservées aux membres, au même endroit.
          </p>
        </div>
      </div>
      <div className="login-main">
        <div className="login-box">
          {children}
          <Link className="linkbtn" href="/">
            ← Retour au site
          </Link>
        </div>
      </div>
    </div>
  )
}
