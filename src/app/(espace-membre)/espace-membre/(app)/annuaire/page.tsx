import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Visage } from '@/components/espace/AnnuaireVisage'
import { lireFiltres, listerAnnuaire, MASQUE, optionsFiltres, type Filtres } from '@/lib/annuaire/donnees'
import { exigerMembre } from '@/lib/membres/espace'

export const metadata: Metadata = { title: 'Annuaire' }

const BASE = '/espace-membre/annuaire'
const lien = (f: Filtres, ch: Partial<Filtres>) => {
  const n = { ...f, ...ch }
  const p = new URLSearchParams()
  if (n.q) p.set('q', n.q)
  if (n.secteur) p.set('secteur', n.secteur)
  if (n.ville) p.set('ville', n.ville)
  if (n.page > 1) p.set('page', String(n.page))
  const s = p.toString()
  return s ? `${BASE}?${s}` : BASE
}

/** Annuaire des membres (écran 07). */
export default async function AnnuairePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerMembre()
  const f = lireFiltres(await searchParams)
  const [{ cartes, total, pages }, opt] = await Promise.all([listerAnnuaire(f, true), optionsFiltres()])
  const chip = (actif: boolean) => `chip ${actif ? 'is-on' : ''}`
  return (
    <>
      <div className="top">
        <h1 className="h1">Annuaire des membres</h1>
      </div>
      <form className="search" method="get" action={BASE} role="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <label htmlFor="mb-q" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          Rechercher un membre
        </label>
        <input id="mb-q" name="q" className="rec-input" type="search" placeholder="Nom, activité, service, ville" defaultValue={f.q ?? ''} />
        {f.secteur && <input type="hidden" name="secteur" value={f.secteur} />}
        {f.ville && <input type="hidden" name="ville" value={f.ville} />}
      </form>
      <div className="stack-s">
        <span className="xs muted">Secteur</span>
        <div className="chips" role="group" aria-label="Secteur">
          <Link className={chip(!f.secteur)} href={lien(f, { secteur: undefined, page: 1 })}>
            Tous
          </Link>
          {opt.secteurs.map((s) => (
            <Link key={s.value} className={chip(f.secteur === s.value)} href={lien(f, { secteur: s.value, page: 1 })}>
              {s.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="stack-s">
        <span className="xs muted">Ville</span>
        <div className="chips" role="group" aria-label="Ville">
          <Link className={chip(!f.ville)} href={lien(f, { ville: undefined, page: 1 })}>
            Toutes
          </Link>
          {opt.villes.map((s) => (
            <Link key={s.value} className={chip(f.ville === s.value)} href={lien(f, { ville: s.value, page: 1 })}>
              {s.label}
            </Link>
          ))}
        </div>
      </div>
      <p className="small muted">{total} membre(s) · coordonnées affichées selon le choix de chaque membre</p>
      {total === 0 && (
        <div className="empty">
          <p className="h3">Aucun membre ne correspond</p>
          <p className="small muted">Élargissez votre recherche.</p>
          <Link className="rec-btn rec-btn--secondary" href={BASE}>
            Effacer les filtres
          </Link>
        </div>
      )}
      <div className="g3">
        {cartes.map((m) => (
          <div className="card mem" key={m.slug}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <Visage photo={m.photo} logo={m.logo} dirigeant={m.dirigeant} nom={m.nom} />
              <div className="grow">
                <p className="h3">{m.nom}</p>
                <p className="small muted">{[m.secteur, m.ville].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div>
              <div className="contact">
                <span className="muted">Dirigeant</span>
                <span>{m.dirigeant}</span>
              </div>
              <div className="contact">
                <span className="muted">Téléphone</span>
                <span className={m.telephone === MASQUE ? undefined : "mono"}>{m.telephone}</span>
              </div>
              <div className="contact">
                <span className="muted">WhatsApp</span>
                <span>{m.whatsapp}</span>
              </div>
              <div className="contact">
                <span className="muted">E-mail</span>
                <span>{m.email}</span>
              </div>
            </div>
            <div className="row between">
              <span className="tag">
                Cat. {m.categorie} · {m.taille}
              </span>
              <Link className="linkbtn" href={`${BASE}/${m.slug}`}>
                Voir la fiche →
              </Link>
            </div>
          </div>
        ))}
      </div>
      {pages > 1 && (
        <nav className="row between" aria-label="Pagination">
          {f.page > 1 ? (
            <Link className="linkbtn" href={lien(f, { page: f.page - 1 })}>
              ← Précédent
            </Link>
          ) : (
            <span />
          )}
          <span className="small muted">
            Page {f.page} sur {pages}
          </span>
          {f.page < pages ? (
            <Link className="linkbtn" href={lien(f, { page: f.page + 1 })}>
              Suivant →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  )
}
