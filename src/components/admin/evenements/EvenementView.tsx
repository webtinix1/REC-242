import type { DocumentViewServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { atLeast } from '@/access/roles'
import { telephoneAffiche } from '@/lib/adhesion/categories'
import { BoView } from '../BoView'
import { EvenementGestion, type Participant } from './EvenementGestion'
import { FormulaireNatif } from './FormulaireNatif'
import { dateCourte, jourNum, moisCourt, STATUTS_EV, taux } from './format'

type Reg = {
  id: number
  statut: string
  position?: number
  numeroBillet?: string
  visiteur?: { nom?: string; telephone?: string; entreprise?: string }
  membre?: { prenom?: string; nom?: string; telephone?: string; entreprise?: { nom?: string } | null } | null
}
type Ev = {
  id: number
  titre: string
  chapeau?: string
  debut: string
  statut: string
  capacite?: number | null
  participants?: number | null
  actualite?: { id: number } | number | null
}

/** Écran 08 : gestion d'un événement. Sans identifiant (création) ou avec ?vue=formulaire : formulaire natif de Payload. */
export const EvenementView = async (props: DocumentViewServerProps) => {
  const { payload, user, searchParams, doc, hasPublishedDoc, i18n, initPageResult, locale, params, permissions, routeSegments, versions, ...natif } = props
  void [hasPublishedDoc, i18n, initPageResult, locale, params, permissions, routeSegments, versions]
  const id = (props as { id?: number | string }).id ?? (doc as { id?: number } | undefined)?.id
  const formulaire = searchParams?.vue === 'formulaire'

  if (!id || formulaire)
    return (
      <>
        {id && (
          <div className="bb bo-view">
            <div className="content">
              <Link className="linkbtn" href={`/admin/collections/events/${id}`}>
                ← Gestion de l&apos;événement
              </Link>
            </div>
          </div>
        )}
        <FormulaireNatif {...(natif as unknown as React.ComponentProps<typeof FormulaireNatif>)} />
      </>
    )

  const e = (await payload.findByID({ collection: 'events', id, depth: 0, user, overrideAccess: false })) as unknown as Ev
  const regs = await payload.find({
    collection: 'registrations',
    where: { evenement: { equals: e.id } },
    sort: 'createdAt',
    limit: 2000,
    depth: 2,
    user,
    overrideAccess: false,
  })
  const lignes = (regs.docs as unknown as Reg[]).map((r) => {
    const m = r.membre
    return {
      id: r.id,
      statut: r.statut,
      position: r.position ?? 0,
      nom: m ? `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() : (r.visiteur?.nom ?? ''),
      profil: m ? 'Membre' : 'Visiteur',
      detail: m ? (m.entreprise?.nom ?? '') : (r.visiteur?.entreprise ?? ''),
      telephone: telephoneAffiche((m ? m.telephone : r.visiteur?.telephone) ?? undefined) ?? '',
    } satisfies Participant
  })
  const inscrits = lignes.filter((l) => l.statut === 'inscrit' || l.statut === 'present').length
  const pct = taux(inscrits, e.capacite)
  const st = STATUTS_EV[e.statut] ?? { label: e.statut, cls: 'pending' }
  const actualite = typeof e.actualite === 'object' && e.actualite ? e.actualite.id : (e.actualite ?? null)

  return (
    <BoView titre="Gestion d’un événement">
      <Link className="linkbtn" href="/admin/collections/events">
        ← Événements
      </Link>
      <div className="head-card">
        <span className="datedisc">
          <b>{jourNum(e.debut)}</b>
          <span>{moisCourt(e.debut)}</span>
        </span>
        <div>
          <h2 className="h1">{e.titre}</h2>
          <p className="muted">
            {dateCourte(e.debut)} · {e.capacite ? `${inscrits} / ${e.capacite}` : inscrits} inscrits{pct !== null ? ` · ${pct} %` : ''}
          </p>
        </div>
        <span className={`rec-badge rec-badge--${st.cls}`}>{st.label}</span>
      </div>
      <EvenementGestion
        id={e.id}
        titre={e.titre}
        chapeau={e.chapeau ?? ''}
        statut={e.statut}
        participantsSaisis={e.participants ?? null}
        actualite={actualite}
        modifiable={atLeast(user as never, 'evenements', 'partial')}
        peutExporter={atLeast(user as never, 'exports', 'partial')}
        lignes={lignes}
      />
    </BoView>
  )
}
