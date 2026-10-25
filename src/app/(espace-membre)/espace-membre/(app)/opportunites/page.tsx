import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import React from 'react'

import { OpportuniteCarte, type CarteOpportunite } from '@/components/espace/OpportuniteCarte'
import { dateLongue, exigerMembre } from '@/lib/membres/espace'
import { joursRestants, statutLabel, TYPES_OPPORTUNITE, typeLabel } from '@/lib/opportunites/regles'
import { getPayloadClient } from '@/lib/site/payload'

export const metadata: Metadata = { title: 'Opportunités' }

const BASE = '/espace-membre/opportunites'
const EDITABLES = ['brouillon', 'modification', 'a-moderer', 'refusee']
const CLASSE: Record<string, string> = { publiee: 'active', expiree: 'suspended', refusee: 'suspended', modification: 'pending', 'a-moderer': 'pending', brouillon: 'pending' }

type Doc = {
  id: number
  type: string
  visibilite: string
  titre: string
  description: string
  secteurs?: ({ id: number; nom: string } | number)[]
  source?: { lien?: string | null; libelle?: string | null }
  commentRepondre?: string | null
  pieceJointe?: { filename?: string } | number | null
  dateLimite: string
  auteur: string
  membre?: number | { id: number } | null
  statut: string
  messageModeration?: string | null
  motifRefus?: string | null
}
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))

/** Opportunités (écran 05) : liste filtrée par type et « Mes publications ». */
export default async function OpportunitesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = await exigerMembre()
  const q = await searchParams
  const type = typeof q.type === 'string' && TYPES_OPPORTUNITE.some((t) => t.value === q.type) ? q.type : undefined
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })

  const [pub, miennes] = await Promise.all([
    payload.find({
      collection: 'opportunities',
      where: { and: [{ statut: { equals: 'publiee' } }, ...(type ? [{ type: { equals: type } }] : [])] },
      sort: 'dateLimite',
      limit: 60,
      depth: 1,
      user,
      overrideAccess: false,
    }),
    payload.find({ collection: 'opportunities', where: { membre: { equals: m.id } }, sort: '-createdAt', limit: 50, depth: 0, user, overrideAccess: false }),
  ])
  const docs = pub.docs as unknown as Doc[]
  const mes = miennes.docs as unknown as Doc[]

  // Entreprise des auteurs membres (source d'une offre entre membres).
  const auteurs = [...new Set(docs.map((d) => idDe(d.membre)).filter((x): x is number => !!x && x !== m.id))]
  const noms = new Map<number, string>()
  if (auteurs.length) {
    const r = await payload.find({ collection: 'members', where: { id: { in: auteurs } }, depth: 1, limit: auteurs.length, overrideAccess: true, select: { entreprise: true } })
    for (const a of r.docs as unknown as { id: number; entreprise?: { nom?: string } | null }[]) if (a.entreprise?.nom) noms.set(a.id, a.entreprise.nom)
  }
  const reponses = new Map<number, number>()
  await Promise.all(
    mes.map(async (d) => {
      const c = await payload.count({ collection: 'opportunityReplies', where: { opportunite: { equals: d.id } }, overrideAccess: true })
      reponses.set(d.id, c.totalDocs)
    }),
  )

  const cartes: CarteOpportunite[] = docs.map((d) => {
    const auteur = idDe(d.membre)
    const sien = auteur === m.id
    const entreMembres = d.auteur === 'membre'
    const secteurs = (d.secteurs ?? []).map((s) => (typeof s === 'object' ? s.nom : '')).filter(Boolean)
    const source = sien
      ? 'Votre annonce'
      : entreMembres
        ? (auteur && noms.get(auteur)) || 'Membre de REC 242'
        : d.source?.libelle || 'Publié par REC 242'
    const pj = d.pieceJointe && typeof d.pieceJointe === 'object' && d.pieceJointe.filename ? d.pieceJointe.filename : undefined
    return {
      id: d.id,
      type: typeLabel(d.type),
      visibilite: d.visibilite === 'public' ? 'Public' : 'Membres',
      bientot: joursRestants(d.dateLimite) <= 7,
      titre: d.titre,
      secteur: secteurs.join(', ') || 'Tous secteurs',
      source,
      limite: dateLongue(d.dateLimite),
      description: d.description,
      commentRepondre: d.commentRepondre || undefined,
      pieceJointe: pj ? { nom: pj, url: `/api/fichiers/file/${encodeURIComponent(pj)}` } : undefined,
      lienOfficiel: d.source?.lien || undefined,
      aider: !!d.source?.lien || ['appel-offres', 'financement'].includes(d.type),
      peutRepondre: entreMembres && d.type === 'offre-membre' && !!auteur && !sien,
    }
  })
  const chip = (actif: boolean) => `chip ${actif ? 'is-on' : ''}`

  return (
    <>
      <div className="top">
        <h1 className="h1">Opportunités</h1>
      </div>
      <div className="card-soft" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="stack-s">
          <p className="h3">Vous avez un besoin ou une offre ?</p>
          <p className="small muted">Publiez-la pour les membres. Chaque annonce est relue avant sa mise en ligne.</p>
        </div>
        <Link className="rec-btn rec-btn--primary" href={`${BASE}/publier`}>
          Publier une opportunité
        </Link>
      </div>
      <div className="chips" role="group" aria-label="Type d’opportunité">
        <Link className={chip(!type)} href={BASE} aria-current={!type ? 'true' : undefined}>
          Toutes
        </Link>
        {TYPES_OPPORTUNITE.map((t) => (
          <Link key={t.value} className={chip(type === t.value)} href={`${BASE}?type=${t.value}`} aria-current={type === t.value ? 'true' : undefined}>
            {t.label}
          </Link>
        ))}
      </div>
      {cartes.length === 0 ? (
        <div className="empty">
          <p className="h3">Aucune opportunité pour le moment</p>
          <p className="small muted">Revenez bientôt, ou publiez la vôtre.</p>
        </div>
      ) : (
        <div className="g2">
          {cartes.map((c) => (
            <OpportuniteCarte key={c.id} o={c} />
          ))}
        </div>
      )}
      <div className="card">
        <h2 className="h3">Mes publications</h2>
        {mes.length === 0 && <p className="small muted">Vous n&apos;avez encore rien publié.</p>}
        {mes.map((d) => {
          const n = reponses.get(d.id) ?? 0
          return (
            <div className="item" key={d.id}>
              <div className="grow">
                <p style={{ fontWeight: 600 }}>{d.titre}</p>
                <p className="small muted">
                  Date limite {dateLongue(d.dateLimite)} · {n} réponse{n > 1 ? 's' : ''}
                </p>
                {d.statut === 'modification' && d.messageModeration && <p className="small">{d.messageModeration}</p>}
                {d.statut === 'refusee' && d.motifRefus && <p className="small">{d.motifRefus}</p>}
              </div>
              <span className={`rec-badge rec-badge--${CLASSE[d.statut] ?? 'pending'}`}>{statutLabel(d.statut)}</span>
              {d.statut === 'publiee' && (
                <Link className="linkbtn" href="/espace-membre/echanges">
                  Lire les réponses
                </Link>
              )}
              {EDITABLES.includes(d.statut) && (
                <Link className="linkbtn" href={`${BASE}/publier?id=${d.id}`}>
                  Modifier
                </Link>
              )}
              {d.statut === 'expiree' && (
                <Link className="linkbtn" href={`${BASE}/publier?id=${d.id}`}>
                  Republier
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
