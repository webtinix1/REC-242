import type { ListViewServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { atLeast } from '@/access/roles'
import { lettreCategorie } from '@/lib/adhesion/categories'
import { situationCotisation, type PaiementMembre } from '@/lib/membres/cotisation'
import { badgeMembre, champLabel, statutMembreLabel, STATUTS_MEMBRE } from '@/lib/membres/options'
import { BoView, initiales, relatif } from '../BoView'
import { DemandesMembres } from './DemandesMembres'
import { ImportExport } from './ImportExport'

const BASE = '/admin/collections/members'
const ONGLETS = [
  { value: 'fiches', label: 'Fiches' },
  { value: 'demandes', label: 'Demandes de modification' },
  { value: 'io', label: 'Import et export' },
]

type Media = { url?: string; sizes?: { vignette?: { url?: string } } } | null
type Ligne = {
  id: number
  numeroAdherent?: string
  prenom: string
  nom: string
  categorie: string
  statut: string
  photo?: Media
  cotisation?: { droit?: number; montant?: number; tranches?: number }
  fin?: { suppressionDemandee?: string | null }
  entreprise?: { id: number; nom: string; logo?: Media; visibilite?: { annuaire?: boolean }; masqueeParAdmin?: boolean } | null
}

const img = (m?: Media) => m?.sizes?.vignette?.url || m?.url || undefined

/** Écran 05 : membres et entreprises (fiches, demandes de modification, import et export). */
export const MembresView = async (props: ListViewServerProps) => {
  const { payload, user, searchParams } = props
  const onglet = ONGLETS.some((o) => o.value === searchParams?.onglet) ? String(searchParams?.onglet) : 'fiches'
  const q = typeof searchParams?.q === 'string' ? searchParams.q.trim() : ''
  const statut = typeof searchParams?.statut === 'string' && STATUTS_MEMBRE.some((s) => s.value === searchParams.statut) ? searchParams.statut : ''
  const peutModifier = atLeast(user as never, 'membres', 'partial')

  const tabs = (
    <div className="tabs" role="tablist">
      {ONGLETS.map((o) => (
        <Link key={o.value} role="tab" aria-selected={onglet === o.value} className={`tab${onglet === o.value ? ' is-on' : ''}`} href={o.value === 'fiches' ? BASE : `${BASE}?onglet=${o.value}`}>
          {o.label}
        </Link>
      ))}
    </div>
  )

  if (onglet === 'demandes') {
    const [demandes, presentations] = await Promise.all([
      payload.find({ collection: 'modificationRequests', where: { statut: { equals: 'attente' } }, sort: 'createdAt', depth: 1, limit: 200, user, overrideAccess: false }),
      payload.find({ collection: 'companies', where: { presentationEnRelecture: { equals: true } }, depth: 1, limit: 200, user, overrideAccess: false }),
    ])
    return (
      <BoView titre="Membres et entreprises">
        {tabs}
        <DemandesMembres
          peutTraiter={peutModifier}
          demandes={demandes.docs.map((d) => {
            const r = d as unknown as {
              id: number
              champ: string
              valeurActuelle?: string
              nouvelleValeur: string
              motif?: string
              createdAt: string
              justificatif?: { url?: string; filename?: string } | null
              membre?: { nomComplet?: string; numeroAdherent?: string } | null
            }
            return {
              id: r.id,
              qui: r.membre?.nomComplet ?? '',
              quand: relatif(r.createdAt),
              champ: champLabel(r.champ),
              avant: r.valeurActuelle ?? '',
              apres: r.nouvelleValeur,
              motif: r.motif ?? '',
              justificatif: r.justificatif?.url ? { url: r.justificatif.url, nom: r.justificatif.filename ?? 'Justificatif' } : undefined,
            }
          })}
          presentations={presentations.docs.map((d) => {
            const e = d as unknown as { id: number; nom: string; presentation?: string; presentationProposee?: string; updatedAt: string; titulaire?: { nomComplet?: string } | null }
            return { id: e.id, qui: `${e.titulaire?.nomComplet ?? ''} · ${e.nom}`, quand: relatif(e.updatedAt), avant: e.presentation ?? '', apres: e.presentationProposee ?? '' }
          })}
        />
      </BoView>
    )
  }

  if (onglet === 'io')
    return (
      <BoView titre="Membres et entreprises">
        {tabs}
        <ImportExport peutExporter={atLeast(user as never, 'exports', 'full')} peutImporter={atLeast(user as never, 'membres', 'full')} />
      </BoView>
    )

  const where = {
    and: [
      ...(statut ? [{ statut: { equals: statut } }] : []),
      ...(q
        ? [{ or: [{ nomComplet: { like: q } }, { numeroAdherent: { like: q } }, { email: { like: q } }, { 'entreprise.nom': { like: q } }] }]
        : []),
    ],
  }
  const r = await payload.find({ collection: 'members', where: where as never, sort: 'numeroAdherent', depth: 2, limit: 300, user, overrideAccess: false })
  const ids = r.docs.map((d) => d.id)
  const paiements = ids.length
    ? await payload.find({ collection: 'payments', where: { membre: { in: ids } }, depth: 0, limit: 3000, overrideAccess: true })
    : { docs: [] }
  const parMembre = new Map<number, PaiementMembre[]>()
  for (const p of paiements.docs as unknown as PaiementMembre[]) {
    const id = typeof p.membre === 'object' ? p.membre?.id : p.membre
    if (id) parMembre.set(id, [...(parMembre.get(id) ?? []), p])
  }

  return (
    <BoView titre="Membres et entreprises">
      {tabs}
      <form className="rec-row bo-filtres" method="get" action={BASE} role="search">
        <label className="sr" htmlFor="mb-q">
          Rechercher un membre
        </label>
        <input id="mb-q" className="rec-input" type="search" name="q" defaultValue={q} placeholder="Nom, entreprise, numéro ou e-mail" />
        <label className="sr" htmlFor="mb-st">
          Statut
        </label>
        <select id="mb-st" className="rec-input" name="statut" defaultValue={statut}>
          <option value="">Tous les statuts</option>
          {STATUTS_MEMBRE.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rec-btn rec-btn--secondary">
          Filtrer
        </button>
      </form>
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">N° adhérent</th>
              <th scope="col">Entreprise</th>
              <th scope="col">Catégorie</th>
              <th scope="col">Statut</th>
              <th scope="col">Cotisation</th>
              <th scope="col">Annuaire</th>
              <th scope="col">
                <span className="sr">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {r.docs.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  Aucun membre pour cette recherche.
                </td>
              </tr>
            )}
            {(r.docs as unknown as Ligne[]).map((m) => {
              const nom = `${m.prenom} ${m.nom}`
              const e = m.entreprise
              const publique = Boolean(e?.visibilite?.annuaire) && !e?.masqueeParAdmin && m.statut === 'actif'
              return (
                <tr key={m.id}>
                  <td className="mono">{m.numeroAdherent}</td>
                  <td data-label="Entreprise">
                    <span className="ent-cell">
                      <span className="logo-tile logo-tile-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {img(e?.logo) ? <img src={img(e?.logo)} alt={`Logo ${e?.nom ?? ''}`} /> : <span className="small">{initiales(e?.nom ?? nom)}</span>}
                      </span>
                      <span>
                        <b>{e?.nom ?? nom}</b>
                        <br />
                        <span className="small muted dirline">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img(m.photo) && <img src={img(m.photo)} alt={nom} />}
                          {nom}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td data-label="Catégorie">
                    <span className="cat">{lettreCategorie(m.categorie)}</span>
                  </td>
                  <td data-label="Statut">
                    <span className={`rec-badge rec-badge--${badgeMembre(m.statut)}`}>{statutMembreLabel(m.statut)}</span>
                  </td>
                  <td data-label="Cotisation">{situationCotisation(m, parMembre.get(m.id) ?? []).libelle}</td>
                  <td data-label="Annuaire">
                    {publique ? 'Publique' : 'Masquée'}
                    {m.fin?.suppressionDemandee && (
                      <>
                        <br />
                        <span className="small" style={{ color: 'var(--text-danger)' }}>
                          Suppression demandée
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    <Link className="linkbtn" href={`${BASE}/${m.id}`}>
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </BoView>
  )
}

