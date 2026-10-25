import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Words } from '@/components/site/Words'

export const metadata: Metadata = { title: 'Page introuvable', robots: { index: false } }

/** Écran 28 : erreur 404. */
export default function NotFound() {
  return (
    <>
      <section className="band bg-night dark net" data-m="head">
        <div className="wrap phead-grid">
          <div className="stack" style={{ gap: 20 }}>
            <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
              <Words text="Cette page a quitté le cercle" />
            </h1>
            <p className="lead" data-m="rise" data-m-d="5">
              Elle a peut-être été déplacée ou n’existe plus.
            </p>
            <form
              action="/recherche"
              method="get"
              role="search"
              data-m="lift"
              data-m-d="6"
              className="searchbar lite"
              style={{ width: '100%', maxWidth: 560 }}
            >
              <label htmlFor="b-404" className="sr">
                Rechercher
              </label>
              <input
                id="b-404"
                name="q"
                className="rec-input"
                type="search"
                placeholder="Rechercher sur le site"
              />
              <button type="submit" className="rec-btn rec-btn--primary">
                Rechercher
              </button>
            </form>
          </div>
          <p
            className="e404"
            aria-hidden="true"
            style={{ justifySelf: 'center' }}
            data-m="disc"
            data-m-d="2"
          >
            404
          </p>
        </div>
      </section>
      <section className="band bg-warm band-s band-end">
        <div
          className="wrap rec-row"
          style={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <p className="h-m" data-m="rise">
            Liens utiles
          </p>
          <div className="rec-row" data-m="pops" data-m-stagger="" data-m-d="2">
            <Link href="/" className="rec-btn rec-btn--secondary">
              Accueil
            </Link>
            <Link href="/agenda" className="rec-btn rec-btn--secondary">
              Agenda
            </Link>
            <Link href="/adherer" className="rec-btn rec-btn--primary">
              Adhérer
            </Link>
            <Link href="/plan-du-site" className="rec-btn rec-btn--ghost">
              Plan du site
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
