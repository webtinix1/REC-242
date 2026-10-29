'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useActionState, useEffect, useRef, useState, useTransition } from 'react'

import type { Retour } from '@/app/(espace-membre)/espace-membre/(app)/actions'
import { Toast } from '@/components/site/Toast'
import type { EtatEchange } from '@/lib/echanges/actions'
import { Icone } from './Icones'
import { robustesse } from './Connexion'

type FormAction = (r: Retour, f: FormData) => Promise<Retour>
type Bascule = (nom: string, valeur: boolean) => Promise<Retour>
type Simple = () => Promise<Retour>

export type DonneesProfil = {
  nom: string
  ini: string
  photo?: string
  logo?: string
  entreprise?: string
  categorie: string
  completude: number
  libres: { presentation: string; enRelecture: boolean; services: string; siteWeb: string; linkedin: string; facebook: string }
  verifies: { champ: string; label: string; valeur: string }[]
  demandes: { id: number; texte: string; date: string; statut: string; cls: string }[]
  visibilite: { name: string; label: string; on: boolean }[]
  commissions: { id: number; nom: string; detail: string }[]
  commissionsEnAttente: { id: number; nom: string; detail: string }[]
  commissionsOuvertes: { id: number; nom: string }[]
  notifications: { name: string; label: string; canal: string; on: boolean }[]
  derniereConnexion: string
}

type Actions = {
  enregistrerFiche: FormAction
  demanderModification: FormAction
  changerImage: FormAction
  changerMotDePasse: FormAction
  changerVisibilite: Bascule
  changerNotification: Bascule
  deconnecterAppareils: Simple
  demanderSuppression: Simple
  demanderCommission: (r: EtatEchange, f: FormData) => Promise<EtatEchange>
}

function Erreur({ id, texte }: { id: string; texte?: string }) {
  return texte ? (
    <span id={id} className="rec-error">
      {texte}
    </span>
  ) : null
}

function Interrupteurs({
  items,
  action,
  etat,
  toast,
  espaces,
}: {
  items: { name: string; label: string; sous: string; on: boolean }[]
  /** Lignes séparées par l'espacement de la carte (notifications). */
  espaces?: boolean
  action: Bascule
  etat?: (on: boolean) => string
  toast: (m: string) => void
}) {
  const [valeurs, setValeurs] = useState(() => Object.fromEntries(items.map((i) => [i.name, i.on])))
  const [, demarrer] = useTransition()
  return (
    <div style={espaces ? { display: 'flex', flexDirection: 'column', gap: 14 } : undefined}>
      {items.map((i) => {
        const on = valeurs[i.name]
        return (
          <button
            key={i.name}
            type="button"
            className={`sw ${on ? 'is-on' : ''}`}
            role="switch"
            aria-checked={on}
            onClick={() => {
              const v = !on
              setValeurs((x) => ({ ...x, [i.name]: v }))
              demarrer(async () => {
                const r = await action(i.name, v)
                if (r.erreur) {
                  setValeurs((x) => ({ ...x, [i.name]: !v }))
                  toast(r.erreur)
                }
              })
            }}
          >
            <span>
              {i.label}
              <br />
              <span className="xs muted">{etat ? etat(on) : i.sous}</span>
            </span>
            <span className="knob" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

function ChoixImage({ cible, libelle, action, toast }: { cible: 'photo' | 'logo'; libelle: string; action: FormAction; toast: (m: string) => void }) {
  const [etat, agir, enCours] = useActionState(action, {})
  const form = useRef<HTMLFormElement>(null)
  const router = useRouter()
  useEffect(() => {
    if (etat.ok) {
      toast(etat.ok)
      router.refresh()
    } else if (etat.erreur) toast(etat.erreur)
  }, [etat, toast, router])
  return (
    <form ref={form} action={agir}>
      <input type="hidden" name="cible" value={cible} />
      <label className="rec-btn rec-btn--secondary" aria-disabled={enCours}>
        {libelle}
        <input
          className="cache"
          type="file"
          name="fichier"
          accept="image/jpeg,image/png,image/webp"
          onChange={() => form.current?.requestSubmit()}
        />
      </label>
    </form>
  )
}

export function Profil({ d, a }: { d: DonneesProfil; a: Actions }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const toast = React.useCallback((m: string) => setMessage(m), [])

  const [fiche, enregistrer, ficheEnCours] = useActionState(a.enregistrerFiche, {})
  const [demande, envoyerDemande, demandeEnCours] = useActionState(a.demanderModification, {})
  const [mdp, changerMdp, mdpEnCours] = useActionState(a.changerMotDePasse, {})
  const [ouverture, setOuverture] = useState<Retour | null>(null)
  const [champ, setChamp] = useState(d.verifies[d.verifies.length - 1]?.champ ?? 'email')
  const [pwOpen, setPwOpen] = useState(false)
  const [nouveau, setNouveau] = useState('')
  const [donnees, setDonnees] = useState<'' | 'del' | 'ok'>('')
  const [msgDonnees, setMsgDonnees] = useState('')
  const [, demarrer] = useTransition()
  const [comOuvert, setComOuvert] = useState(false)
  const [comChoisie, setComChoisie] = useState(d.commissionsOuvertes[0]?.id ?? 0)
  const [com, setCom] = useState<EtatEchange>({})
  const [comEnCours, demarrerCom] = useTransition()
  const [comEnvoyee, setComEnvoyee] = useState('')
  const envoyerCom = (f: FormData) =>
    demarrerCom(async () => {
      const r = await a.demanderCommission({}, f)
      setCom(r)
      if (r.ok) {
        setComEnvoyee(d.commissionsOuvertes.find((c) => c.id === comChoisie)?.nom ?? '')
        setComOuvert(false)
        router.refresh()
      }
    })

  useEffect(() => {
    if (demande.ok) router.refresh()
  }, [demande, router])


  const actuel = d.verifies.find((v) => v.champ === champ)
  // Le formulaire se ferme dès que la demande ouverte a été acceptée par le serveur.
  const demandeEnvoyee = Boolean(demande.ok) && demande !== ouverture
  const formDemande = ouverture !== null && !demandeEnvoyee

  return (
    <>
      <div className="card-soft" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
        <span className={`av av-xl ${d.photo ? 'av-photo' : ''}`}>
          {d.ini}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {d.photo && <img src={d.photo} alt={d.nom} />}
        </span>
        {d.logo && (
          <span className="logo-tile logo-tile-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.logo} alt={`Logo ${d.entreprise ?? ''}`} />
          </span>
        )}
        <div className="grow stack-s">
          <p className="h2">{d.nom}</p>
          <p className="small muted">
            {d.entreprise} · {d.categorie}
          </p>
          <div className="row">
            <ChoixImage cible="photo" libelle="Changer la photo" action={a.changerImage} toast={toast} />
            <ChoixImage cible="logo" libelle="Ajouter un logo" action={a.changerImage} toast={toast} />
          </div>
        </div>
        <div className="stack-s" style={{ minWidth: 180 }}>
          <span className="small">Profil complété à {d.completude} %</span>
          <div className="bar" role="progressbar" aria-label="Complétude du profil" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.completude}>
            <span style={{ width: `${d.completude}%` }} />
          </div>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <form className="card" action={enregistrer} noValidate>
            <h2 className="h3">Ce que vous modifiez vous-même</h2>
            <p className="small muted">Ces informations apparaissent sur votre fiche dans l&apos;annuaire.</p>
            <div className={`rec-field${fiche.erreurs?.presentation ? ' rec-field--error' : ''}`}>
              <label htmlFor="pf-pres">Présentation de l’activité</label>
              <input id="pf-pres" name="presentation" className="rec-input" type="text" defaultValue={d.libres.presentation} placeholder="À compléter" />
              {d.libres.enRelecture && <span className="rec-help">En relecture par le secrétariat avant publication.</span>}
              <Erreur id="pf-pres-err" texte={fiche.erreurs?.presentation} />
            </div>
            <div className={`rec-field${fiche.erreurs?.services ? ' rec-field--error' : ''}`}>
              <label htmlFor="pf-serv">Services proposés</label>
              <input id="pf-serv" name="services" className="rec-input" type="text" defaultValue={d.libres.services} placeholder="À compléter" />
              <Erreur id="pf-serv-err" texte={fiche.erreurs?.services} />
            </div>
            {(
              [
                ['siteWeb', 'Site internet'],
                ['linkedin', 'LinkedIn'],
                ['facebook', 'Facebook'],
              ] as const
            ).map(([k, l]) => (
              <div key={k} className={`rec-field${fiche.erreurs?.[k] ? ' rec-field--error' : ''}`}>
                <label htmlFor={`pf-${k}`}>{l}</label>
                <input id={`pf-${k}`} name={k} className="rec-input" type="url" inputMode="url" defaultValue={d.libres[k]} placeholder="À compléter" />
                <Erreur id={`pf-${k}-err`} texte={fiche.erreurs?.[k]} />
              </div>
            ))}
            {fiche.erreur && <p className="erreur">{fiche.erreur}</p>}
            <div className="row">
              <button type="submit" className="rec-btn rec-btn--primary" disabled={ficheEnCours}>
                Enregistrer
              </button>
              {fiche.ok && !ficheEnCours && <span className="rec-badge rec-badge--active">Modifications enregistrées</span>}
            </div>
          </form>

          <div className="card">
            <h2 className="h3">Informations vérifiées</h2>
            <p className="small muted">
              Ces champs sont vérifiés par le responsable membres. Pour les changer, envoyez une demande : l&apos;historique est conservé.
            </p>
            <div>
              {d.verifies.map((f) => (
                <div className="lock" key={f.champ}>
                  <span className="row" style={{ gap: 8 }}>
                    <Icone nom="lock" className="ic" />
                    {f.label}
                  </span>
                  <span className="muted">{f.valeur}</span>
                </div>
              ))}
            </div>
            {!formDemande && !demandeEnvoyee && (
              <button type="button" className="rec-btn rec-btn--secondary" style={{ width: 'max-content' }} onClick={() => setOuverture(demande)}>
                Demander une modification
              </button>
            )}
            {formDemande && (
              <form
                className="blk"
                action={envoyerDemande}
                noValidate
              >
                <div className="rec-field">
                  <span className="small" style={{ fontWeight: 600 }} id="pf-champ-l">
                    Champ à modifier
                  </span>
                  <div className="chips" role="radiogroup" aria-labelledby="pf-champ-l">
                    {d.verifies.map((x) => (
                      <button
                        key={x.champ}
                        type="button"
                        role="radio"
                        aria-checked={champ === x.champ}
                        className={`chip chip-sm ${champ === x.champ ? 'is-on' : ''}`}
                        onClick={() => setChamp(x.champ)}
                      >
                        {x.label}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="champ" value={champ} />
                </div>
                <div className="rec-field">
                  <label htmlFor="mb-rv">Valeur actuelle</label>
                  <input id="mb-rv" className="rec-input" type="text" value={actuel?.valeur ?? ''} readOnly />
                </div>
                <div className={`rec-field${demande.erreurs?.nouvelleValeur ? ' rec-field--error' : ''}`}>
                  <label htmlFor="mb-rn">Nouvelle valeur</label>
                  <input id="mb-rn" name="nouvelleValeur" className="rec-input" type="text" required />
                  <Erreur id="mb-rn-err" texte={demande.erreurs?.nouvelleValeur} />
                </div>
                <div className="rec-field">
                  <label htmlFor="mb-rm">Motif</label>
                  <input id="mb-rm" name="motif" className="rec-input" type="text" />
                </div>
                <div className={`rec-field${demande.erreurs?.justificatif ? ' rec-field--error' : ''}`}>
                  <label htmlFor="mb-rj">Justificatif, si nécessaire</label>
                  <input id="mb-rj" name="justificatif" className="rec-input drop" type="file" accept="application/pdf,image/jpeg,image/png" />
                  <Erreur id="mb-rj-err" texte={demande.erreurs?.justificatif} />
                </div>
                <div className="row">
                  <button type="submit" className="rec-btn rec-btn--primary" disabled={demandeEnCours}>
                    Envoyer la demande
                  </button>
                  <button type="button" className="linkbtn" onClick={() => setOuverture(null)}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
            {demande.erreur && (
              <p className="erreur" role="alert">
                {demande.erreur}
              </p>
            )}
            {demandeEnvoyee && (
              <div className="okbox" role="status">
                <span className="rec-badge rec-badge--pending">Demande envoyée</span>
                <p className="small">
                  Le responsable membres vérifie votre demande : réponse sous 5 jours ouvrés, par e-mail. La valeur actuelle reste affichée
                  jusque-là.
                </p>
              </div>
            )}
            <p className="small" style={{ fontWeight: 600, marginTop: 6 }}>
              Mes demandes
            </p>
            {d.demandes.length ? (
              d.demandes.map((r) => (
                <div className="item" key={r.id}>
                  <div className="grow">
                    <p className="small" style={{ fontWeight: 600 }}>
                      {r.texte}
                    </p>
                    <p className="xs muted">{r.date}</p>
                  </div>
                  <span className={`rec-badge rec-badge--${r.cls}`}>{r.statut}</span>
                </div>
              ))
            ) : (
              <p className="xs muted">Aucune demande pour le moment.</p>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h2 className="h3">Visibilité de ma fiche</h2>
            <Interrupteurs
              items={d.visibilite.map((v) => ({ ...v, sous: '' }))}
              action={a.changerVisibilite}
              etat={(on) => (on ? 'Activé' : 'Désactivé')}
              toast={toast}
            />
            <p className="xs muted">
              Le consentement à la publication dans l&apos;annuaire est révocable à tout moment. Vos coordonnées ne sont jamais visibles du public.
            </p>
          </div>

          <div className="card">
            <h2 className="h3">Mes commissions</h2>
            {d.commissions.length ? (
              d.commissions.map((c) => (
                <div className="item" key={c.id}>
                  <div className="grow">
                    <p style={{ fontWeight: 600 }}>Commission {c.nom}</p>
                    {c.detail && <p className="xs muted">{c.detail}</p>}
                  </div>
                  <span className="rec-badge rec-badge--active">Membre</span>
                </div>
              ))
            ) : d.commissionsEnAttente.length ? null : (
              <p className="small muted">Vous ne faites partie d&apos;aucune commission pour le moment.</p>
            )}
            {d.commissionsEnAttente.map((c) => (
              <div className="item" key={`att-${c.id}`}>
                <div className="grow">
                  <p style={{ fontWeight: 600 }}>Commission {c.nom}</p>
                  <p className="xs muted">{c.detail}</p>
                </div>
                <span className="rec-badge rec-badge--pending">En attente</span>
              </div>
            ))}
            {d.commissionsOuvertes.length > 0 && (
              <button type="button" className="linkbtn" aria-expanded={comOuvert} onClick={() => setComOuvert((v) => !v)}>
                + Rejoindre une autre commission
              </button>
            )}
            {comOuvert && (
              <form className="blk" action={envoyerCom} noValidate>
                <div className="rec-field">
                  <label htmlFor="mb-cj">Commission</label>
                  <select id="mb-cj" name="commission" className="rec-input" value={comChoisie} onChange={(e) => setComChoisie(Number(e.target.value))}>
                    {d.commissionsOuvertes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`rec-field${com.erreurs?.apport ? ' rec-field--error' : ''}`}>
                  <label htmlFor="mb-cm">Ce que vous pouvez apporter</label>
                  <textarea id="mb-cm" name="apport" className="rec-input" required />
                  <Erreur id="mb-cm-err" texte={com.erreurs?.apport} />
                </div>
                {com.erreur && <p className="erreur">{com.erreur}</p>}
                <div className="row">
                  <button type="submit" className="rec-btn rec-btn--primary" disabled={comEnCours}>
                    Envoyer ma demande
                  </button>
                  <button type="button" className="linkbtn" onClick={() => setComOuvert(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
            {comEnvoyee && (
              <div className="okbox" role="status">
                <span className="rec-badge rec-badge--pending">Demande envoyée</span>
                <p className="small">Le responsable de la commission {comEnvoyee} vous répond après sa prochaine réunion.</p>
              </div>
            )}
            <p className="xs muted">
              La commission Éthique et Vérification n&apos;est pas ouverte aux candidatures : ses membres sont désignés par le comité de direction.
            </p>
          </div>

          <div className="card">
            <h2 className="h3">Notifications</h2>
            <Interrupteurs items={d.notifications.map((n) => ({ ...n, sous: n.canal }))} action={a.changerNotification} toast={toast} espaces />
          </div>

          <div className="card">
            <h2 className="h3">Sécurité</h2>
            <button type="button" className="linkbtn" onClick={() => setPwOpen((v) => !v)} aria-expanded={pwOpen}>
              Changer mon mot de passe
            </button>
            {pwOpen && !mdp.ok && (
              <form className="blk" action={changerMdp} noValidate>
                <div className={`rec-field${mdp.erreurs?.ancien ? ' rec-field--error' : ''}`}>
                  <label htmlFor="mb-p0">Mot de passe actuel</label>
                  <input id="mb-p0" name="ancien" className="rec-input" type="password" autoComplete="current-password" required />
                  <Erreur id="mb-p0-err" texte={mdp.erreurs?.ancien} />
                </div>
                <div className={`rec-field${mdp.erreurs?.nouveau ? ' rec-field--error' : ''}`}>
                  <label htmlFor="mb-p1">Nouveau mot de passe</label>
                  <input
                    id="mb-p1"
                    name="nouveau"
                    className="rec-input"
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    required
                    value={nouveau}
                    onChange={(e) => setNouveau(e.target.value)}
                  />
                  {mdp.erreurs?.nouveau ? <Erreur id="mb-p1-err" texte={mdp.erreurs.nouveau} /> : <span className="rec-help">{robustesse(nouveau)}</span>}
                </div>
                <div className={`rec-field${mdp.erreurs?.confirmation ? ' rec-field--error' : ''}`}>
                  <label htmlFor="mb-p2">Confirmer</label>
                  <input id="mb-p2" name="confirmation" className="rec-input" type="password" autoComplete="new-password" required />
                  <Erreur id="mb-p2-err" texte={mdp.erreurs?.confirmation} />
                </div>
                {mdp.erreur && <p className="erreur">{mdp.erreur}</p>}
                <button type="submit" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} disabled={mdpEnCours}>
                  Enregistrer le mot de passe
                </button>
              </form>
            )}
            {mdp.ok && (
              <div className="okbox" role="status">
                <span className="rec-badge rec-badge--active">Mot de passe changé</span>
                <p className="small">Vos autres appareils devront se reconnecter.</p>
              </div>
            )}
            <button
              type="button"
              className="linkbtn"
              onClick={() =>
                demarrer(async () => {
                  const r = await a.deconnecterAppareils()
                  toast(r.ok ?? r.erreur ?? '')
                })
              }
            >
              Me déconnecter de tous les appareils
            </button>
            <p className="xs muted">
              {d.derniereConnexion ? `Dernière connexion : ${d.derniereConnexion}. ` : ''}Déconnexion automatique après 30 minutes sans activité.
            </p>
            <Link className="linkbtn" href="/conditions-utilisation">
              Conditions d&apos;utilisation de l&apos;espace membre
            </Link>
          </div>

          <div className="card">
            <h2 className="h3">Mes données</h2>
            <p className="small muted">
              Vous pouvez consulter, corriger ou faire supprimer vos données personnelles (
              <Link href="/confidentialite" style={{ color: 'var(--text-brand)', textDecoration: 'underline' }}>
                politique de confidentialité
              </Link>
              ).
            </p>
            <a className="linkbtn" href="/espace-membre/mes-donnees" download>
              Télécharger mes données
            </a>
            {donnees !== 'ok' && (
              <button type="button" className="linkbtn danger" onClick={() => setDonnees('del')}>
                Demander la suppression de mon compte
              </button>
            )}
            {donnees === 'del' && (
              <div className="blk">
                <p className="small">
                  La suppression retire votre fiche de l&apos;annuaire et ferme votre espace. Les reçus de paiement sont conservés le temps exigé par la
                  loi. Votre adhésion prend fin : c&apos;est l&apos;équivalent d&apos;une démission écrite.
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="rec-btn rec-btn--secondary"
                    onClick={() =>
                      demarrer(async () => {
                        const r = await a.demanderSuppression()
                        setMsgDonnees(r.ok ?? r.erreur ?? '')
                        setDonnees('ok')
                      })
                    }
                  >
                    Confirmer ma demande
                  </button>
                  <button type="button" className="linkbtn" onClick={() => setDonnees('')}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
            {donnees === 'ok' && (
              <div className="okbox" role="status">
                <span className="rec-badge rec-badge--active">C&apos;est noté</span>
                <p className="small">{msgDonnees}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </>
  )
}
