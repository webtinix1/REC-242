import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { PartnerForm } from '@/components/site/PartnerForm'
import { Words } from '@/components/site/Words'
import { jetonFormulaire } from '@/lib/antispam'
import { breadcrumbLd, metadataFor } from '@/lib/site/seo'

// Jeton anti-robot horodaté à chaque affichage : la page n'est pas prérendue.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return metadataFor('/devenir-partenaire', {
    title: 'Devenir partenaire',
    description:
      'Proposer un partenariat à REC 242 : votre demande est transmise à la commission Partenariats.',
  })
}

/** Écran 08 : devenir partenaire. */
export default function DevenirPartenaire() {
  return (
    <>
      <section
        className="band bg-night dark net phead"
        style={{ paddingBottom: 104 }}
        data-m="head"
      >
        <div className="wrap" style={{ maxWidth: 940 }}>
          <div className="stack" style={{ gap: 18 }}>
            <Link href="/le-reseau/partenaires" className="linkbtn" data-m="rise">
              ← Partenaires
            </Link>
            <span className="eyebrow" data-m="rise" data-m-d="1">
              Devenir partenaire
            </span>
            <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="1">
              <Words text="Proposer un partenariat" />
            </h1>
            <p className="lead" data-m="rise" data-m-d="4">
              Votre demande est transmise à la commission Partenariats.
            </p>
          </div>
        </div>
      </section>
      <section className="band band-t0 ovis">
        <div className="wrap" style={{ maxWidth: 940 }}>
          <div className="card overlap shadow" style={{ padding: 36 }} data-m="lift" data-m-d="3">
            <PartnerForm jeton={jetonFormulaire()} />
          </div>
        </div>
      </section>
      <JsonLd
        data={breadcrumbLd([
          { nom: 'Partenaires', chemin: '/le-reseau/partenaires' },
          { nom: 'Devenir partenaire', chemin: '/devenir-partenaire' },
        ])}
      />
    </>
  )
}
