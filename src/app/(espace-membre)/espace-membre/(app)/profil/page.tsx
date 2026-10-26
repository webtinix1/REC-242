import type { Metadata } from 'next'
import { headers } from 'next/headers'
import React from 'react'
import { demanderCommission } from '@/lib/echanges/actions'

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

const TZ = 'Africa/Brazzaville'
const jourCle = (d: Date) => d.toLocaleDateString('fr-CA', { timeZone: TZ })
const hhmm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
/** « aujourd'hui à 08:42 », « hier à 18:05 » ou « le 24 oct. 2026 à 08:42 ». */
const heure = (iso: string) => {
  const d = new Date(iso)
  const maintenant = new Date()
  if (jourCle(d) === jourCle(maintenant)) return `aujourd’hui à ${hhmm(d)}`
  if (jourCle(d) === jourCle(new Date(maintenant.getTime() - 86400e3))) return `hier à ${hhmm(d)}`
  return `le ${dateCourte(iso)} à ${hhmm(d)}`
}
/** « il y a 3 jours » (« aujourd'hui », « hier » au plus près). */
const ilYA = (iso: string) => {
  const n = Math.round((new Date(jourCle(new Date())).getTime() - new Date(jourCle(new Date(iso))).getTime()) / 86400e3)
  return n <= 0 ? 'aujourd’hui' : n === 1 ? 'hier' : `il y a ${n} jours`
}
const jourMoisCourt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: TZ }) : ''

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
  const { user } = await payload.auth({ headers: await headers() })
  const [ouvertes, attente] = await Promise.all([
    payload.find({ collection: 'commissions', where: { ouverture: { equals: 'ouverte' } }, sort: 'ordre', limit: 50, depth: 0, user, overrideAccess: false }),
    payload.find({
      collection: 'commissionRequests',
      where: { and: [{ membre: { equals: m.id } }, { statut: { equals: 'attente' } }] },
      limit: 20,
      depth: 1,
      user,
      overrideAccess: false,
    }),
  ])
  const valeur: Record<string, string> = {
    nom: `${m.prenom} ${m.nom}`,
    raisonSociale: e?.nom ?? '',
    secteurs: (e?.secteurs ?? []).map((s) => s.nom).join(', '),
    villeQuartier: [e?.localite?.nom, e?.quartier].filter(Boolean).join(', '),
    telephone: telephoneAffiche(m.telephone ?? undefined),
    email: m.email,
  }
  const commissions = (m.commissions ?? []) as { id: number; nom?: string; prochaineReunion?: string }[]
  const dejaMembre = new Set(commissions.map((c) => c.id))
  const enAttente = (attente.docs as unknown as { id: number; createdAt: string; commission: number | { id: number; nom?: string } }[]).map((r) => ({
    detail: `Demande envoyée ${ilYA(r.createdAt)}`,
    id: typeof r.commission === 'object' ? r.commission.id : r.commission,
    nom: typeof r.commission === 'object' ? (r.commission.nom ?? '') : '',
  }))
  const idsAttente = new Set(enAttente.map((c) => c.id))
  const secteursMembre = (e?.secteurs ?? []).map((x) => x.nom).join(', ')
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
                  : `Envoyée ${ilYA(r.createdAt)}`,
            statut: r.statut === 'validee' ? 'Validée' : r.statut === 'refusee' ? 'Refusée' : 'En attente',
            cls: r.statut === 'validee' ? 'active' : r.statut === 'refusee' ? 'suspended' : 'pending',
          })),
          visibilite: VISIBILITES.map((v) => ({ name: v.name, label: v.label, on: Boolean(e?.visibilite?.[v.name]) })),
          commissions: commissions.map((c) => ({
            id: c.id,
            nom: c.nom ?? '',
            // Les commissions se choisissent à l'adhésion : « membre depuis » reprend le mois d'adhésion.
            detail: [
              m.dateAdhesion ? `Membre depuis ${new Date(m.dateAdhesion).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Africa/Brazzaville' })}` : '',
              c.prochaineReunion ? `${m.dateAdhesion ? 'prochaine' : 'Prochaine'} réunion le ${jourMoisCourt(c.prochaineReunion)}` : '',
            ]
              .filter(Boolean)
              .join(' · '),
          })),
          commissionsEnAttente: enAttente,
          commissionsOuvertes: (ouvertes.docs as unknown as { id: number; nom: string }[])
            .filter((c) => !dejaMembre.has(c.id) && !idsAttente.has(c.id))
            .map((c) => ({ id: c.id, nom: c.nom })),
          notifications: NOTIFICATIONS.map((n) => ({ name: n.name, label: n.label, canal: n.name === 'opportunites' && secteursMembre ? `${secteursMembre}, ${n.canal.charAt(0).toLowerCase()}${n.canal.slice(1)}` : n.canal, on: Boolean(m.notifications?.[n.name]) })),
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
          demanderCommission,
        }}
      />
    </>
  )
}
