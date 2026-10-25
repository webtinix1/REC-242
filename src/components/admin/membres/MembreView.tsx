import type { DocumentViewServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { atLeast } from '@/access/roles'
import { EFFECTIFS, label } from '@/lib/adhesion/options'
import { lettreCategorie } from '@/lib/adhesion/categories'
import { situationCotisation, type PaiementMembre } from '@/lib/membres/cotisation'
import { badgeMembre, statutMembreLabel } from '@/lib/membres/options'
import { BoView, initiales } from '../BoView'
import { DisciplinePanel, DisciplineResume, type DossierClos, type DossierData } from './Discipline'
import { MembreActions } from './MembreActions'

type Media = { url?: string; sizes?: { vignette?: { url?: string } } } | null
type Fiche = {
  id: number
  numeroAdherent?: string
  prenom: string
  nom: string
  email: string
  categorie: string
  statut: string
  motifStatut?: string
  photo?: Media
  derniereConnexion?: string
  relationsSuspendues?: boolean
  cotisation?: { droit?: number; montant?: number; tranches?: number }
  commissions?: { id: number; nom: string }[]
  fin?: { type?: string; date?: string; suppressionDemandee?: string }
  entreprise?: {
    id: number
    nom: string
    logo?: Media
    secteurs?: { nom: string }[]
    localite?: { nom: string } | null
    quartier?: string
    effectif?: string
    visibilite?: Record<string, boolean | undefined>
    masqueeParAdmin?: boolean
  } | null
}

const img = (m?: Media) => m?.sizes?.vignette?.url || m?.url || undefined
const heure = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Brazzaville' }) : ''
const jour = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Brazzaville' }) : '')

function Pill({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return <span className={`pill${ok ? ' pill-ok' : ''}`}>{children}</span>
}

/** Écran 06 : fiche membre (hors discipline, lot 11). */
export const MembreView = async (props: DocumentViewServerProps) => {
  const { payload, user } = props
  const id = props.id ?? (props.doc as { id?: number } | undefined)?.id
  if (!id)
    return (
      <BoView titre="Fiche membre">
        <p>
          Une fiche membre se crée avec « Convertir en membre » depuis une candidature acceptée, ou par l&apos;import CSV.{' '}
          <Link className="linkbtn" href="/admin/collections/members">
            ← Membres
          </Link>
        </p>
      </BoView>
    )
  const m = (await payload.findByID({ collection: 'members', id, depth: 2, user, overrideAccess: false })) as unknown as Fiche
  const [paiements, commissions, dossiers] = await Promise.all([
    payload.find({ collection: 'payments', where: { membre: { equals: m.id } }, depth: 0, limit: 100, overrideAccess: true }),
    payload.find({ collection: 'commissions', limit: 50, depth: 0, sort: 'ordre', overrideAccess: true }),
    payload.find({ collection: 'disciplinaryCases', where: { membre: { equals: m.id } }, sort: '-createdAt', limit: 20, depth: 0, user, overrideAccess: false }),
  ])
  const tous = dossiers.docs as unknown as (DossierData & { dateCloture?: string })[]
  const enCours = tous.find((d) => d.statut !== 'close') ?? null
  const clos: DossierClos[] = tous.filter((d) => d.statut === 'close').map((d) => ({ numero: d.numero, issue: d.issue ?? 'classee', date: d.dateCloture ?? '' }))
  const peutAgirDiscipline = atLeast(user as never, 'membres', 'full')
  const cot = situationCotisation(m, paiements.docs as unknown as PaiementMembre[])
  const e = m.entreprise
  const v = e?.visibilite ?? {}
  const nom = `${m.prenom} ${m.nom}`
  const peutModifier = atLeast(user as never, 'membres', 'partial')

  return (
    <BoView titre="Fiche membre">
      <Link className="linkbtn" href="/admin/collections/members">
        ← Membres
      </Link>
      <div className="head-card">
        <span className="duo">
          <span className="av av-lg av-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {img(m.photo) ? <img src={img(m.photo)} alt={nom} /> : initiales(nom)}
          </span>
          {img(e?.logo) && (
            <span className="logo-tile logo-tile-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(e?.logo)} alt={`Logo ${e?.nom ?? ''}`} />
            </span>
          )}
        </span>
        <div>
          <p className="small muted mono">
            {m.numeroAdherent} · catégorie {lettreCategorie(m.categorie)}
          </p>
          <h2 className="h1">{e?.nom ?? nom}</h2>
          <p className="muted">
            {nom} · cotisation : {cot.libelle.toLowerCase()}
          </p>
        </div>
        <span className={`rec-badge rec-badge--${badgeMembre(m.statut)}`}>{statutMembreLabel(m.statut)}</span>
      </div>
      <MembreActions
        id={m.id}
        modifiable={peutModifier}
        statut={m.statut}
        motifStatut={m.motifStatut ?? ''}
        masquee={Boolean(e?.masqueeParAdmin)}
        aEntreprise={Boolean(e)}
        commissions={commissions.docs.map((c) => ({ id: c.id as number, nom: (c as unknown as { nom: string }).nom }))}
        commissionsMembre={(m.commissions ?? []).map((c) => c.id)}
        fin={m.fin?.type ? `${m.fin.type === 'deces' ? 'Décès' : m.fin.type === 'demission' ? 'Démission écrite' : 'Fin d’adhésion'} enregistré le ${jour(m.fin.date)}.` : ''}
        relationsSuspendues={Boolean(m.relationsSuspendues)}
        suppressionDemandee={m.fin?.suppressionDemandee ? `Le membre a demandé la suppression de son compte le ${jour(m.fin.suppressionDemandee)}.` : ''}
        visibilite={
          <section className="panel">
            <h3 className="h3">Visibilité dans l&apos;annuaire</h3>
            <div className="vrow">
              <span>Fiche publique</span>
              {e?.masqueeParAdmin ? (
                <Pill>Masquée par l&apos;administration</Pill>
              ) : v.annuaire ? (
                <Pill ok>Oui, consentement donné</Pill>
              ) : (
                <Pill>Non, pas de consentement</Pill>
              )}
            </div>
            <div className="vrow">
              <span>Téléphone</span>
              {v.telephone ? <Pill ok>Visible des membres</Pill> : <Pill>Masqué</Pill>}
            </div>
            <div className="vrow">
              <span>WhatsApp</span>
              {v.whatsapp ? <Pill ok>Visible des membres</Pill> : <Pill>Masqué</Pill>}
            </div>
            <div className="vrow">
              <span>E-mail</span>
              {v.email ? <Pill ok>Visible des membres</Pill> : <Pill>Masqué</Pill>}
            </div>
            <div className="vrow">
              <span>Mise en avant sur l&apos;accueil</span>
              {v.miseEnAvant ? <Pill ok>Oui</Pill> : <Pill>Non</Pill>}
            </div>
          </section>
        }
        fiche={
          <section className="panel">
            <div className="panel-h">
              <h3 className="h3">Fiche</h3>
              {e && peutModifier && (
                <Link className="linkbtn" href={`/admin/collections/companies/${e.id}`}>
                  Modifier
                </Link>
              )}
            </div>
            <dl className="dl">
              <dt>Secteurs</dt>
              <dd>{(e?.secteurs ?? []).map((s) => s.nom).join(', ')}</dd>
              <dt>Ville, quartier</dt>
              <dd>{[e?.localite?.nom, e?.quartier].filter(Boolean).join(', ')}</dd>
              <dt>Taille</dt>
              <dd>{label(EFFECTIFS, e?.effectif)}</dd>
              <dt>Commission</dt>
              <dd>{(m.commissions ?? []).map((c) => c.nom).join(', ') || 'Aucune'}</dd>
            </dl>
          </section>
        }
        compte={
          m.statut === 'attente'
            ? 'Compte pas encore activé : le lien d’activation est valable 72 heures.'
            : `Compte activé.${m.derniereConnexion ? ` Dernière connexion : ${heure(m.derniereConnexion)}.` : ''}`
        }
        discipline={<DisciplineResume dossier={enCours} peutAgir={peutAgirDiscipline} />}
        procedure={<DisciplinePanel membreId={m.id} libelle={`${e?.nom ? `${e.nom} · ` : ''}${nom}`} dossier={enCours} clos={clos} peutAgir={peutAgirDiscipline} />}
        cotisation={
          <section className="panel">
            <h3 className="h3">Cotisation</h3>
            {cot.connue ? (
              <>
                <div className="vrow">
                  <span>Droit d&apos;adhésion</span>
                  <span className={`rec-badge rec-badge--${cot.droitPaye ? 'active' : 'pending'}`}>{cot.droitPaye ? 'Payé' : 'Dû'}</span>
                </div>
                {(m.cotisation?.tranches ?? 1) > 1 ? (
                  <>
                    <div className="vrow">
                      <span>1re tranche</span>
                      <span className={`rec-badge rec-badge--${cot.t1 ? 'active' : 'pending'}`}>{cot.t1 ? 'Payée' : 'Due'}</span>
                    </div>
                    <div className="vrow">
                      <span>2e tranche</span>
                      <span className={`rec-badge rec-badge--${cot.t2 ? 'active' : 'pending'}`}>{cot.t2 ? 'Payée' : 'Due'}</span>
                    </div>
                  </>
                ) : (
                  <div className="vrow">
                    <span>Cotisation</span>
                    <span className={`rec-badge rec-badge--${cot.t1 ? 'active' : 'pending'}`}>{cot.t1 ? 'Payée' : 'Due'}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="small muted">Catégorie sur convention : pas de cotisation à suivre ici.</p>
            )}
            {atLeast(user as never, 'cotisations', 'read') && (
              <Link className="linkbtn" href={`/admin/cotisations?membre=${m.id}`}>
                Voir les cotisations →
              </Link>
            )}
          </section>
        }
      />
    </BoView>
  )
}
