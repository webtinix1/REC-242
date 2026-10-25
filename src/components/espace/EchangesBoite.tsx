'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState, useTransition } from 'react'

import { repondreRelation } from '@/app/(espace-membre)/espace-membre/(app)/annuaire/actions'
import { cloturerDemande, ecrire, lu } from '@/lib/echanges/actions'

export type OngletEchange = 'relations' | 'annonces' | 'experts' | 'reseau'

export type Bulle = { sens: 'in' | 'out'; qui: string; texte: string }
export type Coordonnees = { nom: string; telephone?: string; whatsapp?: string; email?: string }
export type Fil = {
  id: number
  qui: string
  ini: string
  photo?: string
  org: string
  date: string
  objet: string
  statut: string
  cls: string
  nonLu: boolean
  contexte: string
  bulles: Bulle[]
  /** Mise en relation reçue, en attente de décision. */
  decision?: { question: string; prenom: string }
  coordonnees?: Coordonnees | null
  peutEcrire: boolean
  peutCloturer: boolean
  lien?: string
}

type Props = { onglet: OngletEchange; base: string; fils: Fil[]; courant: number | null; ouvert: boolean; vide: string }

const href = (base: string, onglet: OngletEchange, id?: number) => `${base}?onglet=${onglet}${id ? `&id=${id}` : ''}`

function Avatar({ f, className = '' }: { f: { ini: string; photo?: string; qui: string }; className?: string }) {
  return (
    <span className={`av ${f.photo ? 'av-photo' : ''} ${className}`}>
      {f.ini}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {f.photo && <img src={f.photo} alt={f.qui} />}
    </span>
  )
}

/** Boîte « Mes échanges » (écran membre 10) : liste à gauche, conversation à droite (une colonne sur mobile). */
export function EchangesBoite({ onglet, base, fils, courant, ouvert, vide }: Props) {
  const actuel = fils.find((f) => f.id === courant) ?? null
  return (
    <div className="inbox" data-ouvert={ouvert && actuel ? 'true' : 'false'}>
      <div className="inbox-list" role="list" aria-label="Échanges">
        {fils.length === 0 && <p className="small muted" style={{ padding: 16 }}>{vide}</p>}
        {fils.map((f) => (
          <Link key={f.id} href={href(base, onglet, f.id)} scroll={false} className={`ib-item ${actuel?.id === f.id ? 'is-on' : ''}`} role="listitem" aria-current={actuel?.id === f.id ? 'true' : undefined}>
            <Avatar f={f} className="ib-av" />
            <span className="ib-txt">
              <span className="ib-top">
                <b>{f.qui}</b>
                <span className="xs muted">{f.date}</span>
              </span>
              <span className="ib-obj">{f.objet}</span>
              <span className="ib-meta">
                <span className={`rec-badge rec-badge--${f.cls}`}>{f.statut}</span>
              </span>
            </span>
            {f.nonLu && actuel?.id !== f.id && <span className="ib-dot" role="img" aria-label="Non lu" />}
          </Link>
        ))}
      </div>
      {actuel ? <Conversation key={`${onglet}:${actuel.id}`} onglet={onglet} base={base} f={actuel} explicite={ouvert} /> : <section className="card conv" />}
    </div>
  )
}

function Conversation({ onglet, base, f, explicite }: { onglet: OngletEchange; base: string; f: Fil; explicite: boolean }) {
  const router = useRouter()
  const [occupe, demarrer] = useTransition()
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string>()
  const [envoye, setEnvoye] = useState(false)
  const [decide, setDecide] = useState<'ok' | 'no' | null>(null)

  // Ouvrir un fil le marque comme lu (sur ordinateur, le premier fil est ouvert d'office).
  useEffect(() => {
    if (!f.nonLu) return
    if (!explicite && !window.matchMedia('(min-width: 761px)').matches) return
    void lu(onglet, f.id).then(() => router.refresh())
  }, [onglet, f.id, f.nonLu, explicite, router])

  const envoyer = () =>
    demarrer(async () => {
      setErreur(undefined)
      const r = await ecrire(onglet, f.id, texte)
      if (r.erreur) return setErreur(r.erreur)
      setTexte('')
      setEnvoye(true)
      router.refresh()
    })
  const decider = (accepter: boolean) =>
    demarrer(async () => {
      setErreur(undefined)
      const r = await repondreRelation(f.id, accepter)
      if (r.erreur) return setErreur(r.erreur)
      setDecide(accepter ? 'ok' : 'no')
      router.refresh()
    })
  const cloturer = () =>
    demarrer(async () => {
      setErreur(undefined)
      const r = await cloturerDemande(f.id)
      if (r.erreur) return setErreur(r.erreur)
      router.refresh()
    })

  const c = f.coordonnees
  const aucune = c && !c.telephone && !c.whatsapp && !c.email
  return (
    <section className="card conv" aria-label={`Conversation : ${f.objet}`}>
      <Link className="linkbtn conv-back" href={href(base, onglet)} scroll={false}>
        ← Retour à la liste
      </Link>
      <div className="conv-h">
        <div>
          <p className="xs muted">{f.contexte}</p>
          <h2 className="h3">{f.objet}</h2>
        </div>
        <span className={`rec-badge rec-badge--${f.cls}`}>{f.statut}</span>
      </div>
      <div className="who">
        <Avatar f={f} />
        <div className="grow">
          <b>{f.qui}</b>
          <p className="xs muted">{f.org}</p>
        </div>
      </div>
      {f.bulles.map((b, i) => (
        <div className={`bubble ${b.sens}`} key={i}>
          <p className="xs muted">{b.qui}</p>
          <p className="small" style={{ whiteSpace: 'pre-line' }}>
            {b.texte}
          </p>
        </div>
      ))}
      {c && (
        <div className="bubble note">
          <p className="xs muted">Coordonnées de {c.nom}</p>
          {aucune ? (
            <p className="small">Ce membre n’affiche pas de coordonnées.</p>
          ) : (
            <>
              {c.telephone && <p className="small">Téléphone : {c.telephone}</p>}
              {c.whatsapp && <p className="small">WhatsApp : {c.whatsapp}</p>}
              {c.email && <p className="small">E-mail : {c.email}</p>}
            </>
          )}
        </div>
      )}
      {f.decision && !decide && (
        <div className="blk">
          <p className="small">{f.decision.question}</p>
          <div className="row">
            <button type="button" className="rec-btn rec-btn--primary" disabled={occupe} onClick={() => decider(true)}>
              Accepter et partager mes coordonnées
            </button>
            <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={() => decider(false)}>
              Refuser poliment
            </button>
          </div>
          <p className="xs muted">Vos coordonnées ne sont transmises que si vous acceptez. Un refus est envoyé sans motif.</p>
        </div>
      )}
      {decide && (
        <div className="okbox" role="status">
          <span className="rec-badge rec-badge--active">C’est fait</span>
          <p className="small">
            {decide === 'ok'
              ? `Mise en relation acceptée : vos coordonnées sont transmises à ${f.qui}, et les siennes à vous.`
              : `Demande refusée. ${f.qui} est prévenu, sans motif.`}
          </p>
        </div>
      )}
      {f.lien && (
        <Link className="rec-btn rec-btn--secondary" style={{ width: 'max-content' }} href={f.lien}>
          Ouvrir
        </Link>
      )}
      {f.peutEcrire && !decide && (
        <div className="composer">
          <div className="rec-field">
            <label htmlFor="mb-mr">Votre réponse</label>
            <textarea id="mb-mr" className="rec-input" value={texte} onChange={(e) => setTexte(e.target.value)} />
          </div>
          {erreur && (
            <p className="erreur" role="alert">
              {erreur}
            </p>
          )}
          <div className="row">
            <button type="button" className="rec-btn rec-btn--primary" disabled={occupe || texte.trim().length < 2} onClick={envoyer}>
              Envoyer
            </button>
            {f.peutCloturer && (
              <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={cloturer}>
                Clôturer la demande
              </button>
            )}
          </div>
          {envoye && !erreur && (
            <div className="okbox" role="status">
              <span className="rec-badge rec-badge--active">Envoyé</span>
              <p className="small">Votre réponse est transmise.</p>
            </div>
          )}
        </div>
      )}
      {!f.peutEcrire && f.peutCloturer && (
        <div className="row">
          <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={cloturer}>
            Clôturer la demande
          </button>
        </div>
      )}
      {!f.peutEcrire && erreur && (
        <p className="erreur" role="alert">
          {erreur}
        </p>
      )}
    </section>
  )
}
