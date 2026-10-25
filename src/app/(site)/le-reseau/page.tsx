import type { Metadata } from 'next'
import React from 'react'

import { Avatar, Boutons, Btn, KeyFigures, SecHead } from '@/components/site/Blocks'
import { Img } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { SubNav } from '@/components/site/SubNav'
import { Words } from '@/components/site/Words'
import { getPeople } from '@/lib/site/data'
import { block, getPage, type CartesBlock } from '@/lib/site/payload'
import { breadcrumbLd, pageMetadata } from '@/lib/site/seo'
import { getKeyFigures } from '@/lib/site/settings'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/le-reseau', { fallbackTitle: 'Qui sommes-nous' })
}

/** Écran 02 : qui sommes-nous. */
export default async function LeReseau() {
  const [page, figs, people] = await Promise.all([
    getPage('/le-reseau'),
    getKeyFigures(),
    getPeople(),
  ])
  const hero = block(page, 'hero')
  const histoire = block(page, 'histoire')
  const but = block(page, 'but')
  const mission = block<CartesBlock>(page, 'mission')
  const objectifs = block<CartesBlock>(page, 'objectifs')
  const organisation = block<CartesBlock>(page, 'organisation')
  const comite = block(page, 'comite')
  const valeurs = block<CartesBlock>(page, 'valeurs')
  const moyens = block<CartesBlock>(page, 'moyens')
  const chiffres = block(page, 'chiffres')
  const statuts = block(page, 'statuts')
  const membresComite = people.filter((p) => p.role !== 'expert')

  return (
    <>
      <div className="subbar">
        <div className="wrap">
          <SubNav />
        </div>
      </div>
      {hero && (
        <section className="pband pband-tall">
          <Img media={hero.image} m={{ m: 'iris' }} priority />
          <div className="wrap">
            <div className="ptext">
              <span className="eyebrow" data-m="rise" data-m-d="1">
                {hero.surtitre}
              </span>
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
            </div>
          </div>
          {hero.note && (
            <span className="pcap" data-m="rise" data-m-d="8">
              {hero.note}
            </span>
          )}
        </section>
      )}

      {(histoire || but) && (
        <section className="band bg-white">
          <div className="wrap ed2">
            {histoire && (
              <div className="stack" style={{ gap: 16 }} data-m="cascade" data-m-stagger="">
                <span className="eyebrow">{histoire.surtitre}</span>
                <h2 className="h-l">{histoire.titre}</h2>
                <p className="muted">{histoire.texte}</p>
              </div>
            )}
            {but && (
              <div
                className="stack"
                style={{ gap: 16 }}
                data-m="cascade"
                data-m-stagger=""
                data-m-d="3"
              >
                <span className="eyebrow">{but.surtitre}</span>
                <p className="quote-xl">{but.texte}</p>
                {but.note && <p className="small muted">{but.note}</p>}
              </div>
            )}
          </div>
        </section>
      )}

      {mission?.cartes?.length ? (
        <section className="band bg-night dark net" data-m="bloom" data-m-scrub="">
          <div className="wrap">
            <SecHead surtitre={mission.surtitre} titre={mission.titre} d="3" />
            <div className="pil" data-m="nodes" data-m-stagger="">
              {mission.cartes.map((p, i) => (
                <div className="pil-i" key={p.titre}>
                  <div className="av">{i + 1}</div>
                  <h3 className="h-m">{p.titre}</h3>
                  <p className="muted">{p.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {objectifs?.cartes?.length ? (
        <section className="band">
          <div className="wrap ed2">
            <div className="stack" style={{ gap: 10 }} data-m="rise">
              <span className="eyebrow">{objectifs.surtitre}</span>
              <h2 className="h-l">{objectifs.titre}</h2>
              {objectifs.reference && <span className="small muted">{objectifs.reference}</span>}
            </div>
            <div className="letters" data-m="letters" data-m-stagger="">
              {objectifs.cartes.map((o, i) => (
                <div className="letters-i" key={i}>
                  <b aria-hidden="true">{String.fromCharCode(97 + i)}</b>
                  <p>{o.titre}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {organisation?.cartes?.length ? (
        <section className="band bg-tint trame" data-m="net">
          <div className="wrap">
            <SecHead surtitre={organisation.surtitre} titre={organisation.titre} />
            <div className="orbit" data-m="line" data-m-stagger="">
              {organisation.cartes.map((o, i) => (
                <div className="orbit-item" key={o.titre}>
                  <span className="orbit-n">{i + 1}</span>
                  <div>
                    <h3 className="h-s">{o.titre}</h3>
                    <p className="small muted">{o.texte}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {comite && membresComite.length > 0 && (
        <section className="band bg-white">
          <div className="wrap">
            <SecHead surtitre={comite.surtitre} titre={comite.titre} bouton={comite.boutons?.[0]} />
            <div className="cdir-strip" data-m="gather" data-m-stagger="">
              {membresComite.map((c) => (
                <div className="cdir-mini" key={c.id}>
                  <Avatar nom={c.nom} initiales={c.initiales} photo={c.photo} />
                  <p className="small" style={{ fontWeight: 600 }}>
                    {c.nom}
                  </p>
                  <p className="xs muted">{c.fonction}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {valeurs?.cartes?.length ? (
        <section className="band bg-green dark rings rings-w" data-m="ripple" data-m-scrub="">
          <div className="wrap">
            <SecHead
              surtitre={valeurs.surtitre}
              titre={valeurs.titre}
              style={{ marginBottom: 36 }}
            />
            <div className="val" data-m="cascade" data-m-stagger="" data-m-d="2">
              {valeurs.cartes.map((v) => (
                <div className="val-i" key={v.titre}>
                  <h3 className="h-m">{v.titre}</h3>
                  <p className="muted">{v.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {moyens?.cartes?.length ? (
        <section className="band bg-warm band-s">
          <div className="wrap">
            <SecHead
              surtitre={moyens.surtitre}
              titre={moyens.titre}
              extra={
                moyens.reference ? <span className="small muted">{moyens.reference}</span> : null
              }
            />
            <div className="chips bigchips" data-m="pops" data-m-stagger="" data-m-d="2">
              {moyens.cartes.map((m) => (
                <span className="chip chip-static" key={m.titre}>
                  {m.titre}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {(chiffres || statuts) && (
        <section className="band">
          <div className="wrap">
            {chiffres && figs.length > 0 && (
              <>
                <SecHead surtitre={chiffres.surtitre} titre={chiffres.titre} />
                <KeyFigures figs={figs} />
                {chiffres.note && (
                  <p className="small muted" style={{ marginTop: 16 }} data-m="rise" data-m-d="5">
                    {chiffres.note}
                  </p>
                )}
              </>
            )}
            {statuts && (
              <div
                data-m="lift"
                data-m-d="2"
                className="card-soft"
                style={{
                  marginTop: 28,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p className="h-s">{statuts.titre}</p>
                  <p className="small muted">{statuts.texte}</p>
                </div>
                <Btn b={statuts.boutons?.[0]} />
              </div>
            )}
          </div>
        </section>
      )}
      <JsonLd data={breadcrumbLd([{ nom: 'Le réseau', chemin: '/le-reseau' }])} />
    </>
  )
}
