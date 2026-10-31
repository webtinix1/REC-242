import type { Metadata } from 'next'
import React from 'react'

import { Avatar, Btn, Img, initialesDe, Lnk } from '@/components/site/Blocks'
import { ExpertsFilter, type XPerson } from '@/components/site/ExpertsFilter'
import { JsonLd } from '@/components/site/JsonLd'
import { SubNav } from '@/components/site/SubNav'
import { Words } from '@/components/site/Words'
import { POLES } from '@/collections/People'
import { dateLong } from '@/lib/site/format'
import { docHref, getPeople, getTextesOfficiels, profilHref, tagNames } from '@/lib/site/data'
import { block, getPage, getPayloadClient, mediaUrl, type CartesBlock } from '@/lib/site/payload'
import { breadcrumbLd, pageMetadata } from '@/lib/site/seo'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/le-reseau/gouvernance', { fallbackTitle: 'Gouvernance' })
}

const ROLE_LABEL: Record<string, string> = {
  fondatrice: 'Fondatrice',
  comite: 'Comité de direction',
  expert: 'Expert du réseau',
}
const poleLabel = (v?: string) => POLES.find((p) => p.value === v)?.label ?? ''

/** Écran 03 : gouvernance. */
export default async function Gouvernance() {
  const [page, people, textes, payload] = await Promise.all([
    getPage('/le-reseau/gouvernance'),
    getPeople(),
    getTextesOfficiels(),
    getPayloadClient(),
  ])
  const filtres = await payload.find({
    collection: 'expertiseTags',
    where: { filtreSite: { equals: true } },
    sort: 'ordre',
    limit: 50,
    depth: 0,
  })
  const hero = block(page, 'hero')
  const comiteS = block(page, 'comite')
  const contact = block(page, 'contact')
  const experts = block(page, 'experts')
  const citation = block(page, 'citation')
  const organigramme = block(page, 'organigramme')
  const organes = block<CartesBlock>(page, 'organes')
  const textesS = block(page, 'textes')

  const fondatrice = people.find((p) => p.role === 'fondatrice')
  const comite = people.filter((p) => p.role === 'comite')
  const xpeople: XPerson[] = people.map((p) => ({
    id: p.id,
    nom: p.nom,
    ini: p.initiales || initialesDe(p.nom),
    photo: mediaUrl(p.photo, 'vignette'),
    fonction: p.fonction,
    role: ROLE_LABEL[p.role],
    tags: tagNames(p),
    href: profilHref(p),
  }))
  const poles = POLES.filter((p) => p.value !== 'direction')
    .map((p) => ({ t: p.label, gens: comite.filter((c) => c.pole === p.value) }))
    .filter((p) => p.gens.length)

  return (
    <>
      <section className="band bg-night dark net phead" data-m="head">
        <div className="wrap">
          <SubNav />
          <div className="stack" style={{ gap: 20 }}>
            <span className="eyebrow" data-m="rise" data-m-d="1">
              {hero?.surtitre || 'Gouvernance'}
            </span>
            <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
              <Words text={hero?.titre || 'Gouvernance'} />
            </h1>
            {hero?.texte && (
              <p className="lead" data-m="rise" data-m-d="4">
                {hero.texte}
              </p>
            )}
            {fondatrice && (
              <div className="fond" style={{ marginTop: 20 }} data-m="rise" data-m-d="6">
                <Avatar
                  nom={fondatrice.nom}
                  initiales={fondatrice.initiales}
                  photo={fondatrice.photo}
                  className="lead-disc av-photo"
                  m={{ m: 'disc', d: '7' }}
                />
                <div className="stack" style={{ gap: 6 }}>
                  <span className="eyebrow">Fondatrice</span>
                  <p className="h-l">{fondatrice.nom}</p>
                  <p className="muted">{fondatrice.fonction}</p>
                  {profilHref(fondatrice) && (
                    <Lnk href={profilHref(fondatrice)!} className="linkbtn">
                      Voir le profil
                    </Lnk>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {comite.length > 0 && (
        <section className="band bg-white">
          <div className="wrap stack" style={{ gap: 24 }}>
            <h2 className="h-l" data-m="rise">
              {comiteS?.titre || 'Le comité de direction'}
            </h2>
            <div className="g3 cdir-grid" data-m="nodes" data-m-stagger="">
              {comite.map((c) => (
                <Lnk href={profilHref(c) ?? '/le-reseau/gouvernance'} className="card cdir-card" key={c.id}>
                  <Avatar nom={c.nom} initiales={c.initiales} photo={c.photo} />
                  <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                    <p className="h-s">{c.nom}</p>
                    <p className="small">{c.fonction}</p>
                    {c.pole && <p className="xs muted">Pôle {poleLabel(c.pole)}</p>}
                    <div className="tagrow">
                      {tagNames(c).map((t) => (
                        <span className="xtag" key={t}>
                          #{t}
                        </span>
                      ))}
                    </div>
                    <span className="cdir-plus">Voir le profil</span>
                  </div>
                </Lnk>
              ))}
              {contact && (
                <div className="card-soft" style={{ justifyContent: 'center' }}>
                  <p className="h-s">{contact.titre}</p>
                  <p className="muted small">{contact.texte}</p>
                  <Btn
                    b={contact.boutons?.[0]}
                    cls="rec-btn--primary"
                    style={{ width: 'max-content' }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {experts && (
        <section className="band bg-sand50" id="experts">
          <div className="wrap stack" style={{ gap: 22 }}>
            <div
              className="rec-row"
              style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}
            >
              <div className="stack" style={{ gap: 8 }}>
                <span className="eyebrow" data-m="rise">
                  {experts.surtitre}
                </span>
                <h2 className="h-l" data-m="rise" data-m-d="1">
                  {experts.titre}
                </h2>
                <p className="muted" style={{ maxWidth: 640 }} data-m="rise" data-m-d="2">
                  {experts.texte}
                </p>
              </div>
              <Btn
                b={experts.boutons?.[0]}
                cls="rec-btn--primary acct-link"
                m={{ m: 'pop', d: '3' }}
              />
            </div>
            <ExpertsFilter
              people={xpeople}
              tags={filtres.docs.map((t) => (t as unknown as { nom: string }).nom)}
            />
            {experts.note && <p className="small muted">{experts.note}</p>}
          </div>
        </section>
      )}

      {citation && (
        <section className="pband pband-r pband-short">
          <Img media={citation.image} m={{ m: 'iris', parallax: true }} />
          <div className="wrap">
            <div className="ptext" data-m="cascade" data-m-stagger="" data-m-d="3">
              <span className="eyebrow">{citation.surtitre}</span>
              <p className="quote-xl">{citation.texte}</p>
            </div>
          </div>
        </section>
      )}

      {organigramme && fondatrice && (
        <section className="band bg-tint trame" data-m="net">
          <div className="wrap">
            <h2 className="h-l" style={{ marginBottom: 28 }} data-m="rise">
              {organigramme.titre}
            </h2>
            <div className="org" data-m="org">
              <Lnk href={profilHref(fondatrice) ?? '/le-reseau/gouvernance'} className="org-node org-top">
                {fondatrice.nom}
                <span>{fondatrice.fonction}</span>
              </Lnk>
              <div className="org-line" aria-hidden="true" />
              <div className="cdir-poles" data-m-stagger="">
                {poles.map((p) => (
                  <div className="cdir-pole" key={p.t}>
                    <p className="cdir-pole-t">{p.t}</p>
                    {p.gens.map((g) => (
                      <Lnk href={profilHref(g) ?? '/le-reseau/gouvernance'} className="cdir-person" key={g.id}>
                        <Avatar
                          nom={g.nom}
                          initiales={g.initiales}
                          photo={g.photo}
                          className="av av-xs av-photo"
                        />
                        <div>
                          <p className="small" style={{ fontWeight: 600 }}>
                            {g.nom}
                          </p>
                          <p className="xs muted">{g.fonction}</p>
                        </div>
                      </Lnk>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {organigramme.note && (
              <p
                className="small muted"
                style={{ marginTop: 24, textAlign: 'center' }}
                data-m="rise"
                data-m-d="8"
              >
                {organigramme.note}
              </p>
            )}
          </div>
        </section>
      )}

      {organes?.cartes?.length ? (
        <section className="band">
          <div className="wrap ed2">
            <h2 className="h-l" data-m="rise">
              {organes.titre}
            </h2>
            <div className="letters" data-m="letters" data-m-stagger="">
              {organes.cartes.map((o, i) => (
                <div className="letters-i" key={o.titre}>
                  <b aria-hidden="true">{i + 1}</b>
                  <div>
                    <h3 className="h-s">{o.titre}</h3>
                    <p className="muted" style={{ fontSize: 16, lineHeight: '26px' }}>
                      {o.texte}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {textesS && textes.length > 0 && (
        <section className="band bg-warm band-s band-end">
          <div className="wrap">
            <h2 className="h-l" style={{ marginBottom: 24 }} data-m="rise">
              {textesS.titre}
            </h2>
            <div className="g3" data-m="deal" data-m-stagger="">
              {textes
                .filter((d) => !/^Bulletin/i.test(d.titre))
                .map((d) => (
                  <Lnk
                    key={d.id}
                    href={d.visibilite === 'public' ? docHref(d) : '/espace-membre/documents'}
                    className="card"
                    style={{ padding: 24 }}
                  >
                    <p className="h-s">{d.titre.replace(/ de l’association$/, '')}</p>
                    <p className="small muted">
                      PDF{d.dateDocument ? ` · ${dateLong(d.dateDocument)}` : ''}
                      {d.visibilite !== 'public' ? ' · réservé aux membres' : ''}
                    </p>
                  </Lnk>
                ))}
            </div>
          </div>
        </section>
      )}
      <JsonLd
        data={breadcrumbLd([
          { nom: 'Le réseau', chemin: '/le-reseau' },
          { nom: 'Gouvernance', chemin: '/le-reseau/gouvernance' },
        ])}
      />
    </>
  )
}
