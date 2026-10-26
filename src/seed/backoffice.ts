import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/**
 * Données des écrans natifs du back-office alignées sur la maquette (maquette/back-office) : documents (écran 18),
 * pages (écran 14) et journal des actions (écran 17). Exécuté en fin de seed, sans rien dupliquer.
 */
type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows?: Record<string, unknown>[] }> } }
const drizzle = (payload: Payload) => (payload.db as unknown as Db).drizzle

/** Jour de la maquette (« 3 oct. 2026 »…) à 10 h UTC. */
const jour = (j: number, mois = 10) => new Date(Date.UTC(2026, mois - 1, j, 10)).toISOString()

/** Écran 18 : version, date de mise à jour et téléchargements de chaque document du tableau. */
const DOCUMENTS: [titre: string, version: number, maj: string, telechargements: number][] = [
  ['Statuts de l’association', 2, jour(3), 186],
  ['Règlement intérieur', 2, jour(3), 94],
  ['Charte de l’adhérent', 1, jour(3), 151],
  ['Compte rendu du comité de direction', 1, jour(14), 63],
  ['Support de l’atelier Formalisation', 1, jour(18), 25],
  ['Fiche institutionnelle', 3, jour(20), 41],
  ['Biographies', 1, jour(20), 17],
]

/** Écran 14 : date de mise à jour des pages ; les pages absentes de la maquette passent après. */
const PAGES: [titre: string, maj: string, brouillon?: boolean][] = [
  ['Accueil', jour(20)],
  ['Le réseau', jour(18)],
  ['Gouvernance', jour(15)],
  ['Commissions', jour(15)],
  ['Antennes', jour(12), true],
  ['Notre écosystème', jour(12), true],
  ['Formalisation', jour(9)],
  ['Adhérer', jour(8)],
  ['Mentions légales', jour(3)],
  ['Confidentialité', jour(3)],
]

/** Écran 17 : entrées de la maquette, datées comme elle par rapport au jour de référence (21 octobre 2026). */
const JOURNAL: [action: string, categorie: string, auteur: string, joursAvant: number, heure: string][] = [
  ['A validé la candidature C-0039', 'validation', 'Béryl Bobanda', 0, '14:02'],
  ['A programmé « Communiqué : constitution de REC 242 »', 'publication', 'Yohan Dinga', 0, '11:40'],
  ['A exporté la liste des inscrits (Afterwork)', 'export', 'Pathurel Nkoua Ngassemo', 1, '17:15'],
  ['A refusé la candidature C-0037 (motif renseigné)', 'validation', 'Ange Mouandza', 1, '09:12'],
  ['A modifié le lien du groupe WhatsApp des membres', 'parametres', 'Super administrateur', 2, '16:30'],
]

async function alignerDocuments(payload: Payload): Promise<void> {
  for (const [titre, version, maj, telechargements] of DOCUMENTS) {
    const r = await payload.find({ collection: 'documents', where: { titre: { equals: titre } }, limit: 1, depth: 0, overrideAccess: true })
    const d = r.docs[0]
    if (!d) continue
    await payload.db.updateOne({ collection: 'documents', id: d.id, data: { version, telechargements }, returning: false })
    await drizzle(payload).execute(sql`UPDATE documents SET updated_at = ${maj} WHERE id = ${d.id}`)
  }
}

async function alignerPages(payload: Payload): Promise<void> {
  const db = drizzle(payload)
  // Pages hors maquette : avant la plus ancienne de la maquette.
  await db.execute(sql`UPDATE pages SET updated_at = ${jour(1)}`)
  await db.execute(sql`UPDATE _pages_v SET updated_at = ${jour(1)}, version_updated_at = ${jour(1)} WHERE latest = true`)
  for (const [i, [titre, jourMaj, brouillon]] of PAGES.entries()) {
    // Une seconde d'écart par rang : les pages du même jour gardent l'ordre de la maquette.
    const maj = new Date(Date.parse(jourMaj) - i * 1000).toISOString()
    const r = await payload.find({ collection: 'pages', where: { title: { equals: titre } }, limit: 1, depth: 0, overrideAccess: true })
    const p = r.docs[0]
    if (!p) continue
    if (brouillon) {
      // Modifications en cours, pas encore publiées : la page reste en ligne dans sa version publiée.
      const v = await db.execute(sql`SELECT version__status AS s FROM _pages_v WHERE parent_id = ${p.id} AND latest = true LIMIT 1`)
      if (v.rows?.[0]?.s !== 'draft')
        await payload.update({ collection: 'pages', id: p.id, data: {}, draft: true, overrideAccess: true, context: { skipAudit: true } })
    }
    await db.execute(sql`UPDATE pages SET updated_at = ${maj} WHERE id = ${p.id}`)
    await db.execute(sql`UPDATE _pages_v SET updated_at = ${maj}, version_updated_at = ${maj} WHERE parent_id = ${p.id} AND latest = true`)
  }
}

/**
 * Écran 09 : statuts de la maquette pour trois actualités que le site affiche publiées. Ce sont des modifications en
 * cours (version brouillon plus récente que la version publiée) : le site garde la version publiée.
 */
const ACTUALITES: [titre: string, etat: string, joursApres?: number, titreBrouillon?: string, auteurEmail?: string][] = [
  ['Communiqué : constitution de REC 242', 'programme', 4],
  ['Les adhésions bientôt ouvertes en ligne', 'brouillon'],
  ['Compte rendu : réunion du comité de direction', 'relecture', undefined, 'Compte rendu réservé : réunion du comité de direction', 'georges.mfouli@rec242.test'],
]

async function alignerActualites(payload: Payload): Promise<void> {
  const db = drizzle(payload)
  const today = new Date()
  for (const [titre, etat, joursApres, titreBrouillon, auteurEmail] of ACTUALITES) {
    const r = await payload.find({ collection: 'news', where: { titre: { equals: titre } }, limit: 1, depth: 0, overrideAccess: true })
    const n = r.docs[0]
    if (!n) continue
    const v = await db.execute(sql`SELECT version__status AS s FROM _news_v WHERE parent_id = ${n.id} AND latest = true LIMIT 1`)
    if (v.rows?.[0]?.s !== 'draft')
      await payload.update({ collection: 'news', id: n.id, data: {}, draft: true, overrideAccess: true, context: { skipAudit: true } })
    // Programmée : à 9 h (heure de Brazzaville), quatre jours après le jour de la maquette ramené à aujourd'hui.
    const date = joursApres
      ? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + joursApres, 8)).toISOString()
      : null
    const auteur = auteurEmail
      ? (await payload.find({ collection: 'users', where: { email: { equals: auteurEmail } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]?.id
      : undefined
    await db.execute(sql`UPDATE _news_v SET version_etat = ${etat}, version_titre = ${titreBrouillon ?? titre}
      ${date ? sql`, version_date_publication = ${date}` : sql``}
      ${auteur ? sql`, version_auteur_id = ${auteur}` : sql``}
      WHERE parent_id = ${n.id} AND latest = true`)
  }
}

async function seedJournal(payload: Payload): Promise<void> {
  const today = new Date()
  for (const [action, categorie, auteurNom, joursAvant, heure] of JOURNAL) {
    const r = await payload.find({ collection: 'auditLog', where: { action: { equals: action } }, limit: 1, depth: 0, overrideAccess: true })
    if (r.docs[0]) continue
    const [h, m] = heure.split(':').map(Number)
    // Heure de Brazzaville (UTC+1).
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - joursAvant, h - 1, m)).toISOString()
    const doc = await payload.create({
      collection: 'auditLog',
      overrideAccess: true,
      data: { action, categorie: categorie as never, auteurType: 'utilisateur', auteurNom, ville: 'Brazzaville' },
    })
    await drizzle(payload).execute(sql`UPDATE audit_log SET created_at = ${date}, updated_at = ${date} WHERE id = ${doc.id}`)
  }
}

export async function alignerBackOffice(payload: Payload): Promise<void> {
  await alignerDocuments(payload)
  await alignerPages(payload)
  await alignerActualites(payload)
  await seedJournal(payload)
  payload.logger.info('Back-office : documents, pages, actualités et journal alignés sur la maquette.')
}
