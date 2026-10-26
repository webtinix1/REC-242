import { randomBytes } from 'crypto'
import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { numeroRecu } from '@/lib/compteurs'
import { ajouterJoursOuvres } from '@/lib/experts/delais'
import { readSeed } from './lib'

/**
 * Lot 10 : échanges de démonstration (seed/demandes-et-messages.json et « Mes échanges » de la maquette).
 * Écrits directement en base (sans les hooks) : certains auteurs sont suspendus ou n'ont pas de compte de démonstration,
 * et les dates de la maquette sont dans le passé.
 */
// Les lignes de tableau écrites directement en base ont besoin de leur identifiant.
const ligne = <T extends object>(x: T) => ({ id: randomBytes(12).toString('hex'), ...x })
const jours = (n: number) => new Date(Date.now() - n * 86400e3).toISOString()
const heures = (n: number) => new Date(Date.now() - n * 3600e3).toISOString()
const quand = (s: string) => (/Aujourd/.test(s) ? 0 : /Hier/.test(s) ? 1 : Number(/(\d+) jours?/.exec(s)?.[1] ?? 3))

export async function seedEchanges(payload: Payload): Promise<void> {
  // Les échanges sont recréés à chaque lancement : l'état « non lu » de la maquette (3 éléments pour Christelle Malonga) est rétabli.
  const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }).drizzle
  for (const t of ['expert_requests', 'connection_requests', 'opportunity_replies', 'network_messages', 'commission_requests'])
    await db.execute(sql.raw(`DELETE FROM "${t}"`))
  const { questions_experts, demandes_commissions } = readSeed<{
    questions_experts: { m: string; q: string; tag: string; to: string; d: string; st: string }[]
    demandes_commissions: { nom: string; com: string; motiv: string }[]
  }>('demandes-et-messages')
  const membres = await payload.find({ collection: 'members', limit: 100, depth: 1, overrideAccess: true })
  const parNom = (nom: string) =>
    (membres.docs as unknown as { id: number; nomComplet?: string; entreprise?: { id: number; nom: string } | null }[]).find((m) => m.nomComplet === nom)
  const parEntreprise = (nom: string) =>
    (membres.docs as unknown as { id: number; entreprise?: { id: number; nom: string } | null }[]).find((m) => m.entreprise?.nom === nom)
  const [people, tags, commissions] = await Promise.all([
    payload.find({ collection: 'people', limit: 100, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'expertiseTags', limit: 100, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'commissions', limit: 50, depth: 0, overrideAccess: true }),
  ])
  const pid = (nom: string) => (people.docs as unknown as { id: number; nom: string }[]).find((p) => p.nom === nom)?.id
  const tid = (nom: string) => (tags.docs as unknown as { id: number; nom: string }[]).find((t) => t.nom === nom)?.id
  const cid = (nom: string) => (commissions.docs as unknown as { id: number; nom: string }[]).find((c) => `Commission ${c.nom}` === nom || c.nom === nom)?.id

  const christelle = parNom('Christelle Malonga')
  const herve = parNom('Hervé Ondongo')
  const leon = parNom('Léon Massamba')
  const nadege = parNom('Nadège Loubaki')

  // Questions aux experts (écran back-office 21 et onglet Experts de Mes échanges).
  const STATUT: Record<string, string> = { 'En cours': 'en-cours', 'Sans réponse': 'sans-reponse', Transmise: 'envoyee', Répondue: 'repondue' }
  const REPONSES: Record<string, string> = {
    'Préparer un dossier de financement pour un local':
      'Je vous envoie un modèle de plan de financement. Prenons 30 minutes au siège jeudi pour le remplir ensemble.',
    'Quel statut juridique pour vendre en ligne ?':
      'Votre établissement suffit pour démarrer. Indiquez vos mentions légales sur le site et conservez vos factures.',
  }
  // Textes complets des questions (Mes échanges, onglet Experts de la maquette).
  const DETAIL: Record<string, string> = {
    'Préparer un dossier de financement pour un local':
      'Je veux louer un local de 40 m² à Bacongo. La banque me demande un plan de financement. Que dois-je préparer ?',
    'Quel statut juridique pour vendre en ligne ?': 'Je veux vendre mes sacs sur internet. Dois-je créer une société ?',
  }
  for (const q of questions_experts) {
    const m = parNom(q.m)
    if (!m || !pid(q.to) || !tid(q.tag)) continue
    const date = /oct/.test(q.d) ? new Date(`2026-10-${q.d.split(' ')[0].padStart(2, '0')}T09:00:00Z`).toISOString() : jours(quand(q.d))
    const fil = [{ auteurType: 'membre', auteurNom: q.m, texte: DETAIL[q.q] ?? q.q, date }]
    if (REPONSES[q.q]) fil.push({ auteurType: 'expert', auteurNom: q.to, texte: REPONSES[q.q], date: new Date(new Date(date).getTime() + (q.q.startsWith('Préparer') ? 3 : 1) * 86400e3).toISOString() })
    await payload.db.create({
      collection: 'expertRequests',
      data: {
        membre: m.id,
        etiquette: tid(q.tag),
        personne: pid(q.to),
        question: q.q,
        preference: 'whatsapp',
        statut: STATUT[q.st] ?? 'envoyee',
        echeance: ajouterJoursOuvres(new Date(date), 5).toISOString(),
        fil: fil.map(ligne),
        relances: 0,
        nonLuMembre: q.q.startsWith('Préparer'),
        createdAt: date,
        updatedAt: date,
      },
    })
  }

  // Mises en relation : acceptée avec Fako Drop (fil), demande reçue de Léon Massamba à votre décision.
  if (christelle && herve) {
    const fako = parEntreprise('Fako Drop')
    await payload.db.create({
      collection: 'connectionRequests',
      data: {
        demandeur: christelle.id,
        destinataire: herve.id,
        entreprise: fako?.entreprise?.id,
        objet: 'Livraisons régulières entre Brazzaville et Pointe-Noire',
        message: 'Bonjour, j’envoie chaque semaine des colis vers Pointe-Noire. Pourriez-vous me faire une proposition pour des livraisons régulières ?',
        statut: 'acceptee',
        dateReponse: jours(2),
        // Maquette : le fil d'Hervé Ondongo (réponse il y a 2 jours) ouvre la liste, devant la demande de Léon Massamba reçue aujourd'hui :
        // le tri suit la dernière activité du fil (updatedAt), ici une consultation récente.
        fil: [ligne({ auteur: herve.id, texte: 'Avec plaisir. J’accepte la mise en relation. Mon numéro WhatsApp : +242 06 903 47 25. Appelez-moi pour un tarif au mois.', date: jours(2) })],
        nonLuPar: [],
        createdAt: jours(3),
        updatedAt: heures(1),
      },
    })
  }
  if (christelle && leon) {
    await payload.db.create({
      collection: 'connectionRequests',
      data: {
        demandeur: leon.id,
        destinataire: christelle.id,
        entreprise: christelle.entreprise?.id,
        objet: 'Dépôt-vente de bretelles dans votre boutique',
        message:
          'Bonjour Christelle, j’ai vu votre boutique à Bacongo. Mes bretelles en wax iraient bien avec vos sacs. Seriez-vous d’accord pour un dépôt-vente de quelques pièces, pour essayer ?',
        statut: 'attente',
        nonLuPar: [christelle.id],
        createdAt: heures(5),
        updatedAt: heures(5),
      },
    })
  }

  // Réponses à l'annonce de Christelle Malonga.
  const annonce = (await payload.find({ collection: 'opportunities', where: { titre: { equals: 'Recherche d’un partenaire de distribution à Pointe-Noire' } }, limit: 1, overrideAccess: true })).docs[0]
  if (annonce && christelle) {
    const rep = [
      [herve, 'Bonjour, nous livrons trois boutiques de mode à Pointe-Noire. Je peux vous mettre en contact avec deux d’entre elles et assurer les livraisons.', 1, true],
      [nadege, 'Ma sœur tient une boutique au marché de Tié-Tié. Je lui ai transmis votre annonce, elle vous contactera.', 4, false],
    ] as const
    for (const [m, texte, j, nonLu] of rep)
      if (m)
        await payload.db.create({
          collection: 'opportunityReplies',
          data: { opportunite: annonce.id, membre: m.id, message: texte, lue: !nonLu, nonLuPar: nonLu ? [christelle.id] : [], fil: [], createdAt: jours(j), updatedAt: jours(j) },
        })
  }

  // Message du réseau (reçu de paiement).
  if (christelle) {
    const recu = (await payload.find({ collection: 'payments', where: { and: [{ membre: { equals: christelle.id } }, { objet: { equals: 'tranche1' } }] }, limit: 1, overrideAccess: true })).docs[0] as unknown as
      | { numero?: string }
      | undefined
    await payload.db.create({
      collection: 'networkMessages',
      data: {
        membre: christelle.id,
        tous: false,
        titre: `Votre reçu ${numeroRecu(Number(recu?.numero))}`.trim(),
        texte: `Merci pour votre paiement de 37 500 FCFA (cotisation 2026, 1re tranche). Votre reçu ${numeroRecu(Number(recu?.numero))} est disponible dans Cotisation.`,
        luPar: [christelle.id],
        createdAt: jours(5),
        updatedAt: jours(5),
      },
    })
  }

  // Demandes pour rejoindre une commission (écran back-office 19).
  for (const d of demandes_commissions) {
    const m = parNom(d.nom)
    const c = cid(d.com)
    if (m && c) await payload.db.create({ collection: 'commissionRequests', data: { membre: m.id, commission: c, apport: d.motiv, statut: 'attente', createdAt: jours(3), updatedAt: jours(3) } })
  }
  payload.logger.info('Échanges de démonstration chargés.')
}
