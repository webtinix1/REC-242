import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import React from 'react'

import { CarteResume } from '@/components/espace/CarteMembre'
import { Icone } from '@/components/espace/Icones'
import { fcfa } from '@/lib/adhesion/categories'
import { inscriptionsDe, jourMois, maintenantMs, statutInscription } from '@/lib/evenements/espace'
import { heureFr, lieuDe, type Evenement } from '@/lib/evenements/notifications'
import {
  completude,
  dateCourte,
  dateLongue,
  exigerMembre,
  initialesDe,
  lettreCategorie,
  paiementsDe,
  situationCotisation,
  urlMedia,
} from '@/lib/membres/espace'
import { statutMembreLabel } from '@/lib/membres/options'
import { nonLus, type Onglet } from '@/lib/echanges/service'
import { joursRestants, typeLabel } from '@/lib/opportunites/regles'
import { getPayloadClient } from '@/lib/site/payload'

export const metadata: Metadata = { title: 'Accueil' }

/** Tableau de bord (écran 02). Les blocs des lots suivants (rendez-vous, opportunités, échanges, experts) arrivent avec eux. */
export default async function TableauPage() {
  const m = await exigerMembre()
  const payload = await getPayloadClient()
  const [paiements, inscriptions, s, news] = await Promise.all([
    paiementsDe(m),
    inscriptionsDe(m.id),
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
  const { user } = await payload.auth({ headers: await headers() })
  const mesSecteurs = (m.entreprise?.secteurs ?? []).map((x) => x.id)
  const lireOpps = (where: object, limit: number) =>
    payload.find({ collection: 'opportunities', where: { and: [{ statut: { equals: 'publiee' } }, where] } as never, sort: 'dateLimite', limit, depth: 0, user, overrideAccess: false })
  const apres = { dateLimite: { greater_than_equal: new Date(maintenantMs() - 86400e3).toISOString() } }
  type OppDoc = { id: number; titre: string; type: string; dateLimite: string }
  let opps = (mesSecteurs.length ? (await lireOpps({ and: [apres, { secteurs: { in: mesSecteurs } }] }, 3)).docs : []) as unknown as OppDoc[]
  if (opps.length < 3) {
    const autres = (await lireOpps({ and: [apres, { id: { not_in: opps.map((o) => o.id) } }] }, 3 - opps.length)).docs as unknown as OppDoc[]
    opps = [...opps, ...autres]
  }
  const rdv = inscriptions
    .filter((i) => ['inscrit', 'attente'].includes(i.statut) && new Date(i.evenement.debut).getTime() >= maintenantMs())
    .sort((a, b) => a.evenement.debut.localeCompare(b.evenement.debut))
    .slice(0, 2)
  const echanges = await nonLus(payload, m.id)
  const { titre: echangesTitre, detail: echangesDetail } = resumeEchanges(echanges)
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
            <div className="row between">
              <h2 className="h3">Mes prochains rendez-vous</h2>
              <Link className="linkbtn" href="/espace-membre/evenements">
                Tout voir
              </Link>
            </div>
            {rdv.length ? (
              rdv.map((i) => {
                const st = statutInscription(i)
                const dm = jourMois(i.evenement.debut)
                return (
                  <div className="item" key={i.id}>
                    <div className="datedisc">
                      <b>{dm.jour}</b>
                      <span>{dm.mois}</span>
                    </div>
                    <div className="grow">
                      <p style={{ fontWeight: 600 }}>{i.evenement.titre}</p>
                      <p className="small muted">
                        {lieuDe(i.evenement as unknown as Evenement)} · {heureFr(i.evenement.debut)}
                      </p>
                    </div>
                    <span className={`rec-badge rec-badge--${st.classe}`}>{st.libelle}</span>
                  </div>
                )
              })
            ) : (
              <p className="small muted">Aucun rendez-vous à venir.</p>
            )}
          </div>
          <div className="card">
            <div className="row between">
              <h2 className="h3">Opportunités pour vous</h2>
              <Link className="linkbtn" href="/espace-membre/opportunites">
                Tout voir
              </Link>
            </div>
            {opps.length ? (
              opps.map((o) => (
                <div className="item" key={o.id}>
                  <span className="av sand" aria-hidden="true">
                    {Math.max(0, joursRestants(o.dateLimite))} j
                  </span>
                  <div className="grow">
                    <p style={{ fontWeight: 600 }}>{o.titre}</p>
                    <p className="small muted">
                      {typeLabel(o.type)} · date limite {dateLongue(o.dateLimite)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="small muted">Aucune opportunité pour le moment.</p>
            )}
          </div>
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
          <div className="card mhint">
            <div className="row between">
              <p className="lbl">Mes échanges</p>
              {echanges.total > 0 && (
                <span className="nbadge" aria-label={`${echanges.total} non lu${echanges.total > 1 ? 's' : ''}`}>
                  {echanges.total}
                </span>
              )}
            </div>
            <p className="h3">{echangesTitre}</p>
            {echangesDetail && <p className="small muted">{echangesDetail}</p>}
            <Link className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} href="/espace-membre/echanges">
              Ouvrir mes échanges
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

const MOTS = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
const nombre = (n: number) => MOTS[n] ?? String(n)
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Titre et phrase de détail de la carte « Mes échanges » (compteurs de non-lus par onglet). */
function resumeEchanges(c: Record<Onglet, number> & { total: number }) {
  if (c.total === 0) return { titre: 'Aucun message en attente', detail: '' }
  const morceaux = [
    c.relations && (c.relations === 1 ? 'une demande de mise en relation reçue' : `${nombre(c.relations)} demandes de mise en relation reçues`),
    c.annonces && (c.annonces === 1 ? 'une réponse à votre annonce' : `${nombre(c.annonces)} réponses à vos annonces`),
    c.experts && (c.experts === 1 ? 'la réponse d’un expert' : `${nombre(c.experts)} réponses d’experts`),
    c.reseau && (c.reseau === 1 ? 'un message du réseau' : `${nombre(c.reseau)} messages du réseau`),
  ].filter(Boolean) as string[]
  const liste = morceaux.length > 1 ? `${morceaux.slice(0, -1).join(', ')} et ${morceaux[morceaux.length - 1]}` : morceaux[0]
  return {
    titre: c.total === 1 ? 'Une réponse vous attend' : `${majuscule(nombre(c.total))} réponses vous attendent`,
    detail: `${majuscule(liste)}.`,
  }
}
