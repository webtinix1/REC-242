import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { atLeast } from '@/access/roles'
import { lettreCategorie } from '@/lib/adhesion/categories'
import { modeLabel, objetLabel } from '@/lib/adhesion/paiement'
import { numeroRecu } from '@/lib/compteurs'
import { refusConstat, refusRelance, RELANCES_MAX, resteDu, statutEcheance, type Echeance } from '@/lib/cotisations/regles'
import { AvecCadre } from '../AvecCadre'
import { BoView } from '../BoView'
import { CotisationsClient, type LigneCotisation, type MembrePaiement } from './CotisationsClient'

type MembreDoc = { id: number; prenom?: string; nom?: string; numeroAdherent?: string; categorie?: string; entreprise?: { nom?: string } | null }
type Due = Echeance & { id: number; membre: MembreDoc | number; categorie?: string; exercice?: { debut?: string; libelle?: string } }
type Paiement = {
  id: number
  numero?: number | null
  objet?: string
  montant?: number
  mode?: string
  datePaiement?: string | null
  createdAt?: string
  membre?: MembreDoc | number | null
  candidature?: { prenom?: string; nom?: string } | null
}

const FCFA = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/g, ' ')} FCFA`
const jour = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Brazzaville' }) : '')
const nomMembre = (m: MembreDoc) => m.entreprise?.nom || `${m.prenom ?? ''} ${m.nom ?? ''}`.trim()
const tranchePrefixe = (e: Echeance, n: number) => ((e.tranches ?? []).length > 1 ? (n === 1 ? '1re tranche' : `${n}e tranche`) : 'Cotisation')

/** Écran 12 : cotisations (compteurs, échéances, relances, constat de perte, paiement manuel, paiements reçus, export comptable). */
const Contenu = async ({ payload, user, searchParams }: AdminViewServerProps) => {
  if (!atLeast(user as never, 'cotisations', 'read'))
    return (
      <BoView titre="Cotisations">
        <p className="muted">Cet écran est réservé au trésorier et aux administrateurs.</p>
      </BoView>
    )
  const filtre = typeof searchParams?.membre === 'string' && /^\d+$/.test(searchParams.membre) ? Number(searchParams.membre) : null
  const [dues, paiements, dernier] = await Promise.all([
    payload.find({ collection: 'dues', depth: 2, limit: 1000, sort: '-exercice.debut', overrideAccess: true, ...(filtre ? { where: { membre: { equals: filtre } } } : {}) }),
    payload.find({
      collection: 'payments',
      depth: 2,
      limit: 12,
      sort: '-datePaiement',
      overrideAccess: true,
      where: { and: [{ statut: { equals: 'paye' } }, ...(filtre ? [{ membre: { equals: filtre } }] : [])] },
    }),
    payload.find({ collection: 'payments', limit: 1, sort: '-numero', depth: 0, overrideAccess: true, select: { numero: true } }),
  ])
  const encaisse = await payload.find({ collection: 'payments', where: { statut: { equals: 'paye' } }, limit: 5000, depth: 0, pagination: false, overrideAccess: true, select: { montant: true } })
  const total = (encaisse.docs as unknown as { montant?: number }[]).reduce((s, p) => s + (p.montant ?? 0), 0)

  // Dernier exercice de chaque membre (les exercices précédents sont soldés ou clos).
  const vus = new Set<number>()
  const courantes = (dues.docs as unknown as Due[]).filter((d) => {
    const id = typeof d.membre === 'object' ? d.membre.id : d.membre
    if (vus.has(id)) return false
    vus.add(id)
    return true
  })
  const maintenant = new Date()
  const lignes: LigneCotisation[] = courantes
    .filter((d) => typeof d.membre === 'object')
    .map((d) => {
      const m = d.membre as MembreDoc
      const reste = resteDu(d)
      const statut = statutEcheance(d, maintenant)
      const prochaine = (d.tranches ?? []).find((t) => t.statut !== 'paye')
      const actif = reste > 0 && statut !== 'perte'
      const passee = d.dateLimite ? new Date(d.dateLimite) < maintenant : false
      return {
        id: d.id,
        membreId: m.id,
        membre: nomMembre(m),
        categorie: lettreCategorie(d.categorie ?? m.categorie ?? ''),
        echeance: statut === 'perte' ? 'Perte constatée' : reste > 0 && prochaine ? `${tranchePrefixe(d, prochaine.numero)} · ${FCFA(prochaine.montant)}` : 'Soldée',
        limite: actif ? (passee ? 'Dépassée' : jour(d.dateLimite)) : '–',
        relances: actif || (d.relances ?? []).length ? `${(d.relances ?? []).length} / ${RELANCES_MAX}` : '–',
        statut,
        actif,
        refusRelance: actif ? refusRelance(d, maintenant) : null,
        refusConstat: actif ? refusConstat(d, maintenant) : 'inactif',
      }
    })
  const parStatut = (s: LigneCotisation['statut']) => lignes.filter((l) => l.statut === s)
  const aVenir = parStatut('a-venir')
  const enRelance = parStatut('en-relance')
  const maxRelances = Math.max(0, ...courantes.filter((d) => statutEcheance(d, maintenant) === 'en-relance').map((d) => (d.relances ?? []).length))
  const tranchesVenir = [...new Set(courantes.filter((d) => statutEcheance(d, maintenant) === 'a-venir').map((d) => { const t = (d.tranches ?? []).find((x) => x.statut !== 'paye'); return t ? tranchePrefixe(d, t.numero) : '' }).filter(Boolean))]

  // Membres proposés pour un paiement manuel : ceux dont une échéance est ouverte, puis le membre filtré.
  const membresPaiement: MembrePaiement[] = courantes
    .filter((d) => typeof d.membre === 'object')
    .map((d) => {
      const m = d.membre as MembreDoc
      const t = (d.tranches ?? []).find((x) => x.statut !== 'paye')
      const reste = resteDu(d)
      return {
        id: m.id,
        libelle: `${nomMembre(m)} · ${m.numeroAdherent ?? ''}`,
        objet: !t ? 'droit' : (d.tranches ?? []).length > 1 ? (t.numero === 1 ? 'tranche1' : 'tranche2') : 'cotisation',
        montant: t?.montant ?? 0,
        reste,
      }
    })
  const prochainRecu = numeroRecu(((dernier.docs[0] as unknown as { numero?: number } | undefined)?.numero ?? 0) + 1)

  const recus = (paiements.docs as unknown as Paiement[]).map((p) => {
    const m = typeof p.membre === 'object' && p.membre ? p.membre : null
    return (
      <tr key={p.id}>
        <td>{jour(p.datePaiement ?? p.createdAt)}</td>
        <td data-label="Membre">
          <b>{m ? nomMembre(m) : `${p.candidature?.prenom ?? ''} ${p.candidature?.nom ?? ''}`.trim()}</b>
        </td>
        <td data-label="Objet">{objetLabel(p.objet)}</td>
        <td data-label="Montant" className="mono">
          {FCFA(p.montant ?? 0)}
        </td>
        <td data-label="Mode">{modeLabel(p.mode)}</td>
        <td data-label="Reçu">
          <a className="linkbtn" href={`/api/payments/${p.id}/recu`} download>
            {numeroRecu(p.numero)}.pdf
          </a>
        </td>
      </tr>
    )
  })

  return (
    <BoView titre="Cotisations">
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-dot" />
          <b>{parStatut('a-jour').length}</b>
          <span>Membres à jour</span>
        </div>
        <div className="kpi">
          <span className="kpi-dot" />
          <b>{aVenir.length}</b>
          <span>Échéance à venir</span>
          {tranchesVenir.length > 0 && <small>{tranchesVenir.join(', ')}</small>}
        </div>
        <div className={`kpi${enRelance.length ? ' kpi-alert' : ''}`}>
          <span className="kpi-dot" />
          <b>{enRelance.length}</b>
          <span>En relance</span>
          {maxRelances > 0 && (
            <small>
              {maxRelances} relance{maxRelances > 1 ? 's' : ''} sur {RELANCES_MAX}
            </small>
          )}
        </div>
        <div className="kpi">
          <span className="kpi-dot" />
          <b className="mono">{new Intl.NumberFormat('fr-FR').format(total).replace(/[  ]/g, ' ')}</b>
          <span>FCFA encaissés</span>
        </div>
      </div>
      <CotisationsClient
        lignes={lignes}
        membres={membresPaiement}
        filtre={filtre}
        filtreNom={filtre ? (lignes.find((l) => l.membreId === filtre)?.membre ?? '') : ''}
        peutPayer={atLeast(user as never, 'cotisations', 'full')}
        peutExporter={atLeast(user as never, 'exports', 'partial')}
        prochainRecu={prochainRecu}
      >
        <h2 className="h2">Paiements reçus</h2>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Membre</th>
                <th scope="col">Objet</th>
                <th scope="col">Montant</th>
                <th scope="col">Mode</th>
                <th scope="col">Reçu</th>
              </tr>
            </thead>
            <tbody>
              {recus.length ? (
                recus
              ) : (
                <tr>
                  <td colSpan={6} className="muted">
                    Aucun paiement enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Règle des statuts : cotisation soldée sous 3 mois, en deux tranches au plus ; trois relances écrites espacées d&apos;au moins 15 jours avant constat de perte
          de la qualité de membre.
        </p>
      </CotisationsClient>
    </BoView>
  )
}

export const CotisationsView = async (props: AdminViewServerProps) => <AvecCadre props={props}>{await Contenu(props)}</AvecCadre>
