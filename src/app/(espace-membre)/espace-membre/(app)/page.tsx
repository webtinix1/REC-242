import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { CarteResume } from '@/components/espace/CarteMembre'
import { Icone } from '@/components/espace/Icones'
import { fcfa } from '@/lib/adhesion/categories'
import {
  completude,
  dateCourte,
  exigerMembre,
  initialesDe,
  lettreCategorie,
  paiementsDe,
  situationCotisation,
  urlMedia,
} from '@/lib/membres/espace'
import { statutMembreLabel } from '@/lib/membres/options'
import { getPayloadClient } from '@/lib/site/payload'

export const metadata: Metadata = { title: 'Accueil' }

/** Tableau de bord (écran 02). Les blocs des lots suivants (rendez-vous, opportunités, échanges, experts) arrivent avec eux. */
export default async function TableauPage() {
  const m = await exigerMembre()
  const payload = await getPayloadClient()
  const [paiements, s, news] = await Promise.all([
    paiementsDe(m),
    payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true }) as Promise<{ whatsapp?: { lienGroupe?: string } }>,
    payload.find({
      collection: 'news',
      where: { and: [{ reserveMembres: { equals: true } }, { etat: { equals: 'publie' } }] },
      sort: '-datePublication',
      limit: 2,
      depth: 1,
      overrideAccess: true,
      select: { titre: true, slug: true, datePublication: true },
    }),
  ])
  const c = completude(m)
  const cot = situationCotisation(m, paiements)
  const annee = m.dateAdhesion ? new Date(m.dateAdhesion).getFullYear() : undefined
  const exercice = m.dateAdhesion ? new Date(m.dateAdhesion).getFullYear() : new Date().getFullYear()
  const todo = c.manquants
    .filter((x) => ['services', 'presentation', 'photo', 'logo'].includes(x.cle))
    .slice(0, 2)
    .map((x) => ({ t: x.libelle, d: `+${x.gain} % de complétude`, href: '/espace-membre/profil', cta: 'Compléter' }))

  return (
    <>
      <div className="top">
        <h1 className="h1">Bonjour, {m.prenom}</h1>
      </div>
      <section className="hello">
        <div className="stack-s">
          <div className="row">
            <span className="st">{statutMembreLabel(m.statut)}</span>
            {annee && <span className="small muted">Membre depuis {annee}</span>}
          </div>
          <p className="h2">Ravi de vous revoir. Voici ce qui vous attend cette semaine.</p>
          <div className="stack-s" style={{ maxWidth: 460 }}>
            <div className="row between">
              <span className="small">Profil complété à {c.pct} %</span>
              <Link className="linkbtn" href="/espace-membre/profil">
                Compléter ma fiche →
              </Link>
            </div>
            <div className="bar" role="progressbar" aria-label="Complétude du profil" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.pct}>
              <span style={{ width: `${c.pct}%` }} />
            </div>
          </div>
        </div>
        <div className="discs" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>

      <div className="split">
        <div className="stack">
          {todo.length > 0 && (
            <div className="card">
              <div className="row between">
                <h2 className="h3">À faire</h2>
                <span className="xs muted">
                  {todo.length} action{todo.length > 1 ? 's' : ''}
                </span>
              </div>
              {todo.map((t) => (
                <div className="todo" key={t.t}>
                  <span className="num" aria-hidden="true">
                    <Icone nom="chevron" className="ic" largeur={2} />
                  </span>
                  <div className="grow">
                    <p style={{ fontWeight: 600 }}>{t.t}</p>
                    <p className="small muted">{t.d}</p>
                  </div>
                  <Link className="rec-btn rec-btn--secondary" href={t.href}>
                    {t.cta}
                  </Link>
                </div>
              ))}
            </div>
          )}
          <div className="card">
            <h2 className="h3">Actualités réservées</h2>
            {news.docs.length ? (
              news.docs.map((n) => {
                const d = n as unknown as { id: number; titre: string; slug: string; datePublication?: string }
                return (
                  <div className="item" key={d.id}>
                    <div className="grow">
                      <span className="tag vis-m">Article réservé</span>
                      <p style={{ fontWeight: 600, marginTop: 4 }}>
                        <Link href={`/actualites/${d.slug}`}>{d.titre}</Link>
                      </p>
                      <p className="xs muted">{dateCourte(d.datePublication)}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="small muted">Aucune actualité réservée pour le moment.</p>
            )}
          </div>
        </div>
        <div className="stack">
          <CarteResume
            nom={`${m.prenom} ${m.nom}`}
            ini={initialesDe(m)}
            photo={urlMedia(m.photo, 'vignette')}
            entreprise={m.entreprise?.nom}
            categorie={lettreCategorie(m.categorie)}
            numero={m.numeroAdherent}
            statut={statutMembreLabel(m.statut)}
          />
          {cot.connue && (
            <div className="card-gold">
              <p className="lbl">Cotisation {exercice}</p>
              <p className="h3">Reste à payer</p>
              <p className="amount">{fcfa(cot.reste)}</p>
            </div>
          )}
          {s.whatsapp?.lienGroupe && (
            <div className="card-soft">
              <p className="lbl">Groupe des membres</p>
              <p className="h3">WhatsApp des membres</p>
              <p className="small muted">
                Le lien est réservé aux membres actifs. Le comité de direction peut le changer s&apos;il circule hors du réseau.
              </p>
              <a className="rec-btn rec-btn--secondary" style={{ width: 'max-content' }} href={s.whatsapp.lienGroupe} target="_blank" rel="noopener noreferrer">
                Rejoindre le groupe
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
