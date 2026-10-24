import Link from 'next/link'
import React from 'react'

import { getNavigation, linkHref } from '@/lib/site/settings'
import { NavPills } from './NavPills'

/** En-tête du site (captures/site, haut de chaque page). */
export const Header = async () => {
  const nav = await getNavigation()
  const items = (nav.principal ?? []).map((n) => ({ libelle: n.libelle, href: linkHref(n), sous: (n.sousMenu ?? []).map(linkHref) }))
  return (
    <header className="head">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="REC 242, retour à l'accueil">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-rec242.jpg" alt="REC 242, Réseau des Entrepreneurs Congolais" width={164} height={48} />
        </Link>
        <NavPills items={items} />
        <div className="head-actions">
          <Link href="/recherche" className="iconbtn" aria-label="Rechercher sur le site">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
          </Link>
          <Link className="iconbtn acct-link" href="/espace-membre" aria-label="Espace membre, se connecter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
            <span className="only-d">Espace membre</span>
          </Link>
          <Link className="rec-btn rec-btn--primary" href="/adherer/candidature">
            Adhérer
          </Link>
        </div>
      </div>
    </header>
  )
}
