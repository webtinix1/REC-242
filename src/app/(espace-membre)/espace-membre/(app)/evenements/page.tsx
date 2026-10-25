import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { EvenementsMes, type LigneInscription } from '@/components/espace/EvenementsMes'
import { EvenementsSuggestions, type Suggestion } from '@/components/espace/EvenementsSuggestions'
import { RichText } from '@/components/site/RichText'
import { billetParId, placesParEvenement } from '@/lib/evenements/lecture'
import { inscriptionsDe, jourMois, maintenantMs, statutInscription, type InscriptionMembre } from '@/lib/evenements/espace'
import { heureFr, jourLong, lieuDe, type Evenement } from '@/lib/evenements/notifications'
import { exigerMembre, urlMedia } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'

export const metadata: Metadata = { title: 'Mes événements' }

const nomType = (t: unknown) => (t && typeof t === 'object' ? (t as { nom?: string }).nom : undefined)
const lieuCourt = (e: InscriptionMembre['evenement']) => lieuDe(e as unknown as Evenement)

/** Mes événements (écran 04). */
export default async function EvenementsPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const m = await exigerMembre()
  const passes = (await searchParams).onglet === 'passes'
  const maintenant = maintenantMs()
  const toutes = await inscriptionsDe(m.id)
  const avenir = toutes
    .filter((i) => ['inscrit', 'attente'].includes(i.statut) && new Date(i.evenement.debut).getTime() >= maintenant)
    .sort((a, b) => a.evenement.debut.localeCompare(b.evenement.debut))
  const anciennes = toutes
    .filter((i) => i.statut !== 'attente' && new Date(i.evenement.debut).getTime() < maintenant)
    .sort((a, b) => b.evenement.debut.localeCompare(a.evenement.debut))

  let lignes: LigneInscription[] = []
  let suggestions: Suggestion[] = []
  if (!passes) {
    lignes = await Promise.all(
      avenir.map(async (i) => {
        const e = i.evenement
        const s = statutInscription(i)
        const b = i.statut === 'inscrit' ? await billetParId(i.id) : null
        return {
          id: i.id,
          evenementId: e.id,
          ...jourMois(e.debut),
          titre: e.titre,
          type: nomType(e.type),
          lieu: lieuCourt(e),
          heure: heureFr(e.debut),
          statut: s.libelle,
          classe: s.classe,
          image: urlMedia(e.image as never, 'carte'),
          numero: i.numeroBillet ?? undefined,
          qr: b?.qr,
          date: jourLong(e.debut),
        }
      }),
    )
    const payload = await getPayloadClient()
    const inscrits = new Set(toutes.filter((i) => i.statut !== 'annule').map((i) => i.evenement.id))
    const r = await payload.find({
      collection: 'events',
      where: { and: [{ statut: { equals: 'publie' } }, { debut: { greater_than_equal: new Date().toISOString() } }, { acces: { in: ['tous', 'membres'] } }] },
      sort: 'debut',
      limit: 12,
      depth: 1,
      overrideAccess: true,
    })
    const evs = (r.docs as unknown as (InscriptionMembre['evenement'] & { capacite?: number | null; acces?: string })[]).filter((e) => !inscrits.has(e.id))
    const places = await placesParEvenement(evs)
    suggestions = evs.slice(0, 4).map((e) => {
      const p = places.get(e.id)
      return {
        id: e.id,
        ...jourMois(e.debut),
        titre: e.titre,
        type: nomType(e.type),
        acces: e.acces === 'membres' ? 'Réservé aux membres' : 'Ouvert à tous',
        lieu: lieuCourt(e),
        heure: heureFr(e.debut),
        places: p == null ? undefined : `${p} place${p > 1 ? 's' : ''} restante${p > 1 ? 's' : ''}`,
        image: urlMedia(e.image as never, 'carte'),
      }
    })
  }

  return (
    <>
      <div className="top">
        <h1 className="h1">Mes événements</h1>
      </div>
      <div className="row between">
        <nav className="seg" aria-label="Période">
          <Link href="/espace-membre/evenements" aria-current={passes ? undefined : 'page'}>
            À venir
          </Link>
          <Link href="/espace-membre/evenements?onglet=passes" aria-current={passes ? 'page' : undefined}>
            Passés
          </Link>
        </nav>
        <Link className="linkbtn" href="/agenda">
          Voir tout l&apos;agenda du réseau →
        </Link>
      </div>

      {!passes && (
        <>
          <div className="card">
            <h2 className="h3">Mes inscriptions</h2>
            {lignes.length ? (
              <EvenementsMes lignes={lignes} qui={`${m.prenom} ${m.nom}${m.entreprise?.nom ? ` · ${m.entreprise.nom}` : ''}`} />
            ) : (
              <div className="empty">
                <p className="h3">Aucune inscription à venir</p>
                <p className="small muted">Inscrivez-vous à un rendez-vous ci-dessous.</p>
              </div>
            )}
          </div>
          <div className="card">
            <div className="row between">
              <h2 className="h3">Prochains rendez-vous du réseau</h2>
            </div>
            {suggestions.length ? <EvenementsSuggestions items={suggestions} /> : <p className="small muted">Aucun autre rendez-vous annoncé pour le moment.</p>}
          </div>
        </>
      )}

      {passes && (
        <div className="card">
          <h2 className="h3">Rendez-vous passés</h2>
          {anciennes.length ? (
            anciennes.map((i) => {
              const e = i.evenement
              const s = statutInscription(i)
              const inscrit = ['inscrit', 'present'].includes(i.statut)
              const docs = (e.documents ?? [])
                .filter((d) => d.document && typeof d.document === 'object' && (d.visibilite === 'tous' || (d.visibilite === 'inscrits' && inscrit)))
                .map((d) => d.document as { id: number; titre?: string })
              const dm = jourMois(e.debut)
              return (
                <div className="item ev" key={i.id}>
                  <div className="datedisc light">
                    <b>{dm.jour}</b>
                    <span>{dm.mois}</span>
                  </div>
                  <div className="grow">
                    <p className="h3">{e.titre}</p>
                    <p className="small muted">{lieuCourt(e)}</p>
                    {(Boolean(e.compteRendu) || docs.length > 0) && (
                      <div className="stack-s" style={{ marginTop: 8 }}>
                        {Boolean(e.compteRendu) && (
                          <details>
                            <summary className="linkbtn">Compte rendu</summary>
                            <div className="small">
                              <RichText data={e.compteRendu} />
                            </div>
                          </details>
                        )}
                        {docs.map((d) => (
                          <a key={d.id} className="linkbtn" href={`/api/documents/${d.id}/telecharger`}>
                            {d.titre ?? 'Document'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`rec-badge rec-badge--${s.classe}`}>{s.libelle}</span>
                </div>
              )
            })
          ) : (
            <div className="empty">
              <p className="h3">Aucun rendez-vous passé</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
