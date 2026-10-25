import type { Metadata } from 'next'
import React from 'react'

import { Profil } from '@/components/espace/Profil'
import { telephoneAffiche } from '@/lib/adhesion/categories'
import { completude, dateCourte, exigerMembre, initialesDe, lettreCategorie, nomCategorie, urlMedia } from '@/lib/membres/espace'
import { CHAMPS_VERIFIES, champLabel, NOTIFICATIONS, VISIBILITES } from '@/lib/membres/options'
import { getPayloadClient } from '@/lib/site/payload'
import {
  changerImage,
  changerMotDePasse,
  changerNotification,
  changerVisibilite,
  demanderModification,
  demanderSuppression,
  deconnecterAppareils,
  enregistrerFiche,
} from '../actions'

export const metadata: Metadata = { title: 'Mon profil' }

type Demande = {
  id: number
  champ: string
  valeurActuelle?: string
  nouvelleValeur: string
  statut: string
  motifRefus?: string
  traiteParNom?: string
  dateTraitement?: string
  createdAt: string
}

const heure = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Brazzaville' })

/** Mon profil et mon entreprise (écran 03). */
export default async function ProfilPage() {
  const m = await exigerMembre()
  const payload = await getPayloadClient()
  const demandes = await payload.find({
    collection: 'modificationRequests',
    where: { membre: { equals: m.id } },
    sort: '-createdAt',
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const e = m.entreprise
  const valeur: Record<string, string> = {
    nom: `${m.prenom} ${m.nom}`,
    raisonSociale: e?.nom ?? '',
    secteurs: (e?.secteurs ?? []).map((s) => s.nom).join(', '),
    villeQuartier: [e?.localite?.nom, e?.quartier].filter(Boolean).join(', '),
    telephone: telephoneAffiche(m.telephone ?? undefined),
    email: m.email,
  }
  const commissions = (m.commissions ?? []) as { id: number; nom?: string; prochaineReunion?: string }[]
  return (
    <>
      <div className="top">
        <h1 className="h1">Mon profil et mon entreprise</h1>
      </div>
      <Profil
        d={{
          nom: `${m.prenom} ${m.nom}`,
          ini: initialesDe(m),
          photo: urlMedia(m.photo, 'vignette'),
          logo: urlMedia(e?.logo, 'vignette'),
          entreprise: e?.nom,
          categorie: nomCategorie(m.categorie) || lettreCategorie(m.categorie),
          completude: completude(m).pct,
          libres: {
            presentation: e?.presentationProposee ?? e?.presentation ?? '',
            enRelecture: Boolean(e?.presentationEnRelecture),
            services: e?.services ?? '',
            siteWeb: e?.siteWeb ?? '',
            linkedin: e?.linkedin ?? '',
            facebook: e?.facebook ?? '',
          },
          verifies: CHAMPS_VERIFIES.map((c) => ({ champ: c.value, label: c.label, valeur: valeur[c.value] ?? '' })),
          demandes: (demandes.docs as unknown as Demande[]).map((r) => ({
            id: r.id,
            texte: `${champLabel(r.champ)} : ${r.valeurActuelle ?? ''} → ${r.nouvelleValeur}`,
            date:
              r.statut === 'validee'
                ? `Validée le ${dateCourte(r.dateTraitement)}${r.traiteParNom ? ` par ${r.traiteParNom}` : ''}`
                : r.statut === 'refusee'
                  ? `Refusée le ${dateCourte(r.dateTraitement)} : ${r.motifRefus ?? ''}`
                  : `Envoyée le ${dateCourte(r.createdAt)}`,
            statut: r.statut === 'validee' ? 'Validée' : r.statut === 'refusee' ? 'Refusée' : 'En attente',
            cls: r.statut === 'validee' ? 'active' : r.statut === 'refusee' ? 'suspended' : 'pending',
          })),
          visibilite: VISIBILITES.map((v) => ({ name: v.name, label: v.label, on: Boolean(e?.visibilite?.[v.name]) })),
          commissions: commissions.map((c) => ({
            id: c.id,
            nom: c.nom ?? '',
            detail: c.prochaineReunion ? `Prochaine réunion le ${dateCourte(c.prochaineReunion)}` : '',
          })),
          notifications: NOTIFICATIONS.map((n) => ({ name: n.name, label: n.label, canal: n.canal, on: Boolean(m.notifications?.[n.name]) })),
          derniereConnexion: m.derniereConnexion ? heure(m.derniereConnexion) : '',
        }}
        a={{
          enregistrerFiche,
          demanderModification,
          changerImage,
          changerMotDePasse,
          changerVisibilite,
          changerNotification,
          deconnecterAppareils,
          demanderSuppression,
        }}
      />
    </>
  )
}
