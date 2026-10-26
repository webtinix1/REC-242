import type { Payload } from 'payload'

import type { Role } from '@/access/roles'
import { media } from './lib'

/**
 * Comptes d'administration de démonstration (docs/04-roles-et-droits.md, titulaires actuels).
 * Les adresses sont fictives (domaine .test) : les vraies adresses seront fournies par REC 242.
 * Mot de passe commun en développement : variable SEED_PASSWORD (12 caractères minimum).
 */
export const DEMO_USERS: { name: string; email: string; roles: Role[] }[] = [
  { name: 'Webtinix (maintenance)', email: 'maintenance@webtinix.test', roles: ['superadmin'] },
  { name: 'Ange Mouandza', email: 'ange.mouandza@rec242.test', roles: ['superadmin'] },
  { name: 'Eve', email: 'eve@rec242.test', roles: ['admin'] },
  { name: 'Georges Mfouli', email: 'georges.mfouli@rec242.test', roles: ['admin'] },
  { name: 'Béryl Bobanda', email: 'beryl.bobanda@rec242.test', roles: ['membres'] },
  { name: 'Gilles Oniangue', email: 'gilles.oniangue@rec242.test', roles: ['membres'] },
  { name: 'Yohan Dinga', email: 'yohan.dinga@rec242.test', roles: ['editeur'] },
  { name: 'Lilia Kongo', email: 'lilia.kongo@rec242.test', roles: ['editeur'] },
  { name: 'Pathurel Nkoua Ngassemo', email: 'pathurel.nkoua@rec242.test', roles: ['evenements'] },
  // Le trésorier est à désigner par REC 242 : compte de démonstration seulement.
  { name: 'Trésorier (à désigner)', email: 'tresorier@rec242.test', roles: ['tresorier'] },
]

export async function seedUsers(payload: Payload): Promise<void> {
  const password = process.env.SEED_PASSWORD || 'Rec242-demo-2026'
  for (const u of DEMO_USERS) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: u.email } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) continue
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { skipAudit: true },
      data: { ...u, statut: 'actif', password },
    })
  }
  await alignerUtilisateurs(payload)
  payload.logger.info(`Utilisateurs de démonstration : ${DEMO_USERS.length} comptes vérifiés.`)
}

/**
 * Écran 16 de la maquette : ordre du tableau, photo, dernière connexion (relative au jour du seed, heure de Brazzaville)
 * et statut de chaque compte. Le compte du trésorier, absent de la maquette, passe en dernier.
 */
const MAQUETTE_USERS: { email: string; photo?: string; jours?: number; heure?: string; statut?: 'invite' }[] = [
  { email: 'maintenance@webtinix.test', jours: 3, heure: '11:00' },
  { email: 'ange.mouandza@rec242.test', photo: 'ange-mouandza', jours: 1, heure: '19:12' },
  { email: 'eve@rec242.test', photo: 'eve', jours: 0, heure: '09:40' },
  { email: 'gilles.oniangue@rec242.test', photo: 'gilles-oniangue', jours: 0, heure: '08:15' },
  { email: 'beryl.bobanda@rec242.test', photo: 'beryl-bobanda', jours: 0, heure: '08:02' },
  { email: 'yohan.dinga@rec242.test', photo: 'yohan-dinga', jours: 1, heure: '17:30' },
  { email: 'lilia.kongo@rec242.test', photo: 'lilia-kongo', jours: 4, heure: '10:00' },
  { email: 'pathurel.nkoua@rec242.test', photo: 'pathurel-nkoua-ngassemo', jours: 0, heure: '10:05' },
  { email: 'georges.mfouli@rec242.test', photo: 'georges-mfouli', statut: 'invite' },
  { email: 'tresorier@rec242.test' },
]

async function alignerUtilisateurs(payload: Payload): Promise<void> {
  const debut = Date.UTC(2026, 0, 1)
  const today = new Date()
  for (const [i, u] of MAQUETTE_USERS.entries()) {
    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: u.email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const doc = found.docs[0]
    if (!doc) continue
    let lastLogin: string | null = null
    if (u.jours !== undefined && u.heure) {
      const [h, m] = u.heure.split(':').map(Number)
      // Heure de Brazzaville (UTC+1).
      lastLogin = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - u.jours, h - 1, m),
      ).toISOString()
    }
    const photo = u.photo
      ? await media(payload, `design/images/personnes/${u.photo}.webp`, doc.name as string, false)
      : undefined
    await payload.db.updateOne({
      collection: 'users',
      id: doc.id,
      data: {
        lastLogin,
        statut: u.statut ?? 'actif',
        ...(photo ? { photo } : {}),
        // L'ordre de création donne l'ordre du tableau (tri par défaut de la collection).
        createdAt: new Date(debut + i * 60_000).toISOString(),
      },
    })
  }
}
