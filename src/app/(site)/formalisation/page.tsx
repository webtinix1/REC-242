import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Boutons, Ex, Img } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { SubNav } from '@/components/site/SubNav'
import { Words } from '@/components/site/Words'
import { estPasse, evenementsPublics } from '@/lib/evenements/site'
import { jourLong } from '@/lib/evenements/notifications'
import { block, getPage, type CartesBlock } from '@/lib/site/payload'
import { breadcrumbLd, pageMetadata } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/formalisation', { fallbackTitle: 'Formalisation' })
}

/** Écran 18 : formalisation. Le prochain atelier est le prochain événement de la commission Formalisation. */
export default async function Formalisation() {
  const page = await getPage('/formalisation')
  const hero = block(page, 'hero')
  const pourqui = block<CartesBlock>(page, 'pourqui')
  const offre = block<CartesBlock>(page, 'offre')
  // Intitulé du bandeau : celui du bloc « atelier » de la page s'il est renseigné, sinon le titre de l'événement.
  const bandeau = block(page, 'atelier')
  const [atelier] = (await evenementsPublics({ 'commission.slug': { equals: 'formalisation' } })).filter((e) => !estPasse(e) && e.statut !== 'annule')

  return (
    <>
      <div className="subbar">
        <div className="wrap">
          <SubNav />
        </div>
      </div>
      {hero && (
        <section className="pband pband-b pband-tall">
          <Img media={hero.image} m={{ m: 'iris' }} style={{ objectPosition: '60% 25%' }} priority />
          <div className="wrap">
            <div className="ptext">
              <span className="eyebrow" data-m="rise" data-m-d="1">
                {hero.surtitre}
              </span>
              <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
                <Words text={hero.titre} />
              </h1>
              {hero.texte && (
                <p className="lead" data-m="rise" data-m-d="4">
                  {hero.texte}
                </p>
              )}
              <Boutons
                boutons={hero.boutons}
                styles={['rec-btn--accent']}
                m={{ m: 'pops', stagger: true, d: '5' }}
              />
            </div>
          </div>
        </section>
      )}

      {pourqui?.cartes?.length ? (
        <section className="band bg-white">
          <div className="wrap">
            <h2 className="h-l" style={{ marginBottom: 28 }} data-m="rise">
              {pourqui.titre}
            </h2>
            <div className="verbs" data-m="verbs" data-m-stagger="">
              {pourqui.cartes.map((c, i) => (
                <div className="verb" key={c.titre}>
                  <Img media={c.image} size="carte" className="verb-ph" />
                  <span className="verb-n">{i + 1}</span>
                  <p className="h-m">{c.titre}</p>
                  <p className="muted">{c.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {offre?.cartes?.length ? (
        <section className="band bg-night dark net" data-m="bloom" data-m-scrub="">
          <div className="wrap">
            <h2 className="h-l" style={{ marginBottom: 28 }} data-m="rise" data-m-d="3">
              {offre.titre}
            </h2>
            <div className="pil" data-m="nodes" data-m-stagger="">
              {offre.cartes.map((c, i) => (
                <div className="pil-i" key={c.titre}>
                  <div className="av">{i + 1}</div>
                  <h3 className="h-m">{c.titre}</h3>
                  <p className="muted">{c.texte}</p>
                </div>
              ))}
            </div>
            {offre.note && (
              <p className="small muted" style={{ marginTop: 20 }} data-m="rise" data-m-d="4">
                {offre.aValider && <Ex />} {offre.note}
              </p>
            )}
          </div>
        </section>
      ) : null}
      {atelier && (
        <section className="band bg-gold rings band-end" data-m="ripple" data-m-scrub="">
          <div className="wrap">
            <div className="stack" style={{ gap: 18 }}>
              <span className="eyebrow" data-m="rise">
                Prochain atelier
              </span>
              <h2 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
                <Words text={bandeau?.titre || atelier.titre} />
              </h2>
              <p className="lead" data-m="rise" data-m-d="4">
                {[jourLong(atelier.debut), atelier.lieu].filter(Boolean).join(' · ')}
              </p>
              <div className="rec-row" data-m="pops" data-m-stagger="" data-m-d="5">
                <Link href={`/agenda/${atelier.slug}`} className="rec-btn rec-btn--primary">
                  Voir l’atelier
                </Link>
                <Link href="/adherer/candidature?categorie=A" className="rec-btn rec-btn--secondary">
                  Adhérer en catégorie A
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
      <JsonLd data={breadcrumbLd([{ nom: 'Formalisation', chemin: '/formalisation' }])} />
    </>
  )
}
