import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/site/JsonLd'
import { Words } from '@/components/site/Words'
import { listerAnnuaire } from '@/lib/annuaire/donnees'
import { evenementsPublics, prochainsEvenements } from '@/lib/evenements/site'
import { getNews } from '@/lib/site/data'
import { breadcrumbLd, metadataFor } from '@/lib/site/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return metadataFor('/plan-du-site', { title: 'Plan du site' })
}

type Item = { label: string; href: string }

/** Écran 24 : plan du site. Les fiches d'exemple (entreprise, événement, article) pointent vers de vraies fiches publiées. */
export default async function PlanDuSite() {
  const [membres, prochains, passes, actus] = await Promise.all([
    listerAnnuaire({ page: 1 }, false),
    prochainsEvenements(1),
    evenementsPublics({ statut: { equals: 'termine' } }, { sort: '-debut', limit: 1 }),
    getNews({ limit: 1, publiques: true }),
  ])
  const fiche = membres.cartes[0] ? `/membres/${membres.cartes[0].slug}` : '/membres'
  const evenement = prochains.evs[0] ? `/agenda/${prochains.evs[0].slug}` : '/agenda'
  const passe = passes[0] ? `/agenda/${passes[0].slug}` : '/agenda?onglet=passes'
  const article = actus.docs[0] ? `/actualites/${actus.docs[0].slug}` : '/actualites'
  const l = (label: string, href: string): Item => ({ label, href })
  const groups: { t: string; items: Item[] }[] = [
    {
      t: 'Le réseau',
      items: [
        l('Qui sommes-nous', '/le-reseau'),
        l('Gouvernance', '/le-reseau/gouvernance'),
        l('Commissions', '/le-reseau/commissions'),
        l('Antennes', '/le-reseau/antennes'),
        l('Notre écosystème', '/le-reseau/ecosysteme'),
        l('Partenaires', '/le-reseau/partenaires'),
        l('Formalisation', '/formalisation'),
      ],
    },
    {
      t: 'Adhérer',
      items: [l('Pourquoi et comment', '/adherer'), l('Candidature', '/adherer/candidature'), l('Confirmation', '/adherer/merci')],
    },
    {
      t: 'Membres et affaires',
      items: [l('Annuaire', '/membres'), l('Fiche entreprise', fiche), l('Opportunités B2B', '/opportunites')],
    },
    { t: 'Agenda', items: [l('À venir', '/agenda'), l('Fiche événement', evenement), l('Événement passé', passe)] },
    { t: 'Actualités', items: [l('Toutes les actualités', '/actualites'), l('Article', article), l('Presse', '/presse')] },
    { t: 'Contact', items: [l('Contact', '/contact'), l('Devenir partenaire', '/devenir-partenaire')] },
    {
      t: 'Informations',
      items: [
        l('Mentions légales', '/mentions-legales'),
        l('Confidentialité', '/confidentialite'),
        l('Conditions d’utilisation', '/conditions-utilisation'),
        l('Recherche', '/recherche'),
      ],
    },
  ]

  return (
    <>
      <section className="band bg-green dark rings rings-w phead" data-m="head">
        <div className="wrap stack" style={{ gap: 18 }}>
          <span className="eyebrow" data-m="rise" data-m-d="1">
            Plan du site
          </span>
          <h1 className="h-xxl" data-m="words" data-m-stagger="" data-m-d="1">
            <Words text="Toutes les pages" />
          </h1>
        </div>
      </section>
      <section className="band band-end">
        <div className="wrap">
          <div className="g4 plan" data-m="cascade" data-m-stagger="">
            {groups.map((g) => (
              <div className="card" key={g.t}>
                <h2 className="h-s">{g.t}</h2>
                {g.items.map((i) => (
                  <Link key={i.href + i.label} href={i.href} className="linkbtn">
                    {i.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="card">
              <h2 className="h-s">Espace membre</h2>
              <Link className="linkbtn" href="/espace-membre/connexion">
                Connexion
              </Link>
              <Link className="linkbtn" href="/espace-membre">
                Tableau de bord
              </Link>
              <Link className="linkbtn" href="/espace-membre">
                Profil, événements, cotisation, documents
              </Link>
              <p className="small muted">Application séparée du site, réservée aux membres.</p>
            </div>
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbLd([{ nom: 'Plan du site', chemin: '/plan-du-site' }])} />
    </>
  )
}
