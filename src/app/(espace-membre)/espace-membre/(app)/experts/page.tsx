import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import React from 'react'

import { ExpertsDemande, type PersonneExpert } from '@/components/espace/ExpertsDemande'
import { poserQuestion } from '@/lib/echanges/actions'
import { dateCourte, exigerMembre, initialesDe, urlMedia } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'

export const metadata: Metadata = { title: 'Solliciter un expert' }

type Tag = { id: number; nom: string }
type Personne = {
  id: number
  nom: string
  initiales?: string
  photo?: Parameters<typeof urlMedia>[0]
  fonction: string
  role: 'fondatrice' | 'comite' | 'expert'
  etiquettes?: (Tag | number)[]
}
type Demande = {
  id: number
  question: string
  statut: string
  createdAt: string
  etiquette?: Tag | number | null
  personne?: { nom?: string } | number | null
}

const STATUT: Record<string, { l: string; cls: string }> = {
  envoyee: { l: 'Envoyée', cls: 'pending' },
  'en-cours': { l: 'En cours', cls: 'pending' },
  repondue: { l: 'Répondue', cls: 'active' },
  'sans-reponse': { l: 'Sans réponse', cls: 'suspended' },
  reattribuee: { l: 'Réattribuée', cls: 'pending' },
  cloturee: { l: 'Clôturée', cls: 'active' },
}
const court = (t: string) => (t.length > 90 ? `${t.slice(0, 87).trimEnd()}…` : t)

/** Solliciter un expert (écran 09) : domaine, personne, demande, puis « Mes demandes ». */
export default async function ExpertsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = await exigerMembre()
  const q = await searchParams
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })

  const [pers, demandes, rang] = await Promise.all([
    payload.find({
      collection: 'people',
      where: { and: [{ visible: { equals: true } }, { role: { in: ['comite', 'expert'] } }] },
      sort: 'ordre',
      limit: 200,
      depth: 1,
      user,
      overrideAccess: false,
    }),
    payload.find({ collection: 'expertRequests', where: { membre: { equals: m.id } }, sort: '-createdAt', limit: 30, depth: 1, user, overrideAccess: false }),
    payload.find({ collection: 'expertiseTags', sort: 'ordre', limit: 200, depth: 0, user, overrideAccess: false }),
  ])
  const gens = (pers.docs as unknown as Personne[]).map((p) => ({
    ...p,
    tags: (p.etiquettes ?? []).filter((t): t is Tag => typeof t !== 'number'),
  }))

  // Étiquettes portées par au moins une personne visible, dans l'ordre des étiquettes.
  const porteuses = new Set(gens.flatMap((p) => p.tags.map((t) => t.id)))
  const tags = (rang.docs as unknown as Tag[]).filter((t) => porteuses.has(t.id))
  const demandeTag = typeof q.tag === 'string' ? q.tag : ''
  const tag = tags.find((t) => t.nom === demandeTag) ?? tags[0]

  const personnes: PersonneExpert[] = tag
    ? gens
        .filter((p) => p.tags.some((t) => t.id === tag.id))
        .map((p) => {
          const mots = p.nom.split(' ')
          return {
            id: p.id,
            nom: p.nom,
            ini: p.initiales || initialesDe({ prenom: mots[0], nom: mots[mots.length - 1] }),
            photo: urlMedia(p.photo, 'vignette'),
            fonction: p.fonction,
            role: p.role === 'comite' ? 'Comité' : 'Expert',
            tags: p.tags.map((t) => t.nom),
          }
        })
    : []

  // « Me faire aider » : la question est préremplie avec le titre de l'opportunité.
  let opportunite: { id: number; titre: string } | undefined
  const idOpp = Number(typeof q.opportunite === 'string' ? q.opportunite : '')
  if (idOpp) {
    const o = (await payload.findByID({ collection: 'opportunities', id: idOpp, depth: 0, user, overrideAccess: false }).catch(() => null)) as unknown as {
      id: number
      titre: string
    } | null
    if (o) opportunite = { id: o.id, titre: o.titre }
  }

  return (
    <>
      <div className="top">
        <h1 className="h1">Solliciter un expert</h1>
      </div>
      <div className="card-soft">
        <p className="h3">Une question sur votre activité ?</p>
        <p className="small">
          Choisissez votre domaine. Les étiquettes d&apos;expertise relient votre demande aux membres du comité de direction et aux experts du réseau
          qui la traitent. Les coordonnées restent privées : la personne choisie vous répond depuis la plateforme ou sur WhatsApp.
        </p>
      </div>
      <div className="card">
        <h2 className="h3">1. Votre domaine</h2>
        {tags.length ? (
          <div className="chips" role="group" aria-label="Domaine">
            {tags.map((t) => (
              <Link
                key={t.id}
                className={`chip ${tag?.id === t.id ? 'is-on' : ''}`}
                aria-current={tag?.id === t.id ? 'true' : undefined}
                href={`/espace-membre/experts?${new URLSearchParams({ tag: t.nom, ...(opportunite ? { opportunite: String(opportunite.id) } : {}) })}`}
                scroll={false}
              >
                #{t.nom}
              </Link>
            ))}
          </div>
        ) : (
          <p className="small muted">Aucun expert n&apos;est disponible pour le moment.</p>
        )}
      </div>
      {tag && (
        <ExpertsDemande
          key={`${tag.id}-${opportunite?.id ?? 0}`}
          tag={{ id: tag.id, nom: tag.nom }}
          personnes={personnes}
          opportunite={opportunite}
          action={poserQuestion}
        />
      )}
      <div className="card">
        <h2 className="h3">Mes demandes</h2>
        {(demandes.docs as unknown as Demande[]).length ? (
          (demandes.docs as unknown as Demande[]).map((r) => {
            const s = STATUT[r.statut] ?? STATUT.envoyee
            return (
              <div className="item" key={r.id}>
                <div className="grow">
                  <p style={{ fontWeight: 600 }}>{court(r.question)}</p>
                  <p className="xs muted">
                    {typeof r.personne === 'object' && r.personne ? r.personne.nom : ''} · #{typeof r.etiquette === 'object' && r.etiquette ? r.etiquette.nom : ''} ·{' '}
                    {dateCourte(r.createdAt)}
                  </p>
                </div>
                <span className={`rec-badge rec-badge--${s.cls}`}>{s.l}</span>
                <Link className="linkbtn" href={`/espace-membre/echanges?onglet=experts&id=${r.id}`}>
                  Ouvrir
                </Link>
              </div>
            )
          })
        ) : (
          <p className="xs muted">Aucune demande pour le moment.</p>
        )}
      </div>
    </>
  )
}
