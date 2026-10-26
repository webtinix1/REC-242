'use client'
import { Link } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import React from 'react'

import '@/styles/back-office.css'

const TABS = [
  { label: 'Pages', href: '/admin/collections/pages' },
  { label: 'Menus', href: '/admin/globals/navigation' },
  { label: 'Gouvernance et experts', href: '/admin/collections/people' },
  { label: 'FAQ', href: '/admin/collections/faq' },
  { label: 'Partenaires', href: '/admin/collections/partners' },
  { label: 'Témoignages', href: '/admin/collections/testimonials' },
  { label: 'Médias', href: '/admin/collections/media' },
  {
    label: 'Taxonomies',
    href: '/admin/collections/sectors',
    also: [
      '/admin/collections/localities',
      '/admin/collections/eventTypes',
      '/admin/collections/expertiseTags',
    ],
  },
]

const TAXO = [
  { label: 'Secteurs', href: '/admin/collections/sectors' },
  { label: 'Localités', href: '/admin/collections/localities' },
  { label: 'Types d’événements', href: '/admin/collections/eventTypes' },
  { label: 'Étiquettes d’expertise', href: '/admin/collections/expertiseTags' },
]

/** Barre d'onglets commune aux listes de l'écran « Pages, menus et médias » (écran 14). */
export const ContenusTabs = () => {
  const pathname = usePathname() || ''
  const on = (t: { href: string; also?: string[] }) =>
    pathname.startsWith(t.href) || Boolean(t.also?.some((a) => pathname.startsWith(a)))
  const inTaxo = TAXO.some((t) => pathname.startsWith(t.href))
  return (
    <div className='bb rec-bloc rec-onglets'>
      <nav className='tabs' aria-label='Contenus'>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`tab${on(t) ? ' is-on' : ''}`}
            aria-current={on(t) ? 'page' : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {inTaxo && (
        <div className='chips'>
          {TAXO.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`chip${pathname.startsWith(t.href) ? ' is-on' : ''}`}
              aria-current={pathname.startsWith(t.href) ? 'page' : undefined}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
