import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Img } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import {
  accesLabel,
  disque,
  estPasse,
  evenementsPublics,
  heureLieu,
  placesInfo,
  tax,
} from '@/lib/evenements/site'
import { placesParEvenement } from '@/lib/evenements/lecture'
import { block, getPage } from '@/lib/site/payload'
import { breadcrumbLd, metadataFor } from '@/lib/site/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return metadataFor('/agenda', {
    title: 'Agenda',
    description: 'Les prochains rendez-vous de REC 242 : afterworks, ateliers, rencontres B2B et conférences.',
  })
}

type SP = Promise<{ onglet?: string; ville?: string; type?: string }>

/** Écran 14 : agenda. Onglets et filtres en liens dans l'adresse. */
export default async function Agenda({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const passes = sp.onglet === 'passes'
  const [tous, accueil] = await Promise.all([evenementsPublics(), getPage('/')])
  const periode = tous.filter((e) => (passes ? estPasse(e) : !estPasse(e)))
  if (passes) periode.reverse()

  const villes = new Map<string, string>()
  const types = new Map<string, string>()
  for (const e of periode) {
    const v = tax(e.ville)
    const t = tax(e.type)
    if (v?.slug) villes.set(v.slug, v.nom)
    if (t?.slug) types.set(t.slug, t.nom)
  }
  const ville = villes.has(sp.ville ?? '') ? sp.ville : undefined
  const type = types.has(sp.type ?? '') ? sp.type : undefined
  const liste = passes
    ? periode
    : periode.filter((e) => (!ville || tax(e.ville)?.slug === ville) && (!type || tax(e.type)?.slug === type))
  const places = await placesParEvenement(liste)

  const href = (q: { onglet?: string; ville?: string; type?: string }) => {
    const p = new URLSearchParams()
    if (q.onglet) p.set('onglet', q.onglet)
    if (q.ville) p.set('ville', q.ville)
    if (q.type) p.set('type', q.type)
    const s = p.toString()
    return `/agenda${s ? `?${s}` : ''}`
  }
  const image = block(accueil, 'hero')?.image

  return (
    <>
      <section className="pband pband-b">
        <Img media={image} alt="" m={{ m: 'iris' }} style={{ objectPosition: '50% 25%' }} priority />
        <div className="wrap" style={{ paddingBottom: 104 }}>
          <div className="ptext">
            <span className="eyebrow" data-m="rise" data-m-d="1">
              Agenda
            </span>
            <h1 className="h-xxl" data-m="words" data-m-stagger="" data-m-d="1">
              <span className="mw">
                <span>Nos</span>
              </span>{' '}
              <span className="mw">
                <span>rendez-</span>
              </span>
              <span className="mw">
                <span>vous</span>
              </span>
            </h1>
            <nav className="chips dark" aria-label="Période" data-m="pops" data-m-stagger="" data-m-d="4">
              <Link href="/agenda" className={`chip${passes ? '' : ' is-on'}`} aria-current={passes ? undefined : 'true'}>
                À venir
              </Link>
              <Link href="/agenda?onglet=passes" className={`chip${passes ? ' is-on' : ''}`} aria-current={passes ? 'true' : undefined}>
                Passés
              </Link>
            </nav>
          </div>
        </div>
      </section>

      <section className="band bg-warm band-t0 ovis band-end">
        <div className="wrap stack" style={{ gap: 20 }}>
          {!passes && (villes.size > 0 || types.size > 0) && (
            <div className="filters card overlap shadow" data-m="lift" data-m-d="3">
              <div className="fgrid fgrid-2">
                <div>
                  <p className="flabel">Ville</p>
                  <div className="chips chips-sm">
                    {[['', 'Toutes'], ...villes].map(([slug, nom]) => (
                      <Link
                        key={slug}
                        scroll={false}
                        href={href({ ville: slug || undefined, type })}
                        className={`chip${(ville ?? '') === slug ? ' is-on' : ''}`}
                        aria-current={(ville ?? '') === slug ? 'true' : undefined}
                      >
                        {nom}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="flabel">Type</p>
                  <div className="chips chips-sm">
                    {[['', 'Tous'], ...types].map(([slug, nom]) => (
                      <Link
                        key={slug}
                        scroll={false}
                        href={href({ ville, type: slug || undefined })}
                        className={`chip${(type ?? '') === slug ? ' is-on' : ''}`}
                        aria-current={(type ?? '') === slug ? 'true' : undefined}
                      >
                        {nom}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {liste.length === 0 && (
            <div className="empty">
              <div className="av sand">0</div>
              <p className="h-s">Aucun rendez-vous ne correspond à ces filtres</p>
              <Link href={href({ onglet: passes ? 'passes' : undefined })} className="rec-btn rec-btn--secondary">
                Voir tous les rendez-vous
              </Link>
            </div>
          )}

          <div className="stack" style={{ gap: 12 }} data-m="deal" data-m-stagger="" data-m-d="4">
            {liste.map((e) => {
              const d = disque(e)
              const p = placesInfo(e, places.get(e.id))
              return (
                <Link key={e.id} href={`/agenda/${e.slug}`} className="card ev-row">
                  <div className="datedisc">
                    <b>{d.d}</b>
                    <span>{d.m}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rec-row">
                      {tax(e.type) && <span className="rec-tag">{tax(e.type)!.nom}</span>}
                      <span className="pill-type">{accesLabel(e.acces)}</span>
                    </div>
                    <p className="h-s" style={{ marginTop: 6 }}>
                      {e.titre}
                    </p>
                    <p className="small muted">{heureLieu(e)}</p>
                  </div>
                  {p && <span className={`seat ${p.classe}`}>{p.texte}</span>}
                  {e.image && typeof e.image !== 'number' && (
                    <span className="pick evthumb">
                      <Img media={e.image} size="vignette" alt="" style={{ display: 'block' }} />
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
          {passes && liste.length > 0 && (
            <p className="small muted">Chaque rendez-vous passé garde son compte rendu et ses photos.</p>
          )}
        </div>
      </section>
      <JsonLd data={breadcrumbLd([{ nom: 'Agenda', chemin: '/agenda' }])} />
    </>
  )
}
