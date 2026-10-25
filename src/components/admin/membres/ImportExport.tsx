'use client'
import React, { useRef, useState } from 'react'

import { api } from './api'

type Rapport = { valides?: number; crees?: number; erreurs: { ligne: number; nom: string; erreurs: string[] }[] }

const MODELE =
  '﻿numero_adherent;prenom;nom;email;telephone;categorie;entreprise;secteurs;ville;quartier;date_adhesion\r\n'

/** Écran 05, onglet « Import et export ». L'annuaire imprimé arrive avec le lot 7. */
export const ImportExport = ({ peutExporter, peutImporter }: { peutExporter: boolean; peutImporter: boolean }) => {
  const [csv, setCsv] = useState('')
  const [nomFichier, setNomFichier] = useState('')
  const [rapport, setRapport] = useState<Rapport | null>(null)
  const [err, setErr] = useState('')
  const [occupe, setOccupe] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const envoyer = async (apercu: boolean) => {
    setOccupe(true)
    setErr('')
    try {
      setRapport((await api('/api/members/import', { method: 'POST', body: JSON.stringify({ csv, apercu }) })) as unknown as Rapport)
      if (!apercu) {
        setCsv('')
        setNomFichier('')
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  const modele = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([MODELE], { type: 'text/csv;charset=utf-8' }))
    a.download = 'modele-import-membres.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="grid2">
      <section className="panel">
        <h3 className="h3">Import initial</h3>
        <p className="small muted">Fichier CSV des membres existants, colonnes vérifiées avant import.</p>
        {peutImporter ? (
          <>
            <label className="drop" htmlFor="imp-csv" style={{ cursor: 'pointer' }}>
              {nomFichier || 'Déposer un fichier CSV'}
              <input
                id="imp-csv"
                ref={input}
                type="file"
                accept=".csv,text/csv"
                className="sr"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  setRapport(null)
                  if (!f) return
                  setNomFichier(f.name)
                  setCsv(await f.text())
                }}
              />
            </label>
            <button type="button" className="linkbtn" onClick={modele}>
              Télécharger le modèle CSV
            </button>
            {csv && (
              <div className="rec-row">
                <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={() => void envoyer(true)}>
                  Vérifier le fichier
                </button>
                {rapport?.valides !== undefined && rapport.valides > 0 && (
                  <button type="button" className="rec-btn rec-btn--primary" disabled={occupe} onClick={() => void envoyer(false)}>
                    Importer {rapport.valides} membre{rapport.valides > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            )}
            {rapport && (
              <div role="status" className="stack">
                {rapport.crees !== undefined ? (
                  <div className="ok">
                    {rapport.crees} membre{rapport.crees > 1 ? 's' : ''} importé{rapport.crees > 1 ? 's' : ''}, en attente d&apos;activation. Le lien
                    d&apos;activation se renvoie depuis chaque fiche.
                  </div>
                ) : (
                  <p className="small">
                    {rapport.valides} ligne{(rapport.valides ?? 0) > 1 ? 's' : ''} prête{(rapport.valides ?? 0) > 1 ? 's' : ''} à importer,{' '}
                    {rapport.erreurs.length} ligne{rapport.erreurs.length > 1 ? 's' : ''} en erreur.
                  </p>
                )}
                {rapport.erreurs.length > 0 && (
                  <ul className="small">
                    {rapport.erreurs.map((x) => (
                      <li key={x.ligne}>
                        Ligne {x.ligne}
                        {x.nom ? ` (${x.nom})` : ''} : {x.erreurs.join(', ')}.
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {err && (
              <p className="err" role="alert">
                {err}
              </p>
            )}
          </>
        ) : (
          <p className="small muted">L&apos;import est réservé au responsable membres et aux administrateurs.</p>
        )}
      </section>
      <section className="panel">
        <h3 className="h3">Export</h3>
        <p className="small muted">Export des fiches (CSV ou Excel). Chaque export de données personnelles est inscrit au journal.</p>
        {peutExporter ? (
          <div className="rec-row">
            <a className="rec-btn rec-btn--secondary" href="/api/members/export" download>
              CSV
            </a>
          </div>
        ) : (
          <p className="small muted">L&apos;export des données personnelles n&apos;est pas ouvert à votre rôle.</p>
        )}
      </section>
    </div>
  )
}
