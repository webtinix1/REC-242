import type { ListViewServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { atLeast, extraRead } from '@/access/roles'
import { lettreCategorie } from '@/lib/adhesion/categories'
import { situationCotisation, type PaiementMembre } from '@/lib/membres/cotisation'
import { badgeMembre, champLabel, statutMembreLabel, STATUTS_MEMBRE } from '@/lib/membres/options'
import { BoView, initiales, relatif } from '../BoView'
import { FORMATS_ENCART } from '@/collections/DirectoryAds'
import { fichesImprimees } from '@/lib/annuaire/imprime'
import { AnnuaireImprime } from './AnnuaireImprime'
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
  let onglet = ONGLETS.some((o) => o.value === searchParams?.onglet) ? String(searchParams?.onglet) : 'fiches'
  const q = typeof searchParams?.q === 'string' ? searchParams.q.trim() : ''
  const statut = typeof searchParams?.statut === 'string' && STATUTS_MEMBRE.some((s) => s.value === searchParams.statut) ? searchParams.statut : ''
  const peutModifier = atLeast(user as never, 'membres', 'partial')
  // « Import et export » : annuaire imprimé et encarts (lus sans contrôle d'accès plus bas), import et export complets.
  // Le responsable événements lit les fiches mais n'a aucun droit sur l'annuaire imprimé ni sur ces exports.
  const peutAnnuaire = extraRead(user as never, 'annuaireImprime')
  const peutIo = peutAnnuaire || atLeast(user as never, 'exports', 'full') || atLeast(user as never, 'membres', 'full')
  // La situation de cotisation se calcule à partir des paiements : réservée aux rôles qui lisent les cotisations.
  const voitCotisations = atLeast(user as never, 'cotisations', 'read')
  if (onglet === 'io' && !peutIo) onglet = 'fiches'

  const tabs = (
    <div className="tabs" role="tablist">
      {ONGLETS.filter((o) => o.value !== 'io' || peutIo).map((o) => (
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

  if (onglet === 'io') {
    const [{ edition, cloture, fiches }, encarts, actifs, s] = await Promise.all([
      fichesImprimees(payload),
      peutAnnuaire
        ? payload.find({ collection: 'directoryAds', where: { statut: { not_equals: 'annule' } }, sort: '-createdAt', depth: 2, limit: 200, overrideAccess: true })
        : { docs: [] },
      payload.find({ collection: 'members', where: { statut: { equals: 'actif' } }, sort: 'nomComplet', depth: 1, limit: 2000, overrideAccess: true, select: { nomComplet: true, entreprise: true } }),
      payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true }) as Promise<{ annuaire?: Record<string, number | string | undefined> }>,
    ])
    const deCetteEdition = encarts.docs.filter((d) => (d as unknown as { edition?: string }).edition === edition)
    return (
      <BoView titre="Membres et entreprises">
        {tabs}
        <ImportExport peutExporter={atLeast(user as never, 'exports', 'full')} peutImporter={atLeast(user as never, 'membres', 'full')} />
        <AnnuaireImprime
          edition={edition}
          cloture={cloture ? new Date(cloture).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Africa/Brazzaville' }) : undefined}
          incluses={fiches.length}
          peutExporter={atLeast(user as never, 'exports', 'full')}
          peutReserver={atLeast(user as never, 'membres', 'partial')}
          tarifs={FORMATS_ENCART.map((f) => ({ value: f.value, label: f.label, montant: f.reglage ? Number(s.annuaire?.[f.reglage] ?? NaN) : 0 }))}
          membres={actifs.docs.map((d) => {
            const m = d as unknown as { id: number; nomComplet?: string; entreprise?: { nom?: string } | null }
            return { id: m.id, nom: `${m.entreprise?.nom ?? ''} · ${m.nomComplet ?? ''}` }
          })}
          encarts={deCetteEdition.map((d) => {
            const a = d as unknown as { id: number; format: string; montant?: number; statut: string; membre?: { nomComplet?: string; entreprise?: { nom?: string } | null } | null }
            return {
              id: a.id,
              format: FORMATS_ENCART.find((f) => f.value === a.format)?.label ?? a.format,
              membre: a.membre?.entreprise?.nom ?? a.membre?.nomComplet ?? '',
              montant: a.montant ?? 0,
              statut: a.statut,
            }
          })}
        />
      </BoView>
    )
  }

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
  const paiements = ids.length && voitCotisations
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
              {voitCotisations && <th scope="col">Cotisation</th>}
              <th scope="col">Annuaire</th>
              <th scope="col">
                <span className="sr">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {r.docs.length === 0 && (
              <tr>
                <td colSpan={voitCotisations ? 7 : 6} className="muted">
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
                  {voitCotisations && <td data-label="Cotisation">{situationCotisation(m, parMembre.get(m.id) ?? []).libelle}</td>}
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

