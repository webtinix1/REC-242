'use client'

import Link from 'next/link'
import React, { useActionState, useState } from 'react'

import type { EtatFormulaire } from '@/app/(espace-membre)/espace-membre/actions'

type Action = (etat: EtatFormulaire, f: FormData) => Promise<EtatFormulaire>

export function Champ({
  id,
  label,
  erreur,
  aide,
  ...input
}: { id: string; label: string; erreur?: string; aide?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const desc = erreur ? `${id}-err` : aide ? `${id}-aide` : undefined
  return (
    <div className={`rec-field${erreur ? ' rec-field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="rec-input" aria-invalid={erreur ? true : undefined} aria-describedby={desc} {...input} />
      {erreur ? (
        <span id={`${id}-err`} className="rec-error">
          {erreur}
        </span>
      ) : (
        aide && (
          <span id={`${id}-aide`} className="rec-help">
            {aide}
          </span>
        )
      )}
    </div>
  )
}

export function Envoye({ retour = true }: { retour?: boolean }) {
  return (
    <>
      <h1 className="h1">Vérifiez vos e-mails</h1>
      <div className="okbox" role="status">
        <span className="rec-badge rec-badge--active">E-mail envoyé</span>
        <p className="small">
          Si un compte existe avec cette adresse, un lien vient de vous être envoyé. Pensez à regarder dans les courriers indésirables.
        </p>
      </div>
      {retour && (
        <Link className="linkbtn" href="/espace-membre/connexion">
          ← Retour à la connexion
        </Link>
      )}
    </>
  )
}

/** Connexion et « Session expirée » (écran 01). */
export function FormulaireConnexion({
  connexion,
  lien,
  retour,
  expiree,
  erreurInitiale,
}: {
  connexion: Action
  lien: Action
  retour?: string
  expiree?: boolean
  erreurInitiale?: string
}) {
  const [etat, agir, enCours] = useActionState(connexion, {})
  const [etatLien, demanderLien, lienEnCours] = useActionState(lien, {})
  const [email, setEmail] = useState('')
  if (etatLien.ok) return <Envoye />
  const erreur = etat.erreur ?? (etat.erreurs ? undefined : erreurInitiale)
  return (
    <>
      {expiree ? (
        <>
          <span className="rec-badge rec-badge--pending">Session expirée</span>
          <h1 className="h1">Vous avez été déconnecté</h1>
          <p className="muted">
            Par sécurité, votre session se ferme après 30 minutes sans activité. Reconnectez-vous pour reprendre là où vous en étiez.
          </p>
        </>
      ) : (
        <>
          <p className="lbl">Espace membre</p>
          <h1 className="h1">Bon retour parmi nous</h1>
        </>
      )}
      <form action={agir} noValidate>
        {erreur && (
          <p className="erreur" role="alert">
            {erreur}
          </p>
        )}
        <input type="hidden" name="retour" value={retour ?? ''} />
        <Champ
          id="mb-mail"
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nom@entreprise.cg"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erreur={etat.erreurs?.email ?? etatLien.erreurs?.email}
        />
        <Champ
          id="mb-pw"
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={10}
          aide={expiree ? undefined : '10 caractères minimum.'}
          erreur={etat.erreurs?.password}
        />
        {!expiree && (
          <label className="check">
            <input type="checkbox" name="rester" defaultChecked /> Rester connecté 30 jours sur cet appareil
          </label>
        )}
        <button type="submit" className="rec-btn rec-btn--primary" disabled={enCours}>
          {expiree ? 'Me reconnecter' : 'Se connecter'}
        </button>
        {!expiree && (
          <div className="row between">
            <Link className="linkbtn" href="/espace-membre/mot-de-passe-oublie">
              Mot de passe oublié ?
            </Link>
            <button type="submit" className="linkbtn" formAction={demanderLien} formNoValidate disabled={lienEnCours}>
              Recevoir un lien par e-mail
            </button>
          </div>
        )}
      </form>
      {!expiree && (
        <div className="card-soft" style={{ padding: 16 }}>
          <p className="small">
            Pas encore membre ?{' '}
            <Link className="linkbtn" href="/adherer">
              Découvrir REC 242 et adhérer
            </Link>
          </p>
        </div>
      )}
    </>
  )
}

/** Mot de passe oublié (lien d'une heure). */
export function FormulaireOubli({ action }: { action: Action }) {
  const [etat, agir, enCours] = useActionState(action, {})
  if (etat.ok) return <Envoye />
  return (
    <>
      <h1 className="h1">Mot de passe oublié</h1>
      <p className="muted">
        Indiquez l&apos;e-mail de votre compte : vous recevrez un lien valable une heure pour choisir un nouveau mot de passe.
      </p>
      <form action={agir} noValidate>
        <Champ id="mb-f" label="E-mail" name="email" type="email" autoComplete="email" required erreur={etat.erreurs?.email} />
        <button type="submit" className="rec-btn rec-btn--primary" disabled={enCours}>
          Envoyer le lien
        </button>
      </form>
      <Link className="linkbtn" href="/espace-membre/connexion">
        ← Retour à la connexion
      </Link>
    </>
  )
}

/** Indicateur de robustesse affiché sous le nouveau mot de passe. */
export const robustesse = (p: string): string => {
  if (!p) return '10 caractères minimum.'
  let score = 0
  if (p.length >= 10) score++
  if (p.length >= 14) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  const niveau = p.length < 10 ? 'insuffisante' : score >= 4 ? 'bonne' : score >= 3 ? 'moyenne' : 'faible'
  return `10 caractères minimum. Robustesse : ${niveau}.`
}

/** Activation (lien de 72 h) ou nouveau mot de passe (lien d'une heure). */
export function FormulaireMotDePasse({
  action,
  jeton,
  activation,
  annuaireParDefaut,
}: {
  action: Action
  jeton: string
  activation?: boolean
  annuaireParDefaut?: boolean
}) {
  const [etat, agir, enCours] = useActionState(action, {})
  const [mdp, setMdp] = useState('')
  return (
    <form action={agir} noValidate>
      {etat.erreur && (
        <p className="erreur" role="alert">
          {etat.erreur}
        </p>
      )}
      <input type="hidden" name="jeton" value={jeton} />
      <Champ
        id="mb-a1"
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
        value={mdp}
        onChange={(e) => setMdp(e.target.value)}
        aide={robustesse(mdp)}
        erreur={etat.erreurs?.password}
      />
      <Champ
        id="mb-a2"
        label="Confirmer le mot de passe"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        required
        erreur={etat.erreurs?.confirmation}
      />
      {activation && (
        <>
          <label className="check">
            <input type="checkbox" name="annuaire" defaultChecked={annuaireParDefaut} /> J&apos;accepte que ma fiche apparaisse dans
            l&apos;annuaire (révocable à tout moment)
          </label>
          <label className="check">
            <input type="checkbox" name="conditions" aria-describedby={etat.erreurs?.conditions ? 'mb-cond-err' : undefined} /> J&apos;accepte les{' '}
            <Link className="linkbtn" href="/conditions-utilisation" target="_blank" style={{ display: 'inline', padding: 0 }}>
              conditions d&apos;utilisation de l&apos;espace membre
            </Link>
          </label>
          {etat.erreurs?.conditions && (
            <span id="mb-cond-err" className="small" style={{ color: 'var(--text-danger)' }}>
              {etat.erreurs.conditions}
            </span>
          )}
        </>
      )}
      <button type="submit" className="rec-btn rec-btn--primary" disabled={enCours}>
        {activation ? 'Activer mon espace' : 'Choisir un nouveau mot de passe'}
      </button>
    </form>
  )
}

/** Lien d'activation expiré : bouton « Recevoir un nouveau lien ». */
export function NouveauLien({ action, jeton }: { action: Action; jeton: string }) {
  const [etat, agir, enCours] = useActionState(action, {})
  if (etat.ok) return <Envoye retour={false} />
  return (
    <form action={agir}>
      {etat.erreur && (
        <p className="erreur" role="alert">
          {etat.erreur}
        </p>
      )}
      <input type="hidden" name="jeton" value={jeton} />
      <button type="submit" className="rec-btn rec-btn--primary" disabled={enCours}>
        Recevoir un nouveau lien
      </button>
    </form>
  )
}
