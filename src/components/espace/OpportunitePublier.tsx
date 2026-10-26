'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useActionState, useEffect, useState } from 'react'

import { Toast } from '@/components/site/Toast'
import { proposerOpportunite } from '@/lib/opportunites/actions'
import { coordonneesDetectees, TYPES_OPPORTUNITE, typeLabel } from '@/lib/opportunites/regles'

export type ValeursPublier = {
  id?: number
  type: string
  titre: string
  description: string
  secteur: string
  visibilite: 'membres' | 'public'
  dateLimite: string
  commentRepondre: string
  pieceActuelle?: string
}

const CONTACTS = ['Par le formulaire de réponse de l’espace membre', 'Par WhatsApp', 'Par e-mail']
const ETAPES = ['Description', 'Visibilité et date limite', 'Relecture']

/** « Publier une opportunité » (écran membre 06) : trois étapes sur la même page. */
export function OpportunitePublier({ init, secteurs, aujourdhui }: { init: ValeursPublier; secteurs: { id: number; nom: string }[]; aujourdhui: string }) {
  const router = useRouter()
  const [etape, setEtape] = useState(1)
  const [v, setV] = useState(init)
  const [fichier, setFichier] = useState('')
  const [local, setLocal] = useState<Record<string, string>>({})
  const [ferme, setFerme] = useState(false)
  const [etat, envoyer, enCours] = useActionState(proposerOpportunite, {})
  const maj = (k: keyof ValeursPublier, val: string) => setV((x) => ({ ...x, [k]: val }))
  const erreurs = { ...local, ...(etat.erreurs ?? {}) }
  const secteurNom = secteurs.find((s) => String(s.id) === v.secteur)?.nom ?? 'Tous secteurs'
  const coords = coordonneesDetectees(v.titre, v.description, v.commentRepondre)

  useEffect(() => {
    if (!etat.ok) return
    const t = setTimeout(() => router.push('/espace-membre/opportunites'), 1600)
    return () => clearTimeout(t)
  }, [etat.ok, router])

  const continuer1 = () => {
    const e: Record<string, string> = {}
    if (!v.titre.trim()) e.titre = 'Indiquez un titre.'
    if (v.description.trim().length < 20) e.description = 'Décrivez votre annonce (20 caractères au moins).'
    setLocal(e)
    if (!Object.keys(e).length) setEtape(2)
  }
  const continuer2 = () => {
    const e: Record<string, string> = {}
    if (!v.dateLimite) e.dateLimite = 'La date limite est obligatoire.'
    else if (v.dateLimite < aujourdhui) e.dateLimite = 'La date limite doit être aujourd’hui ou plus tard.'
    setLocal(e)
    if (!Object.keys(e).length) setEtape(3)
  }
  const champ = (k: string) => `rec-field${erreurs[k] ? ' rec-field--error' : ''}`
  const err = (k: string) => erreurs[k] && <span className="rec-error">{erreurs[k]}</span>

  return (
    <form className="card" style={{ maxWidth: 760 }} action={envoyer} noValidate>
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <div className="steps">
        {ETAPES.map((t, i) => (
          <div key={t} className={`step ${etape > i + 1 ? 'is-done' : etape === i + 1 ? 'is-on' : ''}`} aria-current={etape === i + 1 ? 'step' : undefined}>
            <i>{i + 1}</i>
            <span>{t}</span>
          </div>
        ))}
      </div>

      <div className="stack" style={{ gap: 14 }} hidden={etape !== 1}>
        <h2 className="h2">Décrivez votre opportunité</h2>
        <div className="rec-field">
          <label htmlFor="mb-p-type">Type</label>
          <select id="mb-p-type" name="type" className="rec-input" value={v.type} onChange={(e) => maj('type', e.target.value)}>
            {TYPES_OPPORTUNITE.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className={champ('titre')}>
          <label htmlFor="mb-p-t">Titre</label>
          <input id="mb-p-t" name="titre" className="rec-input" type="text" maxLength={160} placeholder="Recherche d'un partenaire de distribution" value={v.titre} onChange={(e) => maj('titre', e.target.value)} />
          {err('titre')}
        </div>
        <div className={champ('description')}>
          <label htmlFor="mb-p-d">Description</label>
          <textarea id="mb-p-d" name="description" className="rec-input" value={v.description} onChange={(e) => maj('description', e.target.value)} />
          {err('description')}
        </div>
        <div className="rec-field">
          <label htmlFor="mb-p-s">Secteur</label>
          <select id="mb-p-s" name="secteur" className="rec-input" value={v.secteur} onChange={(e) => maj('secteur', e.target.value)}>
            {secteurs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
            <option value="">Tous secteurs</option>
          </select>
        </div>
        <button type="button" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} onClick={continuer1}>
          Continuer
        </button>
      </div>

      <div className="stack" style={{ gap: 14 }} hidden={etape !== 2}>
        <h2 className="h2">Visibilité et date limite</h2>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Visibilité</legend>
          <div className="g2">
            {(
              [
                ['membres', 'Membres uniquement', 'Visible dans l’espace membre'],
                ['public', 'Public', 'Aussi sur le site, après validation'],
              ] as const
            ).map(([val, t, d]) => (
              <label key={val} className={`opt${v.visibilite === val ? ' is-on' : ''}`}>
                <input type="radio" name="visibilite" value={val} checked={v.visibilite === val} onChange={() => maj('visibilite', val)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                <span className="dot" />
                <span>
                  <b>{t}</b>
                  <br />
                  <span className="small muted">{d}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className={champ('dateLimite')}>
          <label htmlFor="mb-p-l">Date limite (obligatoire)</label>
          <input id="mb-p-l" name="dateLimite" className="rec-input" type="date" min={aujourdhui} value={v.dateLimite} onChange={(e) => maj('dateLimite', e.target.value)} />
          <span className="rec-help">L&apos;annonce passe automatiquement en « Expirée » le lendemain.</span>
          {err('dateLimite')}
        </div>
        <div className={champ('pieceJointe')}>
          <label htmlFor="mb-p-pj">Pièce jointe (PDF, JPEG ou PNG, 5 Mo)</label>
          <input id="mb-p-pj" name="pieceJointe" type="file" className="rec-input" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFichier(e.target.files?.[0]?.name ?? '')} />
          {init.pieceActuelle && !fichier && <span className="rec-help">Pièce jointe actuelle : {init.pieceActuelle}</span>}
          {err('pieceJointe')}
        </div>
        <div className="rec-field">
          <label htmlFor="mb-p-c">Comment vous joindre</label>
          <select id="mb-p-c" name="commentRepondre" className="rec-input" value={v.commentRepondre} onChange={(e) => maj('commentRepondre', e.target.value)}>
            {CONTACTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <button type="button" className="rec-btn rec-btn--ghost" onClick={() => setEtape(1)}>
            ← Retour
          </button>
          <button type="button" className="rec-btn rec-btn--primary" onClick={continuer2}>
            Continuer
          </button>
        </div>
      </div>

      <div className="stack" style={{ gap: 14 }} hidden={etape !== 3}>
        <h2 className="h2">Relisez avant d&apos;envoyer</h2>
        <div className="card-soft">
          <span className="tag">{typeLabel(v.type)}</span>
          <p className="h3">{v.titre}</p>
          <p className="small muted" style={{ whiteSpace: 'pre-line' }}>
            {v.description}
          </p>
          <p className="small muted">
            {secteurNom} · {v.visibilite === 'public' ? 'Public' : 'Membres uniquement'} · date limite{' '}
            {v.dateLimite ? new Date(`${v.dateLimite}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''} · {v.commentRepondre}
          </p>
          {(fichier || init.pieceActuelle) && <p className="small muted">Pièce jointe : {fichier || init.pieceActuelle}</p>}
        </div>
        {coords.length > 0 && (
          <p className="erreur" role="status">
            Le texte semble contenir : {coords.join(', ')}. Le modérateur vous demandera de le retirer : les réponses passent par le formulaire de l&apos;espace membre.
          </p>
        )}
        <p className="small muted">Votre annonce sera relue par la commission B2B et Opportunités avant publication.</p>
        {etat.erreur && (
          <p className="erreur" role="alert">
            {etat.erreur}
          </p>
        )}
        <div className="row">
          <button type="button" className="rec-btn rec-btn--ghost" onClick={() => setEtape(2)}>
            ← Modifier
          </button>
          <button type="submit" className="rec-btn rec-btn--primary" disabled={enCours || !!etat.ok}>
            Envoyer pour publication
          </button>
          <Link className="linkbtn" href="/espace-membre/opportunites">
            Annuler
          </Link>
        </div>
      </div>
      <Toast message={etat.ok && !ferme ? 'Annonce envoyée pour modération. Vous serez prévenu dès sa mise en ligne.' : ''} onClose={() => setFerme(true)} />
    </form>
  )
}
