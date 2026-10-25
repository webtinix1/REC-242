'use client'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

const CATEGORIES = [
  ['A', 'A · Individuel, informel, porteur de projet'],
  ['B', 'B · Établissement, commerçant formalisé'],
  ['C', 'C · Entreprise, société'],
  ['expert', 'Expert'],
  ['partenaire', 'Partenaire'],
  ['honneur', 'Membre d’honneur'],
]

type Props = {
  children: React.ReactNode
  localites: { id: number; nom: string }[]
  peutSaisir: boolean
  peutEncaisser: boolean
}

const erreurApi = async (r: Response) => {
  const j = (await r.json().catch(() => ({}))) as {
    errors?: { message: string }[]
    erreurs?: Record<string, string>
  }
  return { message: j.errors?.[0]?.message, erreurs: j.erreurs }
}

/** Barre de l'écran 03 (filtres, export, saisie papier) et panneau « Candidature papier ». */
export const BarreCandidatures = ({ children, localites, peutSaisir, peutEncaisser }: Props) => {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(false)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState('')
  const [ok, setOk] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [lieu, setLieu] = useState('Passage au siège')

  const enregistrer = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const form = ev.currentTarget
    const f = new FormData(form)
    setEnvoi(true)
    setErreurs({})
    setGeneral('')
    setOk('')
    try {
      let bulletin: number | undefined
      const fichier = f.get('bulletin') as File | null
      if (fichier && fichier.size) {
        const up = new FormData()
        up.append('file', fichier)
        up.append('_payload', JSON.stringify({ type: 'bulletin' }))
        const r = await fetch('/api/pieces', { method: 'POST', body: up, credentials: 'include' })
        if (!r.ok)
          throw new Error((await erreurApi(r)).message || 'Le bulletin n’a pas pu être enregistré.')
        bulletin = ((await r.json()) as { doc: { id: number } }).doc.id
      }
      const montant = Number(f.get('montant') || 0)
      const r = await fetch('/api/applications/papier', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomComplet: f.get('nomComplet'),
          telephone: f.get('telephone'),
          email: f.get('email'),
          raisonSociale: f.get('raisonSociale'),
          categorie: f.get('categorie'),
          localite: Number(f.get('localite')),
          secteurs: f.get('secteurs'),
          lieu: lieu === 'evenement' ? f.get('evenement') : lieu,
          consentement: f.get('consentement') === 'on',
          bulletin,
          paiement: montant
            ? { montant, mode: f.get('mode'), reference: f.get('reference') }
            : undefined,
        }),
      })
      if (!r.ok) {
        const e = await erreurApi(r)
        if (e.erreurs) setErreurs(e.erreurs)
        else setGeneral(e.message || 'Le dossier n’a pas pu être enregistré.')
        return
      }
      const j = (await r.json()) as { numero: string }
      setOk(
        `Dossier ${j.numero} créé au statut « Reçue ». Aucun doublon trouvé. Un e-mail de confirmation a été envoyé au candidat.`,
      )
      form.reset()
      router.refresh()
    } catch (e) {
      setGeneral((e as Error).message)
    } finally {
      setEnvoi(false)
    }
  }

  const champ = (
    id: string,
    name: string,
    lib: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className={`rec-field${erreurs[name] ? ' rec-field--error-true' : ''}`}>
      <label htmlFor={id}>{lib}</label>
      <input
        id={id}
        name={name}
        className="rec-input"
        aria-invalid={Boolean(erreurs[name])}
        {...props}
      />
      {erreurs[name] && <span className="rec-error">{erreurs[name]}</span>}
    </div>
  )

  return (
    <>
      <div className="bar-actions">
        <div className="chips">{children}</div>
        <div className="rec-row">
          {/* Téléchargement d’un fichier CSV : lien simple, pas une navigation de page. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="rec-btn rec-btn--secondary" href="/api/applications/export">
            Exporter
          </a>
          {peutSaisir && (
            <button
              type="button"
              className="rec-btn rec-btn--primary"
              onClick={() => setOuvert(true)}
              aria-expanded={ouvert}
            >
              Saisir une candidature papier
            </button>
          )}
        </div>
      </div>
      {ouvert && (
        <section className="panel paper" aria-label="Candidature papier">
          <div className="panel-h">
            <div>
              <h2 className="h2">Candidature papier</h2>
              <p className="small muted">
                Bulletin rempli à la main lors d’un événement ou au siège. Les mêmes contrôles
                s’appliquent : anti-doublon, trois secteurs au maximum.
              </p>
            </div>
            <button type="button" className="linkbtn" onClick={() => setOuvert(false)}>
              Fermer
            </button>
          </div>
          <form onSubmit={enregistrer} noValidate className="stack" style={{ gap: 16 }}>
            {general && (
              <div className="err" role="alert">
                {general}
              </div>
            )}
            <div className="form">
              {champ('bb-pn', 'nomComplet', 'Nom et prénom', { type: 'text' })}
              {champ('bb-pt', 'telephone', 'Téléphone ou WhatsApp', {
                type: 'tel',
                placeholder: '+242',
              })}
              {champ('bb-pe', 'email', 'E-mail', { type: 'email' })}
              {champ('bb-pr', 'raisonSociale', 'Activité ou raison sociale', { type: 'text' })}
              <div className="rec-field">
                <label htmlFor="bb-pc">Catégorie</label>
                <select id="bb-pc" name="categorie" className="rec-input" defaultValue="A">
                  {CATEGORIES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rec-field">
                <label htmlFor="bb-pv">Ville</label>
                <select id="bb-pv" name="localite" className="rec-input">
                  {localites.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom}
                    </option>
                  ))}
                </select>
              </div>
              {champ('bb-ps', 'secteurs', 'Secteurs (3 au maximum)', {
                type: 'text',
                placeholder: 'Artisanat, BTP',
              })}
              <div className="rec-field">
                <label htmlFor="bb-pl">Reçu lors de</label>
                <select
                  id="bb-pl"
                  className="rec-input"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                >
                  <option value="Passage au siège">Passage au siège</option>
                  <option value="evenement">Un événement</option>
                </select>
              </div>
              {lieu === 'evenement' && champ('bb-pev', 'evenement', 'Événement', { type: 'text' })}
              <div className="rec-field full">
                <label htmlFor="bb-pb">Bulletin signé</label>
                <input
                  id="bb-pb"
                  name="bulletin"
                  className="rec-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ paddingTop: 10 }}
                />
                <span className="rec-help">PDF, JPG ou PNG, 5 Mo maximum.</span>
              </div>
              {peutEncaisser && (
                <>
                  {champ('bb-pm', 'montant', 'Paiement reçu à la saisie (FCFA, facultatif)', {
                    type: 'number',
                    min: 0,
                    inputMode: 'numeric',
                  })}
                  <div className="rec-field">
                    <label htmlFor="bb-pmo">Mode</label>
                    <select id="bb-pmo" name="mode" className="rec-input" defaultValue="especes">
                      <option value="especes">Espèces, au siège</option>
                      <option value="virement">Virement</option>
                      <option value="mtn">MTN MoMo</option>
                      <option value="airtel">Airtel Money</option>
                    </select>
                  </div>
                  {champ('bb-pref', 'reference', 'Numéro de souche ou référence', { type: 'text' })}
                </>
              )}
            </div>
            <label className="check-inline">
              <input type="checkbox" name="consentement" /> Consentement et charte signés sur le
              bulletin papier
            </label>
            {erreurs.consentement && <span className="rec-error">{erreurs.consentement}</span>}
            {erreurs.paiement && <span className="rec-error">{erreurs.paiement}</span>}
            {ok && (
              <div className="ok" role="status">
                {ok}
              </div>
            )}
            <div className="rec-row">
              <button type="submit" className="rec-btn rec-btn--primary" disabled={envoi}>
                {envoi ? 'Enregistrement…' : 'Enregistrer le dossier'}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  )
}
