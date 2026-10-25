import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { EchangesBoite, type Bulle, type Fil, type OngletEchange } from '@/components/espace/EchangesBoite'
import { coordonneesPartagees } from '@/lib/annuaire/relations'
import { nonLus } from '@/lib/echanges/service'
import { dateCourte, exigerMembre, initialesDe, urlMedia, type Media } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'

export const metadata: Metadata = { title: 'Mes échanges' }
export const dynamic = 'force-dynamic'

const BASE = '/espace-membre/echanges'
const ONGLETS: { cle: OngletEchange; label: string; aide: string }[] = [
  { cle: 'relations', label: 'Mises en relation', aide: 'Les coordonnées ne sont échangées que si le membre contacté accepte.' },
  { cle: 'annonces', label: 'Réponses à mes annonces', aide: 'Les réponses des membres à vos annonces d’opportunités.' },
  { cle: 'experts', label: 'Experts', aide: 'Les réponses des experts à vos questions.' },
  { cle: 'reseau', label: 'Messages du réseau', aide: 'Les messages envoyés par l’équipe de REC 242.' },
]

type Ref<T> = T | number | null | undefined
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))
type MembreLu = {
  id: number
  prenom?: string
  nom?: string
  photo?: Media | number
  entreprise?: { nom?: string; localite?: { nom?: string } | number | null; secteurs?: ({ nom?: string } | number)[] } | number | null
}

const nomDe = (m?: Ref<MembreLu>) => (m && typeof m === 'object' ? `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() : '')
const orgDe = (m?: Ref<MembreLu>) => {
  if (!m || typeof m !== 'object' || !m.entreprise || typeof m.entreprise !== 'object') return ''
  const e = m.entreprise
  const secteur = (e.secteurs ?? []).map((s) => (typeof s === 'object' ? s.nom : '')).filter(Boolean)[0]
  const ville = e.localite && typeof e.localite === 'object' ? e.localite.nom : ''
  return [e.nom, secteur, ville].filter(Boolean).join(' · ')
}

/** Date relative en français (« Aujourd’hui », « Hier », « Il y a 3 jours »), puis date courte au-delà d'une semaine. */
function relative(iso?: string | null): string {
  if (!iso) return ''
  const fuseau = (d: Date) => d.toLocaleDateString('fr-CA', { timeZone: 'Africa/Brazzaville' })
  const jours = Math.round((new Date(fuseau(new Date())).getTime() - new Date(fuseau(new Date(iso))).getTime()) / 86400e3)
  if (jours <= 0) return 'Aujourd’hui'
  if (jours === 1) return 'Hier'
  if (jours < 7) return `Il y a ${jours} jours`
  return dateCourte(iso)
}
const minuscule = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const etiquetteBulle = (qui: string, iso?: string | null) => (iso ? `${qui} · ${minuscule(relative(iso))}` : qui)
const tri = (a: Fil & { _t: number }, b: Fil & { _t: number }) => b._t - a._t

type Brut = Fil & { _t: number }

/** Mes échanges (écran 10). Chaque membre ne lit que les fils auxquels il participe. */
export default async function EchangesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = await exigerMembre()
  const payload = await getPayloadClient()
  const sp = await searchParams
  const q = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k])
  const onglet = (ONGLETS.find((o) => o.cle === q('onglet'))?.cle ?? 'relations') as OngletEchange
  const compteurs = await nonLus(payload, m.id)
  const toi = (x: Ref<MembreLu>) => idDe(x) === m.id

  let fils: Brut[] = []

  if (onglet === 'relations') {
    const r = await payload.find({
      collection: 'connectionRequests',
      where: { or: [{ demandeur: { equals: m.id } }, { destinataire: { equals: m.id } }] },
      sort: '-createdAt',
      limit: 100,
      depth: 3,
      overrideAccess: true,
    })
    type R = { id: number; createdAt: string; demandeur: Ref<MembreLu>; destinataire: Ref<MembreLu>; objet?: string; message: string; statut: string; fil?: { auteur?: Ref<MembreLu>; texte?: string; date?: string }[]; nonLuPar?: Ref<MembreLu>[] }
    fils = (r.docs as unknown as R[]).map((x) => {
      const recu = toi(x.destinataire)
      const autre = (recu ? x.demandeur : x.destinataire) as MembreLu
      const nom = nomDe(autre)
      const attente = x.statut === 'attente'
      const [statut, cls] =
        attente && recu ? ['À votre décision', 'pending'] : attente ? ['En attente', 'pending'] : x.statut === 'acceptee' ? ['Acceptée', 'active'] : x.statut === 'refusee' ? ['Refusée', 'suspended'] : x.statut === 'annulee' ? ['Annulée', 'suspended'] : ['Signalée', 'suspended']
      const dernier = x.fil?.length ? x.fil[x.fil.length - 1].date : x.createdAt
      const bulles: Bulle[] = [
        { sens: recu ? 'in' : 'out', qui: etiquetteBulle(recu ? nom : 'Vous', x.createdAt), texte: x.message },
        ...(x.fil ?? []).map((b) => ({ sens: (toi(b.auteur) ? 'out' : 'in') as 'in' | 'out', qui: etiquetteBulle(toi(b.auteur) ? 'Vous' : nom, b.date), texte: b.texte ?? '' })),
      ]
      return {
        _t: new Date(dernier ?? x.createdAt).getTime(),
        id: x.id,
        qui: nom,
        ini: initialesDe(autre),
        photo: urlMedia(autre.photo, 'vignette'),
        org: orgDe(autre),
        date: relative(dernier),
        objet: x.objet || (x.message.length > 80 ? `${x.message.slice(0, 77)}…` : x.message),
        statut,
        cls,
        nonLu: (x.nonLuPar ?? []).map(idDe).includes(m.id),
        contexte: recu ? 'Demande de mise en relation reçue' : 'Mise en relation envoyée par vous depuis l’annuaire',
        bulles,
        decision: attente && recu ? { question: `${nom} souhaite vous contacter. Acceptez-vous de lui transmettre vos coordonnées ?`, prenom: autre.prenom ?? '' } : undefined,
        peutEcrire: x.statut === 'acceptee',
        peutCloturer: false,
      }
    })
  } else if (onglet === 'annonces') {
    const r = await payload.find({
      collection: 'opportunityReplies',
      where: { or: [{ membre: { equals: m.id } }, { 'opportunite.membre': { equals: m.id } }] },
      sort: '-createdAt',
      limit: 100,
      depth: 3,
      overrideAccess: true,
    })
    type R = { id: number; createdAt: string; membre: Ref<MembreLu>; opportunite?: { titre?: string; membre?: Ref<MembreLu> } | null; message: string; fil?: { auteur?: Ref<MembreLu>; texte?: string; date?: string }[]; nonLuPar?: Ref<MembreLu>[] }
    fils = (r.docs as unknown as R[]).map((x) => {
      const auteurAnnonce = toi(x.opportunite?.membre)
      const autre = (auteurAnnonce ? x.membre : x.opportunite?.membre) as MembreLu
      const nom = nomDe(autre)
      const nonLu = (x.nonLuPar ?? []).map(idDe).includes(m.id)
      const dernier = x.fil?.length ? x.fil[x.fil.length - 1].date : x.createdAt
      const bulles: Bulle[] = [
        { sens: auteurAnnonce ? 'in' : 'out', qui: etiquetteBulle(auteurAnnonce ? nom : 'Vous', x.createdAt), texte: x.message },
        ...(x.fil ?? []).map((b) => ({ sens: (toi(b.auteur) ? 'out' : 'in') as 'in' | 'out', qui: etiquetteBulle(toi(b.auteur) ? 'Vous' : nom, b.date), texte: b.texte ?? '' })),
      ]
      return {
        _t: new Date(dernier ?? x.createdAt).getTime(),
        id: x.id,
        qui: nom,
        ini: initialesDe(autre ?? {}),
        photo: urlMedia(autre?.photo, 'vignette'),
        org: orgDe(autre),
        date: relative(dernier),
        objet: `Réponse à « ${x.opportunite?.titre ?? ''} »`,
        statut: auteurAnnonce ? (nonLu ? 'Nouveau' : 'Lu') : 'Envoyée',
        cls: auteurAnnonce && nonLu ? 'pending' : 'active',
        nonLu,
        contexte: auteurAnnonce ? 'Réponse à votre annonce' : 'Votre réponse à une annonce',
        bulles,
        peutEcrire: true,
        peutCloturer: false,
      }
    })
  } else if (onglet === 'experts') {
    const r = await payload.find({ collection: 'expertRequests', where: { membre: { equals: m.id } }, sort: '-createdAt', limit: 100, depth: 2, overrideAccess: true })
    type R = {
      id: number
      createdAt: string
      statut: string
      question: string
      nonLuMembre?: boolean
      etiquette?: { nom?: string } | number | null
      personne?: { nom?: string; fonction?: string; initiales?: string; photo?: Media | number } | number | null
      fil?: { auteurType?: string; auteurNom?: string; texte?: string; date?: string }[]
    }
    fils = (r.docs as unknown as R[]).map((x) => {
      const p = x.personne && typeof x.personne === 'object' ? x.personne : null
      const nom = p?.nom ?? ''
      const etiquette = x.etiquette && typeof x.etiquette === 'object' ? x.etiquette.nom : ''
      const [statut, cls] = x.nonLuMembre
        ? ['Nouvelle réponse', 'pending']
        : x.statut === 'repondue'
          ? ['Répondue', 'active']
          : x.statut === 'cloturee'
            ? ['Clôturée', 'suspended']
            : x.statut === 'sans-reponse'
              ? ['Sans réponse', 'suspended']
              : x.statut === 'reattribuee'
                ? ['Réattribuée', 'pending']
                : x.statut === 'en-cours'
                  ? ['En cours', 'pending']
                  : ['Envoyée', 'pending']
      const fil = x.fil?.length ? x.fil : [{ auteurType: 'membre', texte: x.question, date: x.createdAt }]
      const dernier = fil[fil.length - 1].date ?? x.createdAt
      const initiales = p?.initiales || nom.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
      return {
        _t: new Date(dernier).getTime(),
        id: x.id,
        qui: nom,
        ini: initiales,
        photo: urlMedia(p?.photo, 'vignette'),
        org: [p?.fonction, etiquette ? `#${etiquette}` : ''].filter(Boolean).join(' · '),
        date: relative(dernier),
        objet: x.question.length > 80 ? `${x.question.slice(0, 77)}…` : x.question,
        statut,
        cls,
        nonLu: Boolean(x.nonLuMembre),
        contexte: 'Question envoyée depuis « Solliciter un expert »',
        bulles: fil.map((b) => ({ sens: (b.auteurType === 'membre' ? 'out' : 'in') as 'in' | 'out', qui: etiquetteBulle(b.auteurType === 'membre' ? 'Vous' : b.auteurNom || nom, b.date), texte: b.texte ?? '' })),
        peutEcrire: x.statut !== 'cloturee',
        peutCloturer: x.statut !== 'cloturee',
      }
    })
  } else {
    const r = await payload.find({
      collection: 'networkMessages',
      where: { or: [{ membre: { equals: m.id } }, { tous: { equals: true } }] },
      sort: '-createdAt',
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })
    type R = { id: number; createdAt: string; titre: string; texte: string; lien?: string | null; luPar?: Ref<MembreLu>[] }
    fils = (r.docs as unknown as R[]).map((x) => {
      const nonLu = !(x.luPar ?? []).map(idDe).includes(m.id)
      return {
        _t: new Date(x.createdAt).getTime(),
        id: x.id,
        qui: 'REC 242',
        ini: 'R2',
        org: 'Secrétariat',
        date: relative(x.createdAt),
        objet: x.titre,
        statut: nonLu ? 'Nouveau' : 'Lu',
        cls: nonLu ? 'pending' : 'active',
        nonLu,
        contexte: 'Message du réseau',
        bulles: [{ sens: 'in', qui: etiquetteBulle('REC 242', x.createdAt), texte: x.texte }],
        lien: x.lien && x.lien.startsWith('/') && !x.lien.startsWith('//') ? x.lien : undefined,
        peutEcrire: false,
        peutCloturer: false,
      }
    })
  }
  fils.sort(tri)

  const idDemande = Number(q('id'))
  const choisi = fils.find((f) => f.id === idDemande)
  const courant = choisi ?? fils[0] ?? null
  if (courant && onglet === 'relations' && courant.peutEcrire) {
    const c = await coordonneesPartagees(payload, courant.id, m.id)
    if (c) courant.coordonnees = { nom: c.nom, telephone: c.telephone, whatsapp: c.whatsapp, email: c.email }
  }
  const aide = ONGLETS.find((o) => o.cle === onglet)!.aide
  const sortie: Fil[] = fils.map(({ _t, ...f }) => {
    void _t
    return f
  })

  return (
    <>
      <div className="top">
        <h1 className="h1">Mes échanges</h1>
      </div>
      <nav className="seg" aria-label="Type d’échange">
        {ONGLETS.map((o) => (
          <Link
            key={o.cle}
            href={`${BASE}?onglet=${o.cle}`}
            aria-current={o.cle === onglet ? 'page' : undefined}
            aria-label={compteurs[o.cle] > 0 ? `${o.label}, ${compteurs[o.cle]} non lu${compteurs[o.cle] > 1 ? 's' : ''}` : undefined}
          >
            {o.label}
            {compteurs[o.cle] > 0 && <span className="nbadge">{compteurs[o.cle]}</span>}
          </Link>
        ))}
      </nav>
      <p className="small muted">{aide}</p>
      <EchangesBoite onglet={onglet} base={BASE} fils={sortie} courant={courant?.id ?? null} ouvert={Boolean(choisi)} vide="Aucun échange pour le moment." />
    </>
  )
}
