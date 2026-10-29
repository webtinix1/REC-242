import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { categorie, montants, type Tarifs } from '@/lib/adhesion/categories'
import { finExercice, limiteCotisation } from '@/lib/membres/options'
import { media, motDePasseSeed, readSeed } from './lib'

/**
 * Membres et entreprises de démonstration (seed/membres-et-entreprises.json, seed/cotisations-et-paiements.json,
 * seed/demandes-et-messages.json). Mot de passe des comptes : SEED_PASSWORD (comme les comptes de l'administration).
 */
type Annuaire = {
  nom: string
  dir: string
  sect: string
  ville: string
  quartier: string
  cat: string
  comm: string
  taille: string
  dirPhoto: string
  logo: string
}
type Bo = { ref: string; nom: string; statut: string; cot: string; vis: string }

const TAILLE: Record<string, string> = { '1 à 9': '1-9', '10 à 49': '10-49', '50 et plus': '50+' }

// Compléments propres à la démonstration (la maquette montre Christelle Malonga connectée).
const DETAILS: Record<string, { email?: string; telephone?: string; whatsapp?: string | null; adhesion: string; numero?: string; presentation?: string; vis?: boolean[] }> = {
  'Kimia Créations': {
    email: 'christelle@kimiacreations.cg',
    telephone: '+242 06 641 22 87',
    adhesion: '2026-10-06',
    presentation: 'Création et vente de pagnes, sacs et accessoires en wax, fabriqués à Brazzaville.',
    vis: [true, false, true, false, true],
  },
  // Coordonnées et choix d'affichage : annuaire de l'espace membre de la maquette (« Masqué par le membre » sinon).
  Khazad: { adhesion: '2026-10-03', telephone: '+242 06 512 34 18', vis: [true, true, true, false, true] },
  // WhatsApp affiché mais sans numéro WhatsApp : « Non » dans l'annuaire de la maquette.
  'Hôpital Blanche Gomes': { adhesion: '2026-10-04', telephone: '+242 05 530 18 44', whatsapp: null, vis: [true, true, true, false, true] },
  // Membre en relance : adhésion assez ancienne pour que l'échéance de la 2e tranche soit dépassée.
  // Téléphone masqué, WhatsApp affiché (« Oui ») : numéro fictif de démonstration, jamais affiché.
  'Les Bretelles de Léon': { adhesion: '2026-05-04', email: 'contact@bretellesdeleon.cg', telephone: '+242 06 000 00 21', vis: [true, false, true, true, true] },
  '3M-Partners & Conseils': {
    adhesion: '2026-10-08',
    numero: 'REC-2026-0016',
    email: 'contact@3mpartners.cg',
    telephone: '+242 06 877 02 61',
    vis: [true, true, true, true, true],
  },
  'Mbongui Formation & RH': { adhesion: '2026-10-09', numero: 'REC-2026-0017', email: 'contact@mbongui-rh.cg', telephone: '+242 06 000 00 22', vis: [true, false, true, true, true] },
  'Fako Drop': { adhesion: '2026-10-10', numero: 'REC-2026-0018', telephone: '+242 06 903 47 25', vis: [true, true, true, false, false] },
  'Ferme Lékana': { adhesion: '2026-10-08', numero: 'REC-2026-0013', vis: [true, false, false, false, false] },
  'Batimat Congo': { adhesion: '2026-10-11', numero: 'REC-2026-0019', vis: [true, false, true, false, false] },
}

// Fiches de l'annuaire du site de la maquette absentes de seed/membres-et-entreprises.json.
const COMPLEMENTS: Annuaire[] = [
  { nom: 'Fako Drop', dir: 'Hervé Ondongo', sect: 'Transport', ville: 'Pointe-Noire', quartier: 'Tié-Tié', cat: 'B', comm: 'B2B et Opportunités', taille: '10 à 49', dirPhoto: 'design/images/personnes/herve-ondongo.webp', logo: 'design/images/logos-membres/fako-drop.png' },
  { nom: 'Ferme Lékana', dir: 'Serge Bouanga', sect: 'Agriculture', ville: 'Dolisie', quartier: 'Tsila', cat: 'A', comm: 'Formalisation', taille: '1 à 9', dirPhoto: 'design/images/personnes/serge-bouanga.webp', logo: '' },
  { nom: 'Batimat Congo', dir: 'Grâce Nkounkou', sect: 'BTP', ville: 'Brazzaville', quartier: 'Mfilou', cat: 'C', comm: 'Partenariats', taille: '50 et plus', dirPhoto: 'design/images/personnes/grace-nkounkou.webp', logo: '' },
]

const VIS = ['annuaire', 'telephone', 'whatsapp', 'email', 'miseEnAvant']
const sansAccent = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export async function seedMembres(payload: Payload): Promise<void> {
  const { annuaire, back_office } = readSeed<{ annuaire: Annuaire[]; back_office: Bo[] }>('membres-et-entreprises')
  const { demandes_modification } = readSeed<{ demandes_modification: { m: string; champ: string; avant: string; apres: string; d: string }[] }>(
    'demandes-et-messages',
  )
  const [secteurs, localites, commissions, s] = await Promise.all([
    payload.find({ collection: 'sectors', limit: 100, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'localities', limit: 100, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'commissions', limit: 50, depth: 0, overrideAccess: true }),
    payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true }) as Promise<{ tarifs?: Tarifs }>,
  ])
  const idPar = (docs: unknown[], nom: string) => (docs as { id: number; nom: string }[]).find((x) => x.nom === nom)?.id
  const password = motDePasseSeed()
  const parEntreprise = new Map<string, number>()

  for (const a of [...annuaire, ...COMPLEMENTS]) {
    const bo = back_office.find((b) => b.nom === a.nom)
    const det = DETAILS[a.nom] ?? { adhesion: '2026-10-01' }
    const [prenom, ...reste] = a.dir.split(' ')
    const nom = reste.join(' ')
    const email = det.email ?? `${sansAccent(prenom)}.${sansAccent(nom).replace(/\s+/g, '-')}@membres.rec242.test`
    const numero = bo?.ref ?? det.numero
    // Les 9 fiches de l'annuaire de la maquette sont visibles : le statut « Suspendu » du back-office de la maquette n'est pas reproduit.
    const statut = 'actif' as 'actif' | 'suspendu'
    const debut = new Date(`${det.adhesion}T09:00:00Z`)
    const cat = categorie(a.cat)
    const m = montants(cat, s.tarifs)
    const vis = det.vis ?? [true, false, true, true, false]

    const existant = await payload.find({
      collection: 'members',
      where: numero ? { or: [{ numeroAdherent: { equals: numero } }, { email: { equals: email } }] } : { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (existant.docs[0]) {
      // Relance du seed : coordonnées et choix d'affichage remis aux valeurs de démonstration.
      const ex = existant.docs[0] as unknown as { id: number; entreprise?: number }
      await payload.db.updateOne({
        collection: 'members',
        id: ex.id,
        data: {
          email,
          telephone: det.telephone ?? null,
          whatsapp: det.whatsapp !== undefined ? det.whatsapp : (det.telephone ?? null),
          statut: 'actif',
          motifStatut: null,
          consentementAnnuaire: vis[0] ? debut.toISOString() : null,
        },
        returning: false,
      })
      if (ex.entreprise)
        await payload.db.updateOne({
          collection: 'companies',
          id: ex.entreprise,
          data: { visibilite: Object.fromEntries(VIS.map((k, i) => [k, Boolean(vis[i])])), selectionAccueil: Boolean(vis[4]), masqueeParAdmin: false },
          returning: false,
        })
      parEntreprise.set(a.nom, ex.id)
      continue
    }
    const [photo, logo] = await Promise.all([media(payload, a.dirPhoto, a.dir, false), media(payload, a.logo, `Logo ${a.nom}`, false)])
    const entreprise = await payload.create({
      collection: 'companies',
      overrideAccess: true,
      data: {
        nom: a.nom,
        logo,
        secteurs: [idPar(secteurs.docs, a.sect)].filter(Boolean),
        localite: idPar(localites.docs, a.ville),
        quartier: a.quartier,
        effectif: TAILLE[a.taille],
        presentation: det.presentation,
        visibilite: Object.fromEntries(VIS.map((k, i) => [k, Boolean(vis[i])])),
        masqueeParAdmin: false,
        // Sélection du bureau pour l'accueil (démonstration) : les fiches dont le membre accepte la mise en avant.
        selectionAccueil: Boolean(vis[4]),
      } as never,
    })
    const membre = await payload.create({
      collection: 'members',
      overrideAccess: true,
      data: {
        email,
        password,
        prenom,
        nom,
        telephone: det.telephone,
        whatsapp: det.whatsapp !== undefined ? det.whatsapp : det.telephone,
        photo,
        entreprise: entreprise.id,
        categorie: cat?.valeur ?? 'B',
        numeroAdherent: numero,
        statut,
        motifStatut: statut === 'suspendu' ? 'Cotisation non soldée après trois relances (démonstration).' : undefined,
        dateAdhesion: debut.toISOString(),
        validiteCarte: finExercice(debut).toISOString(),
        dateLimiteCotisation: limiteCotisation(debut, s.tarifs?.delaiMois ?? 3).toISOString(),
        cotisation: m ? { droit: m.droit, montant: m.cotisation, tranches: s.tarifs?.tranchesMax ?? 2 } : undefined,
        commissions: [idPar(commissions.docs, a.comm)].filter(Boolean),
        consentementAnnuaire: vis[0] ? debut.toISOString() : undefined,
        conditionsAcceptees: debut.toISOString(),
      } as never,
    })
    await payload.update({ collection: 'companies', id: entreprise.id, data: { titulaire: membre.id } as never, overrideAccess: true })
    parEntreprise.set(a.nom, membre.id as number)

    // Paiements : droit et 1re tranche pour Kimia Créations (maquette), 1re tranche seule pour le membre en relance, le reste soldé.
    if (m) {
      const p = (objet: string, montant: number) =>
        payload.create({
          collection: 'payments',
          overrideAccess: true,
          data: { membre: membre.id, objet, montant, mode: 'mtn', statut: 'paye', referenceOperateur: `SIM-${numero}-${objet}`, datePaiement: debut.toISOString() } as never,
        })
      if (a.nom === 'Kimia Créations') {
        await p('droit', m.droit)
        await p('tranche1', m.tranche)
      } else if (bo?.cot?.includes('relance')) await p('adhesion-tranche', m.premierVersement)
      else await p('adhesion', m.total)
    }
  }

  // Compteur des numéros d'adhérent de l'année : la prochaine conversion suit le plus grand numéro de démonstration.
  const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }).drizzle
  await db.execute(sql`
    INSERT INTO "counters" ("name", "value", "updated_at", "created_at") VALUES ('adherent-2026', 137, now(), now())
    ON CONFLICT ("name") DO UPDATE SET "value" = GREATEST("counters"."value", 137)
  `)

  // Demandes de modification en attente (écran 05) et une demande déjà validée (historique de l'écran 03).
  const deja = await payload.count({ collection: 'modificationRequests', overrideAccess: true })
  if (!deja.totalDocs) {
    const CHAMP: Record<string, string> = { Téléphone: 'telephone', Secteurs: 'secteurs', 'E-mail': 'email', 'Raison sociale': 'raisonSociale' }
    for (const d of demandes_modification) {
      const membre = parEntreprise.get(d.m)
      if (!membre || !CHAMP[d.champ]) continue
      const r = await payload.create({
        collection: 'modificationRequests',
        overrideAccess: true,
        data: { membre, champ: CHAMP[d.champ], nouvelleValeur: d.apres } as never,
      })
      const jours = Number(/(\d+)/.exec(d.d)?.[1] ?? 1)
      await db.execute(sql`UPDATE "modification_requests" SET "created_at" = ${new Date(Date.now() - jours * 86400e3).toISOString()}, "valeur_actuelle" = ${d.avant} WHERE "id" = ${r.id}`)
    }
    const christelle = parEntreprise.get('Kimia Créations')
    const beryl = await payload.find({ collection: 'users', where: { email: { equals: 'beryl.bobanda@rec242.test' } }, limit: 1, overrideAccess: true })
    if (christelle) {
      const r = await payload.create({
        collection: 'modificationRequests',
        overrideAccess: true,
        data: { membre: christelle, champ: 'quartier', nouvelleValeur: 'Bacongo', motif: 'Déménagement de la boutique' } as never,
      })
      await payload.db.updateOne({
        collection: 'modificationRequests',
        id: r.id,
        data: {
          statut: 'validee',
          valeurActuelle: 'Moungali',
          traitePar: beryl.docs[0]?.id,
          traiteParNom: (beryl.docs[0] as { name?: string } | undefined)?.name ?? 'Béryl Bobanda',
          dateTraitement: '2026-10-08T10:00:00.000Z',
        },
      })
      await db.execute(sql`UPDATE "modification_requests" SET "created_at" = '2026-10-07T09:00:00.000Z' WHERE "id" = ${r.id}`)
    }
  }
  payload.logger.info(`Membres de démonstration : ${parEntreprise.size}.`)
}
