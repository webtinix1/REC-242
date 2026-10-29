import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Img } from '@/components/site/Blocks'
import { CarteSiege } from '@/components/site/CarteSiege'
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
              <CarteSiege position={position ?? s.adresse} label={`Carte du siège de REC 242 : ${s.adresse}`} />
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
