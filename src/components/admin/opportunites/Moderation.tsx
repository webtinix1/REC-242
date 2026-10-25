'use client'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { api } from '../membres/api'

type Mode = '' | 'modification' | 'refus'

/** Écran 11 : actions de modération d'une annonce (publier, demander une modification, refuser). */
export const Moderation = ({ id, auteur }: { id: number; auteur: string }) => {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('')
  const [texte, setTexte] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [occupe, setOccupe] = useState(false)

  const envoyer = async (data: Record<string, string>, succes: string) => {
    setOccupe(true)
    setErr('')
    setOk('')
    try {
      await api(`/api/opportunities/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
      setOk(succes)
      setMode('')
      setTexte('')
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  return (
    <>
      {!mode && (
        <div className="rec-row">
          <button
            type="button"
            className="rec-btn rec-btn--primary"
            disabled={occupe}
            onClick={() => void envoyer({ statut: 'publiee' }, auteur ? `Annonce publiée. ${auteur} est prévenu.` : 'Annonce publiée.')}
          >
            Publier
          </button>
          <button type="button" className="rec-btn rec-btn--secondary" disabled={occupe} onClick={() => setMode('modification')}>
            Demander une modification
          </button>
          <button type="button" className="linkbtn danger" disabled={occupe} onClick={() => setMode('refus')}>
            Refuser
          </button>
        </div>
      )}
      {mode && (
        <div className="blk">
          <div className="rec-field">
            <label htmlFor="bb-omm">{mode === 'refus' ? 'Motif du refus (obligatoire, envoyé au membre)' : 'Message au membre'}</label>
            <textarea id="bb-omm" className="rec-input" value={texte} onChange={(e) => setTexte(e.target.value)} />
          </div>
          <div className="rec-row">
            <button
              type="button"
              className="rec-btn rec-btn--primary"
              disabled={occupe || !texte.trim()}
              onClick={() =>
                void (mode === 'refus'
                  ? envoyer({ statut: 'refusee', motifRefus: texte.trim() }, 'Annonce refusée. Le motif a été envoyé au membre et la décision est inscrite au journal.')
                  : envoyer({ statut: 'modification', messageModeration: texte.trim() }, 'Demande de modification envoyée. L’annonce reste en attente jusqu’à la mise à jour du membre.'))
              }
            >
              Envoyer au membre
            </button>
            <button
              type="button"
              className="linkbtn"
              disabled={occupe}
              onClick={() => {
                setMode('')
                setTexte('')
                setErr('')
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      {ok && (
        <div className="ok" role="status">
          {ok}
        </div>
      )}
      {err && (
        <p className="err" role="alert">
          {err}
        </p>
      )}
    </>
  )
}
