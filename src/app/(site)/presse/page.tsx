import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Btn, Img, Lnk } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { Words } from '@/components/site/Words'
import { dateLong } from '@/lib/site/format'
import { docHref, getDocs } from '@/lib/site/data'
import { block, getPage, type CartesBlock } from '@/lib/site/payload'
import { breadcrumbLd, pageMetadata } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/presse', { fallbackTitle: 'Espace presse' })
}

const anneeDe = (iso?: string) => (iso ? String(new Date(iso).getFullYear()) : '')

/** Écran 21 : espace presse. */
export default async function Presse({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>
}) {
  const sp = await searchParams
  const [page, communiques, kitDocs] = await Promise.all([
    getPage('/presse'),
    getDocs('presse', 'communique'),
    getDocs('presse', 'kit'),
  ])
  const hero = block(page, 'hero')
  const kit = block<CartesBlock>(page, 'kit')
  const interventions = block(page, 'interventions')
  const contact = block(page, 'contact')
  const annees = [...new Set(communiques.map((c) => anneeDe(c.dateDocument)).filter(Boolean))]
    .sort()
    .reverse()
  const annee = annees.includes(sp.annee ?? '') ? sp.annee! : annees[0]
  const liste = communiques.filter((c) => anneeDe(c.dateDocument) === annee)

  return (
    <>
      <section className="band bg-ink dark net phead" data-m="head">
        <div className="wrap stack" style={{ gap: 20 }}>
          <Link href="/actualites" className="linkbtn" data-m="rise">
            ← Actualités
          </Link>
          <span className="eyebrow" data-m="rise" data-m-d="1">
            {hero?.surtitre || 'Espace presse'}
          </span>
          <h1 className="h-xxl" data-m="words" data-m-stagger="" data-m-d="1">
            <Words text={hero?.titre || 'Espace presse'} />
          </h1>
          {hero?.texte && (
            <p className="lead" data-m="rise" data-m-d="4">
              {hero.texte}
            </p>
          )}
        </div>
      </section>

      <section className="band bg-white">
        <div className="wrap stack" style={{ gap: 20 }}>
          {liste.length > 0 && (
            <>
              <div className="rec-row" style={{ justifyContent: 'space-between' }} data-m="rise">
                <h2 className="h-m">Communiqués</h2>
                <div className="chips chips-sm">
                  {annees.map((a) => (
                    <Link
                      key={a}
                      href={`/presse?annee=${a}`}
                      scroll={false}
                      className={`chip${a === annee ? ' is-on' : ''}`}
                      aria-current={a === annee ? 'true' : undefined}
                    >
                      {a}
                    </Link>
                  ))}
                </div>
              </div>
              {liste.map((c) => (
                <div className="card row-card" data-m="rise" data-m-d="1" key={c.id}>
                  <div className="av">PDF</div>
                  <div style={{ flex: 1 }}>
                    <p className="small muted">{dateLong(c.dateDocument)}</p>
                    <p className="h-s">{c.titre}</p>
                  </div>
                  <a className="linkbtn" href={docHref(c)}>
                    Télécharger
                  </a>
                </div>
              ))}
            </>
          )}
          {(kit?.cartes?.length || kitDocs.length > 0) && (
            <>
              <h2 className="h-l" style={{ marginTop: 32 }} data-m="rise">
                {kit?.titre || 'Kit média'}
              </h2>
              <div className="g4" data-m="cascade" data-m-stagger="">
                {(kit?.cartes ?? []).map((c) => {
                  const inner = (
                    <>
                      <div className="kit-thumbs">
                        <Img media={c.image} size="carte" />
                      </div>
                      <p className="h-s">{c.titre}</p>
                      {c.texte && <p className="small muted">{c.texte}</p>}
                      {c.libelleLien && <span className="pill-type">{c.libelleLien}</span>}
                    </>
                  )
                  return c.lien ? (
                    <Lnk key={c.titre} href={c.lien} className="card" download>
                      {inner}
                    </Lnk>
                  ) : (
                    <div key={c.titre} className="card">
                      {inner}
                    </div>
                  )
                })}
                {kitDocs.map((d) => (
                  <a key={d.id} href={docHref(d)} className="card">
                    <div className="kit-doc">
                      <Img
                        media={d.couverture}
                        size="vignette"
                        className="dcover"
                        alt={`Couverture : ${d.titre}`}
                      />
                    </div>
                    <p className="h-s">{d.titre}</p>
                    <span className="pill-type">PDF</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {interventions && (
        <section className="band bg-tint band-s">
          <div className="wrap ed2" style={{ alignItems: 'center' }}>
            <h2 className="h-l" data-m="rise">
              {interventions.titre}
            </h2>
            <p className="h-s" style={{ fontWeight: 600 }} data-m="rise" data-m-d="2">
              {interventions.texte}
            </p>
          </div>
        </section>
      )}

      {contact && (
        <section className="band bg-gold rings band-end" data-m="ripple" data-m-scrub="">
          <div className="wrap press-x">
            <div className="stack" style={{ gap: 12 }} data-m="cascade" data-m-stagger="">
              <span className="eyebrow">{contact.surtitre}</span>
              <p className="h-l">{contact.titre}</p>
              {contact.texte && <p>{contact.texte}</p>}
              <Btn
                b={contact.boutons?.[0]}
                cls="rec-btn--primary"
                style={{ width: 'max-content' }}
              />
            </div>
            {contact.image ? (
              <div className="press-ava press-ava-photo" data-m="disc" data-m-d="3">
                <Img media={contact.image} size="carte" />
              </div>
            ) : null}
          </div>
        </section>
      )}
      <JsonLd data={breadcrumbLd([{ nom: 'Espace presse', chemin: '/presse' }])} />
    </>
  )
}
