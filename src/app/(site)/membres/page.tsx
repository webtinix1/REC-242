import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { Words } from '@/components/site/Words'
import { fcfa } from '@/lib/adhesion/categories'
import {
  type Filtres,
  lireFiltres,
  listerAnnuaire,
  optionsFiltresUtilisees,
} from '@/lib/annuaire/donnees'
import { breadcrumbLd, metadataFor } from '@/lib/site/seo'
import { getSettings } from '@/lib/site/settings'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return metadataFor('/membres', {
    title: 'Annuaire',
    description:
      'Trouvez un membre du réseau par secteur, ville, commission ou taille, et découvrez comment figurer dans l’annuaire REC 242.',
  })
}

const ANN_WEB = [
  'Comprise dans l’adhésion, pour tout membre actif',
  'Fiche créée à l’activation du compte, publiée avec votre accord',
  'Mise à jour par vous depuis l’espace membre : présentation, services, logo, liens',
  'Nom, secteur et ville publics ; coordonnées réservées aux membres connectés',
]
const ANN_PAPIER = [
  'Une édition par an, remise à l’assemblée générale, aux partenaires et lors des événements',
  'Insertion standard incluse : nom, logo, secteur, ville et un contact au choix',
  'Pour les membres à jour de cotisation au 30 novembre',
  'Encarts publicitaires en option, dans la limite des pages disponibles',
]

type SP = Promise<Record<string, string | string[] | undefined>>

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join('')

const href = (f: Partial<Filtres>) => {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.secteur) p.set('secteur', f.secteur)
  if (f.ville) p.set('ville', f.ville)
  if (f.commission) p.set('commission', f.commission)
  if (f.taille) p.set('taille', f.taille)
  if (f.page && f.page > 1) p.set('page', String(f.page))
  const s = p.toString()
  return `/membres${s ? `?${s}` : ''}`
}

/** Écran 12 : annuaire. Filtres dans l'adresse, forme publique des fiches (aucune coordonnée). */
export default async function Annuaire({ searchParams }: { searchParams: SP }) {
  const f = lireFiltres(await searchParams)
  const [{ cartes, total, pages }, opts, settings] = await Promise.all([
    listerAnnuaire(f, false),
    optionsFiltresUtilisees(),
    getSettings(),
  ])
  const page = Math.min(f.page, Math.max(1, pages))
  const an = settings.annuaire ?? {}
  const encarts = [
    { t: 'Insertion standard', p: 'Incluse' },
    { t: 'Encart logo agrandi', p: fcfa(an.encartLogo) },
    { t: 'Demi-page', p: fcfa(an.encartDemiPage) },
    { t: 'Pleine page', p: fcfa(an.encartPleinePage) },
  ].filter((e) => e.p)
  const actif = Boolean(f.q || f.secteur || f.ville || f.commission || f.taille)

  const groupes: {
    cle: 'secteur' | 'ville' | 'commission' | 'taille'
    titre: string
    tous: string
    liste: { value: string; label: string }[]
  }[] = [
    { cle: 'secteur', titre: 'Secteur', tous: 'Tous', liste: opts.secteurs },
    { cle: 'ville', titre: 'Ville', tous: 'Toutes', liste: opts.villes },
    { cle: 'commission', titre: 'Commission', tous: 'Toutes', liste: opts.commissions },
    { cle: 'taille', titre: 'Taille', tous: 'Toutes', liste: opts.tailles },
  ]

  return (
    <>
      <section className="band bg-night dark net phead" style={{ paddingBottom: 112 }} data-m="head">
        <div className="wrap stack" style={{ gap: 20 }}>
          <span className="eyebrow" data-m="rise" data-m-d="1">
            Annuaire
          </span>
          <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
            <Words text="Trouvez un membre" />
          </h1>
        </div>
      </section>

      <section className="band band-t0 ovis">
        <div className="wrap stack" style={{ gap: 20 }}>
          <div className="filters card overlap shadow" data-m="lift" data-m-d="3">
            <form method="get" action="/membres" role="search">
              <div className="rec-field" style={{ maxWidth: 560 }}>
                <label htmlFor="b-q">Rechercher</label>
                <input
                  id="b-q"
                  name="q"
                  className="rec-input"
                  type="search"
                  defaultValue={f.q ?? ''}
                  maxLength={80}
                  placeholder="Raison sociale, activité, services"
                />
              </div>
              {f.secteur && <input type="hidden" name="secteur" value={f.secteur} />}
              {f.ville && <input type="hidden" name="ville" value={f.ville} />}
              {f.commission && <input type="hidden" name="commission" value={f.commission} />}
              {f.taille && <input type="hidden" name="taille" value={f.taille} />}
            </form>
            <div className="fgrid">
              {groupes.map((g) => (
                <div key={g.cle}>
                  <p className="flabel">{g.titre}</p>
                  <div className="chips chips-sm">
                    {[{ value: '', label: g.tous }, ...g.liste].map((o) => {
                      const on = (f[g.cle] ?? '') === o.value
                      return (
                        <Link prefetch={false}
                          key={o.value || 'tous'}
                          scroll={false}
                          href={href({ ...f, [g.cle]: o.value || undefined, page: 1 })}
                          className={`chip${on ? ' is-on' : ''}`}
                          aria-current={on ? 'true' : undefined}
                        >
                          {o.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="rec-row" style={{ justifyContent: 'space-between' }}>
              <p className="small muted">
                {total} membre(s) · les filtres sont conservés dans l’adresse de la page pour être
                partagés
              </p>
              <Link prefetch={false} href="/membres" className="linkbtn">
                Effacer les filtres
              </Link>
            </div>
          </div>

          {cartes.length === 0 && (
            <div className="empty">
              <div className="av sand">0</div>
              <p className="h-s">
                {actif ? 'Aucun membre ne correspond à ces filtres' : 'Aucun membre n’est encore répertorié'}
              </p>
              {actif && (
                <Link prefetch={false} href="/membres" className="rec-btn rec-btn--secondary">
                  Effacer les filtres
                </Link>
              )}
            </div>
          )}
          <div className="g3" data-m="cascade" data-m-stagger="">
            {cartes.map((m) => (
              <Link prefetch={false} key={m.slug} href={`/membres/${m.slug}`} className="card">
                <div className="person">
                  {m.logo ? (
                    <span className="logo-tile">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.logo} alt={`Logo ${m.nom}`} loading="lazy" decoding="async" />
                    </span>
                  ) : (
                    <span className="logo-tile logo-ini">{initiales(m.nom)}</span>
                  )}
                  <div>
                    <p className="h-s">{m.nom}</p>
                    <p className="small muted">{[m.secteur, m.ville].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                <div className="rec-row">
                  <span className="rec-tag">Catégorie {m.categorie}</span>
                  {m.depuis && <span className="pill-type">Depuis {m.depuis}</span>}
                </div>
                <span className="small" style={{ color: '#0b5e32', fontWeight: 600 }}>
                  Voir le profil →
                </span>
              </Link>
            ))}
          </div>
          {pages > 1 && (
            <nav className="pager" aria-label="Pagination">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link prefetch={false}
                  key={n}
                  href={href({ ...f, page: n })}
                  className={`pg${n === page ? ' is-on' : ''}`}
                  aria-label={`Page ${n}`}
                  aria-current={n === page ? 'page' : undefined}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>

      <section className="band bg-white" id="figurer">
        <div className="wrap stack" style={{ gap: 24 }}>
          <div className="stack" style={{ gap: 8, maxWidth: 760 }}>
            <span className="eyebrow" data-m="rise">
              Être répertorié
            </span>
            <h2 className="h-l" data-m="rise" data-m-d="1">
              L’annuaire REC 242, en ligne et sur papier
            </h2>
            <p className="muted" data-m="rise" data-m-d="2">
              Deux versions, mises à jour à partir des mêmes fiches. Voici les conditions pour y
              figurer.
            </p>
          </div>
          <div className="g2 dir-mod" data-m="deal" data-m-stagger="">
            <div className="card dir-card">
              <div className="rec-row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">Version web</span>
                <span className="rec-badge rec-badge--active">Incluse</span>
              </div>
              <h3 className="h-m">Annuaire en ligne</h3>
              <ul className="dir-list">
                {ANN_WEB.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <Link prefetch={false} href="/adherer" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }}>
                Adhérer pour figurer
              </Link>
            </div>
            <div className="card dir-card">
              <div className="rec-row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">Version papier</span>
                {an.edition && <span className="rec-badge rec-badge--pending">Édition {an.edition}</span>}
              </div>
              <h3 className="h-m">Annuaire imprimé</h3>
              <ul className="dir-list">
                {ANN_PAPIER.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <div className="dir-prices">
                {encarts.map((e) => (
                  <div className="line" key={e.t}>
                    <span>{e.t}</span>
                    <b className="mono">{e.p}</b>
                  </div>
                ))}
              </div>
              <Link prefetch={false}
                href="/contact?motif=autre&objet=Encart%20annuaire%20imprimé"
                className="rec-btn rec-btn--secondary"
                style={{ width: 'max-content' }}
              >
                Réserver un encart
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="band bg-tint trame band-s band-end" data-m="net">
        <div className="wrap ed2" style={{ alignItems: 'center' }}>
          <div className="stack" style={{ gap: 10 }} data-m="rise">
            <span className="eyebrow">Confidentialité</span>
            <p className="h-m">
              Une fiche n’est publiée qu’avec l’accord du membre, révocable à tout moment.
            </p>
          </div>
          <div className="stack" style={{ gap: 16 }} data-m="rise" data-m-d="2">
            <p className="muted">
              Nom, secteur et ville sont publics. Les coordonnées, le dirigeant, le quartier et la
              taille sont réservés aux membres connectés.
            </p>
            <Link prefetch={false} href="/adherer" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }}>
              Pas encore membre ? Adhérer
            </Link>
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbLd([{ nom: 'Annuaire', chemin: '/membres' }])} />
    </>
  )
}
