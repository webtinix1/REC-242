import 'server-only'
import type { Where } from 'payload'

import { categorie } from '@/lib/adhesion/categories'
import { EFFECTIFS, label } from '@/lib/adhesion/options'
import { getPayloadClient } from '@/lib/site/payload'

/**
 * Annuaire (docs/05-regles-metier.md §6). Une fiche n'y figure que si le membre est actif, a consenti
 * (visibilité « annuaire ») et que l'administration ne l'a pas masquée.
 * Formes de données, jamais mélangées (décision de Webtinix du 28/10/2026) :
 * - `CartePublique` pour le visiteur : aucune donnée de contact ni dirigeant, quartier ou taille ;
 * - `CarteMembre` pour un membre connecté : la même chose, plus de quoi lui écrire depuis la plateforme ;
 *   avec l'abonnement « Annuaire détaillé » (`detaille`), en plus dirigeant, portrait, quartier, taille, commissions et liens.
 * Les coordonnées (téléphone, WhatsApp, e-mail) ne sont jamais lues pour l'annuaire : les échanges restent sur la plateforme.
 */

export const PAR_PAGE = 6

type Media = { url?: string | null; alt?: string | null; sizes?: { vignette?: { url?: string | null } } } | null
type Brut = {
  id: number
  nom: string
  slug: string
  logo?: Media | number | null
  photo?: (Media & { id?: number }) | number | null
  secteurs?: ({ id: number; nom: string; slug?: string } | number)[]
  localite?: { id: number; nom: string } | number | null
  quartier?: string | null
  effectif?: string | null
  presentation?: string | null
  services?: string | null
  recherches?: string | null
  siteWeb?: string | null
  linkedin?: string | null
  facebook?: string | null
  visibilite?: { telephone?: boolean; whatsapp?: boolean; email?: boolean }
  titulaire?: {
    id: number
    prenom?: string
    nom?: string
    categorie?: string
    dateAdhesion?: string | null
    telephone?: string | null
    whatsapp?: string | null
    email?: string
    photo?: Media | number | null
    commissions?: ({ id: number; nom: string } | number)[]
  } | null
}

export type CartePublique = {
  slug: string
  nom: string
  logo?: string
  /** Photo d'illustration de la fiche (bandeau), si la fiche en a une. */
  illustration?: { url: string; alt: string }
  secteur: string
  secteurs: string[]
  ville: string
  categorie: string
  categorieNom: string
  depuis?: number
  presentation?: string
  services?: string
  recherches?: string
  site?: string
}

export type CarteMembre = CartePublique & {
  id: number
  titulaireId?: number
  dirigeant: string
  photo?: string
  quartier: string
  taille: string
  commission: string
  /** Fiche détaillée (abonnement) : sinon dirigeant, portrait, quartier, taille, commission et liens sont vides. */
  detaille: boolean
  liens: { siteWeb?: string; linkedin?: string; facebook?: string }
}

export type Filtres = { q?: string; secteur?: string; ville?: string; commission?: string; taille?: string; page: number; /** Membre connecté : sa propre fiche n'est pas proposée dans l'annuaire de l'espace membre. */ sauf?: number }

const img = (m?: Media | number | null) => (m && typeof m === 'object' ? m.sizes?.vignette?.url || m.url || undefined : undefined)
const photoIllustration = (m?: (Media & { alt?: string | null }) | number | null) =>
  m && typeof m === 'object' && m.url ? { url: m.url, alt: (m as { alt?: string | null }).alt ?? '' } : undefined
const obj = <T,>(x: T | number | null | undefined): T | undefined => (x && typeof x === 'object' ? x : undefined)

export const lireFiltres = (sp: Record<string, string | string[] | undefined>): Filtres => {
  const v = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string).trim() : undefined) || undefined
  return { q: v('q')?.slice(0, 80), secteur: v('secteur'), ville: v('ville'), commission: v('commission'), taille: v('taille'), page: Math.max(1, Number(v('page')) || 1) }
}

/** Condition de présence dans l'annuaire, appliquée côté serveur à toute lecture. */
export const conditionAnnuaire: Where = {
  and: [
    { 'visibilite.annuaire': { equals: true } },
    { masqueeParAdmin: { not_equals: true } },
    { 'titulaire.statut': { equals: 'actif' } },
  ],
}

const versPublique = (c: Brut): CartePublique => {
  const t = c.titulaire
  const cat = categorie(t?.categorie ?? '')
  const secteurs = (c.secteurs ?? []).map((s) => obj<{ nom: string }>(s)?.nom).filter(Boolean) as string[]
  return {
    slug: c.slug,
    nom: c.nom,
    logo: img(c.logo),
    illustration: photoIllustration(c.photo),
    secteur: secteurs[0] ?? '',
    secteurs,
    ville: obj<{ nom: string }>(c.localite)?.nom ?? '',
    categorie: cat?.lettre ?? '',
    categorieNom: cat?.nom ?? '',
    depuis: t?.dateAdhesion ? new Date(t.dateAdhesion).getFullYear() : undefined,
    presentation: c.presentation ?? undefined,
    services: c.services ?? undefined,
    recherches: c.recherches ?? undefined,
    site: c.siteWeb ?? undefined,
  }
}

const versMembre = (c: Brut, detaille: boolean): CarteMembre => {
  const t = c.titulaire
  const base = { ...versPublique(c), id: c.id, titulaireId: t?.id, detaille }
  if (!detaille) return { ...base, dirigeant: '', quartier: '', taille: '', commission: '', liens: {} }
  const coms = (t?.commissions ?? []).map((x) => obj<{ nom: string }>(x)?.nom).filter(Boolean)
  return {
    ...base,
    dirigeant: `${t?.prenom ?? ''} ${t?.nom ?? ''}`.trim(),
    photo: img(t?.photo),
    quartier: c.quartier ?? '',
    taille: label(EFFECTIFS, c.effectif ?? undefined),
    commission: coms.join(', ') || 'Aucune',
    liens: { siteWeb: c.siteWeb ?? undefined, linkedin: c.linkedin ?? undefined, facebook: c.facebook ?? undefined },
  }
}

// Champs lus pour le public : les coordonnées ne sont jamais demandées à la base.
const SELECT_PUBLIC = {
  nom: true,
  slug: true,
  logo: true,
  photo: true,
  secteurs: true,
  localite: true,
  presentation: true,
  services: true,
  recherches: true,
  siteWeb: true,
  titulaire: true,
} as const
const POPULATE_PUBLIC = { members: { categorie: true, dateAdhesion: true } } as const

// Champs lus pour un membre connecté : ceux de la fiche détaillée, jamais téléphone, WhatsApp ni e-mail.
const SELECT_MEMBRE = { ...SELECT_PUBLIC, quartier: true, effectif: true, linkedin: true, facebook: true } as const
const POPULATE_MEMBRE = { members: { categorie: true, dateAdhesion: true, prenom: true, nom: true, photo: true, commissions: true } } as const

const lecture = (pourMembre: boolean) =>
  pourMembre ? { select: SELECT_MEMBRE, populate: POPULATE_MEMBRE } : { select: SELECT_PUBLIC, populate: POPULATE_PUBLIC }

async function whereFiltres(f: Filtres, pourMembre: boolean, detaille = false): Promise<Where> {
  const payload = await getPayloadClient()
  const et: Where[] = [conditionAnnuaire]
  if (pourMembre && f.sauf) et.push({ titulaire: { not_equals: f.sauf } })
  if (f.secteur) {
    const s = await payload.find({ collection: 'sectors', where: { or: [{ slug: { equals: f.secteur } }, { nom: { equals: f.secteur } }] }, limit: 1, depth: 0, overrideAccess: true })
    et.push({ secteurs: { in: s.docs.map((d) => d.id) } })
  }
  if (f.ville) {
    const l = await payload.find({ collection: 'localities', where: { or: [{ slug: { equals: f.ville } }, { nom: { equals: f.ville } }] }, limit: 1, depth: 0, overrideAccess: true })
    et.push({ localite: { in: l.docs.map((d) => d.id) } })
  }
  // Commission et taille ne sont montrées que sur la fiche détaillée (abonnement) : sans elle, on ne filtre pas dessus.
  if (f.commission && pourMembre && detaille) {
    const c = await payload.find({ collection: 'commissions', where: { or: [{ slug: { equals: f.commission } }, { nom: { equals: f.commission } }] }, limit: 1, depth: 0, overrideAccess: true })
    et.push({ 'titulaire.commissions': { in: c.docs.map((d) => d.id) } })
  }
  if (pourMembre && detaille && f.taille && EFFECTIFS.some((e) => e.value === f.taille)) et.push({ effectif: { equals: f.taille } })
  if (f.q) et.push({ or: [{ nom: { like: f.q } }, { presentation: { like: f.q } }, { services: { like: f.q } }, { 'localite.nom': { like: f.q } }, { 'secteurs.nom': { like: f.q } }] })
  return { and: et }
}

/**
 * Liste paginée de l'annuaire, sous la forme qui convient au lecteur.
 * `detaille` : le membre a l'abonnement « Annuaire détaillé » (à vérifier par l'appelant, côté serveur).
 */
export async function listerAnnuaire(f: Filtres, pourMembre: false): Promise<{ cartes: CartePublique[]; total: number; pages: number }>
export async function listerAnnuaire(f: Filtres, pourMembre: true, detaille: boolean): Promise<{ cartes: CarteMembre[]; total: number; pages: number }>
export async function listerAnnuaire(f: Filtres, pourMembre: boolean, detaille = false) {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'companies',
    where: await whereFiltres(f, pourMembre, detaille),
    sort: 'createdAt',
    page: f.page,
    limit: PAR_PAGE,
    depth: 2,
    overrideAccess: true,
    ...lecture(pourMembre),
  })
  const docs = r.docs as unknown as Brut[]
  return { cartes: docs.map((c) => (pourMembre ? versMembre(c, detaille) : versPublique(c))), total: r.totalDocs, pages: r.totalPages }
}

/** Fiche de l'annuaire par son adresse, ou null si elle n'y figure pas. */
export async function ficheAnnuaire(slug: string, pourMembre: false): Promise<CartePublique | null>
export async function ficheAnnuaire(slug: string, pourMembre: true, detaille: boolean): Promise<CarteMembre | null>
export async function ficheAnnuaire(slug: string, pourMembre: boolean, detaille = false) {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'companies',
    where: { and: [conditionAnnuaire, { slug: { equals: slug } }] },
    limit: 1,
    depth: 2,
    overrideAccess: true,
    ...lecture(pourMembre),
  })
  const c = r.docs[0] as unknown as Brut | undefined
  if (!c) return null
  return pourMembre ? versMembre(c, detaille) : versPublique(c)
}

/**
 * « Le réseau en visages » (accueil) : fiches dont le membre accepte la mise en avant ET que le bureau a sélectionnées.
 * Forme publique, plus le portrait du dirigeant (le membre a accepté d'être mis en avant).
 */
export async function misEnAvant(limite = 6): Promise<(CartePublique & { portrait?: string; ini: string })[]> {
  const payload = await getPayloadClient()
  const r = await payload.find({
    collection: 'companies',
    where: { and: [conditionAnnuaire, { 'visibilite.miseEnAvant': { equals: true } }, { selectionAccueil: { equals: true } }] },
    sort: 'nom',
    limit: limite,
    depth: 2,
    overrideAccess: true,
    select: SELECT_PUBLIC,
    populate: { members: { categorie: true, dateAdhesion: true, photo: true } },
  })
  return (r.docs as unknown as Brut[]).map((c) => ({
    ...versPublique(c),
    portrait: img(c.titulaire?.photo),
    ini: c.nom
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join(''),
  }))
}

/** Listes des filtres (secteurs, villes, commissions, tailles). */
export async function optionsFiltres() {
  const payload = await getPayloadClient()
  const [s, l, c] = await Promise.all([
    payload.find({ collection: 'sectors', limit: 100, depth: 0, sort: 'nom', overrideAccess: true }),
    payload.find({ collection: 'localities', limit: 100, depth: 0, sort: 'ordre', overrideAccess: true }),
    payload.find({ collection: 'commissions', limit: 50, depth: 0, sort: 'ordre', overrideAccess: true }),
  ])
  const opt = (docs: unknown[]) => (docs as { nom: string; slug?: string }[]).map((d) => ({ value: d.slug || d.nom, label: d.nom }))
  return { secteurs: opt(s.docs), villes: opt(l.docs), commissions: opt(c.docs), tailles: EFFECTIFS.map((e) => ({ value: e.value, label: e.label })) }
}

/** Filtres de l'espace membre : seulement les secteurs et villes où l'annuaire compte au moins une fiche. */
export async function optionsFiltresUtilisees(sauf?: number) {
  const payload = await getPayloadClient()
  const [opt, r] = await Promise.all([
    optionsFiltres(),
    payload.find({ collection: 'companies', where: sauf ? { and: [conditionAnnuaire, { titulaire: { not_equals: sauf } }] } : conditionAnnuaire, limit: 1000, depth: 0, pagination: false, overrideAccess: true, select: { secteurs: true, localite: true } }),
  ])
  const docs = r.docs as unknown as { secteurs?: (number | { id: number })[]; localite?: number | { id: number } | null }[]
  const id = (x: number | { id: number } | null | undefined) => (typeof x === 'object' && x ? x.id : x)
  const secteursUtilises = new Set(docs.flatMap((d) => (d.secteurs ?? []).map(id)))
  const villesUtilisees = new Set(docs.map((d) => id(d.localite)))
  const [s, l] = await Promise.all([
    payload.find({ collection: 'sectors', limit: 100, depth: 0, sort: 'nom', overrideAccess: true }),
    payload.find({ collection: 'localities', limit: 100, depth: 0, sort: 'ordre', overrideAccess: true }),
  ])
  const garde = (docs2: unknown[], utilises: Set<unknown>) =>
    (docs2 as { id: number; nom: string; slug?: string }[]).filter((d) => utilises.has(d.id)).map((d) => ({ value: d.slug || d.nom, label: d.nom }))
  return { ...opt, secteurs: garde(s.docs, secteursUtilises), villes: garde(l.docs, villesUtilisees) }
}
