'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { OBJETS_PAIEMENT } from '@/lib/adhesion/paiement'
import { api } from '../membres/api'

export type LigneCotisation = {
  id: number
  membreId: number
  membre: string
  categorie: string
  echeance: string
  limite: string
  relances: string
  statut: 'a-jour' | 'a-venir' | 'en-relance' | 'perte'
  actif: boolean
  refusRelance: string | null
  /** null : le constat est possible ; « inactif » : pas d'échéance ouverte. */
  refusConstat: string | null
}
export type MembrePaiement = { id: number; libelle: string; objet: string; montant: number; reste: number }

const FILTRES = [
  { value: 'toutes', label: 'Toutes' },
  { value: 'a-jour', label: 'À jour' },
  { value: 'a-venir', label: 'À venir' },
  { value: 'en-relance', label: 'En relance' },
] as const
const STATUTS = {
  'a-jour': { label: 'À jour', cls: 'active' },
  'a-venir': { label: 'À venir', cls: 'pending' },
  'en-relance': { label: 'En relance', cls: 'suspended' },
  perte: { label: 'Perte constatée', cls: 'suspended' },
} as const
const MODES = [
  { value: 'especes', label: 'Espèces', ref: 'N° du reçu du carnet à souches' },
  { value: 'virement', label: 'Virement', ref: 'Référence du virement' },
] as const
const aujourdhui = () => new Date().toISOString().slice(0, 10)

/** Écran 12 : filtres, actions du trésorier (relances, constat de perte, paiement manuel, export) et tableau des échéances. */
export const CotisationsClient = ({
  lignes,
  membres,
  filtre,
  filtreNom,
  peutPayer,
  peutExporter,
  prochainRecu,
  children,
}: {
  lignes: LigneCotisation[]
  membres: MembrePaiement[]
  filtre: number | null
  filtreNom: string
  peutPayer: boolean
  peutExporter: boolean
  prochainRecu: string
  children: React.ReactNode
}) => {
  const router = useRouter()
  const [f, setF] = useState<(typeof FILTRES)[number]['value']>('toutes')
  const [occupe, setOccupe] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [constat, setConstat] = useState<number | null>(null)
  const [pv, setPv] = useState('')
  const [dateComite, setDateComite] = useState(aujourdhui)
  const [paie, setPaie] = useState(false)
  const [exp, setExp] = useState(false)
  const [du, setDu] = useState('')
  const [au, setAu] = useState(aujourdhui)
  const [membre, setMembre] = useState<number>(filtre ?? membres[0]?.id ?? 0)
  const m = membres.find((x) => x.id === membre)
  const [objet, setObjet] = useState('')
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState(aujourdhui)
  const [mode, setMode] = useState<(typeof MODES)[number]['value']>('especes')
  const [reference, setReference] = useState('')

  const choisirMembre = (id: number) => {
    setMembre(id)
    setObjet('')
    setMontant('')
  }
  const objetEff = objet || m?.objet || 'tranche1'
  const montantEff = montant !== '' ? montant : String(m?.montant ?? '')

  const agir = async (fn: () => Promise<string>) => {
    setOccupe(true)
    setErr('')
    setOk('')
    try {
      setOk(await fn())
      router.refresh()
      return true
    } catch (e) {
      setErr((e as Error).message)
      return false
    } finally {
      setOccupe(false)
    }
  }

  const visibles = lignes.filter((l) => f === 'toutes' || l.statut === f)
  const aRelancer = lignes.filter((l) => l.actif && l.refusRelance === null)

  const relancerTout = () => {
    if (!aRelancer.length) {
      setErr('')
      setOk('Aucune relance due pour le moment : le délai de 15 jours n’est pas écoulé ou les trois relances sont déjà envoyées.')
      return
    }
    if (!window.confirm(`Envoyer ${aRelancer.length} relance${aRelancer.length > 1 ? 's' : ''} par e-mail ?`)) return
    void agir(async () => {
      for (const l of aRelancer) await api(`/api/dues/${l.id}/relancer`, { method: 'POST', body: '{}' })
      return 'Relances envoyées par e-mail. Prochaine relance possible dans 15 jours au plus tôt.'
    })
  }
  const constater = async () => {
    const l = lignes.find((x) => x.id === constat)
    if (!l) return
    const fait = await agir(async () => {
      await api(`/api/dues/${l.id}/constater`, { method: 'POST', body: JSON.stringify({ pv: pv.trim(), dateComite }) })
      return `Perte de la qualité de membre constatée : ${l.membre}. Le membre est informé par écrit et sa fiche quitte l’annuaire.`
    })
    if (fait) setConstat(null)
  }
  const enregistrer = async () => {
    if (!m) return
    const fait = await agir(async () => {
      const r = (await api('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ membre: m.id, objet: objetEff, montant: Number(montantEff.replace(/\s/g, '')), mode, statut: 'paye', referenceOperateur: reference.trim(), datePaiement: date }),
      })) as { doc?: { id: number; numero?: number | null } }
      let numero = doc2(r.doc?.numero)
      if (!numero && r.doc?.id) {
        const p = (await api(`/api/payments/${r.doc.id}?depth=0`)) as { numero?: number | null }
        numero = doc2(p.numero)
      }
      return `Paiement enregistré.${numero ? ` Reçu ${numero} émis,` : ' Reçu émis,'} envoyé à ${m.libelle.split(' · ')[0]} et visible dans son espace. Opération inscrite au journal.`
    })
    if (fait) {
      setReference('')
      setMontant('')
      setObjet('')
    }
  }
  const doc2 = (n?: number | null) => (n ? `PAY-${String(n).padStart(4, '0')}` : '')
  const refMode = MODES.find((x) => x.value === mode)

  return (
    <>
      <div className="bar-actions">
        <div className="chips" role="group" aria-label="Filtrer par statut">
          {FILTRES.map((x) => (
            <button key={x.value} type="button" className={`chip${f === x.value ? ' is-on' : ''}`} aria-pressed={f === x.value} onClick={() => setF(x.value)}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="rec-row">
          {peutExporter && (
            <button type="button" className="rec-btn rec-btn--secondary" aria-expanded={exp} onClick={() => setExp(!exp)}>
              Export comptable
            </button>
          )}
          {peutPayer && (
            <button type="button" className="rec-btn rec-btn--secondary" aria-expanded={paie} onClick={() => setPaie(!paie)}>
              Enregistrer un paiement
            </button>
          )}
          {peutPayer && (
            <button type="button" className="rec-btn rec-btn--primary" disabled={occupe} onClick={relancerTout}>
              Envoyer les relances dues
            </button>
          )}
        </div>
      </div>
      {filtre && (
        <p className="small">
          Membre : <b>{filtreNom || `n° ${filtre}`}</b>{' '}
          <Link className="linkbtn" href="/admin/cotisations">
            Voir tous les membres
          </Link>
        </p>
      )}

      {exp && peutExporter && (
        <section className="panel">
          <div className="panel-h">
            <div>
              <h2 className="h2">Export comptable</h2>
              <p className="small muted">Paiements confirmés et remboursements de la période, au format CSV. L&apos;export est inscrit au journal.</p>
            </div>
            <button type="button" className="linkbtn" onClick={() => setExp(false)}>
              Fermer
            </button>
          </div>
          <div className="form">
            <div className="rec-field">
              <label htmlFor="bb-edu">Du</label>
              <input id="bb-edu" className="rec-input" type="date" value={du} max={au || undefined} onChange={(e) => setDu(e.target.value)} />
            </div>
            <div className="rec-field">
              <label htmlFor="bb-eau">Au</label>
              <input id="bb-eau" className="rec-input" type="date" value={au} min={du || undefined} onChange={(e) => setAu(e.target.value)} />
            </div>
          </div>
          <div className="rec-row">
            <a className="rec-btn rec-btn--primary" download href={`/api/payments/export?${new URLSearchParams({ ...(du ? { du } : {}), ...(au ? { au } : {}) }).toString()}`}>
              Télécharger le CSV
            </a>
          </div>
        </section>
      )}

      {paie && peutPayer && (
        <section className="panel">
          <div className="panel-h">
            <div>
              <h2 className="h2">Enregistrer un paiement</h2>
              <p className="small muted">
                Pour un règlement au siège ou par virement. Un reçu officiel numéroté est émis et envoyé au membre.
              </p>
            </div>
            <button type="button" className="linkbtn" onClick={() => setPaie(false)}>
              Fermer
            </button>
          </div>
          <div className="form">
            <div className="rec-field">
              <label htmlFor="bb-cm">Membre</label>
              <select id="bb-cm" className="rec-input" value={membre} onChange={(e) => choisirMembre(Number(e.target.value))}>
                {membres.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.libelle}
                  </option>
                ))}
              </select>
            </div>
            <div className="rec-field">
              <label htmlFor="bb-co">Objet</label>
              <select id="bb-co" className="rec-input" value={objetEff} onChange={(e) => setObjet(e.target.value)}>
                {OBJETS_PAIEMENT.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rec-field">
              <label htmlFor="bb-cmt">Montant (FCFA)</label>
              <input id="bb-cmt" className="rec-input mono" type="text" inputMode="numeric" value={montantEff} onChange={(e) => setMontant(e.target.value)} />
            </div>
            <div className="rec-field">
              <label htmlFor="bb-cd">Date du paiement</label>
              <input id="bb-cd" className="rec-input" type="date" value={date} max={aujourdhui()} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="rec-field full">
              <span className="small" id="bb-cmode" style={{ fontWeight: 600 }}>
                Mode de paiement
              </span>
              <div className="chips" role="group" aria-labelledby="bb-cmode">
                {MODES.map((x) => (
                  <button key={x.value} type="button" className={`chip${mode === x.value ? ' is-on' : ''}`} aria-pressed={mode === x.value} onClick={() => setMode(x.value)}>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rec-field">
              <label htmlFor="bb-cref">{refMode?.ref}</label>
              <input id="bb-cref" className="rec-input mono" type="text" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="rec-field">
              <label htmlFor="bb-cre">Reçu officiel</label>
              <input id="bb-cre" className="rec-input mono" type="text" value={`${prochainRecu} (attribué automatiquement)`} readOnly />
            </div>
          </div>
          <div className="rec-row">
            <button type="button" className="rec-btn rec-btn--primary" disabled={occupe || !m || !Number(montantEff.replace(/\s/g, '')) || !reference.trim() || !date} onClick={() => void enregistrer()}>
              Enregistrer et émettre le reçu
            </button>
          </div>
        </section>
      )}

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

      {constat !== null && peutPayer && (
        <section className="warn" aria-labelledby="bb-constat">
          <b id="bb-constat">Constater la perte de la qualité de membre : {lignes.find((x) => x.id === constat)?.membre}</b>
          <p className="small">
            Trois relances écrites ont été envoyées. Le constat est inscrit au procès-verbal du comité de direction, le membre est informé par écrit et sa fiche quitte l&apos;annuaire.
            Ce n&apos;est pas une sanction : une nouvelle adhésion reste possible après régularisation.
          </p>
          <div className="form">
            <div className="rec-field">
              <label htmlFor="bb-pv">Procès-verbal du comité (référence)</label>
              <input id="bb-pv" className="rec-input" type="text" value={pv} onChange={(e) => setPv(e.target.value)} />
            </div>
            <div className="rec-field">
              <label htmlFor="bb-dc">Date du comité</label>
              <input id="bb-dc" className="rec-input" type="date" value={dateComite} max={aujourdhui()} onChange={(e) => setDateComite(e.target.value)} />
            </div>
          </div>
          <div className="rec-row">
            <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={() => setConstat(null)}>
              Annuler
            </button>
            <button type="button" className="rec-btn rec-btn--primary" disabled={occupe || !pv.trim() || !dateComite} onClick={() => void constater()}>
              Constater la perte
            </button>
          </div>
        </section>
      )}

      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Membre</th>
              <th scope="col">Catégorie</th>
              <th scope="col">Échéance</th>
              <th scope="col">Limite</th>
              <th scope="col">Relances</th>
              <th scope="col">Statut</th>
              <th scope="col">
                <span className="sr">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  Aucune échéance à afficher.
                </td>
              </tr>
            )}
            {visibles.map((l) => (
              <tr key={l.id}>
                <td>
                  <Link href={`/admin/collections/members/${l.membreId}`} style={{ fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>
                    {l.membre}
                  </Link>
                </td>
                <td data-label="Catégorie">
                  <span className="cat">{l.categorie}</span>
                </td>
                <td data-label="Échéance">{l.echeance}</td>
                <td data-label="Limite">{l.limite}</td>
                <td data-label="Relances" className="mono">
                  {l.relances}
                </td>
                <td data-label="Statut">
                  <span className={`rec-badge rec-badge--${STATUTS[l.statut].cls}`}>{STATUTS[l.statut].label}</span>
                </td>
                <td>
                  {peutPayer && l.actif && l.refusConstat === null && (
                    <button type="button" className="linkbtn danger" disabled={occupe} onClick={() => setConstat(l.id)}>
                      Constater la perte
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {children}
    </>
  )
}
