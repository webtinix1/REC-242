import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { Img } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { ficheAnnuaire } from '@/lib/annuaire/donnees'
import { membreConnecte } from '@/lib/membres/espace'
import { breadcrumbLd, metadataFor } from '@/lib/site/seo'

export const dynamic = 'force-dynamic'

type P = Promise<{ slug: string }>

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join('')

/** Éléments de « Services et recherches » : une pastille par ligne, virgule ou point-virgule. */
const puces = (t?: string) =>
  (t ?? '')
    .split(/\n|,|;/)
    .map((x) => x.trim())
    .filter(Boolean)

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params
  const m = await ficheAnnuaire(slug, false)
  if (!m) return metadataFor(`/membres/${slug}`, { title: 'Membre introuvable' })
  const desc =
    (m.presentation ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
    [m.secteur, m.ville].filter(Boolean).join(' · ')
  return metadataFor(`/membres/${slug}`, { title: m.nom, description: desc })
}

/** Écran 13 : fiche membre, vue visiteur. Un membre actif connecté est renvoyé vers la fiche de l'espace membre. */
export default async function FicheMembre({ params }: { params: P }) {
  const { slug } = await params
  const m = await ficheAnnuaire(slug, false)
  if (!m) notFound()
  const connecte = await membreConnecte()
  if (connecte && connecte.statut === 'actif') redirect(`/espace-membre/annuaire/${slug}`)

  const ligne = [
    m.secteur,
    m.ville,
    m.categorie ? `Catégorie ${m.categorie}` : '',
    m.depuis ? `membre depuis ${m.depuis}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const services = puces(m.services)
  const recherches = puces(m.recherches)
  const retour = `/espace-membre/connexion?retour=/espace-membre/annuaire/${encodeURIComponent(slug)}`

  return (
    <>
      <section className="band bg-green dark rings rings-w phead" data-m="head">
        <div className="wrap stack" style={{ gap: 28 }}>
          <div className="rec-row" style={{ justifyContent: 'space-between' }} data-m="rise">
            <Link prefetch={false} href="/membres" className="linkbtn">
              ← Annuaire
            </Link>
          </div>
          <div className="fond">
            <div className="stack" style={{ gap: 4, alignItems: 'center' }} data-m="disc" data-m-d="1">
              {m.logo ? (
                <span className="logo-tile logo-tile-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.logo} alt={`Logo ${m.nom}`} />
                </span>
              ) : (
                <span className="logo-tile logo-tile-xl logo-ini">{initiales(m.nom)}</span>
              )}
            </div>
            <div className="stack" style={{ gap: 10 }} data-m="cascade" data-m-stagger="" data-m-d="2">
              <div className="rec-row">
                <span className="rec-badge rec-badge--active">Membre actif</span>
              </div>
              <h1 className="h-xl">{m.nom}</h1>
              <p className="lead">{ligne}</p>
            </div>
          </div>
        </div>
      </section>

      {m.presentation && (
        <section className="pband pband-short">
          {m.illustration && <Img media={m.illustration} alt="" m={{ m: 'iris' }} style={{ objectPosition: '60% 35%' }} />}
          <div className="wrap">
            <div className="ptext" data-m="cascade" data-m-stagger="" data-m-d="3">
              <span className="eyebrow">Présentation</span>
              <p className="h-m" style={{ whiteSpace: 'pre-line' }}>
                {m.presentation}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="band band-end">
        <div className="wrap">
          <div className="split">
            <div className="stack" data-m="cascade" data-m-stagger="">
              {(services.length > 0 || recherches.length > 0) && (
                <div className="card">
                  <h2 className="h-s">Services et recherches</h2>
                  <div className="chips">
                    {[...services, ...recherches].map((x, i) => (
                      <span className="chip chip-static" key={`${i}-${x}`}>
                        {x}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="card">
                <h2 className="h-s">Informations</h2>
                <div className="line">
                  <span>Secteurs</span>
                  <span>{m.secteurs.join(', ')}</span>
                </div>
                <div className="line">
                  <span>Ville</span>
                  <span>{m.ville}</span>
                </div>
                <div className="line">
                  <span>Site internet, réseaux</span>
                  {m.site ? (
                    <a
                      href={m.site}
                      rel="noopener noreferrer nofollow"
                      target="_blank"
                      className="linkbtn"
                    >
                      {m.site.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  ) : (
                    <span className="muted">À compléter par le membre</span>
                  )}
                </div>
                <div className="locked-note">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    aria-hidden="true"
                  >
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  <span className="small">
                    Dirigeant, quartier et taille réservés aux membres abonnés à l’annuaire détaillé.
                  </span>
                </div>
              </div>
            </div>
            <div className="card-soft" data-m="lift" data-m-d="2">
              <h2 className="h-s">Prendre contact</h2>
              <p className="muted small">
                Réservé aux membres actifs. Vous lui écrivez depuis votre espace membre : les échanges
                restent sur la plateforme, sans coordonnées échangées.
              </p>
              <Link prefetch={false} href={retour} className="rec-btn rec-btn--primary">
                Se connecter pour contacter
              </Link>
              <Link prefetch={false} href="/adherer" className="rec-btn rec-btn--ghost">
                Pas encore membre ? Adhérer
              </Link>
            </div>
          </div>
        </div>
      </section>
      <JsonLd
        data={breadcrumbLd([
          { nom: 'Annuaire', chemin: '/membres' },
          { nom: m.nom, chemin: `/membres/${slug}` },
        ])}
      />
    </>
  )
}
