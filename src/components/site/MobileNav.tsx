'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState } from 'react'

type Item = { libelle: string; href: string }

const Ico = ({ d }: { d: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)

/** Barre d'onglets et menu plein écran du mobile. */
export const MobileNav = ({ items, whatsapp }: { items: Item[]; whatsapp?: string }) => {
  const pathname = usePathname() || '/'
  const [openOn, setOpenOn] = useState<string | null>(null)
  // Le menu se referme quand on change de page : il n'est ouvert que pour l'adresse où on l'a ouvert.
  const open = openOn === pathname
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null)
  const on = (p: string) => (!open && (p === '/' ? pathname === '/' : pathname.startsWith(p)) ? ' is-on' : '')

  return (
    <>
      {open && (
        <div className="only-m sheet-wrap">
          <nav className="sheet" aria-label="Menu">
            <Link className="sl sl-search" href="/recherche">
              Rechercher sur le site<span aria-hidden="true">→</span>
            </Link>
            {items.map((n) => (
              <Link key={n.href} className="sl" href={n.href}>
                {n.libelle}
                <span aria-hidden="true">→</span>
              </Link>
            ))}
            <Link className="sl" href="/presse">
              Presse<span aria-hidden="true">→</span>
            </Link>
            <Link className="sl" href="/espace-membre">
              Espace membre<span aria-hidden="true">→</span>
            </Link>
            <button type="button" className="sl sl-close" onClick={() => setOpen(false)}>
              Fermer le menu
            </button>
          </nav>
        </div>
      )}
      <nav className="tabbar" aria-label="Navigation mobile">
        <a className="wa" aria-label="Écrire sur WhatsApp" href={whatsapp || '/contact'}>
          <Ico d={<><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z" /></>} />
        </a>
        <Link className={`tab${on('/')}`} href="/">
          <Ico d={<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>} />
          Accueil
        </Link>
        <Link className={`tab${on('/agenda')}`} href="/agenda">
          <Ico d={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>} />
          Agenda
        </Link>
        <Link className={`tab tab-cta${on('/adherer')}`} href="/adherer">
          <span className="tab-disc">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 6v12M6 12h12" />
            </svg>
          </span>
          Adhérer
        </Link>
        <Link className={`tab${on('/membres')}`} href="/membres">
          <Ico d={<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.5 0 4 1.5 4.5 4" /></>} />
          Membres
        </Link>
        <button type="button" className={`tab${open ? ' is-on' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Ouvrir ou fermer le menu">
          <Ico d={<path d="M4 7h16M4 12h16M4 17h16" />} />
          Menu
        </button>
      </nav>
    </>
  )
}
