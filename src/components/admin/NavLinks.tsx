'use client'
import { Link, useNav } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

export type ResolvedItem = {
  label: string
  href: string
  badge?: string
  exact?: boolean
  match?: string[]
}
export type ResolvedGroup = { label: string; items: ResolvedItem[] }

const REFRESH_MS = 60_000

export const NavLinks = ({
  groups,
  adminRoute,
  initialBadges = {},
}: {
  groups: ResolvedGroup[]
  adminRoute: string
  /** Compteurs calculés au rendu serveur, puis rafraîchis toutes les 60 secondes. */
  initialBadges?: Record<string, number>
}) => {
  const pathname = usePathname()
  const [badges, setBadges] = useState<Record<string, number>>(initialBadges)
  const { setNavOpen, hydrated } = useNav()

  // Payload replie le menu jusqu'à 1440 px ; la maquette le garde ouvert sur ordinateur (au-dessus de 1024 px).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)')
    const apply = () => mq.matches && setNavOpen(true)
    if (!hydrated) return
    const t = setTimeout(apply, 50)
    mq.addEventListener('change', apply)
    return () => {
      clearTimeout(t)
      mq.removeEventListener('change', apply)
    }
  }, [setNavOpen, hydrated])

  useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/admin-badges', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => alive && b && setBadges(b as Record<string, number>))
        .catch(() => {})
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  const isOn = (it: ResolvedItem) =>
    it.exact
      ? pathname === adminRoute || pathname === `${adminRoute}/`
      : Boolean(pathname?.startsWith(it.href) || it.match?.some((m) => pathname?.startsWith(m)))

  return (
    <div className="rec-nav__groups">
      {groups.map((g) => (
        <div className="rec-nav__group" key={g.label}>
          <p className="rec-nav__title">{g.label}</p>
          {g.items.map((it) => {
            const n = it.badge ? badges[it.badge] : 0
            const on = isOn(it)
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`rec-nav__item${on ? ' is-on' : ''}`}
                aria-current={on ? 'page' : undefined}
              >
                <span className="rec-nav__dot" aria-hidden="true" />
                <span className="rec-nav__label">{it.label}</span>
                {n ? (
                  <span className="rec-nav__badge" aria-label={`${n} en attente`}>
                    {n}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}
