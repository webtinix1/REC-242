'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useActionState, useEffect, useState } from 'react'

import { inscrireMembre } from '@/lib/evenements/actions'

export type Suggestion = {
  id: number
  /** Adresse de la fiche quand l'événement pose des questions aux membres. */
  formulaire?: string
  jour: string
  mois: string
  titre: string
  type?: string
  acces: string
  lieu: string
  heure: string
  places?: string
  image?: string
}

function Carte({ e, onMessage }: { e: Suggestion; onMessage: (m: string, ok: boolean) => void }) {
  const router = useRouter()
  const [etat, agir, enCours] = useActionState(inscrireMembre, {})
  useEffect(() => {
    if (etat.ok) {
      onMessage(
        etat.statut === 'attente'
          ? `Vous êtes sur la liste d’attente, position ${etat.position ?? 1}. Nous vous écrivons si une place se libère.`
          : 'Un e-mail de confirmation avec le fichier calendrier vous a été envoyé.',
        true,
      )
      router.refresh()
    } else if (etat.general) onMessage(etat.general, false)
  }, [etat, onMessage, router])
  return (
    <form action={agir} className="card-soft">
      <input type="hidden" name="evenement" value={e.id} />
      {e.image && (
        <span className="pick evband">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.image} alt="" />
        </span>
      )}
      <div className="row">
        <div className="datedisc light">
          <b>{e.jour}</b>
          <span>{e.mois}</span>
        </div>
        <div className="grow">
          {e.type && <span className="tag">{e.type}</span>}
          <p className="xs muted" style={{ marginTop: 4 }}>
            {e.acces}
          </p>
        </div>
      </div>
      <p className="h3">{e.titre}</p>
      <p className="small muted">
        {e.lieu} · {e.heure}
        {e.places ? ` · ${e.places}` : ''}
      </p>
      {e.formulaire ? (
        <Link prefetch={false} href={e.formulaire} className="rec-btn rec-btn--primary" style={{ width: 'max-content' }}>
          M&apos;inscrire
        </Link>
      ) : (
        <button type="submit" className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} disabled={enCours}>
          M&apos;inscrire en un clic
        </button>
      )}
    </form>
  )
}

/** Prochains rendez-vous du réseau (écran 04) : inscription en un clic. */
export function EvenementsSuggestions({ items }: { items: Suggestion[] }) {
  const [info, setInfo] = useState<{ texte: string; ok: boolean } | null>(null)
  const prevenir = (texte: string, ok: boolean) => setInfo({ texte, ok })
  return (
    <>
      {info && (
        <div className="okbox" role="status">
          <span className={`rec-badge rec-badge--${info.ok ? 'active' : 'suspended'}`}>{info.ok ? 'Inscription enregistrée' : 'Inscription impossible'}</span>
          <p className="small">{info.texte}</p>
        </div>
      )}
      <div className="g2">
        {items.map((e) => (
          <Carte key={e.id} e={e} onMessage={prevenir} />
        ))}
      </div>
    </>
  )
}
