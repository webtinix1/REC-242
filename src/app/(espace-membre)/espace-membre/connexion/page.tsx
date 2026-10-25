import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

import { CadreConnexion } from '@/components/espace/CadreConnexion'
import { FormulaireConnexion } from '@/components/espace/Connexion'
import { getSettings, waLink } from '@/lib/site/settings'
import { dejaConnecte, recevoirLien, seConnecter } from '../actions'

export const metadata: Metadata = { title: 'Connexion' }
export const dynamic = 'force-dynamic'

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { etat, retour } = await searchParams
  if (etat !== 'attente' && etat !== 'suspendu' && (await dejaConnecte())) redirect('/espace-membre')

  if (etat === 'attente')
    return (
      <CadreConnexion>
        <span className="rec-badge rec-badge--pending">En attente de validation</span>
        <h1 className="h1">Votre candidature est en cours d&apos;examen</h1>
        {/* Le numéro de dossier n'est pas rappelé ici : l'écran s'affiche sans mot de passe valide (voir docs/AVANCEMENT.md). */}
        <p className="muted">
          Prochaines étapes : rendez-vous avec le comité de direction (pièce d&apos;identité vérifiée en main propre, charte signée), puis
          agrément par le comité de direction. Votre espace s&apos;ouvrira ensuite.
        </p>
        <Link className="rec-btn rec-btn--secondary" href="/">
          Retour au site
        </Link>
      </CadreConnexion>
    )

  if (etat === 'suspendu') {
    const s = await getSettings()
    const numero = s.whatsapp?.numero
    return (
      <CadreConnexion>
        <span className="rec-badge rec-badge--suspended">Compte suspendu</span>
        <h1 className="h1">Votre accès est suspendu</h1>
        <p className="muted">
          Votre cotisation n&apos;est pas soldée ou votre adhésion n&apos;a pas été renouvelée. Contactez l&apos;équipe pour régulariser
          votre situation.
        </p>
        {numero && (
          <a
            className="rec-btn rec-btn--primary"
            href={waLink(numero, 'Bonjour, mon accès à l’espace membre REC 242 est suspendu. Pouvez-vous m’aider à régulariser ma situation ?')}
            target="_blank"
            rel="noopener noreferrer"
          >
            Écrire à l&apos;équipe sur WhatsApp ({numero})
          </a>
        )}
      </CadreConnexion>
    )
  }

  return (
    <CadreConnexion>
      <FormulaireConnexion
        connexion={seConnecter}
        lien={recevoirLien}
        retour={retour}
        expiree={etat === 'expiree'}
        erreurInitiale={etat === 'lien' ? 'Ce lien de connexion n’est plus valable. Demandez-en un nouveau.' : undefined}
      />
    </CadreConnexion>
  )
}
