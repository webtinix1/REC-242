import type { ListViewServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { atLeast, extraFull } from '@/access/roles'
import { BoView, initiales } from '../BoView'
import { DemandesCommission } from './DemandesCommission'

const BASE = '/admin/collections/commissions'

type Media = { url?: string; sizes?: { vignette?: { url?: string } } } | null
const img = (m?: Media) => m?.sizes?.vignette?.url || m?.url || undefined
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number))

/** Écran 19 : commissions (demandes pour rejoindre, une carte par commission). L’édition reste le formulaire natif. */
export const CommissionsView = async (props: ListViewServerProps) => {
  const { payload, user } = props
  const peutCreer = extraFull(user as never, 'commissions')
  const peutTraiter = atLeast(user as never, 'membres', 'partial')

  const [coms, demandes, actifs] = await Promise.all([
    payload.find({ collection: 'commissions', sort: 'ordre', depth: 2, limit: 100, user, overrideAccess: false }),
    payload.find({ collection: 'commissionRequests', where: { statut: { equals: 'attente' } }, sort: 'createdAt', depth: 2, limit: 200, overrideAccess: true }),
    payload.find({ collection: 'members', where: { statut: { equals: 'actif' } }, depth: 0, limit: 5000, overrideAccess: true, select: { commissions: true } }),
  ])
  const effectifs = new Map<number, number>()
  for (const m of actifs.docs as unknown as { commissions?: unknown[] }[])
    for (const c of m.commissions ?? []) effectifs.set(idDe(c), (effectifs.get(idDe(c)) ?? 0) + 1)

  return (
    <BoView titre="Commissions">
      <div className="bar-actions">
        <p className="muted">Organes consultatifs créés par le comité de direction (article 17 des statuts).</p>
        {peutCreer && (
          <Link className="rec-btn rec-btn--primary" href={`${BASE}/create`}>
            Créer une commission
          </Link>
        )}
      </div>
      <DemandesCommission
        peutTraiter={peutTraiter}
        demandes={demandes.docs.map((d) => {
          const r = d as unknown as {
            id: number
            apport?: string
            membre?: { nomComplet?: string; photo?: Media; entreprise?: { nom?: string } | null } | null
            commission?: { nom?: string } | null
          }
          const nom = r.membre?.nomComplet ?? ''
          return {
            id: r.id,
            nom,
            ini: initiales(nom),
            photo: img(r.membre?.photo),
            entreprise: r.membre?.entreprise?.nom ?? '',
            commission: r.commission?.nom ?? '',
            apport: r.apport ?? '',
          }
        })}
      />
      <div className="cards3">
        {coms.docs.length === 0 && <p className="muted">Aucune commission pour le moment.</p>}
        {coms.docs.map((d) => {
          const c = d as unknown as {
            id: number
            nom: string
            objet: string
            ouverture: string
            experts?: unknown[]
            prochaineReunion?: string | null
            responsable?: { nom?: string; photo?: Media } | null
          }
          const ouverte = c.ouverture === 'ouverte'
          return (
            <section className="panel comc" key={c.id}>
              <div className="panel-h">
                <h2 className="h3">{c.nom}</h2>
                <span className={`pill${ouverte ? ' pill-ok' : ''}`}>{ouverte ? 'Ouverte' : 'Sur désignation'}</span>
              </div>
              <p className="small muted">{c.objet}</p>
              <div className="vrow">
                <span className="ent-cell">
                  {img(c.responsable?.photo) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="face" src={img(c.responsable?.photo)} alt={c.responsable?.nom ?? ''} />
                  ) : (
                    <span className="av">{initiales(c.responsable?.nom ?? '')}</span>
                  )}
                  <span>
                    <span className="small muted">Responsable</span>
                    <br />
                    <b>{c.responsable?.nom ?? 'Non désigné'}</b>
                  </span>
                </span>
              </div>
              <div className="vrow">
                <span>Membres</span>
                <span className="mono">{effectifs.get(c.id) ?? 0}</span>
              </div>
              <div className="vrow">
                <span>Experts rattachés</span>
                <span className="mono">{(c.experts ?? []).length}</span>
              </div>
              <div className="vrow">
                <span>Prochaine réunion</span>
                <span>
                  {c.prochaineReunion
                    ? new Date(c.prochaineReunion).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Brazzaville' })
                    : 'À fixer'}
                </span>
              </div>
              <Link className="linkbtn" href={`${BASE}/${c.id}`}>
                Modifier
              </Link>
            </section>
          )
        })}
      </div>
    </BoView>
  )
}
