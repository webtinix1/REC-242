import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { AgendaInscription, AgendaInscriptionMembre, EtatReussite } from '@/components/site/AgendaInscription'
import { Img } from '@/components/site/Blocks'
import { JsonLd } from '@/components/site/JsonLd'
import { RichText } from '@/components/site/RichText'
import { Share } from '@/components/site/Share'
import { Words } from '@/components/site/Words'
import { jetonFormulaire } from '@/lib/antispam'
import { placesRestantes } from '@/lib/evenements/lecture'
import { jourLong } from '@/lib/evenements/notifications'
import {
  accesLabel,
  disque,
  heure,
  estPasse,
  evenementParSlug,
  inscriptionDuMembre,
  placesInfo,
  tax,
  type EvenementSite,
} from '@/lib/evenements/site'
import { membreConnecte } from '@/lib/membres/espace'
import { docHref } from '@/lib/site/data'
import { block, getPage, mediaUrl } from '@/lib/site/payload'
import { breadcrumbLd, metadataFor, siteUrl } from '@/lib/site/seo'

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const e = await evenementParSlug(slug)
  if (!e) return {}
  return metadataFor(`/agenda/${slug}`, {
    title: e.titre,
    description: e.chapeau || `${e.titre}, ${jourLong(e.debut)}.`,
    image: e.image,
  })
}

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join('')

const docsVisibles = (e: EvenementSite) =>
  (e.documents ?? [])
    .filter((d) => d.visibilite !== 'inscrits' && d.document && typeof d.document !== 'number')
    .map((d) => d.document as { id: number; titre?: string })

export default async function Evenement({ params }: { params: Params }) {
  const { slug } = await params
  const e = await evenementParSlug(slug)
  if (!e) notFound()
  return e.statut === 'termine' ? <EvenementPasse e={e} /> : <Fiche e={e} />
}

/** Écran 16 : événement passé. */
function EvenementPasse({ e }: { e: EvenementSite }) {
  const d = disque(e)
  const ville = tax(e.ville)?.nom
  const docs = docsVisibles(e)
  const actu = e.actualite && typeof e.actualite !== 'number' && e.actualite.slug ? e.actualite : null
  const galerie = (e.galerie ?? []).filter((g) => g.image && typeof g.image !== 'number')
  return (
    <>
      <section className="band bg-night dark net phead" data-m="head">
        <div className="wrap stack" style={{ gap: 28 }}>
          <Link href="/agenda" className="linkbtn" data-m="rise">
            ← Agenda
          </Link>
          <div className="fond">
            <div data-m="disc" data-m-d="1" className="datedisc" style={{ width: 148, height: 148, background: '#fbb517', color: '#171a17' }}>
              <b style={{ fontSize: 52 }}>{d.d}</b>
              <span style={{ fontSize: 14 }}>{d.m}</span>
            </div>
            <div className="stack" style={{ gap: 12 }}>
              <div className="rec-row" data-m="pops" data-m-stagger="" data-m-d="2">
                {tax(e.type) && <span className="rec-tag">{tax(e.type)!.nom}</span>}
                <span className="rec-badge rec-badge--active">Terminé</span>
              </div>
              <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="2">
                <Words text={e.titre} />
              </h1>
              <p className="lead" data-m="rise" data-m-d="5">
                {[jourLong(e.debut), ville].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {galerie.length > 0 && (
        <section className="gal-x" aria-label="Galerie" data-m="faces" data-m-stagger="">
          {galerie.map((g, i) => (
            <figure key={g.id ?? i}>
              <Img media={g.image} size="carte" />
            </figure>
          ))}
        </section>
      )}

      <section className="band bg-white band-end">
        <div className="wrap">
          <div className="split">
            <div className="stack" data-m="cascade" data-m-stagger="">
              {e.compteRendu ? (
                <div className="card">
                  <h2 className="h-m">Compte rendu</h2>
                  <RichText data={e.compteRendu} />
                </div>
              ) : null}
            </div>
            <div className="stack" data-m="cascade" data-m-stagger="" data-m-d="2">
              {e.participants != null && (
                <div className="card-soft">
                  <p className="small muted">Participants</p>
                  <p className="h-s">{e.participants}</p>
                </div>
              )}
              {docs.length > 0 && (
                <div className="card">
                  <h2 className="h-s">Documents</h2>
                  {docs.map((doc, i) => (
                    <div className="line" key={doc.id} style={i === docs.length - 1 ? { borderBottom: 0 } : undefined}>
                      <span>{doc.titre}</span>
                      <a className="linkbtn" href={docHref(doc)}>
                        PDF
                      </a>
                    </div>
                  ))}
                </div>
              )}
              {actu && (
                <Link href={`/actualites/${actu.slug}`} className="rec-btn rec-btn--secondary">
                  Lire l’article
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbLd([{ nom: 'Agenda', chemin: '/agenda' }, { nom: e.titre, chemin: `/agenda/${e.slug}` }])} />
    </>
  )
}

const STATUT_SCHEMA: Record<string, string> = {
  annule: 'EventCancelled',
  reporte: 'EventRescheduled',
}

/** Écran 15 : fiche d'un événement à venir. */
async function Fiche({ e }: { e: EvenementSite }) {
  const [restantes, membre, accueil] = await Promise.all([
    placesRestantes(e.id, e.capacite),
    membreConnecte(),
    getPage('/'),
  ])
  const actif = membre?.statut === 'actif' ? membre : null
  const mienne = actif ? await inscriptionDuMembre(e.id, actif.id) : null
  const p = placesInfo(e, restantes)
  const complet = Boolean(p?.complet)
  const annule = e.statut === 'annule' || e.statut === 'reporte'
  const clos = estPasse(e) || Boolean(e.cloture && new Date(e.cloture) < new Date())
  const type = tax(e.type)
  const ville = tax(e.ville)
  const image = e.image ?? block(accueil, 'agenda')?.image
  const docs = docsVisibles(e)
  const url = `${siteUrl()}/agenda/${e.slug}`
  const lieuTexte = [e.lieu, e.adresse].filter(Boolean).join(', ')
  const lieuTitre =
    ville?.nom || (e.format === 'visio' ? 'Visioconférence' : e.format === 'communique' ? 'Communiqué aux inscrits' : '')
  const peutAttendre = e.listeAttente !== false

  let panneau: React.ReactNode = null
  if (!annule) {
    if (e.acces === 'invitation') {
      panneau = (
        <>
          <h2 className="h-s">Sur invitation</h2>
          <p className="small">Ce rendez-vous est réservé aux personnes invitées. Pour en savoir plus, écrivez au secrétariat.</p>
          <Link href="/contact" className="rec-btn rec-btn--secondary">
            Contacter le secrétariat
          </Link>
        </>
      )
    } else if (clos) {
      panneau = <p className="small">Les inscriptions sont closes.</p>
    } else if (e.acces === 'membres' && !actif) {
      panneau = (
        <>
          <h2 className="h-s">Réservé aux membres</h2>
          <Link href={`/espace-membre/connexion?retour=/agenda/${e.slug}`} className="rec-btn rec-btn--primary">
            Connectez-vous pour vous inscrire
          </Link>
        </>
      )
    } else if (mienne) {
      panneau =
        mienne.statut === 'attente' ? (
          <>
            <span className="rec-badge rec-badge--pending">Liste d’attente, position {mienne.position}</span>
            <p className="small">Si une place se libère, vous êtes inscrit automatiquement et prévenu par e-mail.</p>
          </>
        ) : (
          <EtatReussite etat={{ ok: true, statut: 'inscrit' }} slug={e.slug} />
        )
    } else if (complet && !peutAttendre) {
      panneau = <span className="rec-badge rec-badge--suspended">Complet</span>
    } else {
      panneau = (
        <>
          {complet ? (
            <>
              <span className="rec-badge rec-badge--suspended">Complet</span>
              <h2 className="h-s">Rejoindre la liste d’attente</h2>
              <p className="small">Si une place se libère, vous êtes inscrit automatiquement et prévenu par e-mail.</p>
            </>
          ) : (
            <h2 className="h-s">Je m’inscris</h2>
          )}
          {actif ? (
            <>
              <p className="small">
                Connecté en tant que{' '}
                <b>
                  {actif.prenom} {actif.nom}
                </b>
                {actif.entreprise?.nom ? ` · ${actif.entreprise.nom}` : ''}. Vos informations sont déjà remplies.
              </p>
              <AgendaInscriptionMembre evenement={e.id} slug={e.slug} complet={complet} />
            </>
          ) : (
            <AgendaInscription evenement={e.id} slug={e.slug} jeton={jetonFormulaire()} complet={complet} />
          )}
        </>
      )
    }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.titre,
    description: e.chapeau || undefined,
    startDate: e.debut,
    endDate: e.fin || undefined,
    eventStatus: `https://schema.org/${STATUT_SCHEMA[e.statut] ?? 'EventScheduled'}`,
    eventAttendanceMode: `https://schema.org/${e.format === 'visio' ? 'OnlineEventAttendanceMode' : 'OfflineEventAttendanceMode'}`,
    location:
      e.format === 'visio'
        ? { '@type': 'VirtualLocation', url }
        : {
            '@type': 'Place',
            name: e.lieu || ville?.nom,
            address: { '@type': 'PostalAddress', streetAddress: e.adresse || undefined, addressLocality: ville?.nom, addressCountry: 'CG' },
          },
    image: mediaUrl(image, 'grande') ? [mediaUrl(image, 'grande')] : undefined,
    organizer: { '@type': 'Organization', name: 'REC 242', url: siteUrl() },
    url,
  }

  return (
    <>
      <div className="subbar">
        <div className="wrap rec-row" style={{ justifyContent: 'space-between' }}>
          <Link href="/agenda" className="linkbtn">
            ← Agenda
          </Link>
        </div>
      </div>
      <section className="pband pband-b pband-tall">
        <Img media={image} alt="" m={{ m: 'iris' }} priority />
        <div className="wrap">
          <div className="ptext" style={{ maxWidth: 760 }}>
            <div className="rec-row dark" data-m="pops" data-m-stagger="" data-m-d="2">
              {type && <span className="rec-tag">{type.nom}</span>}
              <span className="pill-type">{accesLabel(e.acces)}</span>
              {p && <span className={`seat ${p.classe}`}>{p.texte}</span>}
            </div>
            <h1 className="h-xl" data-m="rise" data-m-d="4">
              {e.titre}
            </h1>
          </div>
        </div>
      </section>
      <section className="band bg-night dark band-s">
        <div className="wrap">
          <div className="infos-x" data-m="cascade" data-m-stagger="" data-m-d="6">
            <div>
              <span className="small muted">Date</span>
              <b>{jourLong(e.debut)}</b>
              <span className="small muted">{heure(e.debut)}</span>
            </div>
            <div>
              <span className="small muted">Lieu</span>
              <b>{lieuTitre || lieuTexte}</b>
              {lieuTitre && lieuTexte && <span className="small muted">{lieuTexte}</span>}
            </div>
            <div>
              <span className="small muted">Accès</span>
              <b>{accesLabel(e.acces)}</b>
              {p && <span className="small muted">{p.texte}</span>}
            </div>
            <div>
              <span className="small muted">Tarif</span>
              <b>{e.tarif || 'À préciser'}</b>
              {!e.tarif && <span className="small muted">par le comité de direction</span>}
            </div>
          </div>
        </div>
      </section>

      {annule && (
        <section className="band band-s bg-warm">
          <div className="wrap">
            <div className="card-soft" role="status">
              <span className="rec-badge rec-badge--suspended">{e.statut === 'annule' ? 'Annulé' : 'Reporté'}</span>
              {e.messageInscrits && <p>{e.messageInscrits}</p>}
              {e.statut === 'reporte' && e.nouvelleDate && (
                <p className="small">
                  Nouvelle date : {jourLong(e.nouvelleDate)}, {heure(e.nouvelleDate)}.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="band">
        <div className="wrap">
          <div className="split">
            <div className="stack" data-m="cascade" data-m-stagger="">
              {Boolean(e.chapeau || e.description) && (
                <div className="card">
                  <h2 className="h-s">Le rendez-vous</h2>
                  {e.chapeau && <p>{e.chapeau}</p>}
                  {e.description ? <RichText data={e.description} /> : null}
                </div>
              )}
              {e.programme && e.programme.length > 0 && (
                <div className="card">
                  <h2 className="h-s">Programme</h2>
                  {e.programme.map((l, i) => (
                    <div className="line" key={l.id ?? i}>
                      <span className="mono" style={{ color: '#0b5e32' }}>
                        {l.heure}
                      </span>
                      <span style={{ flex: 1, marginLeft: 16 }}>{l.intitule}</span>
                    </div>
                  ))}
                </div>
              )}
              {e.intervenants && e.intervenants.length > 0 && (
                <div className="card">
                  <h2 className="h-s">Intervenants</h2>
                  <div className="g2">
                    {e.intervenants.map((i, k) => (
                      <div className="person" key={i.id ?? k}>
                        <div className="av sand av-photo">
                          {initiales(i.nom)}
                          <Img media={i.photo} size="vignette" alt={i.nom} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600 }}>{i.nom}</p>
                          {i.fonction && <p className="small muted">{i.fonction}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {docs.length > 0 && (
                <div className="card">
                  <h2 className="h-s">Documents</h2>
                  {docs.map((doc, i) => (
                    <div className="line" key={doc.id} style={i === docs.length - 1 ? { borderBottom: 0 } : undefined}>
                      <span>{doc.titre}</span>
                      <a className="linkbtn" href={docHref(doc)}>
                        Télécharger
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {panneau && (
              <div className="card-soft side-sticky" data-m="lift" data-m-d="2">
                {panneau}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="band bg-tint band-s band-end">
        <div className="wrap rec-row" style={{ justifyContent: 'space-between' }}>
          <p className="h-m" data-m="rise">
            Partager ce rendez-vous
          </p>
          <Share url={url} titre={e.titre} />
        </div>
      </section>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd([{ nom: 'Agenda', chemin: '/agenda' }, { nom: e.titre, chemin: `/agenda/${e.slug}` }])} />
    </>
  )
}
