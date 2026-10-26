import type { ListViewServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { atLeast } from '@/access/roles'
import { BoView } from '../BoView'
import { DupliquerEvenement } from './DupliquerEvenement'
import { dateCourte, STATUTS_EV, taux } from './format'

type Ev = {
  id: number
  titre: string
  debut: string
  statut: string
  capacite?: number | null
  image?: { url?: string; alt?: string; sizes?: { vignette?: { url?: string } } } | null
}

const avenirDabord = (tous: Ev[]) => {
  const maintenant = Date.now()
  return [...tous.filter((e) => new Date(e.debut).getTime() >= maintenant), ...tous.filter((e) => new Date(e.debut).getTime() < maintenant).reverse()]
}

/** Écran 07 : liste des événements. */
export const EvenementsView = async (props: ListViewServerProps) => {
  const { payload, user } = props
  const [evs, regs] = await Promise.all([
    payload.find({ collection: 'events', sort: 'debut', limit: 200, depth: 1, user, overrideAccess: false }),
    payload.find({
      collection: 'registrations',
      where: { statut: { in: ['inscrit', 'present'] } },
      pagination: false,
      depth: 0,
      select: { evenement: true },
      user,
      overrideAccess: false,
    }),
  ])
  const compte = new Map<number, number>()
  for (const r of regs.docs as unknown as { evenement: number }[]) compte.set(r.evenement, (compte.get(r.evenement) ?? 0) + 1)
  const peutCreer = atLeast(user as never, 'evenements', 'partial')
  // À venir d'abord (du plus proche au plus lointain), puis les événements passés.
  const liste = avenirDabord(evs.docs as unknown as Ev[])

  return (
    <BoView titre="Événements">
      <div className="bar-actions">
        <p className="muted">{liste.length === 1 ? '1 événement' : `${liste.length} événements`}</p>
        {peutCreer && (
          <Link className="rec-btn rec-btn--primary" href="/admin/collections/events/create">
            Créer un événement
          </Link>
        )}
      </div>
      <div className="cards3">
        {liste.map((e) => {
          const n = compte.get(e.id) ?? 0
          const pct = taux(n, e.capacite)
          const st = STATUTS_EV[e.statut] ?? { label: e.statut, cls: 'pending' }
          const url = e.image?.sizes?.vignette?.url || e.image?.url
          return (
            <section key={e.id} className="panel evc">
              <span className="pick evimg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {url && <img src={url} alt={e.image?.alt ?? ''} />}
              </span>
              <div className="rec-row" style={{ justifyContent: 'space-between' }}>
                <span className={`rec-badge rec-badge--${st.cls}`}>{st.label}</span>
                <span className="small muted">{dateCourte(e.debut)}</span>
              </div>
              <h3 className="h3">{e.titre}</h3>
              <div className="ring-fill">
                {pct !== null && (
                  <div className="bar">
                    <span style={{ width: `${Math.min(100, pct)}%` }}></span>
                  </div>
                )}
                <span className="small">
                  <b>{e.capacite ? `${n} / ${e.capacite}` : n}</b> inscrits{pct !== null ? ` · ${pct} %` : ''}
                </span>
              </div>
              <div className="rec-row">
                <Link className="rec-btn rec-btn--secondary" href={`/admin/collections/events/${e.id}`}>
                  Gérer
                </Link>
                {peutCreer && <DupliquerEvenement id={e.id} />}
              </div>
            </section>
          )
        })}
      </div>
      {liste.length === 0 && <p className="muted">Aucun événement pour le moment.</p>}
    </BoView>
  )
}
