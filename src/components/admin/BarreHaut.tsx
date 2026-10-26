'use client'
/* eslint-disable @next/next/no-img-element */
import { Link, useAuth, useNav } from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useId, useRef, useState } from 'react'

import { titreEcran } from '@/admin/titres'
import { ROLES } from '@/access/roles'

type Resultat = { cle: string; libelle: string; detail: string; href: string }
type Doc = Record<string, unknown>

const initiales = (nom: string) =>
  nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

/** Membres et candidatures : l'API applique les droits de l'utilisateur connecté (une réponse refusée donne une liste vide). */
const chercher = async (terme: string): Promise<Resultat[]> => {
  const q = encodeURIComponent(terme)
  const get = (url: string) =>
    fetch(url, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { docs: [] }))
      .then((j) => (j.docs ?? []) as Doc[])
      .catch(() => [] as Doc[])
  const [membres, candidatures] = await Promise.all([
    get(
      `/api/members?limit=5&depth=0&where[or][0][nomComplet][like]=${q}&where[or][1][numeroAdherent][like]=${q}&where[or][2][email][like]=${q}`,
    ),
    get(
      `/api/applications?limit=5&depth=0&where[or][0][nom][like]=${q}&where[or][1][prenom][like]=${q}&where[or][2][raisonSociale][like]=${q}&where[or][3][email][like]=${q}`,
    ),
  ])
  return [
    ...membres.map((m) => ({
      cle: `m${m.id}`,
      libelle: String(m.nomComplet ?? m.nom ?? ''),
      detail: `Membre ${m.numeroAdherent ?? ''}`.trim(),
      href: `/admin/collections/members/${m.id}`,
    })),
    ...candidatures.map((c) => ({
      cle: `c${c.id}`,
      libelle: `${c.prenom ?? ''} ${c.nom ?? ''}`.trim(),
      detail: `Candidature · ${c.raisonSociale ?? ''}`,
      href: `/admin/collections/applications/${c.id}`,
    })),
  ]
}

const photoUrl = (photo: unknown): string | null => {
  if (!photo || typeof photo !== 'object') return null
  const p = photo as { url?: string; sizes?: Record<string, { url?: string }> }
  return p.sizes?.thumbnail?.url ?? p.url ?? null
}

/** Barre du haut de la maquette : titre de l'écran, recherche globale, utilisateur connecté, déconnexion. */
export const BarreHaut = () => {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const { user } = useAuth()
  const { navOpen, setNavOpen } = useNav()
  const [terme, setTerme] = useState('')
  const [resultats, setResultats] = useState<Resultat[] | null>(null)
  const idListe = useId()
  const boite = useRef<HTMLDivElement>(null)

  const titre = titreEcran(pathname) ?? ''

  useEffect(() => {
    const t = terme.trim()
    if (t.length < 2) return
    let vivant = true
    const attente = setTimeout(() => {
      chercher(t).then((r) => vivant && setResultats(r))
    }, 250)
    return () => {
      vivant = false
      clearTimeout(attente)
    }
  }, [terme])

  useEffect(() => {
    const fermer = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) setResultats(null)
    }
    document.addEventListener('mousedown', fermer)
    return () => document.removeEventListener('mousedown', fermer)
  }, [])

  const u = user as (Doc & { name?: string; roles?: string[]; photo?: unknown }) | null
  const nom = u?.name || (u?.email as string | undefined) || ''
  const role = ROLES.find((r) => r.value === u?.roles?.[0])?.label ?? ''
  const photo = photoUrl(u?.photo)

  return (
    <div className="rec-topbar">
      <button
        type="button"
        className="rec-topbar__menu"
        aria-label="Ouvrir ou fermer le menu"
        aria-expanded={navOpen}
        onClick={() => setNavOpen(!navOpen)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <p className="rec-topbar__title">{titre}</p>
      <div className="rec-topbar__search" ref={boite}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <label htmlFor={`${idListe}-s`} className="rec-sr">
          Rechercher
        </label>
        <input
          id={`${idListe}-s`}
          type="search"
          placeholder="Rechercher un membre, une candidature…"
          value={terme}
          autoComplete="off"
          onChange={(e) => setTerme(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setResultats(null)
            if (e.key === 'Enter' && resultats?.[0]) {
              setResultats(null)
              router.push(resultats[0].href)
            }
          }}
          aria-controls={resultats ? idListe : undefined}
        />
        {resultats && terme.trim().length >= 2 ? (
          <ul id={idListe} className="rec-topbar__results" aria-label="Résultats de la recherche">
            {resultats.length === 0 ? (
              <li className="rec-topbar__none">Aucun résultat</li>
            ) : (
              resultats.map((r) => (
                <li key={r.cle}>
                  <Link href={r.href} onClick={() => setResultats(null)}>
                    <b>{r.libelle}</b>
                    <span>{r.detail}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      <div className="rec-topbar__me">
        <span className="rec-topbar__av" aria-hidden="true">
          {initiales(nom)}
          {photo ? <img src={photo} alt="" /> : null}
        </span>
        <span className="rec-topbar__who">
          <b>{nom}</b>
          <span>{role}</span>
        </span>
      </div>
      <Link href="/admin/logout" className="rec-topbar__out" aria-label="Se déconnecter">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 4h4v16h-4" />
          <path d="M10 8l-4 4 4 4M6 12h10" />
        </svg>
      </Link>
    </div>
  )
}
