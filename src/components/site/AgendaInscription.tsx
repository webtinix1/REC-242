'use client'
import Link from 'next/link'
import React, { startTransition, useActionState } from 'react'

import { inscrireMembre, inscrireVisiteur, type EtatInscription } from '@/lib/evenements/actions'

/** Champ piège invisible (même nom que le formulaire de contact : `site_web`). */
const Piege = () => (
  <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
    <label htmlFor="ev_site_web">Ne pas remplir</label>
    <input id="ev_site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
  </div>
)

const Champ = ({ id, nom, label, type = 'text', erreur, ...rest }: { id: string; nom: string; label: string; type?: string; erreur?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className={`rec-field${erreur ? ' rec-field--error-true' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <input id={id} name={nom} className="rec-input" type={type} aria-invalid={Boolean(erreur)} aria-describedby={erreur ? `${id}-e` : undefined} {...rest} />
    {erreur && (
      <span className="rec-error" id={`${id}-e`}>
        {erreur}
      </span>
    )}
  </div>
)

/** Résultat d'une inscription : confirmation, ou liste d'attente avec la position. */
export const EtatReussite = ({ etat, slug }: { etat: EtatInscription; slug: string }) =>
  etat.statut === 'attente' ? (
    <>
      <span className="rec-badge rec-badge--pending">Liste d’attente, position {etat.position}</span>
      <p className="small">Si une place se libère, vous êtes inscrit automatiquement et prévenu par e-mail.</p>
    </>
  ) : (
    <>
      <span className="rec-badge rec-badge--active">Inscription confirmée</span>
      <p className="h-s" role="status">À bientôt !</p>
      <p className="small">Un e-mail de confirmation récapitule le rendez-vous. Rappel envoyé la veille par e-mail.</p>
      <a className="rec-btn rec-btn--secondary" href={`/agenda/${slug}/ics`}>
        Ajouter à mon calendrier (.ics)
      </a>
    </>
  )

/** Inscription d'un visiteur : nom, e-mail, WhatsApp, entreprise. La saisie reste en place en cas d'erreur. */
export const AgendaInscription = ({ evenement, slug, jeton, complet }: { evenement: number; slug: string; jeton: string; complet: boolean }) => {
  const [etat, action, envoi] = useActionState<EtatInscription, FormData>(inscrireVisiteur, {})
  const e = etat.erreurs ?? {}
  if (etat.ok) return <EtatReussite etat={etat} slug={slug} />
  return (
    <form
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault()
        const fd = new FormData(ev.currentTarget)
        startTransition(() => action(fd))
      }}
    >
      <input type="hidden" name="evenement" value={evenement} />
      <input type="hidden" name="jeton" value={jeton} />
      <Piege />
      {etat.general && (
        <div className="errbox" role="alert">
          <p>{etat.general}</p>
        </div>
      )}
      <Champ id="b-ev-nom" nom="nom" label="Nom et prénom" autoComplete="name" erreur={e.nom} />
      <Champ id="b-ev-mail" nom="email" label="E-mail" type="email" autoComplete="email" erreur={e.email} />
      <Champ id="b-ev-tel" nom="telephone" label="Téléphone WhatsApp" type="tel" placeholder="+242" autoComplete="tel" />
      <Champ id="b-ev-ent" nom="entreprise" label="Entreprise" autoComplete="organization" />
      <button type="submit" className="rec-btn rec-btn--primary" disabled={envoi}>
        {envoi ? 'Envoi…' : complet ? 'M’inscrire sur la liste d’attente' : 'M’inscrire'}
      </button>
      <p className="small muted">
        Déjà membre ? <Link prefetch={false} className="linkbtn" href={`/espace-membre/connexion?retour=/agenda/${slug}`}>Connectez-vous</Link> pour vous inscrire en un clic.
      </p>
    </form>
  )
}

/** « M'inscrire en un clic » pour un membre actif connecté. */
export const AgendaInscriptionMembre = ({ evenement, slug, complet }: { evenement: number; slug: string; complet: boolean }) => {
  const [etat, action, envoi] = useActionState<EtatInscription, FormData>(inscrireMembre, {})
  if (etat.ok) return <EtatReussite etat={etat} slug={slug} />
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault()
        const fd = new FormData(ev.currentTarget)
        startTransition(() => action(fd))
      }}
    >
      <input type="hidden" name="evenement" value={evenement} />
      {etat.general && (
        <div className="errbox" role="alert">
          <p>{etat.general}</p>
        </div>
      )}
      <button type="submit" className="rec-btn rec-btn--primary" disabled={envoi}>
        {envoi ? 'Envoi…' : complet ? 'M’inscrire sur la liste d’attente' : 'M’inscrire en un clic'}
      </button>
    </form>
  )
}
