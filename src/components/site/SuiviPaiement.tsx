'use client'
import React, { useEffect, useState } from 'react'

import { statutPaiementMerci } from '@/app/(site)/adherer/merci/actions'

/** Page Merci : suit la validation du paiement mobile sur le téléphone du payeur (toutes les 4 secondes, 3 minutes au plus). */
export const SuiviPaiement = ({ initial }: { initial: string }) => {
  const [etat, setEtat] = useState<{ statut: string; recu?: string }>({ statut: initial })

  useEffect(() => {
    if (etat.statut !== 'en-attente') return
    let essais = 0
    const t = setInterval(async () => {
      essais++
      const r = await statutPaiementMerci().catch(() => null)
      if (r && r.statut !== 'en-attente') {
        setEtat(r)
        clearInterval(t)
      }
      if (essais >= 45) clearInterval(t)
    }, 4000)
    return () => clearInterval(t)
  }, [etat.statut])

  const texte =
    etat.statut === 'paye'
      ? `Paiement reçu : le reçu ${etat.recu ?? ''} vous a été envoyé par e-mail.`
      : etat.statut === 'echoue'
        ? 'Le paiement mobile n’a pas abouti. Vous pourrez régler lors du rendez-vous au siège, ou l’équipe vous recontacte.'
        : etat.statut === 'en-attente'
          ? 'Paiement : validez la demande qui s’affiche sur votre téléphone avec votre code secret.'
          : ''
  return texte ? (
    <p className="small" role="status" aria-live="polite" data-m="rise" data-m-d="8">
      {texte}
    </p>
  ) : null
}
