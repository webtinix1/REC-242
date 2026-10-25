import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Btn, Img } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { SubNav } from '@/components/site/SubNav'
import { Words } from '@/components/site/Words'
import { block, getPage, type AntennesBlock } from '@/lib/site/payload'
import { breadcrumbLd, pageMetadata } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/le-reseau/antennes', { fallbackTitle: 'Antennes' })
}

const STATUT: Record<string, string> = {
  siege: 'Siège',
  active: 'Antenne',
  creation: 'En création',
  projet: 'En projet',
}

/** Carte schématique des implantations (décorative, identique à la maquette). */
const CityMap = () => (
  <div className="citymap" aria-hidden="true" data-m="graph">
    <svg viewBox="0 0 400 400" fill="none">
      <g stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeDasharray="5 7">
        <path d="M300 300L300 70" />
        <path d="M300 300L200 316" />
        <path d="M300 300L130 296" />
        <path d="M300 300L60 340" />
        <path d="M300 300L360 170" />
      </g>
      <circle cx="300" cy="300" r="70" stroke="rgba(255,255,255,.14)" strokeWidth="2" />
      <circle cx="300" cy="300" r="22" fill="#fbb517" />
      <g fill="#ffffff">
        <circle cx="300" cy="70" r="10" />
        <circle cx="200" cy="316" r="10" />
        <circle cx="130" cy="296" r="10" />
        <circle cx="60" cy="340" r="10" />
      </g>
      <circle cx="360" cy="170" r="12" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 4" />
      <g fill="#ffffff" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600">
        <text x="318" y="76">
          Ouesso
        </text>
        <text x="248" y="355">
          Brazzaville
        </text>
        <text x="166" y="345">
          Nkayi
        </text>
        <text x="96" y="276">
          Dolisie
        </text>
        <text x="20" y="375">
          Pointe-Noire
        </text>
        <text x="300" y="140">
          Diaspora
        </text>
      </g>
    </svg>
  </div>
)

/** Écran 05 : antennes. */
export default async function Antennes() {
  const page = await getPage('/le-reseau/antennes')
  const hero = block(page, 'hero')
  const liste = block<AntennesBlock>(page, 'antennes')?.antennes ?? []
  const siege = block(page, 'siege')

  return (
    <>
      <section className="band bg-night dark phead" data-m="head">
        <div className="wrap">
          <SubNav />
          <div className="phead-grid">
            <div className="stack" style={{ gap: 20 }}>
              <span className="eyebrow" data-m="rise" data-m-d="1">
                {hero?.surtitre || 'Antennes'}
              </span>
              <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
                <Words text={hero?.titre || 'Antennes'} />
              </h1>
              {hero?.texte && (
                <p className="lead" data-m="rise" data-m-d="5">
                  {hero.texte}
                </p>
              )}
            </div>
            <CityMap />
          </div>
        </div>
      </section>

      {liste.length > 0 && (
        <section className="band bg-white">
          <div className="wrap">
            <div className="g3" data-m="cascade" data-m-stagger="">
              {liste.map((a) => (
                <div className="card" key={a.ville}>
                  <div className="rec-row" style={{ justifyContent: 'space-between' }}>
                    <span className="adv-dot" aria-hidden="true" />
                    <span className="pill-type">{STATUT[a.statut]}</span>
                  </div>
                  <h2 className="h-m">{a.ville}</h2>
                  <p className="small muted">{a.adresse || 'Référent à désigner'}</p>
                  <div className="line">
                    <span>Référent</span>
                    <span className="muted">{a.referent || 'À désigner'}</span>
                  </div>
                  <div className="line" style={{ borderBottom: 0 }}>
                    <span>Prochains événements</span>
                    <Link href={`/agenda?ville=${encodeURIComponent(a.ville)}`} className="linkbtn">
                      Agenda →
                    </Link>
                  </div>
                  <Link
                    className="rec-btn rec-btn--secondary"
                    style={{ width: 'max-content' }}
                    href={`/contact?motif=Autre&objet=${encodeURIComponent(`Antenne de ${a.ville}`)}`}
                  >
                    Contacter l’antenne
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {siege && (
        <section className="band bg-warm band-s band-end">
          <div className="wrap">
            <div
              className="rec-row"
              style={{ justifyContent: 'space-between', alignItems: 'center' }}
              data-m="cascade"
              data-m-stagger=""
            >
              <Img media={siege.image} size="vignette" className="siege-ph" />
              <div className="stack" style={{ gap: 8, maxWidth: 640 }}>
                <span className="eyebrow">{siege.surtitre}</span>
                <p className="h-m">{siege.titre}</p>
              </div>
              <Btn b={siege.boutons?.[0]} cls="rec-btn--primary" />
            </div>
          </div>
        </section>
      )}
      <JsonLd
        data={breadcrumbLd([
          { nom: 'Le réseau', chemin: '/le-reseau' },
          { nom: 'Antennes', chemin: '/le-reseau/antennes' },
        ])}
      />
    </>
  )
}
