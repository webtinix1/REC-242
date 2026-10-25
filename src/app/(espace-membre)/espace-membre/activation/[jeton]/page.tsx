import type { Metadata } from 'next'
import React from 'react'

import { CadreConnexion } from '@/components/espace/CadreConnexion'
import { FormulaireMotDePasse, NouveauLien } from '@/components/espace/Connexion'
import { empreinte } from '@/lib/membres/session'
import { getPayloadClient } from '@/lib/site/payload'
import { activer, renvoyerActivation } from '../../actions'

export const metadata: Metadata = { title: 'Activation' }
export const dynamic = 'force-dynamic'

export default async function ActivationPage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params
  const payload = await getPayloadClient()
  const m = (await payload.db.findOne({ collection: 'members', where: { activationHash: { equals: empreinte(jeton) } } })) as {
    id: number
    statut: string
    activationExpire?: string
    entreprise?: number | null
  } | null
  const valide = m && m.statut === 'attente' && m.activationExpire && new Date(m.activationExpire) > new Date()
  if (!valide)
    return (
      <CadreConnexion>
        <span className="rec-badge rec-badge--pending">Lien expiré</span>
        <h1 className="h1">Ce lien n&apos;est plus valable</h1>
        <p className="muted">Le lien d&apos;activation est valable 72 heures. Recevez un nouveau lien par e-mail pour activer votre espace.</p>
        {m && m.statut === 'attente' ? (
          <NouveauLien action={renvoyerActivation} jeton={jeton} />
        ) : (
          <p className="small muted">Votre espace est peut-être déjà activé : connectez-vous avec votre e-mail.</p>
        )}
      </CadreConnexion>
    )
  let annuaire = false
  if (m.entreprise) {
    const e = (await payload.findByID({ collection: 'companies', id: m.entreprise, depth: 0, overrideAccess: true })) as unknown as {
      visibilite?: { annuaire?: boolean }
    }
    annuaire = Boolean(e.visibilite?.annuaire)
  }
  return (
    <CadreConnexion>
      <span className="rec-badge rec-badge--active">Candidature validée</span>
      <h1 className="h1">Bienvenue dans le réseau</h1>
      <p className="muted">Choisissez votre mot de passe pour activer votre espace. Ce lien est valable 72 heures.</p>
      <FormulaireMotDePasse action={activer} jeton={jeton} activation annuaireParDefaut={annuaire} />
    </CadreConnexion>
  )
}
