import type { Payload } from 'payload'

import { readSeed } from './lib'

/**
 * Lot 9 : opportunités de démonstration (seed/opportunites.json : site, espace membre, back-office).
 * Créées en brouillon puis passées à leur statut de démonstration directement en base : certaines sont déjà
 * expirées ou n'ont pas de lien de source dans la maquette (l'interface l'exigerait pour un appel d'offres).
 */
type Site = { type: string; titre: string; vis: string; limite: string; secteur: string; par: string }
type Espace = Site & { desc?: string; how?: string }
type Bo = { titre: string; type: string; vis: string; limite: string; statut: string }

const TYPE: Record<string, string> = {
  'Appel à partenariat': 'partenariat',
  'Événement partenaire': 'evenement',
  'Appel d’offres': 'appel-offres',
  Financement: 'financement',
  'Rencontre B2B ou mission': 'b2b',
  'Offre entre membres': 'offre-membre',
}
const MOIS: Record<string, number> = { janv: 0, févr: 1, mars: 2, avr: 3, mai: 4, juin: 5, juil: 6, août: 7, sept: 8, oct: 9, nov: 10, novembre: 10, déc: 11, décembre: 11, octobre: 9 }
const date = (s: string) => {
  const [j, m, a] = s.replace('.', '').split(' ')
  return new Date(Date.UTC(Number(a), MOIS[m] ?? 0, Number(j), 12)).toISOString()
}

export async function seedOpportunites(payload: Payload): Promise<void> {
  if ((await payload.count({ collection: 'opportunities', overrideAccess: true })).totalDocs) return
  const { site, espace_membre, back_office } = readSeed<{ site: Site[]; espace_membre: Espace[]; back_office: Bo[] }>('opportunites')
  const secteurs = await payload.find({ collection: 'sectors', limit: 50, depth: 0, overrideAccess: true })
  const sid = (nom: string) => (secteurs.docs as unknown as { id: number; nom: string }[]).find((s) => s.nom === nom)?.id
  const membre = async (email: string) =>
    (await payload.find({ collection: 'members', where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]?.id as number | undefined
  const auteurs: Record<string, number | undefined> = {
    'Recherche d’un partenaire de distribution à Pointe-Noire': await membre('christelle@kimiacreations.cg'),
    'Sous-traitance en développement web, mission de 2 mois': await membre('rodrigue.itoua@membres.rec242.test'),
    'Recherche de livreurs à moto à Pointe-Noire': await membre('herve.ondongo@membres.rec242.test'),
  }

  const creer = async (o: { titre: string; type: string; vis: string; limite: string; secteur?: string; desc?: string; how?: string; par?: string }, statut: string) => {
    const membreId = auteurs[o.titre]
    const officielle = o.par && !/REC 242|Membre|Votre annonce|membre catégorie/.test(o.par) && o.par !== 'Source officielle à citer'
    const doc = await payload.create({
      collection: 'opportunities',
      overrideAccess: true,
      context: { sansEmail: true },
      data: {
        type: TYPE[o.type] ?? 'partenariat',
        titre: o.titre,
        description: o.desc ?? `${o.titre}.`,
        commentRepondre: o.how,
        visibilite: o.vis === 'Public' ? 'public' : 'membres',
        dateLimite: date(o.limite),
        secteurs: o.secteur && sid(o.secteur) ? [sid(o.secteur)] : [],
        source: officielle ? { libelle: o.par } : undefined,
        auteur: membreId ? 'membre' : 'rec242',
        membre: membreId,
        statut: 'brouillon',
      } as never,
    })
    await payload.db.updateOne({
      collection: 'opportunities',
      id: doc.id,
      // Démonstration : l'appel à partenariat de REC 242 est mis en avant sur l'accueil (opportunité publique).
      data: { statut, publieLe: statut === 'publiee' ? new Date().toISOString() : null, miseEnAvant: statut === 'publiee' && o.vis === 'Public' && o.type === 'Appel à partenariat' },
      returning: false,
    })
  }

  // Les fiches détaillées de l'espace membre priment sur les cartes du site (mêmes titres, avec description).
  const titres = new Set(espace_membre.map((o) => o.titre))
  for (const o of espace_membre) await creer(o, 'publiee')
  for (const o of site.filter((s) => !titres.has(s.titre))) await creer(o, 'publiee')
  for (const o of back_office.filter((b) => !titres.has(b.titre) && !site.some((s) => s.titre === b.titre) && !b.titre.startsWith('Partenaires pour')))
    await creer(o, o.statut === 'À modérer' ? 'a-moderer' : o.statut === 'Expirée' ? 'expiree' : 'publiee')
  payload.logger.info('Opportunités de démonstration chargées.')
}
