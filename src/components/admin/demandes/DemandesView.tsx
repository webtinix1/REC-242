import type { ListViewServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { atLeast, extraRead } from '@/access/roles'
import { PREFERENCES, STATUTS_EXPERT } from '@/collections/ExpertRequests'
import { STATUTS_RELATION } from '@/collections/ConnectionRequests'
import { masquerCoordonnees } from '@/lib/echanges/masquage'
import { BoView, initiales, relatif } from '../BoView'
import { DemandesExperts, type DemandeExpert } from './DemandesExperts'
import { RelationsSuivi, type LigneRelation, type MembreSuspendu, type Signalement } from './RelationsSuivi'

const BASE = '/admin/collections/expertRequests'
const ONGLETS = [
  { value: 'experts', label: 'Questions aux experts' },
  { value: 'relations', label: 'Conversations entre membres' },
]

type Media = { url?: string; sizes?: { vignette?: { url?: string } } } | null
const img = (m?: Media) => m?.sizes?.vignette?.url || m?.url || undefined
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number))
const jour = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Brazzaville' })

const classeStatut = (s: string) => (s === 'sans-reponse' ? 'suspended' : s === 'repondue' || s === 'cloturee' ? 'active' : 'pending')
const classeRelation = (s: string) => (s === 'acceptee' ? 'active' : s === 'signalee' ? 'suspended' : s === 'attente' ? 'pending' : 'pending')

type Personne = { id: number; nom: string; fonction?: string; photo?: Media; etiquettes?: unknown[] }
type MembreRef = { id: number; nomComplet?: string; photo?: Media; entreprise?: { nom?: string } | null } | null

/** Écran 21 : questions aux experts et suivi des mises en relation entre membres. */
export const DemandesView = async (props: ListViewServerProps) => {
  const { payload, user, searchParams } = props
  const onglet = ONGLETS.some((o) => o.value === searchParams?.onglet) ? String(searchParams?.onglet) : 'experts'
  const peutTraiter = atLeast(user as never, 'membres', 'partial')

  const tabs = (
    <div className="tabs" role="tablist">
      {ONGLETS.map((o) => (
        <Link key={o.value} role="tab" aria-selected={onglet === o.value} className={`tab${onglet === o.value ? ' is-on' : ''}`} href={o.value === 'experts' ? BASE : `${BASE}?onglet=${o.value}`}>
          {o.label}
        </Link>
      ))}
    </div>
  )

  if (onglet === 'relations') {
    const [rel, signalees, suspendus] = await Promise.all([
      payload.find({ collection: 'connectionRequests', sort: '-createdAt', depth: 2, limit: 100, overrideAccess: true }),
      payload.find({ collection: 'connectionRequests', where: { statut: { equals: 'signalee' } }, sort: '-createdAt', depth: 2, limit: 100, overrideAccess: true }),
      payload.find({ collection: 'members', where: { relationsSuspendues: { equals: true } }, sort: 'nomComplet', depth: 1, limit: 100, overrideAccess: true }),
    ])
    const nomDe = (m: MembreRef) => m?.nomComplet ?? ''
    // Conversations entre membres : lisibles par les rôles des demandes des membres seulement (décision du 28/10/2026).
    const peutLire = extraRead(user as never, 'demandesMembres')
    const lignes: LigneRelation[] = rel.docs.map((d) => {
      const r = d as unknown as {
        id: number
        statut: string
        createdAt: string
        message?: string
        demandeur?: MembreRef
        destinataire?: MembreRef
        fil?: { auteur?: number | { id: number } | null; texte?: string; date?: string }[]
      }
      const auteur = (a: unknown) => (idDe(a) === r.demandeur?.id ? nomDe(r.demandeur ?? null) : nomDe(r.destinataire ?? null))
      return {
        id: r.id,
        demandeur: nomDe(r.demandeur ?? null),
        demandeurEnt: r.demandeur?.entreprise?.nom ?? '',
        contacte: nomDe(r.destinataire ?? null),
        contacteEnt: r.destinataire?.entreprise?.nom ?? '',
        statut: STATUTS_RELATION.find((s) => s.value === r.statut)?.label ?? r.statut,
        cls: classeRelation(r.statut),
        date: jour(r.createdAt),
        conversation: peutLire
          ? [
              { qui: nomDe(r.demandeur ?? null), quand: jour(r.createdAt), texte: masquerCoordonnees(r.message ?? ''), demandeur: true },
              ...(r.fil ?? []).map((b) => ({ qui: auteur(b.auteur), quand: b.date ? jour(b.date) : '', texte: masquerCoordonnees(b.texte ?? ''), demandeur: idDe(b.auteur) === r.demandeur?.id })),
            ]
          : [],
      }
    })
    const signalements: Signalement[] = signalees.docs.map((d) => {
      const r = d as unknown as {
        id: number
        createdAt: string
        demandeur?: MembreRef
        destinataire?: MembreRef
        signalement?: { motif?: string; date?: string; par?: unknown }
      }
      const parId = r.signalement?.par ? idDe(r.signalement.par) : undefined
      const signaleur = parId && parId === r.destinataire?.id ? r.destinataire : parId && parId === r.demandeur?.id ? r.demandeur : null
      return {
        id: r.id,
        demandeur: nomDe(r.demandeur ?? null),
        demandeurId: r.demandeur?.id,
        contacte: nomDe(r.destinataire ?? null),
        signalePar: signaleur?.nomComplet ?? '',
        motif: r.signalement?.motif ?? '',
        date: jour(r.signalement?.date ?? r.createdAt),
      }
    })
    const suspendusLignes: MembreSuspendu[] = suspendus.docs.map((d) => {
      const m = d as unknown as { id: number; nomComplet?: string; entreprise?: { nom?: string } | null }
      return { id: m.id, nom: m.nomComplet ?? '', entreprise: m.entreprise?.nom ?? '' }
    })
    return (
      <BoView titre="Demandes des membres">
        {tabs}
        <RelationsSuivi lignes={lignes} signalements={signalements} suspendus={suspendusLignes} peutTraiter={peutTraiter} />
      </BoView>
    )
  }

  const [r, experts] = await Promise.all([
    payload.find({ collection: 'expertRequests', sort: '-createdAt', depth: 2, limit: 200, user, overrideAccess: false }),
    payload.find({ collection: 'people', where: { role: { equals: 'expert' } }, depth: 1, limit: 500, overrideAccess: true }),
  ])
  const personnes = experts.docs as unknown as Personne[]

  const demandes: DemandeExpert[] = r.docs.map((d) => {
    const x = d as unknown as {
      id: number
      question: string
      preference?: string
      statut: string
      createdAt: string
      echeance?: string
      relances?: number
      membre?: MembreRef
      etiquette?: { id: number; nom?: string } | null
      personne?: Personne | null
      fil?: { auteurType: string; auteurNom?: string; texte: string; date: string }[]
    }
    const nom = nomDeMembre(x.membre)
    const etiquetteId = x.etiquette?.id
    return {
      id: x.id,
      membre: nom,
      ini: initiales(nom),
      photo: img(x.membre?.photo),
      entreprise: x.membre?.entreprise?.nom ?? '',
      quand: relatif(x.createdAt),
      date: jour(x.createdAt),
      question: x.question,
      etiquette: x.etiquette?.nom ? (x.etiquette.nom.startsWith('#') ? x.etiquette.nom : `#${x.etiquette.nom}`) : '',
      statut: x.statut,
      statutLabel: STATUTS_EXPERT.find((s) => s.value === x.statut)?.label ?? x.statut,
      cls: classeStatut(x.statut),
      preference: PREFERENCES.find((p) => p.value === x.preference)?.label ?? '',
      personne: x.personne?.nom ?? '',
      personneFonction: x.personne?.fonction ?? '',
      personnePhoto: img(x.personne?.photo),
      relances: x.relances ?? 0,
      fil: (x.fil ?? []).filter((f, i) => !(i === 0 && f.auteurType === 'membre' && f.texte === x.question)).map((f) => ({
        type: f.auteurType,
        qui: f.auteurNom || (f.auteurType === 'expert' ? (x.personne?.nom ?? 'Expert') : f.auteurType === 'rec242' ? 'REC 242' : 'Système'),
        texte: f.texte,
        quand: f.date ? relatif(f.date) : '',
      })),
      alternatives: personnes
        .filter((p) => p.id !== x.personne?.id && (p.etiquettes ?? []).map(idDe).includes(etiquetteId as number))
        .map((p) => ({ id: p.id, nom: p.nom })),
    }
  })
  const selection = typeof searchParams?.id === 'string' ? Number(searchParams.id) : undefined

  return (
    <BoView titre="Demandes des membres">
      {tabs}
      <DemandesExperts demandes={demandes} selection={selection} peutTraiter={peutTraiter} />
    </BoView>
  )
}

const nomDeMembre = (m?: MembreRef) => m?.nomComplet ?? ''
