import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Img } from '@/components/site/Blocks'
import { ContactForm } from '@/components/site/ContactForm'
import { JsonLd } from '@/components/site/JsonLd'
import { MOTIFS } from '@/collections/ContactMessages'
import { jetonFormulaire } from '@/lib/antispam'
import { block, getPage } from '@/lib/site/payload'
import { breadcrumbLd, pageMetadata } from '@/lib/site/seo'
import { getSettings, waLink } from '@/lib/site/settings'

// Jeton anti-robot horodaté à chaque affichage : la page n'est pas prérendue.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/contact', { fallbackTitle: 'Contact' })
}

/** Plan schématique du quartier du siège (illustration de la maquette). */
const PlanSiege = ({ label }: { label: string }) => (
  <div className="map" role="img" aria-label={label}>
    <svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="560" height="360" fill="#eef1e8" />
      <path d="M0 250 C120 230 200 300 330 280 S520 230 560 250 L560 360 L0 360Z" fill="#cfe3ea" />
      <g stroke="#ffffff" strokeWidth="14" fill="none" strokeLinecap="round">
        <path d="M-10 120 L570 90" />
        <path d="M60 -10 L120 370" />
        <path d="M250 -10 L280 250" />
        <path d="M430 -10 L470 250" />
        <path d="M-10 200 L570 180" />
      </g>
      <g stroke="#ffffff" strokeWidth="6" fill="none">
        <path d="M160 20 L520 10" />
        <path d="M0 40 L240 60" />
        <path d="M330 120 L360 250" />
      </g>
      <circle cx="270" cy="104" r="22" fill="#ffffff" />
      <g fill="#d9dccf">
        <rect x="140" y="130" width="90" height="40" rx="4" />
        <rect x="300" y="130" width="110" height="38" rx="4" />
        <rect x="140" y="20" width="90" height="70" rx="4" />
        <rect x="300" y="20" width="110" height="55" rx="4" />
        <rect x="20" y="130" width="70" height="50" rx="4" />
        <rect x="480" y="110" width="70" height="60" rx="4" />
      </g>
      <text x="300" y="230" fontFamily="Inter, sans-serif" fontSize="12" fill="#62675f">
        Rue Charles Foucault
      </text>
      <text x="300" y="98" fontFamily="Inter, sans-serif" fontSize="11" fill="#62675f">
        Rond-point de la Poste
      </text>
      <text x="40" y="320" fontFamily="Inter, sans-serif" fontSize="12" fill="#4b7f91">
        Fleuve Congo
      </text>
      <g transform="translate(262 150)">
        <path
          d="M0 -36 C-16 -36 -24 -24 -24 -14 C-24 4 0 22 0 22 C0 22 24 4 24 -14 C24 -24 16 -36 0 -36Z"
          fill="#0b5e32"
        />
        <circle cx="0" cy="-14" r="8" fill="#fbb517" />
      </g>
    </svg>
    <span className="map-tag">REC 242 · siège</span>
  </div>
)

type SP = Promise<{ motif?: string; objet?: string }>

/** Écran 22 : contact. Le motif et l'objet peuvent être préremplis par l'adresse (?motif=Presse&objet=…). */
export default async function Contact({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const [s, page] = await Promise.all([getSettings(), getPage('/contact')])
  const siege = block(page, 'siege')
  const motif = MOTIFS.find((m) => m.label === sp.motif || m.value === sp.motif)?.value
  const objet = sp.objet?.slice(0, 120)
  const wa = waLink(s.whatsapp?.numero, 'Bonjour REC 242, ')
  const lat = s.planAcces?.latitude
  const lng = s.planAcces?.longitude
  const position = lat != null && lng != null ? `${lat},${lng}` : s.adresse
  const itineraire = position
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(position)}`
    : undefined
  const partage =
    position && s.whatsapp?.numero
      ? `https://wa.me/?text=${encodeURIComponent(`REC 242, siège : ${s.adresse ?? ''} https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(position)}`)}`
      : undefined
  const [intro, ...indications] = (s.planAcces?.indications ?? '').split(/\n+/).filter(Boolean)

  return (
    <>
      <section
        className="band bg-night dark net phead"
        style={{ paddingBottom: 112 }}
        data-m="head"
      >
        <div className="wrap phead-grid">
          <div className="stack" style={{ gap: 18 }}>
            <span className="eyebrow" data-m="rise" data-m-d="1">
              Contact
            </span>
            <h1 className="h-xxl" data-m="words" data-m-stagger="" data-m-d="1">
              <span className="mw">
                <span>Parlons-</span>
              </span>
              <span className="mw">
                <span>en</span>
              </span>
            </h1>
          </div>
          {s.whatsapp?.numero && (
            <div className="stack" style={{ gap: 12 }}>
              <p className="small muted" data-m="rise" data-m-d="3">
                Le plus rapide · WhatsApp
              </p>
              <p className="wa-big" data-m="wipe" data-m-d="4">
                {s.whatsapp.numero}
              </p>
              {wa && (
                <a
                  className="rec-btn rec-btn--accent"
                  style={{ width: 'max-content' }}
                  data-m="pop"
                  data-m-d="7"
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Écrire sur WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="band band-t0 ovis">
        <div className="wrap">
          <div className="split overlap">
            <div className="card shadow" style={{ padding: 32 }} data-m="lift" data-m-d="3">
              <ContactForm jeton={jetonFormulaire()} motifInitial={motif} objet={objet} />
            </div>
            <div className="stack" data-m="cascade" data-m-stagger="" data-m-d="5">
              {s.email && (
                <div className="card">
                  <p className="small muted">E-mail</p>
                  <p className="mono">{s.email}</p>
                </div>
              )}
              {s.adresse && (
                <div className="card">
                  <p className="small muted">Siège</p>
                  <p>{s.adresse}</p>
                  {s.horaires && <p className="small muted">{s.horaires}</p>}
                </div>
              )}
              <Link prefetch={false} href="/devenir-partenaire" className="card">
                <p className="small muted">Organisation</p>
                <p className="h-s">Proposer un partenariat →</p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {s.adresse && (
        <section className="band bg-sand50">
          <div className="wrap">
            <div className="split map-split" data-m="deal" data-m-stagger="">
              <div className="stack" style={{ gap: 12 }}>
                <span className="eyebrow">Plan d’accès</span>
                <h2 className="h-l">Venir au siège</h2>
                <p className="muted">
                  {s.adresse}.{intro ? ` ${intro}` : ''}
                </p>
                {indications.length > 0 && (
                  <div className="stack" style={{ gap: 6 }}>
                    {indications.map((l) => {
                      const [tete, ...reste] = l.split(' · ')
                      return (
                        <p className="small" key={l}>
                          {reste.length ? (
                            <>
                              <b>{tete}</b> · {reste.join(' · ')}
                            </>
                          ) : (
                            l
                          )}
                        </p>
                      )
                    })}
                  </div>
                )}
                <div className="rec-row">
                  {itineraire && (
                    <a
                      className="rec-btn rec-btn--primary"
                      href={itineraire}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ouvrir l’itinéraire
                    </a>
                  )}
                  {partage && (
                    <a
                      className="rec-btn rec-btn--secondary"
                      href={partage}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Partager la position sur WhatsApp
                    </a>
                  )}
                </div>
              </div>
              <PlanSiege label={`Plan du quartier du siège de REC 242 : ${s.adresse}`} />
            </div>
          </div>
        </section>
      )}

      {siege && (
        <section className="pband pband-short band-end">
          <Img media={siege.image} m={{ m: 'iris', parallax: true }} />
          <div className="wrap">
            <div className="ptext" data-m="cascade" data-m-stagger="" data-m-d="3">
              <span className="eyebrow">{siege.surtitre}</span>
              <p className="h-l">{siege.titre || s.adresse}</p>
            </div>
          </div>
          {siege.note && (
            <span className="pcap" data-m="rise" data-m-d="6">
              {siege.note}
            </span>
          )}
        </section>
      )}
      <JsonLd data={breadcrumbLd([{ nom: 'Contact', chemin: '/contact' }])} />
    </>
  )
}
