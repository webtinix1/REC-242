'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState, useTransition } from 'react'

import { payerAbonnement } from '@/lib/abonnement/actions'
import { suivrePaiement } from '@/lib/cotisations/actions'

export type DonneesAbonnement = {
  /** Date de fin en toutes lettres si l'abonnement court. */
  jusquau?: string
  /** Offre en vigueur (Paramètres, onglet Tarifs) ; absente tant que REC 242 n'a pas fixé le prix et la durée. */
  offre?: { montantTexte: string; duree: string }
  telephone: string
}

type Phase = 'ferme' | 'saisie' | 'attente' | 'echec'

/**
 * Abonnement « Annuaire détaillé » (décision du 28/10/2026), en tête de l'annuaire de l'espace membre :
 * état de l'abonnement, ou offre et paiement mobile (même parcours que la cotisation).
 */
export function AbonnementAnnuaire({ d }: { d: DonneesAbonnement }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('ferme')
  const [operateur, setOperateur] = useState<'mtn' | 'airtel'>('mtn')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [recu, setRecu] = useState('')
  const [enCours, lancer] = useTransition()
  const paiement = useRef<number | null>(null)
  const panneau = useRef<HTMLDivElement>(null)
  const nomOperateur = operateur === 'mtn' ? 'MTN MoMo' : 'Airtel Money'

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
    setErreurs({})
    setMessage('')
    lancer(async () => {
      const r = await payerAbonnement({}, f).catch(() => ({ erreur: 'Une erreur est survenue. Réessayez dans un instant.' }) as Awaited<ReturnType<typeof payerAbonnement>>)
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
    <section className="card-soft" id="abonnement" aria-labelledby="mb-abo-t">
      <div className="row between">
        <h2 className="h3" id="mb-abo-t">
          Annuaire détaillé
        </h2>
        {d.jusquau && <span className="rec-badge rec-badge--active">Actif jusqu’au {d.jusquau}</span>}
      </div>
      {d.jusquau ? (
        <p className="small">Vous voyez les fiches détaillées des membres : dirigeant, portrait, quartier, taille et commissions.</p>
      ) : (
        <>
          <p className="small">
            Avec l’abonnement « Annuaire détaillé », en plus de votre cotisation, vous voyez les fiches détaillées des membres : dirigeant, portrait, quartier, taille et
            commissions. Sans abonnement, vous voyez tous les membres et pouvez leur écrire depuis la plateforme.
          </p>
          {d.offre ? (
            phase === 'ferme' &&
            !recu && (
              <div className="row">
                <span className="amount">{d.offre.montantTexte}</span>
                <span className="small muted">pour {d.offre.duree}</span>
                <button type="button" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} onClick={ouvrir}>
                  S’abonner
                </button>
              </div>
            )
          ) : (
            <p className="small muted">L’abonnement sera proposé prochainement.</p>
          )}
        </>
      )}

      {phase !== 'ferme' && d.offre && !d.jusquau && (
        <div className="paypanel" ref={panneau} tabIndex={-1} aria-labelledby="mb-abo-pay-t">
          <div className="row between">
            <h3 className="h3" id="mb-abo-pay-t">
              Payer l’abonnement
            </h3>
            {phase !== 'attente' && (
              <button type="button" className="linkbtn" onClick={() => setPhase('ferme')}>
                Fermer
              </button>
            )}
          </div>
          <p className="amount">{d.offre.montantTexte}</p>
          {phase === 'attente' ? (
            <div className="stack-s" role="status" aria-live="polite">
              <p style={{ fontWeight: 600 }}>En attente de votre validation</p>
              <p className="small">
                Une demande de {d.offre.montantTexte} s’affiche sur votre téléphone {nomOperateur}. Confirmez avec votre code secret : l’abonnement s’active aussitôt.
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
                  <label htmlFor="mb-abo-tel">Numéro {nomOperateur}</label>
                  <input id="mb-abo-tel" name="telephone" className="rec-input" type="tel" autoComplete="tel" defaultValue={d.telephone} aria-invalid={erreurs.telephone ? true : undefined} />
                  <span className="rec-help">Une demande de validation s’affiche sur ce téléphone. Confirmez avec votre code secret : le reçu est émis aussitôt.</span>
                  {erreurs.telephone && <span className="rec-error">{erreurs.telephone}</span>}
                </div>
                {erreurs.operateur && <span className="rec-error">{erreurs.operateur}</span>}
              </div>
              <p className="small muted">Vous pouvez aussi régler au siège : le trésorier enregistre le paiement et l’abonnement s’active.</p>
              {message && (
                <p className="erreur" role="alert">
                  {message}
                </p>
              )}
              <button type="submit" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} disabled={enCours}>
                {enCours ? 'Envoi de la demande…' : 'Confirmer le paiement'}
              </button>
            </form>
          )}
        </div>
      )}

      {recu && (
        <div className="okbox" role="status">
          <span className="rec-badge rec-badge--active">Abonnement activé</span>
          <p className="small">Votre paiement est confirmé. Le reçu {recu} vous a été envoyé par e-mail.</p>
        </div>
      )}
    </section>
  )
}
