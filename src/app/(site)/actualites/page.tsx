import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import React from 'react'

import { Img } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { Words } from '@/components/site/Words'
import { NEWS_TYPES } from '@/collections/News'
import { dateCourt, dateLong } from '@/lib/site/format'
import { getNews, isMemberViewer, NEWS_TYPE_LABEL, type Tag } from '@/lib/site/data'
import { mediaUrl } from '@/lib/site/payload'
import { breadcrumbLd, metadataFor } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return metadataFor('/actualites', {
    title: 'Actualités',
    description: 'La vie du réseau : articles, communiqués, interviews et retours sur événement.',
  })
}

const PAR_PAGE = 6

type SP = Promise<{ type?: string; secteur?: string; page?: string }>

/** Écran 19 : actualités. Filtres type et secteur dans l'adresse, pagination. */
export default async function Actualites({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const [all, membre] = await Promise.all([
    getNews({ limit: 500 }),
    isMemberViewer(await headers()),
  ])
  const docs = all.docs
  const une = docs.find((n) => n.aLaUne && !n.reserveMembres) ?? docs.find((n) => !n.reserveMembres)
  const secteurs: Tag[] = []
  for (const n of docs)
    for (const s of n.secteurs ?? [])
      if (typeof s !== 'number' && !secteurs.some((x) => x.id === s.id)) secteurs.push(s)

  const type = NEWS_TYPES.some((t) => t.value === sp.type) ? sp.type : undefined
  const secteur = secteurs.find((s) => s.slug === sp.secteur)
  // Une actualité sans secteur concerne tout le monde : elle reste visible quel que soit le secteur choisi.
  const filtered = docs.filter(
    (n) =>
      (!type || n.type === type) &&
      (!secteur ||
        !n.secteurs?.length ||
        n.secteurs.some((s) => typeof s !== 'number' && s.id === secteur.id)),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / PAR_PAGE))
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pages)
  const list = filtered.slice((page - 1) * PAR_PAGE, page * PAR_PAGE)

  const href = (q: { type?: string; secteur?: string; page?: number }) => {
    const p = new URLSearchParams()
    if (q.type) p.set('type', q.type)
    if (q.secteur) p.set('secteur', q.secteur)
    if (q.page && q.page > 1) p.set('page', String(q.page))
    const s = p.toString()
    return `/actualites${s ? `?${s}` : ''}`
  }

  return (
    <>
      <section className="band bg-white band-s" style={{ paddingBottom: 40 }}>
        <div
          className="wrap rec-row"
          style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}
        >
          <div className="stack" style={{ gap: 10 }}>
            <span className="eyebrow" data-m="rise">
              Actualités
            </span>
            <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="0">
              <Words text="La vie du réseau" />
            </h1>
          </div>
          <Link href="/presse" className="rec-btn rec-btn--secondary" data-m="pop" data-m-d="4">
            Espace presse
          </Link>
        </div>
      </section>

      {une && (
        <section className="pband pband-b">
          <Img media={une.image} alt="" m={{ m: 'iris', d: '2' }} style={{ objectPosition: '50% 40%' }} priority />
          <div className="wrap">
            <div className="ptext" style={{ maxWidth: 720 }}>
              <div className="rec-row dark" data-m="pops" data-m-stagger="" data-m-d="4">
                <span className="pill-type">{NEWS_TYPE_LABEL[une.type]}</span>
                <span className="small muted">{dateLong(une.datePublication)}</span>
              </div>
              <h2 className="h-xl" data-m="words" data-m-stagger="" data-m-d="4">
                <Words text={une.titre} />
              </h2>
              <p className="lead" data-m="rise" data-m-d="8">
                {une.chapeau}
              </p>
              <div className="rec-row" data-m="pops" data-m-stagger="" data-m-d="9">
                <Link href={`/actualites/${une.slug}`} className="rec-btn rec-btn--accent">
                  Lire l’article
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="band bg-white band-s">
        <div className="wrap">
          <div className="filters card" data-m="rise">
            <div className="fgrid fgrid-2">
              <div>
                <p className="flabel">Type</p>
                <div className="chips chips-sm">
                  {[{ value: '', label: 'Tous' }, ...NEWS_TYPES].map((t) => (
                    <Link
                      key={t.value}
                      scroll={false}
                      href={href({ type: t.value || undefined, secteur: secteur?.slug })}
                      className={`chip${(type ?? '') === t.value ? ' is-on' : ''}`}
                      aria-current={(type ?? '') === t.value ? 'true' : undefined}
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="flabel">Secteur</p>
                <div className="chips chips-sm">
                  {[{ id: 0, nom: 'Tous', slug: '' }, ...secteurs].map((s) => (
                    <Link
                      key={s.id}
                      scroll={false}
                      href={href({ type, secteur: s.slug || undefined })}
                      className={`chip${(secteur?.slug ?? '') === s.slug ? ' is-on' : ''}`}
                      aria-current={(secteur?.slug ?? '') === s.slug ? 'true' : undefined}
                    >
                      {s.nom}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band band-t0" style={{ paddingTop: 8 }}>
        <div className="wrap stack" style={{ gap: 22 }}>
          {list.length === 0 && (
            <div className="empty">
              <p className="h-s">Aucune actualité pour ces filtres</p>
            </div>
          )}
          <div className="g3 newsgrid" data-m="deal" data-m-stagger="">
            {list.map((n) =>
              n.reserveMembres && !membre ? (
                <Link
                  key={n.id}
                  className="card"
                  href={`/espace-membre?suite=${encodeURIComponent(`/actualites/${n.slug}`)}`}
                >
                  <div className="ncover-dot" aria-hidden="true" />
                  <div className="rec-row">
                    <span className="pill-type">{NEWS_TYPE_LABEL[n.type]}</span>
                    <span className="vis mem">Membres</span>
                  </div>
                  <span className="small muted">{dateCourt(n.datePublication)}</span>
                  <p className="h-s">{n.titre}</p>
                  <p className="small muted">{n.chapeau}</p>
                  <span className="small" style={{ color: '#0b5e32', fontWeight: 600 }}>
                    Se connecter à l’espace membre pour lire →
                  </span>
                </Link>
              ) : (
                <Link key={n.id} className="card" href={`/actualites/${n.slug}`}>
                  {mediaUrl(n.image, 'carte') ? (
                    <Img media={n.image} size="carte" className="ncover" alt="" />
                  ) : (
                    <div className="ncover-dot" aria-hidden="true" />
                  )}
                  <div className="rec-row">
                    <span className="pill-type">{NEWS_TYPE_LABEL[n.type]}</span>
                  </div>
                  <span className="small muted">{dateCourt(n.datePublication)}</span>
                  <p className="h-s">{n.titre}</p>
                  <p className="small muted">{n.chapeau}</p>
                </Link>
              ),
            )}
          </div>
          {pages > 1 && (
            <nav className="pager" aria-label="Pagination">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={href({ type, secteur: secteur?.slug, page: n })}
                  className={`pg${n === page ? ' is-on' : ''}`}
                  aria-label={`Page ${n}`}
                  aria-current={n === page ? 'page' : undefined}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>

      <section className="band bg-warm band-s band-end">
        <div
          className="wrap rec-row"
          style={{ justifyContent: 'space-between', alignItems: 'center' }}
          data-m="cascade"
          data-m-stagger=""
        >
          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">Espace presse</span>
            <p className="h-m">
              Communiqués, kit média et contact presse, accessibles sans compte.
            </p>
          </div>
          <Link href="/presse" className="rec-btn rec-btn--primary">
            Espace presse
          </Link>
        </div>
      </section>
      <JsonLd data={breadcrumbLd([{ nom: 'Actualités', chemin: '/actualites' }])} />
    </>
  )
}
