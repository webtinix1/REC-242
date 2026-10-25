import type { Metadata } from 'next'
import React from 'react'

import { CadreConnexion } from '@/components/espace/CadreConnexion'
import { FormulaireOubli } from '@/components/espace/Connexion'
import { motDePasseOublie } from '../actions'

export const metadata: Metadata = { title: 'Mot de passe oublié' }

export default function MotDePasseOubliePage() {
  return (
    <CadreConnexion>
      <FormulaireOubli action={motDePasseOublie} />
    </CadreConnexion>
  )
}
