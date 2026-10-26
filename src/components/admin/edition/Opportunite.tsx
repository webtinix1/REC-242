'use client'
import { useForm, useFormFields, useFormProcessing } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

import { typeLabel } from '@/lib/opportunites/regles'

const jourLong = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Africa/Brazzaville',
      })
    : ''

/** Aperçu en direct de la carte de l'opportunité (écran 20), mis à jour à chaque saisie. */
export const ApercuOpportunite = () => {
  const v = useFormFields(([f]) => ({
    type: f?.type?.value as string | undefined,
    titre: f?.titre?.value as string | undefined,
    secteurs: f?.secteurs?.value as (number | string | { id: number })[] | undefined,
    lien: f?.['source.lien']?.value as string | undefined,
    dateLimite: f?.dateLimite?.value as string | undefined,
    visibilite: f?.visibilite?.value as string | undefined,
  }))
  const [noms, setNoms] = useState<Record<string, string>>({})
  useEffect(() => {
    fetch('/api/sectors?limit=100&depth=0&select[nom]=true', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { docs?: { id: number; nom: string }[] } | null) =>
        setNoms(Object.fromEntries((j?.docs ?? []).map((s) => [String(s.id), s.nom]))),
      )
      .catch(() => {})
  }, [])
  const secteurs = (v.secteurs ?? [])
    .map((s) => noms[String(typeof s === 'object' ? s.id : s)])
    .filter(Boolean)
  const meta = [secteurs.join(', '), v.lien ? 'Source officielle citée' : ''].filter(Boolean).join(' · ')
  return (
    <section className="rec-panneau">
      <h3 className="rec-panneau__titre">Aperçu</h3>
      <div className="rec-pv">
        {v.type ? <span className="rec-pv__pill">{typeLabel(v.type)}</span> : null}
        <b>{v.titre}</b>
        {meta ? <span className="rec-pv__small rec-pv__muted">{meta}</span> : null}
        {v.dateLimite ? <span className="rec-pv__small">Date limite : {jourLong(v.dateLimite)}</span> : null}
        {v.visibilite === 'membres' ? (
          <span className="rec-pv__pill rec-pv__pill--ok">Réservé aux membres</span>
        ) : null}
      </div>
    </section>
  )
}

/** Rappel des règles (écran 20). */
export const ReglesOpportunite = () => (
  <section className="rec-panneau">
    <h3 className="rec-panneau__titre">Règles</h3>
    <p className="rec-pv__small rec-pv__muted">
      Une opportunité expirée disparaît des listes le lendemain de sa date limite. Un éditeur peut
      préparer un brouillon ; la publication est faite par un administrateur ou un éditeur.
    </p>
  </section>
)

/**
 * « Enregistrer le brouillon » et « Publier » (écran 20) : enregistrent l'annonce avec le statut correspondant.
 * Les droits et les règles (date limite, source, coordonnées) sont vérifiés par les hooks de la collection.
 */
export const BoutonsOpportunite = () => {
  const { submit } = useForm()
  const processing = useFormProcessing()
  return (
    <>
      <button
        type="button"
        className="rec-btn rec-btn--secondary"
        disabled={processing}
        onClick={() => void submit({ overrides: { statut: 'brouillon' } })}
      >
        Enregistrer le brouillon
      </button>
      <button
        type="button"
        className="rec-btn rec-btn--primary"
        disabled={processing}
        onClick={() => void submit({ overrides: { statut: 'publiee' } })}
      >
        Publier
      </button>
    </>
  )
}
