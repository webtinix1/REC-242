import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { Img, initialesDe, Lnk } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { SubNav } from '@/components/site/SubNav'
import { Words } from '@/components/site/Words'
import { POLES } from '@/collections/People'
import { getProfil, tagNames, type Profil } from '@/lib/site/data'
import { isPreview } from '@/lib/site/payload'
import { breadcrumbLd, metadataFor } from '@/lib/site/seo'

type Params = Promise<{ slug: string }>
type Entree = NonNullable<NonNullable<Profil['rubriques']>[number]['entrees']>[number]

const lignes = (s?: string | null) =>
  (s ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const p = await getProfil(slug, await isPreview())
  if (!p) return {}
  const meta = await metadataFor(`/le-reseau/gouvernance/${slug}`, {
    title: p.nom,
    description: p.presentation || `${p.nom}, ${p.fonction}.`,
    image: p.photo,
  })
  // Fiche encore vide : la page existe pour le lien depuis la gouvernance, mais n'a rien à proposer aux moteurs de recherche.
  return p.presentation ? meta : { ...meta, robots: { index: false } }
}

const Points = ({ texte }: { texte?: string | null }) => {
  const points = lignes(texte)
  return points.length ? (
    <ul className="pf-points">
      {points.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  ) : null
}

const Detail = ({ e }: { e: Entree }) => (
  <>
    <h3 className="h-s">{e.titre}</h3>
    {e.organisation && <p className="pf-org">{e.organisation}</p>}
    {e.description && <p className="muted small">{e.description}</p>}
    <Points texte={e.points} />
  </>
)

const Quand = ({ e }: { e: Entree }) =>
  e.periode || e.lieu ? (
    <p className="pf-quand">
      {e.periode}
      {e.lieu && <span>{e.lieu}</span>}
    </p>
  ) : null

/** Page de profil d'un membre du comité, ouverte depuis la gouvernance. Les coordonnées ne sont jamais affichées. */
export default async function ProfilComite({ params }: { params: Params }) {
  const { slug } = await params
  const p = await getProfil(slug, await isPreview())
  if (!p) notFound()

  const pole = p.pole && p.pole !== 'direction' ? POLES.find((x) => x.value === p.pole)?.label : undefined
  const tags = tagNames(p)
  const domaines = lignes(p.domaines)
  const rubriques = (p.rubriques ?? []).filter((r) => r.entrees?.length)
  const competences = p.competences ?? []
  const chiffres = p.chiffres ?? []

  return (
    <>
      <section className="band bg-night dark net phead" data-m="head">
        <div className="wrap">
          <SubNav />
          <div className="pf-id">
            <div className="pf-portrait" data-m="rise" data-m-d="1">
              {p.initiales || initialesDe(p.nom)}
              <Img media={p.photo} size="carte" alt={p.nom} sizes="240px" priority />
            </div>
            <div className="stack" style={{ gap: 14 }}>
              <span className="eyebrow" data-m="rise" data-m-d="1">
                {p.accroche || 'Comité de direction'}
              </span>
              <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
                <Words text={p.nom} />
              </h1>
              <p className="lead" data-m="rise" data-m-d="3">
                {p.fonction}
              </p>
              {pole && <p className="muted">Pôle {pole}</p>}
              {p.lieu && <p className="muted">{p.lieu}</p>}
              {tags.length > 0 && (
                <div className="tagrow">
                  {tags.map((t) => (
                    <span className="xtag" key={t}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {(chiffres.length > 0 || p.presentation) && (
        <section className="band bg-white">
          <div className="wrap">
            {chiffres.length > 0 && (
              <dl className="pf-chiffres" data-m="rise">
                {chiffres.map((c) => (
                  <div key={c.libelle}>
                    <dt>{c.valeur}</dt>
                    <dd>{c.libelle}</dd>
                  </div>
                ))}
              </dl>
            )}
            {p.presentation && (
              <div className="pf-corps">
                <h2 className="h-l" data-m="rise">
                  Profil
                </h2>
                <p className="lead" data-m="rise" data-m-d="1">
                  {p.presentation}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {rubriques.map((r, i) => (
        <section className={`band ${i % 2 ? 'bg-white' : 'bg-sand50'}`} key={r.id ?? r.titre}>
          <div className="wrap stack" style={{ gap: 28 }}>
            <h2 className="h-l" data-m="rise">
              {r.titre}
            </h2>
            {r.disposition === 'cartes' ? (
              <div className="pf-cartes">
                {r.entrees!.map((e) => (
                  <article className="card" key={e.id ?? e.titre}>
                    <Quand e={e} />
                    <Detail e={e} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="pf-chrono">
                {r.entrees!.map((e) => (
                  <article className="pf-entree" key={e.id ?? e.titre}>
                    <Quand e={e} />
                    <div style={{ gridColumn: e.periode || e.lieu ? undefined : '1 / -1' }}>
                      <Detail e={e} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}

      {(competences.length > 0 || domaines.length > 0) && (
        <section className="band bg-tint">
          <div className="wrap stack" style={{ gap: 28 }}>
            <h2 className="h-l" data-m="rise">
              Compétences
            </h2>
            {competences.length > 0 && (
              <div className="pf-comp">
                {competences.map((c) => (
                  <div key={c.titre}>
                    <h3 className="h-s">{c.titre}</h3>
                    {c.texte && <p className="muted small">{c.texte}</p>}
                  </div>
                ))}
              </div>
            )}
            {domaines.length > 0 && (
              <div className="tagrow" aria-label="Domaines et outils">
                {domaines.map((d) => (
                  <span className="xtag" key={d}>
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="band band-s band-end">
        <div className="wrap">
          <Lnk href="/le-reseau/gouvernance" className="rec-btn rec-btn--secondary">
            Retour à la gouvernance
          </Lnk>
        </div>
      </section>
      <JsonLd
        data={breadcrumbLd([
          { nom: 'Le réseau', chemin: '/le-reseau' },
          { nom: 'Gouvernance', chemin: '/le-reseau/gouvernance' },
          { nom: p.nom, chemin: `/le-reseau/gouvernance/${slug}` },
        ])}
      />
    </>
  )
}
