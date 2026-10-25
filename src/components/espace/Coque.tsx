'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState } from 'react'

import { Icone } from './Icones'

export type Moi = {
  nom: string
  ini: string
  photo?: string
  logo?: string
  entreprise?: string
  categorie: string
  numero?: string
  statut: string
}

/**
 * Rubriques de l'espace membre, dans l'ordre de la maquette. Seules celles déjà livrées sont affichées ;
 * les autres arrivent avec leur lot (docs/10-plan-de-developpement.md).
 */
const NAV = [
  { href: '/espace-membre', label: 'Accueil', icon: 'home', pret: true },
  { href: '/espace-membre/evenements', label: 'Mes événements', icon: 'calendar', pret: true },
  { href: '/espace-membre/opportunites', label: 'Opportunités', icon: 'briefcase', pret: false },
  { href: '/espace-membre/annuaire', label: 'Annuaire', icon: 'users', pret: true },
  { href: '/espace-membre/experts', label: 'Experts', icon: 'spark', pret: false },
  { href: '/espace-membre/echanges', label: 'Mes échanges', icon: 'chat', pret: false },
  { href: '/espace-membre/cotisation', label: 'Cotisation', icon: 'wallet', pret: false },
  { href: '/espace-membre/documents', label: 'Documents', icon: 'file', pret: false },
  { href: '/espace-membre/carte', label: 'Ma carte', icon: 'card', pret: true },
  { href: '/espace-membre/profil', label: 'Mon profil', icon: 'user', pret: true },
].filter((n) => n.pret)

const TABS = [
  { href: '/espace-membre', label: 'Accueil', icon: 'home', pret: true },
  { href: '/espace-membre/evenements', label: 'Événements', icon: 'calendar', pret: true },
  { href: '/espace-membre/opportunites', label: 'Opportunités', icon: 'briefcase', pret: false },
  { href: '/espace-membre/annuaire', label: 'Annuaire', icon: 'users', pret: true },
  { href: '/espace-membre/profil', label: 'Moi', icon: 'user', pret: true },
].filter((n) => n.pret)

const PLUS = [
  { href: '/espace-membre/cotisation', label: 'Cotisation et paiements', pret: false },
  { href: '/espace-membre/documents', label: 'Documents du réseau', pret: false },
  { href: '/espace-membre/carte', label: 'Ma carte de membre', pret: true },
  { href: '/espace-membre/profil', label: 'Mon profil', pret: true },
].filter((n) => n.pret)

const actif = (chemin: string, href: string) => (href === '/espace-membre' ? chemin === href : chemin.startsWith(href))

function Avatar({ moi, className = '' }: { moi: Moi; className?: string }) {
  return (
    <span className={`av ${moi.photo ? 'av-photo' : ''} ${className}`}>
      {moi.ini}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {moi.photo && <img src={moi.photo} alt={moi.nom} />}
    </span>
  )
}

export function Coque({ moi, deconnexion, children }: { moi: Moi; deconnexion: () => Promise<void>; children: React.ReactNode }) {
  const chemin = usePathname()
  const [menu, setMenu] = useState(false)
  return (
    <>
      <div className="topbar">
        <Link className="plate" href="/" aria-label="Retour au site REC 242">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-rec242-328.webp" alt="REC 242" width={103} height={30} />
        </Link>
        <button type="button" className="me-btn" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-label="Ouvrir le menu de mon espace">
          <Avatar moi={moi} />
          Mon espace
        </button>
      </div>
      <div className="shell">
        <aside className="side" aria-label="Menu de l'espace membre">
          <div className="side-in">
            <div className="plate">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-rec242-328.webp" alt="REC 242" width={116} height={34} />
            </div>
            <div className="me">
              <div className="av-wrap">
                <Avatar moi={moi} className="av-lg" />
                <span className="dot-s" aria-hidden="true" />
              </div>
              <b>{moi.nom}</b>
              <span className="side-ent">
                {moi.logo && (
                  <span className="logo-tile logo-tile-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={moi.logo} alt={`Logo ${moi.entreprise ?? ''}`} />
                  </span>
                )}
                <span className="small" style={{ color: '#cfe5d8' }}>
                  {moi.entreprise} · catégorie {moi.categorie}
                </span>
              </span>
              <span className="mono">{moi.numero}</span>
              <span className="st">{moi.statut}</span>
            </div>
            <nav className="nav" aria-label="Rubriques">
              {NAV.map((n) => {
                const on = actif(chemin, n.href)
                return (
                  <Link key={n.href} href={n.href} className={`nav-i ico-${n.icon} ${on ? 'is-on' : ''}`} aria-current={on ? 'page' : undefined}>
                    <Icone nom={n.icon} className={`i-${n.icon}`} />
                    <span>{n.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="side-foot">
              <Link href="/">
                <Icone nom="back" className="ic" />
                Retour au site
              </Link>
              <form action={deconnexion}>
                <button type="submit">
                  <Icone nom="logout" className="ic" />
                  Se déconnecter
                </button>
              </form>
            </div>
          </div>
        </aside>
        <main className="main" id="contenu">
          {children}
        </main>
      </div>

      <div className={`sheet-wrap open-${menu}`}>
        <nav className="sheet" aria-label="Menu de mon espace">
          <div className="row" style={{ padding: '4px 4px 10px' }}>
            <Avatar moi={moi} />
            <div className="grow">
              <p style={{ fontWeight: 700 }}>{moi.nom}</p>
              <p className="xs muted mono">{moi.numero}</p>
            </div>
            <span className="st">{moi.statut}</span>
          </div>
          {PLUS.map((p) => (
            <Link key={p.href} className="sl" href={p.href} onClick={() => setMenu(false)}>
              {p.label}
              <span aria-hidden="true">→</span>
            </Link>
          ))}
          <Link className="sl" href="/">
            Retour au site<span aria-hidden="true">→</span>
          </Link>
          <form action={deconnexion}>
            <button type="submit" className="sl">
              Se déconnecter<span aria-hidden="true">→</span>
            </button>
          </form>
          <button type="button" className="sl" style={{ justifyContent: 'center', background: 'none' }} onClick={() => setMenu(false)}>
            Fermer
          </button>
        </nav>
      </div>

      <nav className="tabbar" aria-label="Navigation de l'espace membre" style={{ gridTemplateColumns: `repeat(${TABS.length},minmax(0,1fr))` }}>
        {TABS.map((t) => {
          const on = actif(chemin, t.href) || (t.label === 'Moi' && ['/espace-membre/carte', '/espace-membre/cotisation', '/espace-membre/documents'].some((h) => chemin.startsWith(h)))
          return (
            <Link key={t.href} href={t.href} className={`tab t-${t.label} ${on ? 'is-on' : ''}`} aria-current={on ? 'page' : undefined}>
              <Icone nom={t.icon} className={`i-${t.icon}`} />
              <span>{t.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
