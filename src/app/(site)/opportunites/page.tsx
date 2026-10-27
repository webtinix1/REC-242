import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { OpportuniteCarte } from '@/components/site/OpportuniteCarte'
import { opportunitesSite } from '@/components/site/OpportuniteDonnees'
import { Words } from '@/components/site/Words'
import { TYPES_OPPORTUNITE } from '@/lib/opportunites/regles'
import { dateLong } from '@/lib/site/format'
import { breadcrumbLd, metadataFor } from '@/lib/site/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return metadataFor('/opportunites', {
    title: 'Opportunités',
    description:
      'Appels à partenariat, événements partenaires, appels d’offres relayés, financements et offres entre membres. Chaque annonce a une date limite.',
  })
}

type SP = Promise<{ type?: string }>

/** Écran 17 : opportunités. Filtre par type en liens dans l'adresse. */
export default async function Opportunites({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const type = TYPES_OPPORTUNITE.find((t) => t.value === sp.type)?.value
  const { cartes, expirees } = await opportunitesSite(type)
  const filtres = [{ value: '', label: 'Toutes' }, ...TYPES_OPPORTUNITE.filter((t) => t.value !== 'b2b')]
  const lien = (v: string) => (v ? `/opportunites?type=${v}` : '/opportunites')

  return (
    <>
      <section className="band bg-green dark net phead">
        <div className="wrap stack" style={{ gap: 20 }}>
          <span className="eyebrow" data-m="rise" data-m-d="1">
            Opportunités B2B
          </span>
          <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
            <Words text="Les opportunités du réseau" />
          </h1>
          <p className="lead" data-m="rise" data-m-d="4">
            Appels à partenariat, événements partenaires, appels d’offres relayés, financements et offres entre membres. Chaque annonce a une date limite.
          </p>
          <nav className="chips" aria-label="Type d’opportunité" data-m="pops" data-m-stagger="" data-m-d="5">
            {filtres.map((f) => (
              <Link prefetch={false}
                key={f.value}
                scroll={false}
                href={lien(f.value)}
                className={`chip${(type ?? '') === f.value ? ' is-on' : ''}`}
                aria-current={(type ?? '') === f.value ? 'true' : undefined}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          {cartes.length === 0 && (
            <div className="empty">
              <p className="h-s">Aucune opportunité ouverte pour ce type</p>
              <Link prefetch={false} href="/opportunites" className="rec-btn rec-btn--secondary">
                Voir toutes les opportunités
              </Link>
            </div>
          )}
          <div className="g2" data-m="deal" data-m-stagger="">
            {cartes.map((o) => (
              <OpportuniteCarte key={`${o.reservee ? 'r' : 'p'}${o.id}`} o={o} />
            ))}
          </div>
        </div>
      </section>

      <section className="band bg-warm band-s">
        <div className="wrap">
          <div className="card expired" data-m="rise">
            <h2 className="h-s">Expirées</h2>
            {expirees.map((x) => (
              <div className="line" style={{ borderBottom: 0 }} key={x.id}>
                <span>
                  {x.type} · {x.titre}
                </span>
                <span className="small muted">Expiré le {dateLong(x.dateLimite)}</span>
              </div>
            ))}
            <p className="small muted">Une opportunité expirée disparaît des listes le lendemain de sa date limite.</p>
          </div>
        </div>
      </section>

      <section className="band bg-gold rings band-end" data-m="ripple" data-m-scrub="">
        <div className="wrap">
          <div className="stack" style={{ gap: 18, maxWidth: 760 }}>
            <h2 className="h-xl" data-m="words" data-m-stagger="" data-m-d="0">
              <Words text="Vous avez un besoin ou une offre ?" />
            </h2>
            <p className="lead" data-m="rise" data-m-d="5">
              Les membres actifs publient leurs opportunités depuis leur espace. Chaque annonce est relue avant d’être mise en ligne.
            </p>
            <div className="rec-row" data-m="pops" data-m-stagger="" data-m-d="6">
              <Link prefetch={false} className="rec-btn rec-btn--primary" href="/espace-membre/opportunites/publier">
                Publier une opportunité
              </Link>
            </div>
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbLd([{ nom: 'Opportunités', chemin: '/opportunites' }])} />
    </>
  )
}
