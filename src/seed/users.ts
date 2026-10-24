import type { Payload } from 'payload'

import type { Role } from '@/access/roles'

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
    const existing = await payload.find({ collection: 'users', where: { email: { equals: u.email } }, limit: 1, overrideAccess: true })
    if (existing.docs[0]) continue
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { skipAudit: true },
      data: { ...u, statut: 'actif', password },
    })
  }
  payload.logger.info(`Utilisateurs de démonstration : ${DEMO_USERS.length} comptes vérifiés.`)
}
