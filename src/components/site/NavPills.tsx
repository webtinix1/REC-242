'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

type Item = { libelle: string; href: string; sous: string[] }

/** Une entrée est active si l'adresse courante commence par son lien ou par l'un de ses sous-liens. */
export const isActive = (pathname: string, it: Item): boolean => {
  const all = [it.href, ...it.sous].filter((h) => h && h !== '/')
  return all.some((h) => pathname === h || pathname.startsWith(`${h}/`))
}

export const NavPills = ({ items }: { items: Item[] }) => {
  const pathname = usePathname() || '/'
  return (
    <nav className="pills" aria-label="Navigation principale">
      {items.map((it) => {
        const on = isActive(pathname, it)
        return (
          <Link key={it.href} href={it.href} className={`pill${on ? ' is-on' : ''}`} aria-current={on ? 'page' : undefined}>
            {it.libelle}
          </Link>
        )
      })}
    </nav>
  )
}
