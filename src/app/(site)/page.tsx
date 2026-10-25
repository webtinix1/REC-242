import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Btn, Boutons, Img, KeyFigures, Lnk, SecHead } from '@/components/site/Blocks'
import { Words } from '@/components/site/Words'
import { dateCourt } from '@/lib/site/format'
import { getFaq, getNews, getPartners, NEWS_TYPE_LABEL } from '@/lib/site/data'
import { block, getPage, type CartesBlock, type SectionBlock } from '@/lib/site/payload'
import { pageMetadata } from '@/lib/site/seo'
import { getKeyFigures } from '@/lib/site/settings'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/', { absoluteTitle: true })
}

/** Écran 01 : accueil (captures/site/01-accueil-*). */
export default async function Accueil() {
  const [page, figs, faq, partners, news] = await Promise.all([
    getPage('/'),
    getKeyFigures(),
    getFaq('accueil'),
    getPartners(),
    getNews({ limit: 3 }),
  ])
  const hero = block(page, 'hero')
  const piliers = block<CartesBlock>(page, 'piliers')
  const avantages = block<CartesBlock>(page, 'avantages')
  const formalisation = block(page, 'formalisation')
  const actualites = block(page, 'actualites')
  const partenaires = block(page, 'partenaires')
  const faqS = block(page, 'faq')
  const final = block<SectionBlock>(page, 'final')
  const [une, ...autres] = news.docs

  return (
    <>
      {hero && (
        <section className="pband pband-tall" data-m="hero">
          <Img media={hero.image} m={{ m: 'iris' }} priority />
          <div className="halo" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="wrap">
            <div className="ptext" style={{ maxWidth: 560 }}>
              {hero.surtitre && (
                <span className="eyebrow" data-m="rise" data-m-d="1">
                  {hero.surtitre}
                </span>
              )}
              <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
                <Words text={hero.titre} />
              </h1>
              {hero.texte && (
                <p className="lead" data-m="rise" data-m-d="5">
                  {hero.texte}
                </p>
              )}
              <Boutons
                boutons={hero.boutons}
                styles={['rec-btn--accent', 'rec-btn--onbrand']}
                m={{ m: 'pops', stagger: true, d: '6' }}
              />
              {hero.note && (
                <p
                  className="small muted"
                  style={{ color: 'rgba(255,255,255,.84)' }}
                  data-m="rise"
                  data-m-d="8"
                >
                  {hero.note}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {figs.length > 0 && (
        <section className="band band-s">
          <div className="wrap">
            <KeyFigures figs={figs} />
          </div>
        </section>
      )}

      {piliers?.cartes?.length ? (
        <section className="band bg-white" style={{ paddingTop: 72 }}>
          <div className="wrap">
            <SecHead
              surtitre={piliers.surtitre}
              titre={piliers.titre}
              bouton={piliers.boutons?.[0]}
              style={{ marginBottom: 36 }}
            />
            <div className="verbs" data-m="verbs" data-m-stagger="">
              {piliers.cartes.map((p, i) => (
                <div className="verb" key={p.titre}>
                  <span className="verb-n">{i + 1}</span>
                  <h3 className="verb-t">{p.titre}</h3>
                  <p className="muted">{p.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {avantages?.cartes?.length ? (
        <section className="band bg-green dark net net-soft" data-m="bloom" data-m-scrub="">
          <div className="wrap">
            <SecHead
              surtitre={avantages.surtitre}
              titre={avantages.titre}
              bouton={avantages.boutons?.[0]}
              btnCls="rec-btn--accent"
              style={{ marginBottom: 20 }}
              d="3"
            />
            <div className="advx" data-m="nodes" data-m-stagger="">
              {avantages.cartes.map((a) => (
                <div className="advx-i" key={a.titre}>
                  <span className="advx-dot" aria-hidden="true" />
                  <h3 className="h-s">{a.titre}</h3>
                  <p className="muted small">{a.texte}</p>
                  {a.lien && (
                    <Lnk href={a.lien} className="linkbtn">
                      {a.libelleLien} →
                    </Lnk>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Agenda (lot 8), « Le réseau en visages » (lot 7) et opportunités (lot 9) s'affichent quand leurs données existent. */}

      {formalisation && (
        <section className="pband">
          <Img media={formalisation.image} m={{ m: 'iris', parallax: true }} />
          <div className="wrap">
            <div className="pband-card" data-m="lift" data-m-d="3">
              <span className="eyebrow">{formalisation.surtitre}</span>
              <h2 className="h-l">{formalisation.titre}</h2>
              <p className="muted">{formalisation.texte}</p>
              <Boutons boutons={formalisation.boutons} />
            </div>
          </div>
        </section>
      )}

      {actualites && une && (
        <section className="band bg-white">
          <div className="wrap">
            <SecHead
              surtitre={actualites.surtitre}
              titre={actualites.titre}
              bouton={actualites.boutons?.[0]}
            />
            <div className="newsx">
              <Link href={`/actualites/${une.slug}`} className="newsx-main" data-m="rise">
                <figure className="photo" data-m="iris" data-m-d="1">
                  <Img media={une.image} alt="" />
                </figure>
                <span className="pill-type">{NEWS_TYPE_LABEL[une.type]}</span>
                <span className="small muted">{dateCourt(une.datePublication)}</span>
                <p className="h-m">{une.titre}</p>
              </Link>
              {autres.length > 0 && (
                <div className="newsx-side" data-m="deal-side" data-m-stagger="" data-m-d="3">
                  {autres.map((n) => (
                    <Link key={n.id} href={`/actualites/${n.slug}`}>
                      <Img media={n.image} size="vignette" className="nthumb" alt="" />
                      <span className="pill-type">{NEWS_TYPE_LABEL[n.type]}</span>
                      <span className="small muted">{dateCourt(n.datePublication)}</span>
                      <p className="h-s">{n.titre}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {partenaires && partners.length > 0 && (
        <section className="band bg-tint trame band-s" style={{ paddingBottom: 72 }} data-m="net">
          <div className="wrap">
            <SecHead
              surtitre={partenaires.surtitre}
              titre={partenaires.titre}
              bouton={partenaires.boutons?.[0]}
            />
            <div className="logos logos-row" data-m="pops" data-m-stagger="" data-m-d="2">
              {partners.map((p) => (
                <span className="partner-tile" key={p.id}>
                  <span className="logo-tile logo-tile-lg">
                    <Img media={p.logo} size="vignette" alt={`Logo ${p.nom}`} />
                  </span>
                  <span className="xs" style={{ color: '#262a26' }}>
                    {p.nom}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {faqS && faq.length > 0 && (
        <section className="band">
          <div className="wrap">
            <div className="split">
              <div className="stack" data-m="rise">
                <span className="eyebrow">{faqS.surtitre}</span>
                <h2 className="h-l">{faqS.titre}</h2>
                <Btn b={faqS.boutons?.[0]} style={{ width: 'max-content' }} />
              </div>
              <div
                className="stack"
                style={{ gap: 10 }}
                data-m="cascade"
                data-m-stagger=""
                data-m-d="2"
              >
                {faq.slice(0, 4).map((f) => (
                  <details key={f.id}>
                    <summary>{f.question}</summary>
                    <p>{f.reponse}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {final && (
        <section className="band bg-gold rings band-end" data-m="ripple" data-m-scrub="">
          <div className="wrap final-x">
            <div className="stack" style={{ gap: 20 }}>
              <h2 className="h-xl" data-m="words" data-m-stagger="" data-m-d="0">
                <Words text={final.titre} />
              </h2>
              {final.texte && (
                <p className="lead" style={{ maxWidth: 680 }} data-m="rise" data-m-d="5">
                  {final.texte}
                </p>
              )}
              <Boutons boutons={final.boutons} m={{ m: 'pops', stagger: true, d: '7' }} />
            </div>
          </div>
        </section>
      )}
    </>
  )
}
