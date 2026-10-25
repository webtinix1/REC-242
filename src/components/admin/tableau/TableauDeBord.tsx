import type { AdminViewServerProps, Payload, Where } from 'payload'
import Link from 'next/link'
import React from 'react'

import { atLeast } from '@/access/roles'
import { AUDIT_CATEGORIES } from '@/collections/AuditLog'
import { motifLabel } from '@/collections/ContactMessages'
import { fcfa } from '@/lib/site/format'
import { BoView, relatif } from '../BoView'
import { dateCourte, STATUTS_EV, taux } from '../evenements/format'

const TZ = 'Africa/Brazzaville'
const JOUR = 86400000
const ADMIN = '/admin/collections'

type User = AdminViewServerProps['initPageResult']['req']['user']

/** Un compteur est null (carte masquée) quand l'utilisateur n'a pas le droit de lire la collection. */
const compter = async (payload: Payload, user: User, collection: string, where: Where): Promise<number | null> => {
  try {
    const r = await payload.count({ collection: collection as never, where: where as never, user, overrideAccess: false })
    return r.totalDocs
  } catch {
    return null
  }
}

const lister = async <T,>(payload: Payload, user: User, args: Record<string, unknown>): Promise<T[] | null> => {
  try {
    const r = await payload.find({ depth: 0, user, overrideAccess: false, ...args } as never)
    return r.docs as unknown as T[]
  } catch {
    return null
  }
}

type Kpi = { cle: string; valeur: string; libelle: string; detail: string; href: string; alerte?: boolean }

const KpiCarte = ({ k }: { k: Kpi }) => (
  <Link className={`kpi${k.alerte ? ' kpi-alert' : ''}`} href={k.href}>
    <span className="kpi-dot" />
    <b>{k.valeur}</b>
    <span>{k.libelle}</span>
    <small>{k.detail}</small>
  </Link>
)

const pluriel = (n: number, un: string, plusieurs: string) => (n > 1 ? plusieurs : un)

/** Écran 02 : tableau de bord du back-office. Chaque compteur est calculé avec les droits de l'utilisateur. */
export const TableauDeBord = async ({ initPageResult }: AdminViewServerProps) => {
  const { req } = initPageResult
  const { payload, user } = req
  const maintenant = new Date()
  const iso = maintenant.toISOString()
  const debutMois = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1)).toISOString()
  const finMois = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() + 1, 1)).toISOString()
  const dansUneSemaine = new Date(maintenant.getTime() + 7 * JOUR).toISOString()

  const [cand, modifs, msgs, commissions, demandes, opps, relance, actifs, encarts] = await Promise.all([
    lister<{ createdAt: string }>(payload, user, {
      collection: 'applications',
      where: { statut: { in: ['recue', 'en-examen', 'complement'] } },
      sort: 'createdAt',
      limit: 1000,
      select: { createdAt: true },
    }),
    compter(payload, user, 'modificationRequests', { statut: { equals: 'attente' } }),
    lister<{ id: number; motif?: string; objet?: string; message?: string; statut: string }>(payload, user, {
      collection: 'contactMessages',
      sort: '-createdAt',
      limit: 5,
      select: { motif: true, objet: true, message: true, statut: true },
    }),
    compter(payload, user, 'commissionRequests', { statut: { equals: 'attente' } }),
    lister<{ createdAt: string }>(payload, user, {
      collection: 'expertRequests',
      where: { statut: { equals: 'sans-reponse' } },
      sort: 'createdAt',
      limit: 1000,
      select: { createdAt: true },
    }),
    lister<{ dateLimite?: string; statut: string }>(payload, user, {
      collection: 'opportunities',
      where: {
        and: [
          { statut: { equals: 'publiee' } },
          { dateLimite: { greater_than_equal: iso } },
          { dateLimite: { less_than_equal: dansUneSemaine } },
        ],
      },
      limit: 1000,
      select: { dateLimite: true, statut: true },
    }),
    lister<{ relances?: unknown[] }>(payload, user, {
      collection: 'dues',
      where: { statut: { equals: 'en-relance' } },
      limit: 2000,
      select: { relances: true },
    }),
    compter(payload, user, 'members', { statut: { equals: 'actif' } }),
    compter(payload, user, 'directoryAds', { statut: { equals: 'a-payer' } }),
  ])

  const [paiements, evenements, journal, aTraiter, aModerer] = await Promise.all([
    lister<{ montant?: number }>(payload, user, {
      collection: 'payments',
      where: { and: [{ statut: { equals: 'paye' } }, { datePaiement: { greater_than_equal: debutMois } }, { datePaiement: { less_than: finMois } }] },
      pagination: false,
      select: { montant: true },
    }),
    lister<{ id: number; titre: string; debut: string; statut: string; capacite?: number | null }>(payload, user, {
      collection: 'events',
      where: { and: [{ statut: { in: ['publie', 'complet'] } }, { debut: { greater_than_equal: iso } }] },
      sort: 'debut',
      limit: 4,
      select: { titre: true, debut: true, statut: true, capacite: true },
    }),
    lister<{ id: number; action: string; categorie: string; createdAt: string }>(payload, user, {
      collection: 'auditLog',
      sort: '-createdAt',
      limit: 6,
      select: { action: true, categorie: true, createdAt: true },
    }),
    compter(payload, user, 'contactMessages', { statut: { equals: 'a-traiter' } }),
    compter(payload, user, 'opportunities', { statut: { equals: 'a-moderer' } }),
  ])

  const inscrits = new Map<number, number>()
  if (evenements?.length) {
    const regs = await lister<{ evenement: number }>(payload, user, {
      collection: 'registrations',
      where: { and: [{ evenement: { in: evenements.map((e) => e.id) } }, { statut: { in: ['inscrit', 'present'] } }] },
      pagination: false,
      select: { evenement: true },
    })
    for (const r of regs ?? []) inscrits.set(r.evenement, (inscrits.get(r.evenement) ?? 0) + 1)
  }

  const jours = (d: string) => Math.max(0, Math.floor((maintenant.getTime() - new Date(d).getTime()) / JOUR))
  const enAttente = cand?.length ?? null
  const plusAncienne = cand?.[0] ? jours(cand[0].createdAt) : null
  const expirent = opps ? [...opps].sort((a, b) => String(a.dateLimite).localeCompare(String(b.dateLimite))) : null
  const joursAvant = expirent?.[0]?.dateLimite ? Math.max(0, Math.ceil((new Date(expirent[0].dateLimite).getTime() - maintenant.getTime()) / JOUR)) : null
  const perdues = relance ? relance.filter((d) => (d.relances?.length ?? 0) >= 3).length : null
  const questions = demandes?.length ?? null
  const plusAncienneQuestion = demandes?.[0] ? jours(demandes[0].createdAt) : null
  const somme = paiements ? paiements.reduce((t, p) => t + (p.montant ?? 0), 0) : null
  const moisCourant = maintenant.toLocaleDateString('fr-FR', { month: 'long', timeZone: TZ })

  const kpis: Kpi[] = []
  if (enAttente !== null)
    kpis.push({
      cle: 'cand',
      valeur: String(enAttente),
      libelle: pluriel(enAttente, 'Candidature en attente', 'Candidatures en attente'),
      detail: plusAncienne !== null ? `La plus ancienne : ${plusAncienne} ${pluriel(plusAncienne, 'jour', 'jours')}` : 'Aucune en attente',
      href: `${ADMIN}/applications`,
      alerte: enAttente > 0,
    })
  if (modifs !== null)
    kpis.push({ cle: 'modifs', valeur: String(modifs), libelle: pluriel(modifs, 'Demande de modification', 'Demandes de modification'), detail: 'Fiches membres', href: `${ADMIN}/members?onglet=demandes` })
  if (aTraiter !== null)
    kpis.push({ cle: 'msgs', valeur: String(aTraiter), libelle: pluriel(aTraiter, 'Message non traité', 'Messages non traités'), detail: 'Par motif ci-dessous', href: `${ADMIN}/contactMessages` })
  if (expirent !== null)
    kpis.push({
      cle: 'expire',
      valeur: String(expirent.length),
      libelle: pluriel(expirent.length, 'Opportunité expire cette semaine', 'Opportunités expirent cette semaine'),
      detail: joursAvant !== null ? `Dans ${joursAvant} ${pluriel(joursAvant, 'jour', 'jours')}` : aModerer ? `${aModerer} à modérer` : 'Aucune cette semaine',
      href: `${ADMIN}/opportunities`,
    })

  const kpis2: Kpi[] = []
  if (actifs !== null) kpis2.push({ cle: 'actifs', valeur: String(actifs), libelle: pluriel(actifs, 'Membre actif', 'Membres actifs'), detail: 'Fiches membres', href: `${ADMIN}/members` })
  if (relance !== null)
    kpis2.push({ cle: 'relance', valeur: String(relance.length), libelle: pluriel(relance.length, 'Cotisation en relance', 'Cotisations en relance'), detail: `Dont ${perdues ?? 0} à 3 relances`, href: '/admin/cotisations' })
  if (paiements !== null && somme !== null)
    kpis2.push({ cle: 'paiements', valeur: fcfa(somme), libelle: 'Paiements du mois', detail: `${paiements.length} ${pluriel(paiements.length, 'paiement confirmé', 'paiements confirmés')}, ${moisCourant}`, href: `${ADMIN}/payments` })

  const suivre: { n: number; t: string; where: string; href: string }[] = []
  if (commissions) suivre.push({ n: commissions, t: 'Demandes pour rejoindre une commission', where: 'Commissions', href: `${ADMIN}/commissionRequests` })
  if (questions)
    suivre.push({
      n: questions,
      t: `Question à un expert sans réponse${plusAncienneQuestion ? ` depuis ${plusAncienneQuestion} ${pluriel(plusAncienneQuestion, 'jour', 'jours')}` : ''}`,
      where: 'Demandes des membres',
      href: `${ADMIN}/expertRequests`,
    })
  if (perdues) suivre.push({ n: perdues, t: 'Membre à 3 relances : perte de la qualité à constater', where: 'Cotisations', href: '/admin/cotisations' })
  if (encarts) suivre.push({ n: encarts, t: 'Encart de l’annuaire imprimé à régler', where: 'Membres', href: `${ADMIN}/members?onglet=io` })

  const raccourcis = [
    { t: 'Rédiger une actualité', href: `${ADMIN}/news/create`, ok: atLeast(user as never, 'actualites', 'partial') },
    { t: 'Créer un événement', href: `${ADMIN}/events/create`, ok: atLeast(user as never, 'evenements', 'partial') },
    { t: 'Publier une opportunité', href: `${ADMIN}/opportunities/create`, ok: atLeast(user as never, 'opportunites', 'partial') },
    { t: 'Relancer les cotisations', href: '/admin/cotisations', ok: relance !== null },
  ].filter((r) => r.ok)

  return (
    <BoView titre="Tableau de bord">
      <p className="muted">Bonjour. Voici ce qui attend une action aujourd&apos;hui.</p>
      <div className="kpis">
        {kpis.map((k) => (
          <KpiCarte key={k.cle} k={k} />
        ))}
      </div>
      {kpis2.length > 0 && (
        <div className={`kpis${kpis2.length === 3 ? ' kpis-dash' : ''}`}>
          {kpis2.map((k) => (
            <KpiCarte key={k.cle} k={k} />
          ))}
        </div>
      )}
      {(evenements || msgs) && (
        <div className="grid2">
          {evenements && (
            <section className="panel">
              <div className="panel-h">
                <h2 className="h2">Prochains événements</h2>
                <Link className="linkbtn" href={`${ADMIN}/events`}>
                  Tous
                </Link>
              </div>
              {evenements.length === 0 && <p className="small muted">Aucun événement à venir.</p>}
              {evenements.map((e) => {
                const n = inscrits.get(e.id) ?? 0
                const pct = taux(n, e.capacite)
                const st = STATUTS_EV[e.statut] ?? { label: e.statut, cls: 'pending' }
                return (
                  <Link key={e.id} className="ev" href={`${ADMIN}/events/${e.id}`}>
                    <div className="ev-t">
                      <b>{e.titre}</b>
                      <span className="small muted">
                        {dateCourte(e.debut)} · {e.capacite ? `${n} / ${e.capacite}` : n} {pluriel(n, 'inscrit', 'inscrits')}
                      </span>
                    </div>
                    <div className="bar" role="img" aria-label={pct === null ? 'Places illimitées' : `Taux de remplissage ${pct} %`}>
                      <span style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
                    </div>
                    <span className={`rec-badge rec-badge--${st.cls}`}>{st.label}</span>
                  </Link>
                )
              })}
            </section>
          )}
          {msgs && (
            <section className="panel">
              <div className="panel-h">
                <h2 className="h2">Messages par motif</h2>
                <Link className="linkbtn" href={`${ADMIN}/contactMessages`}>
                  Tous
                </Link>
              </div>
              {msgs.length === 0 && <p className="small muted">Aucun message.</p>}
              {msgs.map((m) => (
                <div key={m.id} className="row">
                  <span className="pill">{motifLabel(m.motif)}</span>
                  <span className="row-t">{m.objet || (m.message ?? '').slice(0, 80)}</span>
                  <span className={`rec-badge rec-badge--${m.statut === 'a-traiter' ? 'pending' : 'active'}`}>
                    {m.statut === 'a-traiter' ? 'À traiter' : m.statut === 'traite' ? 'Traité' : 'Archivé'}
                  </span>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
      <section className="panel">
        <div className="panel-h">
          <h2 className="h2">À suivre</h2>
        </div>
        {suivre.length === 0 && <p className="small muted">Rien à suivre pour le moment.</p>}
        {suivre.map((x) => (
          <Link key={x.t} className="row rowbtn" href={x.href}>
            <span className="badge">{x.n}</span>
            <span className="row-t">{x.t}</span>
            <span className="small muted">{x.where} →</span>
          </Link>
        ))}
      </section>
      {journal && (
        <section className="panel">
          <div className="panel-h">
            <h2 className="h2">Activité récente</h2>
            <Link className="linkbtn" href={`${ADMIN}/auditLog`}>
              Journal
            </Link>
          </div>
          {journal.length === 0 && <p className="small muted">Aucune activité enregistrée.</p>}
          {journal.map((j) => (
            <div key={j.id} className="row">
              <span className="pill">{AUDIT_CATEGORIES.find((c) => c.value === j.categorie)?.label ?? j.categorie}</span>
              <span className="row-t">{j.action}</span>
              <span className="small muted">{relatif(j.createdAt)}</span>
            </div>
          ))}
        </section>
      )}
      {raccourcis.length > 0 && (
        <section className="panel">
          <div className="panel-h">
            <h2 className="h2">Raccourcis</h2>
          </div>
          <div className="quick">
            {raccourcis.map((r) => (
              <Link key={r.t} className="qbtn" href={r.href}>
                {r.t}
              </Link>
            ))}
          </div>
        </section>
      )}
    </BoView>
  )
}
