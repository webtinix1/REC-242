import React from 'react'

import { Coque } from '@/components/espace/Coque'
import { nonLus } from '@/lib/echanges/service'
import { getPayloadClient } from '@/lib/site/payload'
import { exigerMembre, initialesDe, lettreCategorie, urlMedia } from '@/lib/membres/espace'
import { statutMembreLabel } from '@/lib/membres/options'
import { seDeconnecter } from '../actions'

export const dynamic = 'force-dynamic'

/** Coque de l'espace membre : réservée aux membres actifs (docs/07-ecrans-espace-membre.md). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const m = await exigerMembre()
  const non = await nonLus(await getPayloadClient(), m.id).catch(() => ({ total: 0 }))
  return (
    <Coque
      deconnexion={seDeconnecter}
      nonLus={non.total}
      moi={{
        nom: `${m.prenom} ${m.nom}`,
        ini: initialesDe(m),
        photo: urlMedia(m.photo, 'vignette'),
        logo: urlMedia(m.entreprise?.logo, 'vignette'),
        entreprise: m.entreprise?.nom,
        categorie: lettreCategorie(m.categorie),
        numero: m.numeroAdherent,
        statut: statutMembreLabel(m.statut),
      }}
    >
      {children}
    </Coque>
  )
}
