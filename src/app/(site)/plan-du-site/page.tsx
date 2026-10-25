import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { Words } from '@/components/site/Words'
import { getPayloadClient } from '@/lib/site/payload'
import { breadcrumbLd, metadataFor } from '@/lib/site/seo'
import { getNavigation, linkHref } from '@/lib/site/settings'

export async function generateMetadata(): Promise<Metadata> {
  return metadataFor('/plan-du-site', { title: 'Plan du site' })
}

type Item = { label: string; href: string }

/** Écran 24 : plan du site, construit depuis le menu et les pages publiées. */
export default async function PlanDuSite() {
  const [nav, payload] = await Promise.all([getNavigation(), getPayloadClient()])
  const pages = (
    await payload.find({
      collection: 'pages',
      where: { _status: { equals: 'published' } },
      limit: 200,
      depth: 0,
      sort: 'title',
      overrideAccess: false,
    })
  ).docs as unknown as { title: string; chemin?: string; menu?: string }[]
  const groups: { t: string; items: Item[] }[] = (nav.principal ?? []).map((n) => {
    const items: Item[] = n.sousMenu?.length
      ? n.sousMenu.map((s) => ({ label: s.libelle, href: linkHref(s) }))
      : [{ label: n.libelle, href: linkHref(n) }]
    for (const p of pages)
      if (p.menu === n.libelle && p.chemin && !items.some((i) => i.href === p.chemin))
        items.push({ label: p.title, href: p.chemin })
    return { t: n.libelle, items }
  })
  const infos: Item[] = pages
    .filter((p) => !p.menu && p.chemin && p.chemin !== '/')
    .map((p) => ({ label: p.title, href: p.chemin! }))
  infos.push({ label: 'Recherche', href: '/recherche' })
  groups.push({ t: 'Informations', items: infos })

  return (
    <>
      <section className="band bg-green dark rings rings-w phead" data-m="head">
        <div className="wrap stack" style={{ gap: 18 }}>
          <span className="eyebrow" data-m="rise" data-m-d="1">
            Plan du site
          </span>
          <h1 className="h-xxl" data-m="words" data-m-stagger="" data-m-d="1">
            <Words text="Toutes les pages" />
          </h1>
        </div>
      </section>
      <section className="band band-end">
        <div className="wrap">
          <div className="g4 plan" data-m="cascade" data-m-stagger="">
            {groups.map((g) => (
              <div className="card" key={g.t}>
                <h2 className="h-s">{g.t}</h2>
                {g.items.map((i) => (
                  <Link key={i.href + i.label} href={i.href} className="linkbtn">
                    {i.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="card">
              <h2 className="h-s">Espace membre</h2>
              <Link className="linkbtn" href="/espace-membre">
                Connexion
              </Link>
              <Link className="linkbtn" href="/espace-membre">
                Tableau de bord
              </Link>
              <Link className="linkbtn" href="/espace-membre">
                Profil, événements, cotisation, documents
              </Link>
              <p className="small muted">Application séparée du site, réservée aux membres.</p>
            </div>
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbLd([{ nom: 'Plan du site', chemin: '/plan-du-site' }])} />
    </>
  )
}
