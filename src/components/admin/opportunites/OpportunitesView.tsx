import type { ListViewServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { atLeast } from '@/access/roles'
import { lettreCategorie } from '@/lib/adhesion/categories'
import { situationCotisation, type PaiementMembre } from '@/lib/membres/cotisation'
import { joursRestants, typeLabel } from '@/lib/opportunites/regles'
import { BoView, relatif } from '../BoView'
import { dateCourte } from '../evenements/format'
import { Moderation } from './Moderation'

const BASE = '/admin/collections/opportunities'

type Opp = {
  id: number
  titre: string
  type: string
  visibilite?: string
  dateLimite?: string | null
  statut: string
  description?: string
  coordonnees?: string
  createdAt: string
  secteurs?: ({ nom?: string } | number)[] | null
  membre?: number | Membre | null
}

type Membre = {
  id: number
  nomComplet?: string
  prenom?: string
  nom?: string
  categorie?: string
  cotisation?: { droit?: number; montant?: number; tranches?: number }
  entreprise?: { nom?: string } | number | null
}

const jourLong = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Brazzaville' })

const statutAffiche = (o: Opp): { label: string; cls: string } => {
  if (o.statut === 'publiee') {
    const j = o.dateLimite ? joursRestants(o.dateLimite) : null
    if (j !== null && j <= 7 && j >= 0) return { label: j === 0 ? 'Expire aujourd’hui' : `Expire dans ${j} jour${j > 1 ? 's' : ''}`, cls: 'pending' }
    return { label: 'Publiée', cls: 'active' }
  }
  if (o.statut === 'expiree') return { label: 'Expirée', cls: 'suspended' }
  if (o.statut === 'refusee') return { label: 'Refusée', cls: 'suspended' }
  if (o.statut === 'a-moderer') return { label: 'À modérer', cls: 'pending' }
  if (o.statut === 'modification') return { label: 'Modification demandée', cls: 'pending' }
  return { label: 'Brouillon', cls: 'pending' }
}

/** Écran 11 : liste des opportunités et modération de l'annonce sélectionnée. */
export const OpportunitesView = async (props: ListViewServerProps) => {
  const { payload, user, searchParams } = props
  const res = await payload.find({ collection: 'opportunities', limit: 300, depth: 2, sort: '-createdAt', user, overrideAccess: false })
  const liste = res.docs as unknown as Opp[]
  const aModerer = liste.filter((o) => o.statut === 'a-moderer').sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const demande = typeof searchParams?.moderer === 'string' ? Number(searchParams.moderer) : NaN
  const sel = aModerer.find((o) => o.id === demande) ?? aModerer[0]
  const peutModerer = atLeast(user as never, 'opportunites', 'partial')

  let situation = ''
  let m: Membre | null = null
  if (sel?.membre) {
    m =
      typeof sel.membre === 'object'
        ? sel.membre
        : ((await payload.findByID({ collection: 'members', id: sel.membre, depth: 1, overrideAccess: true })) as unknown as Membre)
    const p = await payload.find({ collection: 'payments', where: { membre: { equals: m.id } }, pagination: false, depth: 0, overrideAccess: true })
    situation = situationCotisation(m, p.docs as unknown as PaiementMembre[]).libelle
  }
  const auteur = m ? [m.prenom, m.nom].filter(Boolean).join(' ') || m.nomComplet || '' : ''
  const sect = (sel?.secteurs ?? [])
    .map((s) => (typeof s === 'object' ? s.nom : ''))
    .filter(Boolean)
    .join(', ')
  const coord = sel?.coordonnees?.trim() ?? ''
  const limiteOk = !!sel?.dateLimite && joursRestants(sel.dateLimite) >= 0

  return (
    <BoView titre="Opportunités">
      <div className="bar-actions">
        <p className="muted">Chaque opportunité a une date limite obligatoire et passe en « Expirée » le lendemain.</p>
        <Link className="rec-btn rec-btn--primary" href={`${BASE}/create`}>
          Publier une opportunité
        </Link>
      </div>
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Opportunité</th>
              <th scope="col">Type</th>
              <th scope="col">Visibilité</th>
              <th scope="col">Date limite</th>
              <th scope="col">Statut</th>
              <th scope="col">
                <span className="sr">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {liste.map((o) => {
              const st = statutAffiche(o)
              return (
                <tr key={o.id}>
                  <td>
                    <b>{o.titre}</b>
                  </td>
                  <td data-label="Type">{typeLabel(o.type)}</td>
                  <td data-label="Visibilité">
                    <span className="pill">{o.visibilite === 'public' ? 'Public' : 'Membres'}</span>
                  </td>
                  <td data-label="Date limite">{dateCourte(o.dateLimite)}</td>
                  <td data-label="Statut">
                    <span className={`rec-badge rec-badge--${st.cls}`}>{st.label}</span>
                  </td>
                  <td>
                    <Link className="linkbtn" href={`${BASE}/${o.id}`}>
                      Modifier
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {liste.length === 0 && <p className="muted">Aucune opportunité pour le moment.</p>}
      {sel && (
        <section className="panel mod">
          <div className="panel-h">
            <div>
              <h2 className="h3">À modérer</h2>
              <p className="small muted">
                {m
                  ? `Déposée ${relatif(sel.createdAt).toLowerCase()} par ${auteur}${typeof m.entreprise === 'object' && m.entreprise?.nom ? `, ${m.entreprise.nom}` : ''}${m.categorie ? ` · membre catégorie ${lettreCategorie(m.categorie)}` : ''}${situation ? (situation === 'À jour' ? ', à jour de cotisation' : `, cotisation : ${situation.toLowerCase()}`) : ''}`
                  : `Déposée ${relatif(sel.createdAt).toLowerCase()} par REC 242`}
              </p>
            </div>
            <span className="rec-badge rec-badge--pending">À modérer</span>
          </div>
          <div className="grid2 grid-wide">
            <div className="stack">
              <div className="pv-screen">
                <span className="pill">{typeLabel(sel.type)}</span>
                <b>{sel.titre}</b>
                <span className="small">{sel.description}</span>
                <span className="small muted">
                  {[sect, sel.visibilite === 'public' ? 'Public' : 'Membres', sel.dateLimite ? `date limite ${jourLong(sel.dateLimite)}` : ''].filter(Boolean).join(' · ')}
                </span>
              </div>
            </div>
            <div className="stack">
              <p className="small" style={{ fontWeight: 600 }}>
                Vérifications
              </p>
              <div className="vrow">
                <span className="small">Date limite renseignée et valide</span>
                <span className={`pill ${limiteOk ? 'pill-ok' : ''}`}>{limiteOk ? 'Oui' : 'Non'}</span>
              </div>
              <div className="vrow">
                <span className="small">Pas de coordonnées dans le texte</span>
                <span className={`pill ${coord ? '' : 'pill-ok'}`}>{coord ? `Détecté : ${coord}` : 'Oui'}</span>
              </div>
              <div className="vrow">
                <span className="small">Conforme à la charte</span>
                <span className="pill pill-ok">À confirmer</span>
              </div>
            </div>
          </div>
          {peutModerer && <Moderation key={sel.id} id={sel.id} auteur={auteur} />}
          {aModerer.length > 1 && (
            <p className="small muted">
              Autres annonces à modérer :{' '}
              {aModerer
                .filter((o) => o.id !== sel.id)
                .map((o, i) => (
                  <React.Fragment key={o.id}>
                    {i > 0 && ', '}
                    <Link className="linkbtn" href={`${BASE}?moderer=${o.id}`}>
                      {o.titre}
                    </Link>
                  </React.Fragment>
                ))}
            </p>
          )}
        </section>
      )}
    </BoView>
  )
}
