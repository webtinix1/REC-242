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

const GOUVERNANCE = '/le-reseau/gouvernance'

/** Sous-navigation de la rubrique « Le réseau ». */
export const SubNav = () => {
  const p = usePathname()
  return (
    <nav className="chips subnav" aria-label="Rubrique Le réseau">
      {RESEAU.map(([href, label]) => (
        <Link prefetch={false}
          key={href}
          href={href}
          className={`chip${p === href || (href === GOUVERNANCE && p.startsWith(`${href}/`)) ? ' is-on' : ''}`}
          aria-current={p === href ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
