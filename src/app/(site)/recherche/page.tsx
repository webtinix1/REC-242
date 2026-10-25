import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'
import React from 'react'

import { getPayloadClient } from '@/lib/site/payload'
import { metadataFor } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await metadataFor('/recherche', { title: 'Recherche' })), robots: { index: false } }
}

const TYPES = ['Tout', 'Page', 'Événement', 'Actualité', 'Membre']

type Result = { id: number; title: string; type?: string; lien?: string; extrait?: string }

/** Écran 23 : recherche sur le contenu public (index du plugin search). */
export default async function Recherche({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim().slice(0, 100)
  const type = TYPES.includes(sp.type ?? '') && sp.type !== 'Tout' ? sp.type : undefined
  let results: Result[] = []
  if (q) {
    const payload = await getPayloadClient()
    const mots = q.split(/\s+/).filter(Boolean).slice(0, 6)
    const and: Where[] = mots.map((m): Where => ({
      or: [{ title: { like: m } } as Where, { contenu: { like: m } } as Where],
    }))
    if (type) and.push({ type: { equals: type } })
    const r = await payload.find({
      collection: 'search',
      where: { and },
      sort: '-priority',
      limit: 50,
      depth: 0,
      overrideAccess: false,
    })
    results = r.docs as unknown as Result[]
  }
  const href = (t: string) =>
    `/recherche?${new URLSearchParams({ q, ...(t !== 'Tout' ? { type: t } : {}) })}`

  return (
    <>
      <section className="band bg-tint trame phead" data-m="head">
        <div className="wrap stack" style={{ gap: 20, maxWidth: 1000 }}>
          <span className="eyebrow" data-m="rise">
            Recherche
          </span>
          <h1 className="sr">Rechercher sur le site</h1>
          <form
            className="searchbar"
            action="/recherche"
            method="get"
            role="search"
            data-m="lift"
            data-m-d="1"
          >
            <label htmlFor="b-search" className="sr">
              Rechercher sur le site
            </label>
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <input id="b-search" name="q" className="rec-input" type="search" defaultValue={q} />
            {type && <input type="hidden" name="type" value={type} />}
            <button type="submit" className="rec-btn rec-btn--primary">
              Rechercher
            </button>
          </form>
          {q && (
            <p className="h-m" data-m="rise" data-m-d="3" aria-live="polite">
              {results.length} résultat(s) pour « {q} »
            </p>
          )}
          {q && (
            <div
              className="chips"
              role="group"
              aria-label="Type de résultat"
              data-m="pops"
              data-m-stagger=""
              data-m-d="4"
            >
              {TYPES.map((t) => (
                <Link
                  key={t}
                  href={href(t)}
                  scroll={false}
                  className={`chip${(type ?? 'Tout') === t ? ' is-on' : ''}`}
                  aria-current={(type ?? 'Tout') === t ? 'true' : undefined}
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="band band-end">
        <div className="wrap stack" style={{ gap: 20, maxWidth: 1000 }}>
          {q && results.length === 0 && (
            <div className="empty">
              <p className="h-s">Aucun résultat</p>
              <p className="small muted">Essayez un autre mot, ou consultez le plan du site.</p>
            </div>
          )}
          <div className="stack" style={{ gap: 12 }} data-m="cascade" data-m-stagger="">
            {results.map((r) => (
              <Link key={r.id} href={r.lien || '/'} className="card row-card">
                <span className="pill-type">{r.type}</span>
                <div style={{ flex: 1 }}>
                  <p className="h-s">{r.title}</p>
                  {r.extrait && <p className="small muted">{r.extrait}</p>}
                </div>
              </Link>
            ))}
          </div>
          <p className="small muted">
            La recherche couvre les pages, actualités, événements et fiches publiques des membres.
          </p>
        </div>
      </section>
    </>
  )
}
