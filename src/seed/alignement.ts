import fs from 'fs'
import path from 'path'

import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { slugify } from '@/fields/slug'
import { ARTICLE_AG } from './contenus'
import { dateFr, media, ROOT, rich, upsert } from './lib'

/**
 * Alignement des données de démonstration sur la maquette validée (direction B) : maquette/sources/B-Site.dc.html
 * et B-Membre.dc.html. Exécuté à la fin du seed, il met à jour (sans dupliquer) ce que les seeds des lots ont créé.
 */
type Db = { drizzle: { execute: (q: unknown) => Promise<unknown> } }
const drizzle = (payload: Payload) => (payload.db as unknown as Db).drizzle

const photo = (f: string) => `design/images/photos/${f}.webp`

/** Numéros de reçus : PAY-0001 et PAY-0002 sont ceux de Christelle Malonga (droit d'adhésion, 1re tranche), les autres suivent. */
export async function renumeroterRecus(payload: Payload): Promise<void> {
  const db = drizzle(payload)
  await db.execute(sql`UPDATE payments SET numero = numero + 100000 WHERE numero IS NOT NULL`)
  await db.execute(sql`
    WITH c AS (
      SELECT p.id,
             row_number() OVER (
               ORDER BY CASE WHEN m.email = 'christelle@kimiacreations.cg' THEN 0 ELSE 1 END,
                        CASE p.objet WHEN 'droit' THEN 0 ELSE 1 END, p.id
             ) AS rn
      FROM payments p LEFT JOIN members m ON m.id = p.membre_id
      WHERE p.numero IS NOT NULL
    )
    UPDATE payments SET numero = c.rn FROM c WHERE payments.id = c.id`)
  await db.execute(sql`
    INSERT INTO counters (name, value, updated_at, created_at)
    VALUES ('recu', (SELECT COALESCE(MAX(numero), 0) FROM payments), now(), now())
    ON CONFLICT (name) DO UPDATE SET value = (SELECT COALESCE(MAX(numero), 0) FROM payments)`)
}

/** Date de la maquette (jour de référence : 21 octobre 2026) reportée au même écart de la date du jour, à midi UTC. */
const JOUR_MAQUETTE = Date.UTC(2026, 9, 21)
function selonMaquette(jour: string): string {
  const ecart = Math.round((Date.parse(`${jour}T00:00:00Z`) - JOUR_MAQUETTE) / 86400000)
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + ecart, 12)).toISOString()
}

async function alignerAnnuaire(payload: Payload): Promise<void> {
  // Fiche 13 de la maquette (Khazad) : présentation et « Services et recherches » tels qu'affichés.
  const k = await payload.find({ collection: 'companies', where: { nom: { equals: 'Khazad' } }, limit: 1, depth: 0, overrideAccess: true })
  if (k.docs[0])
    await payload.db.updateOne({
      collection: 'companies',
      id: k.docs[0].id,
      data: {
        presentation:
          'Texte rédigé par le membre depuis son espace : activité, produits ou services, zone d’intervention. Relu par le secrétariat avant publication.',
        services: null,
        recherches: 'Partenaires de distribution, Fournisseurs',
      },
      returning: false,
    })
  // Photo d'illustration de la fiche 13 (maquette : « Couturier au travail dans son atelier »).
  if (k.docs[0]) {
    const photoId = await media(payload, photo('couturier-atelier'), 'Couturier au travail dans son atelier')
    if (photoId) await payload.db.updateOne({ collection: 'companies', id: k.docs[0].id, data: { photo: photoId }, returning: false })
  }
  // Christelle Malonga : services, site et fonction vides (complétude à 70 %, action « Présenter vos services »).
  const c = await payload.find({ collection: 'members', where: { email: { equals: 'christelle@kimiacreations.cg' } }, limit: 1, depth: 0, overrideAccess: true })
  const ent = (c.docs[0] as unknown as { entreprise?: number } | undefined)?.entreprise
  if (ent) await payload.db.updateOne({ collection: 'companies', id: ent, data: { services: null, siteWeb: null, linkedin: null, facebook: null }, returning: false })
  if (c.docs[0]) await payload.db.updateOne({ collection: 'members', id: c.docs[0].id, data: { fonction: null }, returning: false })
}

async function alignerEvenements(payload: Payload): Promise<void> {
  const [types, evs, docs] = await Promise.all([
    payload.find({ collection: 'eventTypes', limit: 50, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'events', limit: 50, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'documents', limit: 100, depth: 0, overrideAccess: true }),
  ])
  const nomType = (id?: number) => (types.docs as unknown as { id: number; nom: string }[]).find((t) => t.id === id)?.nom
  // Visuel choisi par type d'événement (classe « pick » de la maquette).
  const VISUEL: Record<string, [string, string]> = {
    Afterwork: ['groupe', 'Membres du réseau échangeant lors d’une rencontre'],
    Atelier: ['conference', 'Table ronde entre entrepreneurs'],
    'Rencontre B2B': ['poignee', 'Poignée de main entre partenaires d’affaires'],
    Conférence: ['reunion', 'Grande salle de conférence'],
    Assemblée: ['reunion', 'Grande salle de conférence'],
  }
  const formalisation = (await payload.find({ collection: 'commissions', where: { nom: { equals: 'Formalisation' } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]?.id
  const idDoc = (titre: string) => (docs.docs as unknown as { id: number; titre: string }[]).find((d) => d.titre === titre)?.id

  // Document « Programme détaillé (PDF) » de l'afterwork (visible par tous). Ancien titre renommé pour rester idempotent.
  const ancien = idDoc('Programme détaillé de l’afterwork')
  if (ancien) await payload.db.updateOne({ collection: 'documents', id: ancien, data: { titre: 'Programme détaillé (PDF)' }, returning: false })
  const programme = await upsert<{ id: number }>(
    payload,
    'documents',
    'titre',
    'Programme détaillé (PDF)',
    {
      titre: 'Programme détaillé (PDF)',
      rubrique: 'evenements',
      visibilite: 'public',
      dateDocument: dateFr('14 novembre 2026'),
      version: 1,
    },
    { filePath: path.join(ROOT, 'seed/fichiers/programme-afterwork.pdf') },
  )
  // Support de l'atelier : « Membres » dans la maquette.
  const support = idDoc('Support de l’atelier Formalisation')
  if (support) await payload.db.updateOne({ collection: 'documents', id: support, data: { visibilite: 'membres' }, returning: false })

  const actu = await payload.find({
    collection: 'news',
    where: { slug: { equals: slugify('REC 242 tient son assemblée générale constitutive') } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const galerie = [
    ['entrepreneuses-rencontre', 'Entrepreneuses réunies lors d’une rencontre du réseau'],
    ['reunion-table', 'Assemblée générale de REC 242'],
    ['seance-travail', 'Séance de travail en petit groupe'],
    ['commercant-boutique', 'Commerçant devant sa boutique'],
    ['couturier-atelier', 'Couturier au travail dans son atelier'],
    ['commercante-etal', 'Commerçante devant son étal'],
  ]

  for (const e of evs.docs as unknown as { id: number; titre: string; type?: number }[]) {
    const t = nomType(e.type)
    const v = t ? VISUEL[t] : undefined
    const data: Record<string, unknown> = {}
    if (v) data.image = await media(payload, photo(v[0]), v[1])
    // Bandeau de la fiche : la maquette utilise la même photo pour tous les événements.
    data.bandeau = await media(payload, photo('seance-travail'), 'Séance de travail en petit groupe')
    if (t === 'Afterwork') data.documents = [{ document: programme.id, visibilite: 'tous' }]
    if (t === 'Assemblée') {
      data.galerie = []
      for (const [f, alt] of galerie) (data.galerie as unknown[]).push({ image: await media(payload, photo(f), alt) })
      data.actualite = actu.docs[0]?.id
      data.participants = null
      // Maquette (écran 16) : « Statuts adoptés » et « Règlement intérieur ».
      data.documents = [
        { titre: 'Statuts de l’association', libelle: 'Statuts adoptés' },
        { titre: 'Règlement intérieur', libelle: undefined },
      ]
        .filter((x) => idDoc(x.titre))
        .map((x) => ({ document: idDoc(x.titre), visibilite: 'tous', libelle: x.libelle }))
    }
    if (Object.keys(data).length)
      await payload.update({ collection: 'events', id: e.id, data: data as never, overrideAccess: true, context: { skipAudit: true, sansEmail: true } })
    // Commission porteuse de l'atelier (bandeau « Prochain atelier » de /formalisation) et accès de la conférence : maquette.
    if (e.titre === 'Formaliser son activité : par où commencer ?' && formalisation)
      await payload.db.updateOne({ collection: 'events', id: e.id, data: { commission: formalisation }, returning: false })
    if (e.titre === 'Porteurs de projets et investisseurs') await payload.db.updateOne({ collection: 'events', id: e.id, data: { acces: 'membres' }, returning: false })
  }
  // Documents : titres de la maquette, et le bulletin d'adhésion (formulaire du site) hors de la liste des membres.
  const bio = idDoc('Biographies du comité de direction')
  if (bio) await payload.db.updateOne({ collection: 'documents', id: bio, data: { titre: 'Biographies' }, returning: false })
  const bulletin = idDoc('Bulletin d’adhésion')
  if (bulletin) await payload.db.updateOne({ collection: 'documents', id: bulletin, data: { rubrique: 'adhesion' }, returning: false })
}

async function alignerOpportunites(payload: Payload): Promise<void> {
  // Photos des cartes : choisies par titre dans la maquette (classe « pick »). Lien de source : la maquette n'en donne aucun.
  const PHOTO: [string, string, string, number][] = [
    ['ateliers de formalisation', 'couturieres', 'Couturières au travail', 25],
    ['exposants', 'vendeuse', 'Vendeuse devant son étal', 22],
    ['informatiques', 'brazza1', 'Vue de Brazzaville', 50],
    ['jeunes entreprises', 'tailleur', 'Tailleur dans son atelier', 35],
    ['partenaire de distribution', 'livraison', 'Livreur et ses colis', 50],
    ['veloppement web', 'ordinateur', 'Entrepreneur devant son ordinateur', 30],
  ]
  // Échéances de la maquette (écran membre 05 ; l'avis d'appel d'offres porte le 5 novembre sur le site, écran 17 : la maquette
  // donne deux dates pour la même annonce, l'espace membre est la référence ici). « Expire bientôt » découle de la date du jour.
  // Ces dates sont relatives au « jour » de la maquette (21 octobre 2026, d'où « 6 j » pour le 27 octobre) : on garde le même
  // écart à la date du seed, pour que les annonces ne passent pas à « Expirée » quelques jours après.
  const DATES: [string, string][] = [
    ['informatiques', '2026-10-27'],
    ['jeunes entreprises', '2026-12-20'],
    ['partenaire de distribution', '2026-12-10'],
    ['ateliers de formalisation', '2026-11-30'],
    ['veloppement web', '2026-10-27'],
    ['Salon professionnel', '2026-11-15'],
  ]
  // Avis officiels : la maquette affiche « Consulter l'avis officiel » sans donner d'adresse. Adresses de démonstration à remplacer.
  const LIENS: [string, string][] = [
    ['informatiques', 'https://example.org/avis-officiel/AO-2026-118'],
    ['jeunes entreprises', 'https://example.org/programme-appui-pme'],
  ]
  // Ordre d'affichage de la maquette (écran 17), qui n'est pas chronologique : rang dans la liste du site.
  const RANG = ['ateliers de formalisation', 'Salon professionnel', 'informatiques', 'jeunes entreprises', 'partenaire de distribution', 'veloppement web']
  const MIS_EN_AVANT = ['REC 242 cherche des partenaires pour ses ateliers de formalisation', 'Salon professionnel : appel à exposants']
  const r = await payload.find({ collection: 'opportunities', limit: 200, depth: 0, overrideAccess: true })
  for (const o of r.docs as unknown as { id: number; titre: string; visibilite: string; statut: string; source?: { lien?: string | null; libelle?: string | null } | null }[]) {
    const data: Record<string, unknown> = { miseEnAvant: MIS_EN_AVANT.includes(o.titre) && o.statut === 'publiee' && o.visibilite === 'public' }
    const rg = RANG.findIndex((k) => o.titre.includes(k))
    data.rang = rg >= 0 ? rg + 1 : null
    const j = DATES.find(([k]) => o.titre.includes(k))
    if (j) data.dateLimite = selonMaquette(j[1])
    const l = LIENS.find(([k]) => o.titre.includes(k))
    if (l) data.source = { libelle: o.source?.libelle ?? null, lien: l[1] }
    const p = PHOTO.find(([k]) => o.titre.includes(k))
    if (p) data.image = await media(payload, photo(p[1]), p[2], true, [50, p[3]])
    // Section « Expirées » du site : une opportunité expirée publique.
    if (o.titre === 'Prestations de nettoyage de bureaux') Object.assign(data, { visibilite: 'public', statut: 'expiree' })
    await payload.db.updateOne({ collection: 'opportunities', id: o.id, data, returning: false })
  }
}

/** « Mes publications » de Christelle Malonga (écran membre 05) : une annonce expirée, avec ses 4 réponses déjà traitées. */
async function alignerAnnonceExpiree(payload: Payload): Promise<void> {
  const titre = 'Lot de chutes de tissu wax à céder'
  const c = (await payload.find({ collection: 'members', where: { email: { equals: 'christelle@kimiacreations.cg' } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!c) return
  const commerce = (await payload.find({ collection: 'sectors', where: { nom: { equals: 'Commerce' } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const doc = await upsert<{ id: number }>(payload, 'opportunities', 'titre', titre, {
    type: 'offre-membre',
    titre,
    description: `${titre}.`,
    visibilite: 'membres',
    dateLimite: selonMaquette('2026-09-30'),
    secteurs: commerce ? [commerce.id] : [],
    auteur: 'membre',
    membre: c.id,
    statut: 'brouillon',
  })
  await payload.db.updateOne({ collection: 'opportunities', id: doc.id, data: { statut: 'expiree', publieLe: '2026-09-10T09:00:00.000Z', createdAt: '2026-09-10T09:00:00.000Z' }, returning: false })
  await drizzle(payload).execute(sql`DELETE FROM opportunity_replies WHERE opportunite_id = ${doc.id}`)
  const auteurs = await payload.find({ collection: 'members', where: { email: { in: ['rodrigue.itoua@membres.rec242.test', 'sylvie.okombi@membres.rec242.test', 'herve.ondongo@membres.rec242.test', 'grace.nkounkou@membres.rec242.test'] } }, limit: 10, depth: 0, overrideAccess: true })
  for (const [i, m] of auteurs.docs.entries()) {
    const date = new Date(Date.UTC(2026, 8, 12 + i, 9)).toISOString()
    await payload.db.create({
      collection: 'opportunityReplies',
      data: { opportunite: doc.id, membre: m.id, message: 'Bonjour, votre lot m’intéresse. Pouvons-nous en parler ?', lue: true, nonLuPar: [], fil: [], createdAt: date, updatedAt: date },
    })
  }
}

async function alignerActualites(payload: Payload): Promise<void> {
  const first = await payload.find({ collection: 'news', sort: 'id', limit: 1, depth: 0, overrideAccess: true })
  const auteur = (first.docs[0] as unknown as { auteur?: number } | undefined)?.auteur
  const secteurs = await payload.find({ collection: 'sectors', limit: 50, depth: 0, overrideAccess: true })
  const sid = (nom: string) => (secteurs.docs as unknown as { id: number; nom: string }[]).find((s) => s.nom === nom)?.id
  // Les 8 actualités de la maquette (écran 19), dont 2 réservées affichées dans « Actualités réservées » de l'espace membre.
  const AJOUTS = [
    { titre: 'Le numérique au service des commerçants', type: 'article', date: '9 octobre 2026', sect: 'Numérique', chapo: 'Outils simples pour vendre et se faire payer.', img: ['brazzaville-fleuve', 'Brazzaville et le fleuve Congo vus depuis un pont'], res: false },
    { titre: 'Appel à intervenants pour les ateliers 2027', type: 'annonce', date: '7 octobre 2026', sect: 'Formation', chapo: 'Partagez votre expertise avec les membres.', img: ['reunion-table', 'Assemblée générale de REC 242'], res: true },
  ]
  for (const n of AJOUTS) {
    const slug = slugify(n.titre)
    const doc = await upsert<{ id: number }>(
      payload,
      'news',
      'slug',
      slug,
      {
        titre: n.titre,
        chapeau: n.chapo,
        type: n.type,
        image: await media(payload, photo(n.img[0]), n.img[1]),
        secteurs: sid(n.sect) ? [sid(n.sect)] : [],
        datePublication: dateFr(n.date),
        reserveMembres: n.res,
        auteur,
        signature: 'la Communication',
        etat: 'publie',
        _status: 'published',
      },
      { draft: false },
    )
    await payload.db.updateOne({ collection: 'news', id: doc.id, data: { reserveMembres: n.res, aLaUne: false }, returning: false })
  }
  // Article de l'écran 20 : chapeau de la liste (écran 19), puis ouverture et corps de l'article, sans doublon. Apostrophes de la maquette.
  const ag = slugify('REC 242 tient son assemblée générale constitutive')
  const agDoc = (await payload.find({ collection: 'news', where: { slug: { equals: ag } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (agDoc)
    await payload.db.updateOne({
      collection: 'news',
      id: agDoc.id,
      data: {
        // Chapeau de l'article (écran 20) ; le corps commence au paragraphe suivant.
        chapeau: ARTICLE_AG[0].replace(/’/g, "'"),
        corps: rich(ARTICLE_AG.slice(1).map((l) => l.replace(/’/g, "'"))),
        aLireAussiTitre: "L'accompagnement à la formalisation",
      },
      returning: false,
    })
  // Actualité réservée : titre de la maquette de l'espace membre (écran 02), sans « réservé ».
  await payload.db.updateMany({
    collection: 'news',
    where: { slug: { equals: slugify('Compte rendu réservé : réunion du comité de direction') } },
    data: { titre: 'Compte rendu : réunion du comité de direction' },
    returning: false,
  })
  // La maquette (écran 19) montre chaque actualité deux fois (publique et réservée) pour présenter les deux états ;
  // docs/06 impose une seule carte par actualité en production : pas de doublons (on retire ceux d'un ancien seed).
  const jumeaux = (await payload.find({ collection: 'news', where: { slug: { like: '-reserve' } }, limit: 100, depth: 0, overrideAccess: true })).docs.filter((n) => n.slug?.endsWith('-reserve'))
  if (jumeaux.length) await payload.delete({ collection: 'news', where: { id: { in: jumeaux.map((n) => n.id) } }, overrideAccess: true, context: { skipAudit: true } })
  // Ordre de la maquette (écran 19), qui n'est pas chronologique.
  const ORDRE = [
    'REC 242 tient son assemblée générale constitutive',
    'Communiqué : constitution de REC 242',
    'Les adhésions bientôt ouvertes en ligne',
    'La commission Formalisation lance ses permanences',
    'Trois questions à la fondatrice de REC 242',
    'Compte rendu : réunion du comité de direction',
    'Le numérique au service des commerçants',
    'Appel à intervenants pour les ateliers 2027',
  ]
  const tous = (await payload.find({ collection: 'news', limit: 100, depth: 0, overrideAccess: true })).docs as unknown as { id: number; titre: string; slug: string; reserveMembres?: boolean }[]
  let rang = 0
  for (const t of ORDRE)
    for (const n of tous.filter((x) => x.titre === t))
      await payload.db.updateOne({ collection: 'news', id: n.id, data: { rang: ++rang }, returning: false })
  // « À la une » : l'assemblée générale constitutive seulement.
  const une = slugify('REC 242 tient son assemblée générale constitutive')
  const all = await payload.find({ collection: 'news', limit: 100, depth: 0, overrideAccess: true })
  for (const n of all.docs as unknown as { id: number; slug: string }[])
    await payload.db.updateOne({ collection: 'news', id: n.id, data: { aLaUne: n.slug === une }, returning: false })
}

/** Recherche « formalisation » (écran 23) : mêmes résultats que la maquette, trouvés par des champs publics. */
async function alignerRecherche(payload: Payload): Promise<void> {
  const DESC: [string, string][] = [
    ['/formalisation', 'Accompagner les entreprenants du secteur informel vers la formalisation.'],
    ['/le-reseau/commissions', 'Commission Formalisation : accompagne les membres du secteur informel.'],
  ]
  for (const [chemin, description] of DESC) {
    const pg = (await payload.find({ collection: 'pages', where: { chemin: { equals: chemin } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as { id: number; meta?: Record<string, unknown> } | undefined
    if (pg) await payload.update({ collection: 'pages', id: pg.id, data: { meta: { ...(pg.meta ?? {}), description }, _status: 'published' } as never, draft: false, overrideAccess: true, context: { skipAudit: true } })
  }
  // La commission d'un membre n'est pas publique (docs/05 §6) : la fiche de la ferme se trouve par sa présentation.
  const f = (await payload.find({ collection: 'companies', where: { nom: { equals: 'Ferme Lékana' } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (f)
    await payload.db.updateOne({
      collection: 'companies',
      id: f.id,
      data: { presentation: 'Exploitation agricole de Dolisie, en cours de formalisation de son activité.' },
      returning: false,
    })
  // Réindexation des pages (nouvelle règle d'indexation).
  const pages = await payload.find({ collection: 'pages', limit: 200, depth: 0, overrideAccess: true })
  for (const pg of pages.docs) await payload.update({ collection: 'pages', id: pg.id, data: { _status: 'published' }, draft: false, overrideAccess: true, context: { skipAudit: true } })
}

/**
 * Apostrophes : la maquette écrit les textes de ses pages avec l'apostrophe droite (HTML) et ses données (JS) avec l'apostrophe typographique.
 * Un texte de page repris tel quel de l'HTML de la maquette reprend donc son apostrophe droite.
 */
async function alignerApostrophes(payload: Payload): Promise<void> {
  const html = fs.readFileSync(path.join(ROOT, 'maquette/site/index.html'), 'utf8').split('\n').slice(0, 1180).join('\n')
  const droit = (t: string): string =>
    t
      .split(/(?<=[.!?:;]) +/)
      .map((c) => (c.includes('’') && c.length >= 8 && html.includes(c.replace(/’/g, "'")) ? c.replace(/’/g, "'") : c))
      .join(' ')
  const trans = (v: unknown, cle = ''): unknown => {
    if (typeof v === 'string') return ['id', 'blockType', 'ancre', 'chemin', 'slug', 'lien', 'href', 'url'].includes(cle) ? v : v.includes('’') ? droit(v) : v
    if (Array.isArray(v)) return v.map((x) => trans(x, cle))
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trans(x, k)]))
    return v
  }
  const pages = await payload.find({ collection: 'pages', limit: 200, depth: 0, overrideAccess: true })
  for (const pg of pages.docs as unknown as { id: number; layout?: unknown; title?: string }[]) {
    const layout = trans(pg.layout)
    if (JSON.stringify(layout) === JSON.stringify(pg.layout)) continue
    await payload.update({ collection: 'pages', id: pg.id, data: { layout, _status: 'published' } as never, draft: false, overrideAccess: true, context: { skipAudit: true } })
  }
}

/** Kit média de l'espace presse (écran 21) : deux vignettes par carte, comme la maquette. */
async function alignerPresse(payload: Payload): Promise<void> {
  const salle = await media(payload, photo('reunion-table'), 'Assemblée générale de REC 242')
  const conf = await media(payload, photo('reunion'), 'Grande salle de conférence')
  const logo = (await payload.find({ collection: 'media', where: { filename: { equals: 'rec242-logo-horizontal.webp' } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (logo) await payload.db.updateOne({ collection: 'media', id: logo.id, data: { illustration: false }, returning: false })
  for (const [titre, description] of [['Fiche institutionnelle', 'Mission, organisation, chiffres clés'], ['Biographies', 'Membres du comité de direction']])
    await payload.db.updateMany({ collection: 'documents', where: { titre: { equals: titre } }, data: { description }, returning: false })
  if (!salle || !conf) return
  const db = drizzle(payload)
  await db.execute(sql`UPDATE pages_blocks_cartes_cartes SET image2_id = ${salle} WHERE titre = 'Logo REC 242'`)
  await db.execute(sql`UPDATE pages_blocks_cartes_cartes SET image2_id = ${conf} WHERE titre = 'Photos officielles'`)
}

async function alignerFormalisation(payload: Payload): Promise<void> {
  // Bandeau « Prochain atelier » : intitulé de la maquette (« Formaliser son activité »), propre au bloc de la page.
  await drizzle(payload).execute(sql`
    UPDATE pages_blocks_section SET titre = 'Formaliser son activité'
    WHERE ancre = 'atelier' AND _parent_id IN (SELECT id FROM pages WHERE chemin = '/formalisation')`)
  // Bandeau de la page Formalisation : « Commerçante devant son étal » (maquette, écran 18).
  const id = await media(payload, photo('commercante-etal'), 'Commerçante devant son étal')
  if (!id) return
  await drizzle(payload).execute(sql`
    UPDATE pages_blocks_section SET image_id = ${id}
    WHERE ancre = 'hero' AND image_id IS NULL AND _parent_id IN (SELECT id FROM pages WHERE chemin = '/formalisation')`)
}

/** Documents personnels de Christelle Malonga (écran membre 12) : sa charte de l'adhérent signée. */
async function alignerDocumentsPersonnels(payload: Payload): Promise<void> {
  const c = await payload.find({ collection: 'members', where: { email: { equals: 'christelle@kimiacreations.cg' } }, limit: 1, depth: 0, overrideAccess: true })
  const membre = c.docs[0]?.id
  if (!membre) return
  const charte = await upsert<{ id: number }>(
    payload,
    'documents',
    'titre',
    'Charte de l’adhérent signée',
    { titre: 'Charte de l’adhérent signée', rubrique: 'textes', visibilite: 'personnel', membre, dateDocument: dateFr('6 octobre 2026'), version: 1 },
    { filePath: path.join(ROOT, 'seed/fichiers/charte-adherent.pdf') },
  )
  const couv = await media(payload, 'design/images/documents/couverture-charte.webp', 'Couverture : Charte de l’adhérent')
  await payload.db.updateOne({
    collection: 'documents',
    id: charte.id,
    data: { visibilite: 'personnel', membre, rubrique: 'textes', ...(couv ? { couverture: couv } : {}) },
    returning: false,
  })
}

/** Domaines proposés aux membres (écran 09) : les dix étiquettes de la maquette, dans son ordre. */
async function alignerDomaines(payload: Payload): Promise<void> {
  const DOMAINES = ['Formalisation', 'Juridique', 'Fiscalité', 'Financement', 'BTP', 'Numérique', 'Ressources humaines', 'Agriculture', 'Stratégie', 'Partenariats']
  const existantes = await payload.find({ collection: 'expertiseTags', limit: 200, depth: 0, overrideAccess: true })
  let ordre = existantes.docs.length
  for (const nom of DOMAINES) await upsert(payload, 'expertiseTags', 'slug', slugify(nom), { nom, ordre: ++ordre })
  const tags = await payload.find({ collection: 'expertiseTags', limit: 200, depth: 0, overrideAccess: true })
  for (const t of tags.docs as unknown as { id: number; nom: string }[]) {
    const i = DOMAINES.indexOf(t.nom)
    await payload.db.updateOne({ collection: 'expertiseTags', id: t.id, data: { domaineMembres: i >= 0, ordreMembres: i >= 0 ? i + 1 : 0 }, returning: false })
  }
}

/** Historique des demandes de Christelle Malonga (écran 03) : « Quartier : Moungali → Bacongo ». */
async function alignerDemandes(payload: Payload): Promise<void> {
  await payload.db.updateMany({
    collection: 'modificationRequests',
    where: { and: [{ champ: { equals: 'villeQuartier' } }, { nouvelleValeur: { equals: 'Brazzaville, Bacongo' } }, { statut: { equals: 'validee' } }] },
    data: { champ: 'quartier', valeurActuelle: 'Moungali', nouvelleValeur: 'Bacongo' },
    returning: false,
  })
}

async function alignerParametres(payload: Payload): Promise<void> {
  // Liens WhatsApp de démonstration : À CONFIRMER PAR REC 242 (docs/11-a-obtenir-de-rec242.md), à remplacer dans Paramètres.
  const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })) as { whatsapp?: { numero?: string; lienGroupe?: string; lienChaine?: string } }
  if (s.whatsapp?.lienGroupe && s.whatsapp?.lienChaine) return
  await payload.updateGlobal({
    slug: 'settings',
    overrideAccess: true,
    context: { skipAudit: true },
    data: {
      whatsapp: {
        ...s.whatsapp,
        lienGroupe: s.whatsapp?.lienGroupe || 'https://chat.whatsapp.com/demo-a-confirmer',
        lienChaine: s.whatsapp?.lienChaine || 'https://whatsapp.com/channel/demo-a-confirmer',
      },
    } as never,
  })
}

export async function alignerSurMaquette(payload: Payload): Promise<void> {
  await alignerAnnuaire(payload)
  await alignerEvenements(payload)
  await alignerOpportunites(payload)
  await alignerAnnonceExpiree(payload)
  await alignerActualites(payload)
  await alignerDocumentsPersonnels(payload)
  await alignerApostrophes(payload)
  await alignerRecherche(payload)
  // Écritures directes dans les blocs des pages : après les mises à jour de pages ci-dessus.
  await alignerFormalisation(payload)
  await alignerPresse(payload)
  await alignerDomaines(payload)
  await alignerDemandes(payload)
  await alignerParametres(payload)
  payload.logger.info('Données de démonstration alignées sur la maquette.')
}
