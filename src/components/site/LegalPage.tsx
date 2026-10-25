import { notFound } from 'next/navigation'
import React from 'react'

import { Ex, Lnk } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { Words } from '@/components/site/Words'
import { block, getPage, type CartesBlock } from '@/lib/site/payload'
import { breadcrumbLd } from '@/lib/site/seo'

/** Écrans 25 à 27 : pages de texte légal (rubriques « legal-row »), bandeau « À valider » tant que le comité n'a pas relu. */
export async function LegalPage({
  chemin,
  head,
  foot,
}: {
  chemin: string
  head: string
  foot: string
}) {
  const page = await getPage(chemin)
  if (!page) notFound()
  const hero = block(page, 'hero')
  const rubriques = block<CartesBlock>(page, 'rubriques')?.cartes ?? []
  const liens = block<CartesBlock>(page, 'liens')?.cartes ?? []
  return (
    <>
      <section className={`band ${head} phead`} data-m="head">
        <div className="wrap stack" style={{ gap: 18, maxWidth: 940 }}>
          {hero?.surtitre && (
            <span className="eyebrow" data-m="rise" data-m-d="1">
              {hero.surtitre}
            </span>
          )}
          <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
            <Words text={hero?.titre || page.title} />
          </h1>
          {(hero?.aValider || hero?.note) && (
            <p data-m="rise" data-m-d="5">
              {hero.aValider && <Ex />} {hero.note}
            </p>
          )}
        </div>
      </section>
      {rubriques.length > 0 && (
        <section className="band bg-white">
          <div className="wrap" style={{ maxWidth: 940 }} data-m="cascade" data-m-stagger="">
            {rubriques.map((r) => (
              <div className="legal-row" key={r.titre}>
                <h2 className="h-s">{r.titre}</h2>
                {(r.texte ?? '').split(/\n+/).map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
      {liens.length > 0 && (
        <section className={`band ${foot} band-s band-end`}>
          <div
            className="wrap legal-links"
            style={{ maxWidth: 940 }}
            data-m="pops"
            data-m-stagger=""
          >
            {liens.map((l) => (
              <Lnk key={l.titre} href={l.lien || '/'} className="linkbtn">
                {l.titre} →
              </Lnk>
            ))}
          </div>
        </section>
      )}
      <JsonLd data={breadcrumbLd([{ nom: page.title, chemin }])} />
    </>
  )
}
