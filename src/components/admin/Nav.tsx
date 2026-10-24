import type { ServerProps } from 'payload'
import { Logout } from '@payloadcms/ui'
import { NavHamburger, NavWrapper } from '@payloadcms/next/client'
import React from 'react'

import { NAV } from '@/admin/navigation'
import { NavLinks, type ResolvedGroup } from './NavLinks'

/** Menu de gauche du back-office : groupes et libellés de la maquette, pastilles des éléments en attente. */
export const Nav = async (props: ServerProps) => {
  const { payload, visibleEntities, permissions } = props
  if (!payload?.config || !visibleEntities) return null
  const canReadC = (slug: string) => Boolean(permissions?.collections?.[slug as never]?.read)
  const canReadG = (slug: string) => Boolean(permissions?.globals?.[slug as never]?.read)
  const adminRoute = payload.config.routes.admin
  const collections = new Set((visibleEntities.collections as string[]).filter(canReadC))
  const globals = new Set((visibleEntities.globals as string[]).filter(canReadG))
  const allCollections = new Set(payload.config.collections.map((c) => c.slug as string))
  // Accessibles autrement : les modèles d'e-mails depuis l'onglet « E-mails automatiques » des Paramètres.
  const listed = new Set<string>(['global:emailTemplates'])

  const groups: ResolvedGroup[] = NAV.map((g) => ({
    label: g.label,
    items: g.items.flatMap((it) => {
      if ('collection' in it) {
        listed.add(it.collection)
        for (const m of it.match ?? [])
          listed.add(
            m.replace(/^\/(collections|globals)\//, (_x, t) => (t === 'globals' ? 'global:' : '')),
          )
        return collections.has(it.collection)
          ? [
              {
                label: it.label,
                href: `${adminRoute}/collections/${it.collection}`,
                badge: it.badge,
                match: it.match?.map((m) => `${adminRoute}${m}`),
              },
            ]
          : []
      }
      if ('global' in it) {
        listed.add(`global:${it.global}`)
        return globals.has(it.global)
          ? [{ label: it.label, href: `${adminRoute}/globals/${it.global}`, badge: it.badge }]
          : []
      }
      if (it.requires && !(allCollections.has(it.requires) && collections.has(it.requires)))
        return []
      return [
        {
          label: it.label,
          href: `${adminRoute}${it.path}`,
          badge: it.badge,
          exact: it.path === '',
        },
      ]
    }),
  })).filter((g) => g.items.length > 0)

  const others = [
    ...payload.config.collections
      .filter((c) => collections.has(c.slug) && !listed.has(c.slug))
      .map((c) => ({
        label: typeof c.labels?.plural === 'string' ? c.labels.plural : c.slug,
        href: `${adminRoute}/collections/${c.slug}`,
      })),
    ...payload.config.globals
      .filter((g) => globals.has(g.slug) && !listed.has(`global:${g.slug}`))
      .map((g) => ({
        label: typeof g.label === 'string' ? g.label : g.slug,
        href: `${adminRoute}/globals/${g.slug}`,
      })),
  ]
  if (others.length) groups.push({ label: 'Autres', items: others })

  return (
    <NavWrapper baseClass="nav">
      <nav className="nav__wrap rec-nav" aria-label="Menu d’administration">
        <div className="rec-nav__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-rec242.jpg" alt="REC 242" />
          <span className="rec-nav__pill">Back-office</span>
        </div>
        <NavLinks groups={groups} adminRoute={adminRoute} />
        <div className="nav__controls">
          <Logout />
        </div>
      </nav>
      <div className="nav__header">
        <div className="nav__header-content">
          <NavHamburger baseClass="nav" />
        </div>
      </div>
    </NavWrapper>
  )
}
