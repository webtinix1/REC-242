import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Img } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { SubNav } from '@/components/site/SubNav'
import { Words } from '@/components/site/Words'
import { getCommissions, type Person } from '@/lib/site/data'
import { block, getPage } from '@/lib/site/payload'
import { breadcrumbLd, pageMetadata } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/le-reseau/commissions', { fallbackTitle: 'Commissions' })
}

/** Écran 04 : commissions. */
export default async function Commissions() {
  const [page, commissions] = await Promise.all([
    getPage('/le-reseau/commissions'),
    getCommissions(),
  ])
  const hero = block(page, 'hero')
  const designation = block(page, 'designation')

  return (
    <>
      <section className="band bg-green dark rings rings-w phead" data-m="head">
        <div className="wrap">
          <SubNav />
          <div className="phead-grid">
            <div className="stack" style={{ gap: 20 }}>
              <span className="eyebrow" data-m="rise" data-m-d="1">
                {hero?.surtitre || 'Commissions'}
              </span>
              <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
                <Words text={hero?.titre || 'Commissions'} />
              </h1>
              {hero?.texte && (
                <p className="lead" data-m="rise" data-m-d="4">
                  {hero.texte}
                </p>
              )}
            </div>
            {commissions.length > 0 && (
              <p
                className="num-xl"
                aria-hidden="true"
                style={{ justifySelf: 'center' }}
                data-m="disc"
                data-m-d="3"
              >
                {commissions.length}
              </p>
            )}
          </div>
        </div>
      </section>

      {commissions.length > 0 && (
        <section className="band bg-white">
          <div className="wrap">
            <div className="comm-grid" data-m="nodes" data-m-stagger="">
              {commissions.map((c) => {
                const resp =
                  c.responsable && typeof c.responsable !== 'number'
                    ? (c.responsable as Person)
                    : null
                return (
                  <div className="card" key={c.id}>
                    {c.image && typeof c.image !== 'number' ? (
                      <span className="pick commimg">
                        <Img media={c.image} size="carte" className="on" />
                      </span>
                    ) : null}
                    <span className="adv-dot" aria-hidden="true" />
                    <h2 className="h-m">{c.nom}</h2>
                    <p className="muted">{c.objet}</p>
                    <div className="line">
                      <span>Responsable</span>
                      <span className="muted">{resp?.nom ?? 'À désigner'}</span>
                    </div>
                    <div className="line">
                      <span>Experts rattachés</span>
                      <span>{c.experts?.length ?? 0}</span>
                    </div>
                    <div className="line" style={{ borderBottom: 0 }}>
                      <span>Événements liés</span>
                      <Link href={`/agenda?commission=${c.slug}`} className="linkbtn">
                        Voir l’agenda →
                      </Link>
                    </div>
                    {c.ouverture === 'ouverte' && (
                      <Link
                        className="rec-btn rec-btn--secondary"
                        style={{ width: 'max-content' }}
                        href="/espace-membre/commissions"
                      >
                        Rejoindre la commission (membres)
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {designation && (
        <section className="pband pband-short band-end">
          <Img media={designation.image} m={{ m: 'iris', parallax: true }} />
          <div className="wrap">
            <div className="ptext" data-m="cascade" data-m-stagger="" data-m-d="3">
              <span className="eyebrow">{designation.surtitre}</span>
              <p className="h-m">{designation.texte}</p>
            </div>
          </div>
        </section>
      )}
      <JsonLd
        data={breadcrumbLd([
          { nom: 'Le réseau', chemin: '/le-reseau' },
          { nom: 'Commissions', chemin: '/le-reseau/commissions' },
        ])}
      />
    </>
  )
}
