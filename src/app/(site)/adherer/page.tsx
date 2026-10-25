import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Boutons, Img, Lnk, SecHead } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { Words } from '@/components/site/Words'
import { categorie, CATEGORIES, fcfa, montants, type Tarifs } from '@/lib/adhesion/categories'
import { getFaq } from '@/lib/site/data'
import { block, getPage, getPayloadClient, type CartesBlock, type Media } from '@/lib/site/payload'
import { breadcrumbLd, pageMetadata } from '@/lib/site/seo'
import { getSettings } from '@/lib/site/settings'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/adherer', { fallbackTitle: 'Adhérer' })
}

type Comparatif = {
  titre?: string
  lignes?: { libelle: string; visiteur?: boolean; membre?: boolean }[]
}
type Statuts = {
  titre?: string
  lignes?: { nom: string; categorie: string; pour?: string; droits?: string }[]
}
type Temoignage = {
  id: number
  citation: string
  personne: string
  entreprise?: string
  photo?: Media | number | null
  logo?: Media | number | null
}

const NOMBRES = ['zéro', 'une', 'deux', 'trois', 'quatre']

/** Écran 09 : adhérer. Montants, total de la première année et tranches calculés depuis les Paramètres (onglet Tarifs). */
export default async function Adherer() {
  const [page, s, faq, payload] = await Promise.all([
    getPage('/adherer'),
    getSettings(),
    getFaq('adherer'),
    getPayloadClient(),
  ])
  const tarifs = s.tarifs as Tarifs | undefined
  const hero = block(page, 'hero')
  const avantages = block<CartesBlock>(page, 'avantages')
  const qui = block(page, 'qui')
  const comparatif = block(page, 'comparatif') as Comparatif | undefined
  const cats = block(page, 'categories')
  const statuts = block(page, 'statuts') as Statuts | undefined
  const parcours = block<CartesBlock>(page, 'parcours')
  const temBlock = block(page, 'temoignages') as
    { titre?: string; temoignages?: (number | Temoignage)[] } | undefined
  const faqS = block(page, 'faq')
  const ids = (temBlock?.temoignages ?? []).map((t) => (typeof t === 'number' ? t : t.id))
  const temoignages = ids.length
    ? ((
        await payload.find({
          collection: 'testimonials',
          where: { and: [{ id: { in: ids } }, { accordPublication: { equals: true } }] },
          depth: 1,
          overrideAccess: false,
        })
      ).docs as unknown as Temoignage[])
    : []
  temoignages.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
  const tranches = tarifs?.tranchesMax ?? 2
  const delai = tarifs?.delaiMois ?? 3
  const cartes = CATEGORIES.filter((c) => ['A', 'B', 'C'].includes(c.valeur))
    .map((c) => ({ c, m: montants(c, tarifs) }))
    .filter((x) => x.m)
  const montantStatut = (code: string) => {
    const c = categorie(code)
    if (c?.convention) return 'Fixé par convention'
    const m = montants(c, tarifs)
    return m
      ? `${m.droit.toLocaleString('fr-FR').replace(/[  ]/g, ' ')} + ${fcfa(m.cotisation)}`
      : ''
  }

  return (
    <>
      {hero && (
        <section className="band bg-warm phead">
          <div className="wrap phead-grid">
            <div className="stack" style={{ gap: 20 }}>
              <span className="eyebrow" data-m="rise" data-m-d="1">
                {hero.surtitre}
              </span>
              <h1 className="h-xxl" data-m="words" data-m-stagger="" data-m-d="1">
                <Words text={hero.titre} />
              </h1>
              {hero.texte && (
                <p className="lead" data-m="rise" data-m-d="4">
                  {hero.texte}
                </p>
              )}
              <Boutons
                boutons={hero.boutons}
                styles={['rec-btn--primary', 'rec-btn--ghost']}
                m={{ m: 'pops', stagger: true, d: '5' }}
              />
              {hero.note && (
                <p className="small muted" data-m="rise" data-m-d="7">
                  {hero.note}
                </p>
              )}
            </div>
            {hero.image ? (
              <figure className="phead-photo" data-m="iris" data-m-d="2">
                <Img media={hero.image} priority sizes="(max-width: 768px) 100vw, 50vw" />
              </figure>
            ) : null}
          </div>
        </section>
      )}

      {avantages?.cartes?.length ? (
        <section className="band bg-white">
          <div className="wrap">
            <SecHead surtitre={avantages.surtitre} titre={avantages.titre} />
            <div className="g3" data-m="nodes" data-m-stagger="">
              {avantages.cartes.map((a) => (
                <div className="card adv" key={a.titre}>
                  <span className="adv-dot" aria-hidden="true" />
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

      {(qui || comparatif?.lignes?.length) && (
        <section className="band bg-tint trame" data-m="net">
          <div className="wrap ed2">
            {qui && (
              <div className="stack" style={{ gap: 16 }} data-m="rise">
                <span className="eyebrow">{qui.surtitre}</span>
                <p className="h-m">{qui.texte}</p>
              </div>
            )}
            {comparatif?.lignes?.length ? (
              <div className="stack" style={{ gap: 16 }}>
                <h2 className="h-l" data-m="rise" data-m-d="2">
                  {comparatif.titre}
                </h2>
                <div className="tblwrap" data-m="table">
                  <table className="tbl tbl-cmp">
                    <thead>
                      <tr>
                        <th scope="col">Ce que vous pouvez faire</th>
                        <th scope="col">Visiteur</th>
                        <th scope="col">Membre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparatif.lignes.map((r) => (
                        <tr key={r.libelle}>
                          <td>{r.libelle}</td>
                          <td data-label="Visiteur">
                            <span className={`mark ${r.visiteur ? 'yes' : 'no'}`}>
                              {r.visiteur ? 'Oui' : 'Non'}
                            </span>
                          </td>
                          <td data-label="Membre">
                            <span className={`mark ${r.membre ? 'yes' : 'no'}`}>
                              {r.membre ? 'Oui' : 'Non'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {cats && cartes.length > 0 && (
        <section className="band bg-night dark net net-soft" data-m="bloom" data-m-scrub="">
          <div className="wrap">
            <SecHead surtitre={cats.surtitre} titre={cats.titre} />
            <div className="g3 catgrid" data-m="nodes" data-m-stagger="">
              {cartes.map(({ c, m }) => (
                <div className="catcard" style={{ cursor: 'default' }} key={c.valeur}>
                  <div className="letter">{c.lettre}</div>
                  <p className="h-s">{c.nom}</p>
                  <div className="line">
                    <span>Droit d’adhésion</span>
                    <b>{fcfa(m!.droit)}</b>
                  </div>
                  <div className="line">
                    <span>Cotisation annuelle</span>
                    <b>{fcfa(m!.cotisation)}</b>
                  </div>
                  <p className="small muted">Première année</p>
                  <p className="price">{fcfa(m!.total)}</p>
                  <p className="small muted">
                    ou {NOMBRES[tranches] ?? tranches} tranches de {fcfa(m!.tranche)} sous {delai}{' '}
                    mois
                  </p>
                  <Link
                    href={`/adherer/candidature?categorie=${c.valeur}`}
                    className="rec-btn rec-btn--secondary"
                  >
                    Choisir {c.lettre}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {statuts?.lignes?.length ? (
        <section className="band bg-white">
          <div className="wrap">
            <h2 className="h-l" style={{ marginBottom: 24 }} data-m="rise">
              {statuts.titre}
            </h2>
            <div className="tblwrap" data-m="table">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">Statut</th>
                    <th scope="col">Pour qui</th>
                    <th scope="col">Montant</th>
                    <th scope="col">Ce qu’il ouvre</th>
                  </tr>
                </thead>
                <tbody>
                  {statuts.lignes.map((m) => (
                    <tr key={m.nom}>
                      <td>
                        <b>{m.nom}</b>
                      </td>
                      <td data-label="Pour qui">{m.pour}</td>
                      <td data-label="Montant" className="mono">
                        {montantStatut(m.categorie)}
                      </td>
                      <td data-label="Ce qu’il ouvre">{m.droits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {parcours?.cartes?.length ? (
        <section className="band bg-green dark rings rings-w" data-m="ripple" data-m-scrub="">
          <div className="wrap">
            <SecHead
              surtitre={parcours.surtitre}
              titre={parcours.titre}
              style={{ marginBottom: 36 }}
            />
            <div className="path path-dark" data-m="line" data-m-stagger="">
              {parcours.cartes.map((p, i) => (
                <div className="path-step" key={p.titre}>
                  <div className="n">{i + 1}</div>
                  <div className="stack" style={{ gap: 6 }}>
                    <p className="h-s" style={{ fontSize: 17, lineHeight: '23px' }}>
                      {p.titre}
                    </p>
                    <p className="small muted">{p.texte}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {temoignages.length > 0 && (
        <section className="band bg-warm">
          <div className="wrap">
            <div className="stack" style={{ gap: 16 }}>
              <h2 className="h-l" data-m="rise">
                {temBlock?.titre}
              </h2>
              <div className="g2" data-m="deal" data-m-stagger="">
                {temoignages.map((t) => (
                  <div className="card testi" key={t.id}>
                    <p>« {t.citation} »</p>
                    <div className="person">
                      <span className="duo">
                        <Img
                          media={t.photo}
                          size="vignette"
                          className="duo-face"
                          alt={t.personne}
                        />
                        {t.logo ? (
                          <span className="logo-tile">
                            <Img
                              media={t.logo}
                              size="vignette"
                              alt={`Logo ${t.entreprise ?? ''}`}
                            />
                          </span>
                        ) : null}
                      </span>
                      <div>
                        <p className="h-s">{t.personne}</p>
                        {t.entreprise && <p className="small muted">{t.entreprise}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {faqS && faq.length > 0 && (
        <section className="band band-end">
          <div className="wrap">
            <div className="split">
              <div className="stack" data-m="rise">
                <span className="eyebrow">{faqS.surtitre}</span>
                <h2 className="h-l">{faqS.titre}</h2>
                {faqS.texte && <p className="muted">{faqS.texte}</p>}
                <Boutons boutons={faqS.boutons} />
              </div>
              <div
                className="stack"
                style={{ gap: 10 }}
                data-m="cascade"
                data-m-stagger=""
                data-m-d="2"
              >
                {faq.map((f) => (
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
      <JsonLd data={breadcrumbLd([{ nom: 'Adhérer', chemin: '/adherer' }])} />
    </>
  )
}
