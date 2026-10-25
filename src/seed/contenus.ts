import path from 'path'
import type { Payload } from 'payload'

import { slugify } from '@/fields/slug'
import { dateFr, media, readSeed, rich, ROOT, upsert } from './lib'
import { seedLiensActualites, seedPages } from './pages'

type Personne = {
  ini: string
  nom: string
  fn: string
  pole?: string
  lead?: boolean
  tags: string[]
  photo: string
}

const SECTEURS = [
  'Agriculture',
  'Commerce',
  'Numérique',
  'BTP',
  'Services',
  'Santé',
  'Formation',
  'Immobilier',
  'Transport',
  'Artisanat',
]
const LOCALITES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Diaspora / Autre']
const TYPES_EVT = [
  'Afterwork',
  'Atelier',
  'Masterclass',
  'Rencontre B2B',
  'Conférence',
  'Déjeuner d’affaires',
  'Formation',
  'Assemblée',
]
const ETIQUETTES = [
  'Formalisation',
  'Juridique',
  'Fiscalité',
  'Financement',
  'Numérique',
  'Données',
  'Communication',
  'Stratégie',
  'Partenariats',
  'Institutions',
  'Accompagnement',
  'Agriculture',
  'BTP',
  'Immobilier',
  'Formation',
  'Ressources humaines',
  'Entrepreneuriat',
  'Réseau',
]

const POLE: Record<string, string> = {
  Direction: 'direction',
  'Numérique et données': 'numerique',
  Juridique: 'juridique',
  'Programme et relations avec les adhérents': 'programme',
  'Communication et stratégie': 'communication',
  'Relations extérieures': 'relations',
}

// Experts rattachés à chaque commission (données de démonstration, à confirmer par REC 242).
const EXPERTS_PAR_COMMISSION: Record<string, string[]> = {
  'Éthique et Vérification': ['Patrick Mavoungou', 'Nadège Loubaki'],
  Formalisation: ['Patrick Mavoungou', 'Serge Bouanga', 'Nadège Loubaki'],
  'B2B et Opportunités': ['Rodrigue Itoua', 'Grâce Nkounkou'],
  Communication: ['Rodrigue Itoua'],
  Partenariats: ['Grâce Nkounkou', 'Patrick Mavoungou'],
}

// Images des cartes de commission (maquette, écran 04).
const IMAGE_COMMISSION: Record<string, string> = {
  'Éthique et Vérification': 'conference',
  Formalisation: 'tailleur',
  'B2B et Opportunités': 'vendeuse',
  Communication: 'ordinateur',
  Partenariats: 'poignee',
}
// Cadrage des images dans les cartes (site.css, .pick .v-*).
const FOCAL: Record<string, [number, number]> = {
  conference: [50, 22],
  vendeuse: [50, 22],
  ordinateur: [50, 30],
}
const IMAGE_ALT: Record<string, string> = {
  conference: 'Table ronde de travail',
  tailleur: 'Tailleur dans son atelier',
  vendeuse: 'Commerçante à son étal',
  ordinateur: 'Entrepreneuse travaillant sur son ordinateur',
  poignee: 'Poignée de main entre partenaires',
}

async function taxonomies(payload: Payload) {
  const ids: Record<string, Record<string, number>> = {}
  for (const [coll, list] of [
    ['sectors', SECTEURS],
    ['localities', LOCALITES],
    ['eventTypes', TYPES_EVT],
    ['expertiseTags', ETIQUETTES],
  ] as const) {
    ids[coll] = {}
    for (const [i, nom] of list.entries()) {
      const d = await upsert<{ id: number }>(payload, coll, 'slug', slugify(nom), {
        nom,
        ordre: i + 1,
      })
      ids[coll][nom] = d.id
    }
  }
  // Étiquettes proposées en filtre sur la page Gouvernance (liste de la maquette).
  for (const nom of FILTRES_GOUVERNANCE) {
    await payload.db.updateOne({
      collection: 'expertiseTags',
      id: ids.expertiseTags[nom],
      data: { filtreSite: true },
    })
  }
  return ids
}

const FILTRES_GOUVERNANCE = [
  'Formalisation',
  'Juridique',
  'Fiscalité',
  'Financement',
  'Numérique',
  'Communication',
  'Partenariats',
  'Stratégie',
  'Agriculture',
  'BTP',
  'Formation',
]

async function gouvernance(payload: Payload, tags: Record<string, number>) {
  const g = readSeed<{
    comite: Personne[]
    experts: Personne[]
    commissions: { t: string; d: string; resp: string; ouverte: boolean }[]
    commissions_back_office: { nom: string; next: string }[]
  }>('gouvernance')
  const ids: Record<string, number> = {}
  for (const [i, p] of g.comite.entries()) {
    const d = await upsert<{ id: number }>(payload, 'people', 'nom', p.nom, {
      nom: p.nom,
      initiales: p.ini,
      fonction: p.fn,
      role: p.lead ? 'fondatrice' : 'comite',
      pole: POLE[p.pole || ''] ?? undefined,
      etiquettes: p.tags.map((t) => tags[t]).filter(Boolean),
      photo: await media(payload, p.photo, `Portrait de ${p.nom}`),
      ordre: i + 1,
      visible: true,
    })
    ids[p.nom] = d.id
  }
  for (const [i, p] of g.experts.entries()) {
    const d = await upsert<{ id: number }>(payload, 'people', 'nom', p.nom, {
      nom: p.nom,
      initiales: p.ini,
      fonction: p.fn,
      role: 'expert',
      etiquettes: p.tags.map((t) => tags[t]).filter(Boolean),
      photo: await media(payload, p.photo, `Portrait de ${p.nom}`),
      ordre: 100 + i,
      visible: true,
    })
    ids[p.nom] = d.id
  }
  for (const [i, c] of g.commissions.entries()) {
    const bo = g.commissions_back_office.find((x) => x.nom === c.t)
    await upsert(payload, 'commissions', 'slug', slugify(c.t), {
      nom: c.t,
      objet: c.d,
      responsable: ids[c.resp],
      ouverture: c.ouverte ? 'ouverte' : 'designation',
      experts: (EXPERTS_PAR_COMMISSION[c.t] ?? []).map((n) => ids[n]).filter(Boolean),
      prochaineReunion: bo ? dateFr(bo.next) : undefined,
      image: await media(
        payload,
        `design/images/photos/${IMAGE_COMMISSION[c.t]}.webp`,
        IMAGE_ALT[IMAGE_COMMISSION[c.t]],
        true,
        FOCAL[IMAGE_COMMISSION[c.t]],
      ),
      afficheeSurSite: true,
      ordre: i + 1,
    })
  }
}

async function annexes(payload: Payload) {
  const c = readSeed<{
    partenaires: { n: number; nom: string; logo: string; type: string; d: string }[]
  }>('contenus')
  for (const p of c.partenaires) {
    await upsert(payload, 'partners', 'nom', p.nom, {
      nom: p.nom,
      logo: await media(payload, p.logo, `Logo de ${p.nom}`),
      type: p.type,
      description: p.d,
      conventionSignee: true,
      ordre: p.n,
    })
  }
  const a = readSeed<{ faq: { q: string; r: string }[] }>('adhesion')
  for (const [i, f] of a.faq.entries()) {
    await upsert(payload, 'faq', 'question', f.q, {
      question: f.q,
      reponse: f.r,
      emplacements: i < 4 ? ['accueil', 'adherer'] : ['adherer'],
      ordre: i + 1,
      visible: true,
    })
  }
  const temoignages = [
    {
      citation:
        'Grâce aux ateliers de la commission Formalisation, j’ai mis mes papiers en ordre et je réponds maintenant à des commandes d’entreprises.',
      personne: 'Léon Massamba',
      entreprise: 'Les Bretelles de Léon',
      photo: 'design/images/personnes/leon-massamba.webp',
    },
    {
      citation:
        'Les rencontres entre membres m’ont permis de trouver deux fournisseurs à Brazzaville et un nouveau point de vente.',
      personne: 'Christelle Malonga',
      entreprise: 'Kimia Créations',
      photo: 'design/images/personnes/christelle-malonga.webp',
    },
  ]
  for (const t of temoignages) {
    const doc = await upsert<{ id: number; logo?: number | null }>(
      payload,
      'testimonials',
      'personne',
      t.personne,
      {
        ...t,
        photo: await media(payload, t.photo, `Portrait de ${t.personne}`),
        accordPublication: true,
      },
    )
    if (!doc.logo) {
      const logo = await media(
        payload,
        `design/images/logos-membres/${slugify(t.entreprise)}.png`,
        `Logo de ${t.entreprise}`,
      )
      if (logo)
        await payload.db.updateOne({ collection: 'testimonials', id: doc.id, data: { logo } })
    }
  }
}

const DOCS = [
  {
    titre: 'Statuts de l’association',
    rubrique: 'textes',
    visibilite: 'public',
    fichier: 'statuts.pdf',
    cover: 'couverture-statuts',
    date: '3 oct. 2026',
    dl: 186,
  },
  {
    titre: 'Règlement intérieur',
    rubrique: 'textes',
    visibilite: 'membres',
    fichier: 'reglement-interieur.pdf',
    cover: 'couverture-reglement',
    date: '3 oct. 2026',
    dl: 94,
  },
  {
    titre: 'Charte de l’adhérent',
    rubrique: 'textes',
    visibilite: 'public',
    fichier: 'charte-adherent.pdf',
    cover: 'couverture-charte',
    date: '3 oct. 2026',
    dl: 151,
  },
  {
    titre: 'Compte rendu du comité de direction',
    rubrique: 'vie',
    visibilite: 'membres',
    fichier: 'compte-rendu-comite.pdf',
    cover: 'couverture-compte-rendu',
    date: '14 oct. 2026',
    dl: 63,
  },
  {
    titre: 'Support de l’atelier Formalisation',
    rubrique: 'ateliers',
    visibilite: 'inscrits',
    fichier: 'support-atelier-formalisation.pdf',
    cover: 'couverture-support',
    date: '18 oct. 2026',
    dl: 25,
  },
  {
    titre: 'Fiche institutionnelle',
    rubrique: 'presse',
    visibilite: 'public',
    fichier: 'fiche-institutionnelle.pdf',
    cover: 'couverture-fiche-institutionnelle',
    date: '20 oct. 2026',
    dl: 41,
  },
  {
    titre: 'Biographies du comité de direction',
    rubrique: 'presse',
    visibilite: 'public',
    fichier: 'biographies-comite.pdf',
    cover: 'couverture-biographies',
    date: '20 oct. 2026',
    dl: 17,
  },
  {
    titre: 'Constitution de REC 242, Réseau des Entrepreneurs Congolais',
    rubrique: 'presse',
    visibilite: 'public',
    fichier: 'communique-constitution.pdf',
    cover: '',
    date: '3 oct. 2026',
    dl: 0,
  },
  {
    titre: 'Ouverture des adhésions en ligne',
    rubrique: 'presse',
    visibilite: 'public',
    fichier: 'communique-adhesions.pdf',
    cover: '',
    date: '2 nov. 2026',
    dl: 0,
  },
  {
    titre: 'Bulletin d’adhésion',
    rubrique: 'textes',
    visibilite: 'public',
    fichier: 'fiche-adhesion.pdf',
    cover: '',
    date: '3 oct. 2026',
    dl: 0,
  },
]

async function documents(payload: Payload) {
  const ids: Record<string, number> = {}
  for (const d of DOCS) {
    const doc = await upsert<{ id: number }>(
      payload,
      'documents',
      'titre',
      d.titre,
      {
        titre: d.titre,
        rubrique: d.rubrique,
        visibilite: d.visibilite,
        typePresse: d.rubrique === 'presse' ? (d.cover ? 'kit' : 'communique') : undefined,
        dateDocument: dateFr(d.date),
        couverture: d.cover
          ? await media(
              payload,
              `design/images/documents/${d.cover}.webp`,
              `Couverture : ${d.titre}`,
            )
          : undefined,
        telechargements: d.dl,
        version: 1,
      },
      { filePath: path.join(ROOT, 'seed/fichiers', d.fichier) },
    )
    ids[d.titre] = doc.id
  }
  return ids
}

async function settings(payload: Payload) {
  const s = (await payload.findGlobal({ slug: 'settings', overrideAccess: true })) as {
    adresse?: string
  }
  if (s.adresse) return
  await payload.updateGlobal({
    slug: 'settings',
    overrideAccess: true,
    context: { skipAudit: true },
    data: {
      adresse: '165 rue Charles Foucault, Centre-Ville, Brazzaville',
      email: 'contact@rec242.cg',
      // Horaires et plan d'accès : proposés dans la maquette, à confirmer par REC 242.
      horaires: 'Du lundi au vendredi, 8 h 30 à 17 h. Le samedi sur rendez-vous.',
      planAcces: {
        indications:
          'À deux pas du rond-point de la Poste, entrée par la cour.\nEn taxi · demander « Centre-Ville, la Poste ».\nStationnement · places dans la rue Charles Foucault.',
      },
      whatsapp: { numero: '+242 06 725 79 50' },
      chiffresCles: [
        { libelle: 'Membres actifs', mode: 'saisi', valeur: '248' },
        { libelle: 'Entreprises représentées', mode: 'saisi', valeur: '173' },
        { libelle: 'Secteurs', mode: 'saisi', valeur: '18' },
        { libelle: 'Année de fondation', mode: 'saisi', valeur: '2026' },
      ],
      // Montants : docs/05-regles-metier.md (cotisation B à confirmer : 75 000 selon REC 242, 50 000 selon les statuts).
      tarifs: {
        droitA: 10000,
        cotisationA: 25000,
        droitB: 15000,
        cotisationB: 75000,
        droitC: 25000,
        cotisationC: 150000,
        droitExpert: 15000,
        cotisationExpert: 75000,
        delaiMois: 3,
        tranchesMax: 2,
        relances: 3,
        intervalleRelancesJours: 15,
      },
      annuaire: {
        edition: '2027',
        cloture: dateFr('30 nov. 2026'),
        encartLogo: 25000,
        encartDemiPage: 75000,
        encartPleinePage: 150000,
      },
      alertes: {
        adresseAlerte: 'Rec242.Contact@gmail.com',
        copie: 'contact@rec242.cg',
        alertesAussi: 'messages',
      },
      seo: {
        titre: 'REC 242 · Réseau des Entrepreneurs Congolais',
        description:
          'REC 242 réunit entreprenants de l’informel, commerçants et entreprises pour s’entraider, se rencontrer et faire des affaires ensemble.',
      },
    } as never,
  })
}

async function navigation(payload: Payload) {
  const n = (await payload.findGlobal({ slug: 'navigation', overrideAccess: true })) as {
    principal?: unknown[]
  }
  if (n.principal?.length) return
  const L = (libelle: string, url: string) => ({ libelle, url })
  await payload.updateGlobal({
    slug: 'navigation',
    overrideAccess: true,
    data: {
      principal: [
        {
          ...L('Le réseau', '/le-reseau'),
          sousMenu: [
            L('Qui sommes-nous', '/le-reseau'),
            L('Gouvernance', '/le-reseau/gouvernance'),
            L('Commissions', '/le-reseau/commissions'),
            L('Antennes', '/le-reseau/antennes'),
            L('Notre écosystème', '/le-reseau/ecosysteme'),
            L('Partenaires', '/le-reseau/partenaires'),
            L('Formalisation', '/formalisation'),
          ],
        },
        L('Adhérer', '/adherer'),
        L('Membres', '/membres'),
        L('Agenda', '/agenda'),
        L('Opportunités', '/opportunites'),
        L('Actualités', '/actualites'),
        L('Contact', '/contact'),
      ],
      piedDePage: [
        {
          titre: 'Le réseau',
          liens: [
            L('Qui sommes-nous', '/le-reseau'),
            L('Gouvernance', '/le-reseau/gouvernance'),
            L('Commissions', '/le-reseau/commissions'),
            L('Antennes', '/le-reseau/antennes'),
            L('Notre écosystème', '/le-reseau/ecosysteme'),
            L('Partenaires', '/le-reseau/partenaires'),
            L('Formalisation', '/formalisation'),
          ],
        },
        {
          titre: 'Participer',
          liens: [
            L('Adhérer', '/adherer'),
            L('Agenda', '/agenda'),
            L('Opportunités', '/opportunites'),
            L('Annuaire', '/membres'),
            L('Actualités', '/actualites'),
            L('Presse', '/presse'),
          ],
        },
        {
          titre: 'Nous joindre',
          liens: [
            L('Devenir partenaire', '/devenir-partenaire'),
            L('Espace membre', '/espace-membre'),
          ],
        },
      ],
    } as never,
  })
}

const ARTICLE_AG = [
  'Le 3 octobre 2026, à Brazzaville, l’assemblée générale constitutive de REC 242 a adopté les statuts et le règlement intérieur de l’association.',
  'REC 242, Réseau des Entrepreneurs Congolais, est une association à but non lucratif, apolitique et non confessionnelle. Son but : structurer, connecter et valoriser l’écosystème entrepreneurial congolais en facilitant l’entraide et les affaires entre ses membres.',
  '## Quatre organes',
  'L’assemblée générale définit les orientations et s’appuie sur le comité de direction. Le comité, composé de la fondatrice et de sept membres répartis en cinq pôles, exécute les décisions et valide les adhésions. Des commissions thématiques donnent leur avis et font des propositions. Deux contrôleurs aux comptes vérifient la gestion.',
  '## Et maintenant',
  'Les adhésions sont ouvertes aux entreprenants de l’informel, aux commerçants formalisés et aux entreprises, selon trois catégories.',
]

const TYPE: Record<string, string> = {
  'Retour sur événement': 'retour',
  Communiqué: 'communique',
  Annonce: 'annonce',
  Article: 'article',
  Interview: 'interview',
}

async function actualites(
  payload: Payload,
  sectors: Record<string, number>,
  docs: Record<string, number>,
  auteur?: number,
) {
  const a = readSeed<{
    actualites: {
      type: string
      titre: string
      date: string
      sect: string
      res: boolean
      chapo: string
      src: string
    }[]
  }>('actualites-et-presse')
  for (const n of a.actualites) {
    await upsert(
      payload,
      'news',
      'slug',
      slugify(n.titre),
      {
        titre: n.titre,
        chapeau: n.chapo,
        type: TYPE[n.type] ?? 'article',
        image: await media(payload, n.src, n.titre),
        corps: n.titre.startsWith('REC 242 tient') ? rich(ARTICLE_AG) : undefined,
        secteurs: sectors[n.sect] ? [sectors[n.sect]] : [],
        datePublication: dateFr(n.date),
        reserveMembres: n.res,
        pdf:
          n.type === 'Communiqué'
            ? docs['Constitution de REC 242, Réseau des Entrepreneurs Congolais']
            : undefined,
        auteur,
        signature: 'la Communication',
        etat: 'publie',
        _status: 'published',
      },
      { draft: false },
    )
  }
}

export async function seedContenus(payload: Payload, auteur?: number): Promise<void> {
  const tax = await taxonomies(payload)
  await gouvernance(payload, tax.expertiseTags)
  await annexes(payload)
  const docs = await documents(payload)
  await settings(payload)
  await navigation(payload)
  await actualites(payload, tax.sectors, docs, auteur)
  await seedPages(payload)
  await seedLiensActualites(payload)
  await seedComplementsLot3(payload)
  await seedIndexRecherche(payload)
  payload.logger.info(
    'Contenus de démonstration : taxonomies, gouvernance, partenaires, FAQ, documents, paramètres, menus, actualités, pages.',
  )
}

/** Champs ajoutés au lot 3 sur des données déjà chargées par un seed précédent. */
export async function seedComplementsLot3(payload: Payload): Promise<void> {
  const docs = await payload.find({
    collection: 'documents',
    where: { and: [{ rubrique: { equals: 'presse' } }, { typePresse: { exists: false } }] },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  for (const d of docs.docs)
    await payload.db.updateOne({
      collection: 'documents',
      id: d.id,
      data: { typePresse: d.couverture ? 'kit' : 'communique' },
    })
  const comms = await payload.find({
    collection: 'commissions',
    where: { image: { exists: false } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  for (const c of comms.docs) {
    const img = IMAGE_COMMISSION[c.nom]
    if (img)
      await payload.db.updateOne({
        collection: 'commissions',
        id: c.id,
        data: { image: await media(payload, `design/images/photos/${img}.webp`, IMAGE_ALT[img]) },
      })
  }
  await payload.db.updateMany({
    collection: 'news',
    where: { signature: { exists: false } },
    data: { signature: 'la Communication' },
  })
  const une = await payload.count({
    collection: 'news',
    where: { aLaUne: { equals: true } },
    overrideAccess: true,
  })
  if (!une.totalDocs)
    await payload.db.updateMany({
      collection: 'news',
      where: { slug: { equals: slugify('REC 242 tient son assemblée générale constitutive') } },
      data: { aLaUne: true },
    })
}

/** Index de recherche : réindexe les actualités publiées qui n'y figurent pas (chargées avant l'ajout du plugin). */
export async function seedIndexRecherche(payload: Payload): Promise<void> {
  const indexed = await payload.find({
    collection: 'search',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  const ids = new Set(
    indexed.docs
      .map((d) => d.doc as { relationTo: string; value: number | { id: number } } | undefined)
      .filter(Boolean)
      .map((d) => `${d!.relationTo}:${typeof d!.value === 'object' ? d!.value.id : d!.value}`),
  )
  const news = await payload.find({
    collection: 'news',
    where: { _status: { equals: 'published' } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  for (const n of news.docs)
    if (!ids.has(`news:${n.id}`))
      await payload.update({
        collection: 'news',
        id: n.id,
        data: { signature: n.signature ?? 'la Communication' },
        overrideAccess: true,
        context: { skipAudit: true },
      })
}
