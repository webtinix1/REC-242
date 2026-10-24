'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const RESEAU = [
  ['/le-reseau', 'Qui sommes-nous'],
  ['/le-reseau/gouvernance', 'Gouvernance'],
  ['/le-reseau/commissions', 'Commissions'],
  ['/le-reseau/antennes', 'Antennes'],
  ['/le-reseau/ecosysteme', 'Notre écosystème'],
  ['/le-reseau/partenaires', 'Partenaires'],
  ['/formalisation', 'Formalisation'],
]

/** Sous-navigation de la rubrique « Le réseau ». */
export const SubNav = () => {
  const p = usePathname()
  return (
    <nav className="chips subnav" aria-label="Rubrique Le réseau">
      {RESEAU.map(([href, label]) => (
        <Link key={href} href={href} className={`chip${p === href ? ' is-on' : ''}`} aria-current={p === href ? 'page' : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  )
}
