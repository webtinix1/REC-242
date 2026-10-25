'use client'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { api } from './api'

type Props = {
  edition?: string
  cloture?: string
  incluses: number
  peutExporter: boolean
  peutReserver: boolean
  tarifs: { value: string; label: string; montant: number }[]
  membres: { id: number; nom: string }[]
  encarts: { id: number; format: string; membre: string; montant: number; statut: string }[]
}

const fcfa = (n: number) => `${n.toLocaleString('fr-FR').replace(/[  ]/g, ' ')} FCFA`
const STATUT: Record<string, { label: string; cls: string }> = {
  inclus: { label: 'Incluse', cls: 'active' },
  'a-payer': { label: 'À payer', cls: 'pending' },
  paye: { label: 'Payé', cls: 'active' },
  annule: { label: 'Annulé', cls: 'suspended' },
}

/** Écran 05 : annuaire imprimé (édition en cours, fiches éligibles, encarts, export pour l'imprimeur). */
export const AnnuaireImprime = (p: Props) => {
  const router = useRouter()
  const [membre, setMembre] = useState('')
  const [format, setFormat] = useState('logo')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [occupe, setOccupe] = useState(false)

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
    } finally {
      setOccupe(false)
    }
  }
  const payants = p.encarts.filter((e) => e.statut !== 'inclus').length

  return (
    <section className="panel">
      <div className="panel-h">
        <div>
          <h3 className="h3">Annuaire imprimé{p.edition ? `, édition ${p.edition}` : ''}</h3>
          <p className="small muted">
            Mis en page automatiquement à partir des fiches des membres à jour au {p.cloture ?? 'jour de la clôture'}, qui ont accepté de figurer dans
            l&apos;annuaire.
          </p>
        </div>
        {p.cloture && <span className="pill">Clôture le {p.cloture}</span>}
      </div>
      {!p.edition ? (
        <p className="small muted">Renseignez l&apos;édition en cours et la date de clôture dans Paramètres, onglet Tarifs.</p>
      ) : (
        <>
          <div className="kpis kpis-3">
            <div className="kpi">
              <b>{p.incluses}</b>
              <span>Fiches incluses</span>
            </div>
            <div className="kpi">
              <b>{payants}</b>
              <span>Encarts réservés</span>
            </div>
          </div>
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Encart</th>
                  <th scope="col">Membre</th>
                  <th scope="col">Montant</th>
                  <th scope="col">Paiement</th>
                </tr>
              </thead>
              <tbody>
                {p.encarts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Aucun encart réservé pour cette édition.
                    </td>
                  </tr>
                )}
                {p.encarts.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <b>{e.format}</b>
                    </td>
                    <td data-label="Membre">{e.membre}</td>
                    <td data-label="Montant" className="mono">
                      {e.montant ? fcfa(e.montant) : 'Incluse'}
                    </td>
                    <td data-label="Paiement">
                      <span className={`rec-badge rec-badge--${STATUT[e.statut]?.cls ?? 'pending'}`}>{STATUT[e.statut]?.label ?? e.statut}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {p.peutReserver && (
            <div className="rec-row">
              <div className="rec-field">
                <label htmlFor="enc-m">Membre</label>
                <select id="enc-m" className="rec-input" value={membre} onChange={(e) => setMembre(e.target.value)}>
                  <option value="">Choisir</option>
                  {p.membres.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rec-field">
                <label htmlFor="enc-f">Encart</label>
                <select id="enc-f" className="rec-input" value={format} onChange={(e) => setFormat(e.target.value)}>
                  {p.tarifs
                    .filter((t) => t.value !== 'standard' && !Number.isNaN(t.montant))
                    .map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} · {fcfa(t.montant)}
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="button"
                className="rec-btn rec-btn--secondary"
                disabled={occupe || !membre}
                onClick={() =>
                  void agir(
                    () => api('/api/directoryAds', { method: 'POST', body: JSON.stringify({ membre: Number(membre), format }) }),
                    'Encart réservé. Le paiement s’enregistre dans Cotisations.',
                  )
                }
              >
                Réserver un encart
              </button>
            </div>
          )}
          {p.peutExporter && (
            <div className="rec-row">
              <a className="rec-btn rec-btn--primary" href="/api/members/export-imprimeur" download>
                Exporter pour l&apos;imprimeur
              </a>
              <span className="small muted">Archive ZIP : fichier CSV des fiches et dossier des logos. L&apos;export est inscrit au journal.</span>
            </div>
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
        </>
      )}
    </section>
  )
}
