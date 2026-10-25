'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState, useTransition } from 'react'

import { payerCotisation, suivrePaiement } from '@/lib/cotisations/actions'

export type DonneesCotisationHaut = {
  categorie: string
  montants: string
  exercice: string
  pct: number
  reste: string
  soldee: boolean
  /** Libellé du bouton (« Payer la 2e tranche »), vide si rien à payer. */
  bouton: string
  /** Montant de la prochaine tranche due et du solde, en chiffres puis en texte. */
  montant: number
  montantTexte: string
  solde: number
  soldeTexte: string
  tranchesDues: number
  telephone: string
  siege: string
}

type Phase = 'ferme' | 'saisie' | 'attente' | 'echec'

/** Haut de l'écran 11 : catégorie, jauge, reste à payer et panneau de paiement mobile (MTN MoMo ou Airtel Money). */
export function CotisationHaut({ d }: { d: DonneesCotisationHaut }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('ferme')
  const [mode, setMode] = useState<'mobile' | 'siege'>('mobile')
  const [operateur, setOperateur] = useState<'mtn' | 'airtel'>('mtn')
  const [tout, setTout] = useState(false)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [recu, setRecu] = useState('')
  const [enCours, lancer] = useTransition()
  const paiement = useRef<number | null>(null)
  const panneau = useRef<HTMLDivElement>(null)
  const nomOperateur = operateur === 'mtn' ? 'MTN MoMo' : 'Airtel Money'
  const montant = tout ? d.solde : d.montant
  const montantTexte = tout ? d.soldeTexte : d.montantTexte
  const titre = tout ? 'Payer le solde de la cotisation' : d.bouton

  useEffect(() => {
    if (phase !== 'attente') return
    let essais = 0
    const t = setInterval(async () => {
      essais++
      const id = paiement.current
      const r = id ? await suivrePaiement(id).catch(() => null) : null
      if (r?.statut === 'paye') {
        clearInterval(t)
        setRecu(r.numero ?? '')
        setPhase('ferme')
        router.refresh()
      } else if (r?.statut === 'echoue') {
        clearInterval(t)
        setMessage('Le paiement n’a pas abouti. Vérifiez le numéro et votre solde, puis réessayez.')
        setPhase('echec')
      } else if (essais >= 60) {
        clearInterval(t)
        setMessage('Nous n’avons pas reçu de validation sur le téléphone. Réessayez.')
        setPhase('echec')
      }
    }, 3000)
    return () => clearInterval(t)
  }, [phase, router])

  const ouvrir = () => {
    setRecu('')
    setMessage('')
    setErreurs({})
    setPhase('saisie')
    setTimeout(() => panneau.current?.focus(), 0)
  }

  const confirmer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    f.set('operateur', operateur)
    if (tout) f.set('tout', 'on')
    setErreurs({})
    setMessage('')
    lancer(async () => {
      const r = await payerCotisation({}, f).catch(() => ({ erreur: 'Une erreur est survenue. Réessayez dans un instant.' }) as Awaited<ReturnType<typeof payerCotisation>>)
      if (r.erreurs) return setErreurs(r.erreurs)
      if (r.erreur || !r.ok || !r.paiement) {
        setMessage(r.erreur ?? 'Le paiement n’a pas pu être lancé. Réessayez dans un instant.')
        return setPhase(r.paiement ? 'echec' : 'saisie')
      }
      paiement.current = r.paiement
      setPhase('attente')
    })
  }

  return (
    <>
      <div className="g3">
        <div className="card">
          <p className="lbl">Ma catégorie</p>
          <p className="h3">{d.categorie}</p>
          {d.montants && <p className="small muted mono">{d.montants}</p>}
        </div>
        <div className="card">
          <p className="lbl">Cotisation {d.exercice}</p>
          <div className="bar" role="progressbar" aria-label="Part de la cotisation réglée" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.pct}>
            <span style={{ width: `${d.pct}%` }} />
          </div>
          <p className="small muted">{d.pct} % réglé</p>
        </div>
        <div className="card-gold">
          <p className="lbl">Reste à payer</p>
          <p className="amount">{d.reste}</p>
          {d.soldee ? (
            <span className="rec-badge rec-badge--active">Cotisation soldée</span>
          ) : (
            phase === 'ferme' &&
            !recu && (
              <button type="button" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} onClick={ouvrir}>
                {d.bouton}
              </button>
            )
          )}
        </div>
      </div>

      {phase !== 'ferme' && !d.soldee && (
        <div className="paypanel" ref={panneau} tabIndex={-1} aria-labelledby="mb-pay-t">
          <div className="row between">
            <h2 className="h2" id="mb-pay-t">
              {titre}
            </h2>
            {phase !== 'attente' && (
              <button type="button" className="linkbtn" onClick={() => setPhase('ferme')}>
                Fermer
              </button>
            )}
          </div>
          <p className="amount">{montantTexte}</p>

          {phase === 'attente' ? (
            <div className="stack-s" role="status" aria-live="polite">
              <p style={{ fontWeight: 600 }}>En attente de votre validation</p>
              <p className="small">
                Une demande de {montantTexte} s’affiche sur votre téléphone {nomOperateur}. Confirmez avec votre code secret : le reçu est émis aussitôt.
              </p>
            </div>
          ) : phase === 'echec' ? (
            <div className="stack-s" role="alert">
              <p className="erreur">{message}</p>
              <button type="button" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} onClick={() => setPhase('saisie')}>
                Réessayer
              </button>
            </div>
          ) : (
            <form onSubmit={confirmer} className="stack" noValidate>
              <div className="g2">
                <button type="button" className={`opt${mode === 'mobile' ? ' is-on' : ''}`} aria-pressed={mode === 'mobile'} onClick={() => setMode('mobile')}>
                  <span className="dot" />
                  <span>
                    <b>Paiement mobile</b>
                    <br />
                    <span className="small muted">MTN MoMo ou Airtel Money</span>
                  </span>
                </button>
                <button type="button" className={`opt${mode === 'siege' ? ' is-on' : ''}`} aria-pressed={mode === 'siege'} onClick={() => setMode('siege')}>
                  <span className="dot" />
                  <span>
                    <b>Au siège</b>
                    <br />
                    <span className="small muted">{d.siege}</span>
                  </span>
                </button>
              </div>
              {d.tranchesDues > 1 && (
                <label className="row" style={{ gap: 10, minHeight: 44, cursor: 'pointer' }}>
                  <input type="checkbox" checked={tout} onChange={(e) => setTout(e.target.checked)} style={{ width: 22, height: 22 }} />
                  <span className="small">Tout régler maintenant ({d.soldeTexte})</span>
                </label>
              )}
              {mode === 'mobile' ? (
                <div className="momo">
                  <div className="g2">
                    {(
                      [
                        ['mtn', 'MTN MoMo', 'Depuis un numéro MTN'],
                        ['airtel', 'Airtel Money', 'Depuis un numéro Airtel'],
                      ] as const
                    ).map(([k, nom, sous]) => (
                      <button key={k} type="button" className={`opt${operateur === k ? ' is-on' : ''}`} aria-pressed={operateur === k} onClick={() => setOperateur(k)}>
                        <span className="dot" />
                        <span>
                          <b>{nom}</b>
                          <br />
                          <span className="small muted">{sous}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className={`rec-field${erreurs.telephone ? ' rec-field--error' : ''}`}>
                    <label htmlFor="mb-momo">Numéro {nomOperateur}</label>
                    <input id="mb-momo" name="telephone" className="rec-input" type="tel" autoComplete="tel" defaultValue={d.telephone} aria-invalid={erreurs.telephone ? true : undefined} />
                    <span className="rec-help">
                      Une demande de validation de {montantTexte} s’affiche sur ce téléphone. Confirmez avec votre code secret : le reçu est émis aussitôt.
                    </span>
                    {erreurs.telephone && <span className="rec-error">{erreurs.telephone}</span>}
                  </div>
                  {erreurs.operateur && <span className="rec-error">{erreurs.operateur}</span>}
                </div>
              ) : (
                <p className="small">À régler au siège lors de votre prochain passage. Le trésorier enregistre le paiement et votre reçu apparaît ici.</p>
              )}
              {message && (
                <p className="erreur" role="alert">
                  {message}
                </p>
              )}
              {mode === 'mobile' && (
                <button type="submit" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} disabled={enCours || montant <= 0}>
                  {enCours ? 'Envoi de la demande…' : 'Confirmer le paiement'}
                </button>
              )}
            </form>
          )}
        </div>
      )}

      {recu && (
        <div className="okbox" role="status">
          <span className="rec-badge rec-badge--active">Paiement enregistré</span>
          <p className="small">Votre paiement est confirmé. Le reçu {recu} a été ajouté ci-dessous et envoyé par e-mail.</p>
        </div>
      )}
    </>
  )
}
