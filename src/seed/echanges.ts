import { randomBytes } from 'crypto'
import type { Payload } from 'payload'

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
const quand = (s: string) => (/Aujourd/.test(s) ? 0 : /Hier/.test(s) ? 1 : Number(/(\d+) jours?/.exec(s)?.[1] ?? 3))

export async function seedEchanges(payload: Payload): Promise<void> {
  if ((await payload.count({ collection: 'expertRequests', overrideAccess: true })).totalDocs) return
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
  for (const q of questions_experts) {
    const m = parNom(q.m)
    if (!m || !pid(q.to) || !tid(q.tag)) continue
    const date = /oct/.test(q.d) ? new Date(`2026-10-${q.d.split(' ')[0].padStart(2, '0')}T09:00:00Z`).toISOString() : jours(quand(q.d))
    const fil = [{ auteurType: 'membre', auteurNom: q.m, texte: q.q, date }]
    if (REPONSES[q.q]) fil.push({ auteurType: 'expert', auteurNom: q.to, texte: REPONSES[q.q], date: new Date(new Date(date).getTime() + 3 * 86400e3).toISOString() })
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
        nonLuMembre: q.st === 'En cours',
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
        fil: [ligne({ auteur: herve.id, texte: 'Avec plaisir. Appelez-moi pour un tarif au mois.', date: jours(2) })],
        nonLuPar: [],
        createdAt: jours(3),
        updatedAt: jours(2),
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
        createdAt: jours(0),
        updatedAt: jours(0),
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
        titre: `Votre reçu ${recu?.numero ?? ''}`.trim(),
        texte: `Merci pour votre paiement (cotisation, 1re tranche). Votre reçu ${recu?.numero ?? ''} est disponible dans Cotisation.`,
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
