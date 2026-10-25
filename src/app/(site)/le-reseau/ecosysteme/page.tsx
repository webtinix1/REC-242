import type { Metadata } from 'next'
import React from 'react'

import { Boutons, Ex } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { SubNav } from '@/components/site/SubNav'
import { Words } from '@/components/site/Words'
import { block, getPage, type CartesBlock } from '@/lib/site/payload'
import { breadcrumbLd, pageMetadata } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/le-reseau/ecosysteme', { fallbackTitle: 'Notre écosystème' })
}

/** Écran 06 : notre écosystème. */
export default async function Ecosysteme() {
  const page = await getPage('/le-reseau/ecosysteme')
  const hero = block(page, 'hero')
  const cercle = block(page, 'cercle')
  const familles = block<CartesBlock>(page, 'familles')?.cartes ?? []
  const final = block(page, 'final')

  return (
    <>
      <section className="band phead" style={{ paddingBottom: 56 }}>
        <div className="wrap">
          <SubNav />
          <div className="stack" style={{ gap: 20 }}>
            <span className="eyebrow" data-m="rise" data-m-d="1">
              {hero?.surtitre || 'Notre écosystème'}
            </span>
            <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
              <Words text={hero?.titre || 'Notre écosystème'} />
            </h1>
            {hero?.texte && (
              <p className="lead" data-m="rise" data-m-d="5">
                {hero.texte} {hero.note && <Ex>{hero.note}</Ex>}
              </p>
            )}
          </div>
        </div>
      </section>

      {cercle && (
        <section className="band bg-night dark" data-m="bloom">
          <div className="wrap eco-x">
            {familles.length >= 4 && (
              <div className="eco-orbit" aria-hidden="true" data-m="eco" data-m-scrub="">
                <div className="eco-core">
                  <b>REC 242</b>
                  <span>le réseau</span>
                </div>
                {familles.slice(0, 4).map((f, i) => (
                  <span key={f.titre} className={`eco-node n${i + 1}`}>
                    {f.titre}
                  </span>
                ))}
              </div>
            )}
            <div
              className="stack"
              style={{ gap: 18 }}
              data-m="cascade"
              data-m-stagger=""
              data-m-d="4"
            >
              <span className="eyebrow">{cercle.surtitre}</span>
              <p className="quote-xl">{cercle.titre}</p>
              <p className="muted">{cercle.texte}</p>
            </div>
          </div>
        </section>
      )}

      {familles.length > 0 && (
        <section className="band bg-mint">
          <div className="wrap">
            <div className="g2" data-m="nodes" data-m-stagger="">
              {familles.map((e) => (
                <div className="card" key={e.titre}>
                  <span className="adv-dot" aria-hidden="true" />
                  <h2 className="h-m">{e.titre}</h2>
                  <p className="muted">{e.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {final && (
        <section className="band bg-gold rings band-end" data-m="bloom-l" data-m-scrub="">
          <div className="wrap">
            <div className="stack" style={{ gap: 18 }}>
              <h2 className="h-xl" data-m="words" data-m-stagger="" data-m-d="3">
                <Words text={final.titre} />
              </h2>
              <p className="lead" data-m="rise" data-m-d="6">
                {final.texte}
              </p>
              <Boutons boutons={final.boutons} m={{ m: 'pops', stagger: true, d: '7' }} />
            </div>
          </div>
        </section>
      )}
      <JsonLd
        data={breadcrumbLd([
          { nom: 'Le réseau', chemin: '/le-reseau' },
          { nom: 'Notre écosystème', chemin: '/le-reseau/ecosysteme' },
        ])}
      />
    </>
  )
}
