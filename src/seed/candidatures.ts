/**
 * Lot 5 : candidatures de démonstration (seed/candidatures.json) et leurs paiements.
 * Les numéros reprennent ceux de la maquette (C-0037 à C-0043) : le compteur part de 36 sur une base vide.
 */
import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { categorie, montants, type Tarifs } from '@/lib/adhesion/categories'
import { readSeed } from './lib'

type Cand = {
  ref: string
  nom: string
  ent: string
  cat: string
  sect: string
  ville: string
  recue: string
  statut: string
  paye: string
  telephone: string
  email: string
  tranche_age: string
  forme_juridique: string
  objectifs: string
  connu_par: string
}

const STATUT: Record<string, string> = {
  Reçue: 'recue',
  'En examen': 'en-examen',
  'Complément demandé': 'complement',
  Acceptée: 'acceptee',
  Refusée: 'refusee',
}
const CAT: Record<string, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  P: 'partenaire',
  E: 'expert',
  H: 'honneur',
}
const AGE: Record<string, string> = {
  '18-25': '18-25',
  '26-35': '26-35',
  '36-45': '36-45',
  '46 et plus': '46+',
}
const FORME: Record<string, string> = {
  'Activité informelle': 'informelle',
  'Entreprise individuelle': 'individuelle',
  SARL: 'sarl',
  SA: 'sa',
}
const CONNU: Record<string, string> = {
  'Un membre': 'membre',
  'Réseaux sociaux': 'reseaux',
  'Événement du réseau': 'evenement',
  'Bouche-à-oreille': 'autre',
  'Site internet': 'autre',
}
const OBJ: Record<string, string> = {
  partenariats: 'affaires',
  visibilité: 'visibilite',
  "opportunités d'affaires": 'affaires',
  'activités et afterworks': 'afterworks',
  formations: 'formations',
  formalisation: 'formalisation',
}

const joursAvant = (recue: string) => {
  const m = recue.match(/(\d+)\s*jour/)
  return Number(m?.[1] ?? 0)
}

export async function seedCandidatures(payload: Payload): Promise<void> {
  if ((await payload.count({ collection: 'applications', overrideAccess: true })).totalDocs) return
  const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } })
    .drizzle
  await db.execute(sql`
    INSERT INTO "counters" ("name", "value", "updated_at", "created_at") VALUES ('dossier', 36, now(), now())
    ON CONFLICT ("name") DO UPDATE SET "value" = GREATEST("counters"."value", 36)
  `)
  const [secteurs, localites] = await Promise.all([
    payload.find({ collection: 'sectors', limit: 50, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'localities', limit: 50, depth: 0, overrideAccess: true }),
  ])
  const idDe = (docs: unknown[], nom: string) =>
    (docs as { id: number; nom: string }[]).find((x) => x.nom === nom)?.id
  const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })) as {
    tarifs?: Tarifs
  }
  const { liste } = readSeed<{ liste: Cand[] }>('candidatures')

  // Du plus ancien au plus récent, pour que les numéros suivent l'ordre de la maquette.
  for (const c of [...liste].sort((a, b) => a.ref.localeCompare(b.ref))) {
    const mots = c.nom.split(' ')
    const cat = CAT[c.cat] ?? 'B'
    const paiementSiege = c.paye === 'Paiement au siège'
    const doc = await payload.create({
      collection: 'applications',
      overrideAccess: true,
      context: { sansEmail: true },
      data: {
        source: 'en-ligne',
        civilite: undefined,
        nom: mots.slice(-1).join(' '),
        prenom: mots.slice(0, -1).join(' '),
        telephone: c.telephone,
        email: c.email,
        trancheAge: AGE[c.tranche_age],
        raisonSociale: c.ent,
        formeJuridique: FORME[c.forme_juridique] ?? 'autre',
        localite: idDe(localites.docs, c.ville),
        description: `${c.ent} : activité ${c.sect.toLowerCase()} à ${c.ville}.`,
        secteurs: [idDe(secteurs.docs, c.sect)].filter(Boolean),
        anciennete: '1-3',
        objectifs: [
          ...new Set(
            c.objectifs
              .split(',')
              .map((o) => OBJ[o.trim().toLowerCase()])
              .filter(Boolean),
          ),
        ],
        connuPar: CONNU[c.connu_par] ?? 'autre',
        categorie: cat,
        modalite: categorie(cat)?.convention
          ? undefined
          : c.paye.includes('tranche')
            ? 'deux-tranches'
            : 'une-fois',
        modePaiement: categorie(cat)?.convention ? undefined : paiementSiege ? 'siege' : 'mobile',
        autorisations: { annuaire: true, coordonnees: true, logo: true, portrait: false },
        consentement: true,
        acceptationTextes: true,
      } as never,
    })
    const date = new Date(Date.now() - joursAvant(c.recue) * 24 * 3600e3)
    const statut = STATUT[c.statut] ?? 'recue'
    if (statut !== 'recue')
      await payload.update({
        collection: 'applications',
        id: doc.id,
        overrideAccess: true,
        context: { sansEmail: true },
        data: {
          statut,
          motifRefus: statut === 'refusee' ? 'Motif de démonstration.' : undefined,
          pieceVerifiee: statut === 'acceptee',
          charteSignee: statut === 'acceptee',
        } as never,
      })
    // Date de réception de la maquette (« il y a N jours »).
    await db.execute(
      sql`UPDATE "applications" SET "created_at" = ${date.toISOString()} WHERE "id" = ${doc.id}`,
    )
    // Paiements reçus (mode simulation : paiement mobile confirmé).
    const m = montants(categorie(cat), s.tarifs)
    if (
      m &&
      (c.paye.includes('payée') || c.paye.includes('totalité') || c.paye.includes('Remboursement'))
    ) {
      const deux = c.paye.includes('tranche')
      const p = await payload.create({
        collection: 'payments',
        overrideAccess: true,
        data: {
          candidature: doc.id,
          objet: deux ? 'adhesion-tranche' : 'adhesion',
          montant: deux ? m.premierVersement : m.total,
          mode: 'mtn',
          statut: 'paye',
          referenceOperateur: `SIM-${c.ref}`,
          datePaiement: date.toISOString(),
        } as never,
      })
      if (c.paye.includes('Remboursement'))
        await payload.update({
          collection: 'payments',
          id: p.id,
          overrideAccess: true,
          data: { statut: 'remboursement' } as never,
        })
    }
  }
  payload.logger.info(`Candidatures de démonstration : ${liste.length}.`)
}
