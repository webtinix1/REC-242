'use client'
import { useRouter } from 'next/navigation'
import React, { createContext, useContext, useState } from 'react'

import { ETAPES, GRIEFS, refusTransition, SANCTIONS, SUSPENSION_MOIS, type Dossier, type Etape } from '@/lib/discipline/regles'
import { api } from './api'

export type DossierData = Dossier & {
  id: number
  numero: string
  historique?: { date: string; etape: string; auteur?: string }[]
  recours?: { date?: string | null; texte?: string | null } | null
  issue?: string | null
}
export type DossierClos = { numero: string; issue: string; date: string }

const Ctx = createContext<{ open: boolean; setOpen: (o: boolean) => void }>({ open: false, setOpen: () => undefined })

/** Partage l'ouverture du panneau de procédure entre la section de la colonne de droite et le panneau pleine largeur. */
export const DisciplineProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false)
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>
}

const jour = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Brazzaville' }) : '')
const etapeLabel = (v?: string) => ETAPES.find((e) => e.value === v)?.label ?? v ?? ''
const sanctionLabel = (v?: string | null) => (v === 'suspension' ? 'Suspension (1 à 6 mois)' : (SANCTIONS.find((s) => s.value === v)?.label ?? ''))
const ISSUES: Record<string, string> = { classee: 'Classée sans suite', confirmee: 'Sanction confirmée', annulee: 'Sanction annulée' }

/** Section « Discipline » de la colonne de droite de la fiche membre. */
export const DisciplineResume = ({ dossier, peutAgir }: { dossier: DossierData | null; peutAgir: boolean }) => {
  const { open, setOpen } = useContext(Ctx)
  return (
    <section className="panel">
      <div className="panel-h">
        <h3 className="h3">Discipline</h3>
        {dossier ? <span className="pill">{etapeLabel(dossier.statut)}</span> : <span className="pill pill-ok">Aucune procédure</span>}
      </div>
      <p className="small muted">
        Rappel à l&apos;ordre, avertissement, suspension de 1 à 6 mois ou exclusion, selon l&apos;article 15 des statuts. Aucune sanction sans
        notification écrite des griefs ni délai de défense.
      </p>
      {dossier ? (
        <button type="button" className="rec-btn rec-btn--secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Fermer la procédure' : `Voir la procédure ${dossier.numero}`}
        </button>
      ) : (
        peutAgir && (
          <button type="button" className="rec-btn rec-btn--secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
            Ouvrir une procédure
          </button>
        )
      )}
    </section>
  )
}

const ORDRE: Etape[] = ['ouverte', 'griefs', 'defense', 'avis', 'decision', 'recours', 'close']
const COURANTE = [0, 1, 2, 3, 4, 5, 5]

/** Panneau de procédure : champs de l'étape en cours, frise des étapes et historique. */
export const DisciplinePanel = ({
  membreId,
  libelle,
  dossier,
  clos,
  peutAgir,
}: {
  membreId: number
  libelle: string
  dossier: DossierData | null
  clos: DossierClos[]
  peutAgir: boolean
}) => {
  const { open, setOpen } = useContext(Ctx)
  const router = useRouter()
  const [griefs, setGriefs] = useState<string[]>(dossier?.griefs ?? [])
  const [faits, setFaits] = useState(dossier?.faits ?? '')
  const [envisagee, setEnvisagee] = useState<string>(dossier?.sanctionEnvisagee ?? '')
  const [defense, setDefense] = useState('')
  const [avis, setAvis] = useState('')
  const [sanction, setSanction] = useState('')
  const [duree, setDuree] = useState('')
  const [motivation, setMotivation] = useState('')
  const [texte, setTexte] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  if (!open) return null

  const statut: Etape = dossier?.statut ?? 'ouverte'
  const rang = ORDRE.indexOf(statut)
  const base = `/api/disciplinaryCases/${dossier?.id}`
  const agir = async (fn: () => Promise<unknown>, succes: string) => {
    setOccupe(true)
    setErr('')
    setOk('')
    try {
      await fn()
      setOk(succes)
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
      router.refresh()
    } finally {
      setOccupe(false)
    }
  }
  const post = (chemin: string, data: unknown) => api(`${base}${chemin}`, { method: 'POST', body: JSON.stringify(data) })
  const etat = (x: Partial<Dossier>): Dossier => ({ ...(dossier ?? {}), statut, ...x }) as Dossier

  const refusGriefs = refusTransition(etat({ statut: 'ouverte', griefs, faits, sanctionEnvisagee: envisagee }), 'griefs')
  const refusDefense = refusTransition(etat({ defense }), 'defense')
  const refusAvis = refusTransition(etat({ avis }), 'avis')
  const refusDecision = refusTransition(etat({ sanction, dureeMois: sanction === 'suspension' ? Number(duree) : null, motivation }), 'decision')
  const refusRecours = refusTransition(etat({}), 'recours')
  const refusClasser = refusTransition(etat({}), 'close')

  const raison = (r: string | null) => (r && peutAgir ? <p className="small muted">{r}</p> : null)
  const chips = (valeur: string, choisir: (v: string) => void, id: string) => (
    <div className="chips" role="group" aria-labelledby={id}>
      {SANCTIONS.map((s) => (
        <button key={s.value} type="button" className={`chip${valeur === s.value ? ' is-on' : ''}`} aria-pressed={valeur === s.value} disabled={!peutAgir || occupe} onClick={() => choisir(s.value)}>
          {s.value === 'suspension' ? 'Suspension (1 à 6 mois)' : s.label}
        </button>
      ))}
    </div>
  )
  const lecture = (titre: string, t?: string | null) =>
    t ? (
      <div className="rec-field">
        <span className="small" style={{ fontWeight: 600 }}>
          {titre}
        </span>
        <p className="small">{t}</p>
      </div>
    ) : null

  const creerPuisNotifier = () =>
    agir(
      async () => {
        let id = dossier?.id
        if (!id) {
          const r = (await api('/api/disciplinaryCases', { method: 'POST', body: JSON.stringify({ membre: membreId }) })) as { doc?: { id: number } }
          id = r.doc?.id
        }
        await api(`/api/disciplinaryCases/${id}/griefs`, { method: 'POST', body: JSON.stringify({ griefs, faits, sanctionEnvisagee: envisagee }) })
      },
      'Griefs notifiés par écrit. Le délai de défense de 15 jours est ouvert, la commission Éthique et Vérification est saisie. Le membre reste actif pendant la procédure.',
    )

  const frise: { t: string; d: string }[] = [
    { t: '1. Notification écrite des griefs', d: dossier?.dateGriefs ? `Envoyée le ${jour(dossier.dateGriefs)}` : 'À envoyer' },
    {
      t: '2. Défense écrite du membre',
      d: dossier?.dateDefense ? `Reçue le ${jour(dossier.dateDefense)}` : dossier?.finDefense ? `Défense attendue avant le ${jour(dossier.finDefense)}` : 'Sous 15 jours après la notification',
    },
    { t: '3. Avis de la commission Éthique et Vérification', d: dossier?.dateAvis ? `Rendu le ${jour(dossier.dateAvis)}` : 'Avis consultatif, ne lie pas le comité' },
    {
      t: '4. Décision motivée du comité de direction',
      d: dossier?.dateDecision ? `Notifiée le ${jour(dossier.dateDecision)} : ${sanctionLabel(dossier.sanction).toLowerCase()}` : 'Notifiée par écrit au membre',
    },
    {
      t: '5. Recours devant l’assemblée générale',
      d: dossier?.recours?.date
        ? `Formé le ${jour(dossier.recours.date)}`
        : dossier?.finRecours
          ? `Recours possible jusqu’au ${jour(dossier.finRecours)}`
          : 'Sous 30 jours. Non suspensif, sauf pour une exclusion',
    },
  ]
  // Étape de la frise : passée, en cours ou à venir (la clôture ferme toutes les étapes).
  const clsEtape = (i: number) => (statut === 'close' || i < COURANTE[rang] ? 'done' : i === COURANTE[rang] ? 'now' : 'todo')

  return (
    <section className="panel proc" aria-labelledby="disc-titre">
      <div className="panel-h">
        <div>
          <h2 className="h2" id="disc-titre">
            Procédure disciplinaire
          </h2>
          <p className="small muted">
            {libelle} · {dossier ? `dossier ${dossier.numero}` : 'dossier à ouvrir'}
          </p>
        </div>
        <button type="button" className="linkbtn" onClick={() => setOpen(false)}>
          Fermer
        </button>
      </div>
      <div className="grid2">
        <div className="stack">
          {statut === 'ouverte' && (
            <>
              <fieldset className="rec-field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="small" style={{ fontWeight: 600 }}>
                  Griefs reprochés
                </legend>
                {GRIEFS.map((g) => (
                  <label key={g.value} className="check-inline" style={{ minHeight: 32 }}>
                    <input
                      type="checkbox"
                      checked={griefs.includes(g.value)}
                      disabled={!peutAgir || occupe}
                      onChange={(e) => setGriefs((x) => (e.target.checked ? [...x, g.value] : x.filter((y) => y !== g.value)))}
                    />
                    {g.label}
                  </label>
                ))}
              </fieldset>
              <div className="rec-field">
                <label htmlFor="bb-df">Faits</label>
                <textarea id="bb-df" className="rec-input" value={faits} disabled={!peutAgir || occupe} placeholder="Exposé daté des faits, pièces jointes à l'appui." onChange={(e) => setFaits(e.target.value)} />
              </div>
              <div className="rec-field">
                <span className="small" id="disc-env" style={{ fontWeight: 600 }}>
                  Sanction envisagée
                </span>
                {chips(envisagee, setEnvisagee, 'disc-env')}
              </div>
            </>
          )}
          {statut !== 'ouverte' && (
            <>
              {lecture('Griefs reprochés', (dossier?.griefs ?? []).map((g) => GRIEFS.find((x) => x.value === g)?.label ?? g).join(' ; '))}
              {lecture('Faits', dossier?.faits)}
              {lecture('Sanction envisagée', sanctionLabel(dossier?.sanctionEnvisagee))}
              {lecture('Défense du membre', dossier?.defense)}
              {lecture('Avis de la commission Éthique et Vérification', dossier?.avis)}
              {dossier?.dateDecision && lecture('Décision', `${sanctionLabel(dossier.sanction)}${dossier.dureeMois ? `, ${dossier.dureeMois} mois` : ''}. ${dossier.motivation ?? ''}`)}
              {lecture('Recours', dossier?.recours?.texte)}
              {dossier?.issue && lecture('Issue', ISSUES[dossier.issue] ?? dossier.issue)}
            </>
          )}

          {peutAgir && statut === 'griefs' && (
            <div className="rec-field">
              <label htmlFor="disc-def">Défense écrite du membre</label>
              <textarea id="disc-def" className="rec-input" value={defense} disabled={occupe} onChange={(e) => setDefense(e.target.value)} />
              {raison(refusDefense)}
              <button
                type="button"
                className="rec-btn rec-btn--secondary"
                style={{ width: 'max-content' }}
                disabled={occupe || Boolean(refusDefense)}
                onClick={() => void agir(() => post('/defense', { defense }), 'Défense enregistrée.')}
              >
                Enregistrer la défense
              </button>
            </div>
          )}
          {peutAgir && (statut === 'griefs' || statut === 'defense') && (
            <div className="rec-field">
              <label htmlFor="disc-avis">Avis de la commission Éthique et Vérification</label>
              <textarea id="disc-avis" className="rec-input" value={avis} disabled={occupe} onChange={(e) => setAvis(e.target.value)} />
              {raison(refusAvis)}
              <button
                type="button"
                className="rec-btn rec-btn--secondary"
                style={{ width: 'max-content' }}
                disabled={occupe || Boolean(refusAvis)}
                onClick={() => void agir(() => post('/avis', { avis }), 'Avis de la commission enregistré.')}
              >
                Enregistrer l&apos;avis
              </button>
            </div>
          )}
          {peutAgir && statut === 'avis' && (
            <>
              <div className="rec-field">
                <span className="small" id="disc-san" style={{ fontWeight: 600 }}>
                  Sanction prononcée
                </span>
                {chips(sanction, setSanction, 'disc-san')}
              </div>
              {sanction === 'suspension' && (
                <div className="rec-field">
                  <label htmlFor="disc-duree">Durée de la suspension (mois)</label>
                  <input id="disc-duree" className="rec-input" type="number" min={SUSPENSION_MOIS.min} max={SUSPENSION_MOIS.max} value={duree} disabled={occupe} onChange={(e) => setDuree(e.target.value)} />
                </div>
              )}
              <div className="rec-field">
                <label htmlFor="disc-mot">Décision motivée</label>
                <textarea id="disc-mot" className="rec-input" value={motivation} disabled={occupe} onChange={(e) => setMotivation(e.target.value)} />
              </div>
              {raison(refusDecision)}
              <div className="rec-row">
                <button
                  type="button"
                  className="rec-btn rec-btn--primary"
                  disabled={occupe || Boolean(refusDecision)}
                  onClick={() => void agir(() => post('/decision', { sanction, dureeMois: sanction === 'suspension' ? Number(duree) : undefined, motivation }), 'Décision notifiée par écrit au membre.')}
                >
                  Notifier la décision
                </button>
              </div>
            </>
          )}
          {peutAgir && statut === 'decision' && (
            <div className="rec-field">
              <label htmlFor="disc-rec">Recours devant l&apos;assemblée générale</label>
              <textarea id="disc-rec" className="rec-input" value={texte} disabled={occupe} onChange={(e) => setTexte(e.target.value)} />
              {raison(refusRecours)}
              <button
                type="button"
                className="rec-btn rec-btn--secondary"
                style={{ width: 'max-content' }}
                disabled={occupe || Boolean(refusRecours) || !texte.trim()}
                onClick={() => void agir(() => post('/recours', { texte }), 'Recours enregistré.')}
              >
                Enregistrer le recours
              </button>
            </div>
          )}
          {peutAgir && statut === 'recours' && (
            <div className="rec-field">
              <span className="small" style={{ fontWeight: 600 }}>
                Décision de l&apos;assemblée générale
              </span>
              <div className="rec-row">
                <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={() => void agir(() => post('/close', { issue: 'confirmee' }), 'Sanction confirmée, dossier clos.')}>
                  Confirmer la sanction
                </button>
                <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={() => void agir(() => post('/close', { issue: 'annulee' }), 'Sanction annulée, dossier clos.')}>
                  Annuler la sanction
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="stack">
          <p className="h3">Étapes</p>
          {frise.map((x, i) => (
            <div className="tl" key={x.t}>
              <span className={`tl-dot tl-${clsEtape(i)}`} aria-hidden="true" />
              <div>
                <p style={{ fontWeight: 600 }}>{x.t}</p>
                <p className="small muted">{x.d}</p>
              </div>
            </div>
          ))}
          {(dossier?.historique?.length || clos.length > 0) && (
            <>
              <p className="h3">Historique</p>
              {(dossier?.historique ?? []).map((h, i) => (
                <p className="small" key={`${h.date}-${i}`}>
                  <span className="muted">{jour(h.date)}</span> · {etapeLabel(h.etape)}
                  {h.auteur ? <span className="muted"> · {h.auteur}</span> : null}
                </p>
              ))}
              {clos.map((c) => (
                <p className="small" key={c.numero}>
                  <span className="muted">{jour(c.date)}</span> · Dossier {c.numero} clos : {ISSUES[c.issue] ?? c.issue}
                </p>
              ))}
            </>
          )}
        </div>
      </div>
      {ok && (
        <div className="ok" role="status">
          {ok}
        </div>
      )}
      {err && (
        <p className="err" role="alert">
          {err}
        </p>
      )}
      {peutAgir && statut === 'ouverte' && (
        <div className="stack">
          {raison(refusGriefs)}
          <div className="rec-row">
            <button type="button" className="rec-btn rec-btn--primary" disabled={occupe || Boolean(refusGriefs)} onClick={() => void creerPuisNotifier()}>
              Notifier les griefs au membre
            </button>
          </div>
        </div>
      )}
      {peutAgir && ['griefs', 'defense', 'avis'].includes(statut) && (
        <div className="rec-row">
          <button type="button" className="linkbtn" disabled={occupe || Boolean(refusClasser)} onClick={() => void agir(() => post('/close', { issue: 'classee' }), 'Dossier classé sans suite.')}>
            Classer sans suite
          </button>
        </div>
      )}
      {!peutAgir && <p className="small muted">Les étapes de la procédure sont réservées au responsable membres et aux administrateurs.</p>}
    </section>
  )
}
