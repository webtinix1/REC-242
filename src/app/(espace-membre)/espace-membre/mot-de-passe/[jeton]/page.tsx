import type { Metadata } from 'next'
import React from 'react'

import { CadreConnexion } from '@/components/espace/CadreConnexion'
import { FormulaireMotDePasse } from '@/components/espace/Connexion'
import { nouveauMotDePasse } from '../../actions'

export const metadata: Metadata = { title: 'Nouveau mot de passe' }

/** Arrivée par le lien « Mot de passe oublié » (valable 1 heure). */
export default async function NouveauMotDePassePage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params
  return (
    <CadreConnexion>
      <h1 className="h1">Mot de passe oublié</h1>
      <p className="muted">Choisissez votre nouveau mot de passe.</p>
      <FormulaireMotDePasse action={nouveauMotDePasse} jeton={jeton} />
    </CadreConnexion>
  )
}
