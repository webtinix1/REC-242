import type { Metadata } from 'next'
import React from 'react'

import { Boutons, Img } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { SubNav } from '@/components/site/SubNav'
import { Words } from '@/components/site/Words'
import { getPartners } from '@/lib/site/data'
import { block, getPage, type CartesBlock } from '@/lib/site/payload'
import { breadcrumbLd, pageMetadata } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/le-reseau/partenaires', { fallbackTitle: 'Partenaires' })
}

/** Écran 07 : partenaires (convention signée seulement). */
export default async function Partenaires() {
  const [page, partners] = await Promise.all([getPage('/le-reseau/partenaires'), getPartners()])
  const hero = block(page, 'hero')
  const soutenir = block<CartesBlock>(page, 'soutenir')?.cartes ?? []
  const final = block(page, 'final')

  return (
    <>
      <section className="band bg-tint phead">
        <div className="wrap">
          <SubNav />
          <div className="phead-grid">
            <div className="stack" style={{ gap: 20 }}>
              <span className="eyebrow" data-m="rise" data-m-d="1">
                {hero?.surtitre || 'Partenaires'}
              </span>
              <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
                <Words text={hero?.titre || 'Partenaires'} />
              </h1>
              {hero?.texte && (
                <p className="lead" data-m="rise" data-m-d="5">
                  {hero.texte}
                </p>
              )}
            </div>
            {hero?.image ? (
              <figure className="phead-photo" data-m="iris" data-m-d="2">
                <Img media={hero.image} priority />
              </figure>
            ) : null}
          </div>
        </div>
      </section>

      {partners.length > 0 && (
        <section className="band bg-white">
          <div className="wrap stack" style={{ gap: 24 }}>
            <div className="g4" data-m="cascade" data-m-stagger="">
              {partners.map((p) => {
                const inner = (
                  <>
                    <span className="logo-tile logo-tile-xl">
                      <Img media={p.logo} size="vignette" alt={`Logo ${p.nom}`} />
                    </span>
                    <p className="h-s">{p.nom}</p>
                    {p.type && <span className="pill-type">{p.type}</span>}
                    {p.description && <p className="small muted">{p.description}</p>}
                  </>
                )
                const style = { alignItems: 'center', textAlign: 'center' } as const
                return p.lien ? (
                  <a
                    key={p.id}
                    className="card"
                    style={style}
                    href={p.lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${p.nom} (nouvel onglet)`}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={p.id} className="card" style={style}>
                    {inner}
                  </div>
                )
              })}
            </div>
            {hero?.note && <p className="small muted">{hero.note}</p>}
          </div>
        </section>
      )}

      {soutenir.length > 0 && (
        <section className="band bg-green dark net net-soft" data-m="bloom" data-m-scrub="">
          <div className="wrap">
            <div className="ways" data-m="cascade" data-m-stagger="" data-m-d="3">
              {soutenir.map((w) => (
                <div className="ways-i" key={w.titre}>
                  <h2 className="h-m">{w.titre}</h2>
                  <p className="muted">{w.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {final && (
        <section className="band bg-gold rings band-end" data-m="ripple" data-m-scrub="">
          <div className="wrap">
            <div className="stack" style={{ gap: 18, maxWidth: 760 }}>
              <h2 className="h-xl" data-m="words" data-m-stagger="" data-m-d="0">
                <Words text={final.titre} />
              </h2>
              <p className="lead" data-m="rise" data-m-d="3">
                {final.texte}
              </p>
              <Boutons boutons={final.boutons} m={{ m: 'pops', stagger: true, d: '5' }} />
            </div>
          </div>
        </section>
      )}
      <JsonLd
        data={breadcrumbLd([
          { nom: 'Le réseau', chemin: '/le-reseau' },
          { nom: 'Partenaires', chemin: '/le-reseau/partenaires' },
        ])}
      />
    </>
  )
}
