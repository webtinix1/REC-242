import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'test@rec242.test',
  password: 'Test-rec242-2026',
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await payload.db.deleteMany({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })

  // Create fresh test user
  await payload.create({
    collection: 'users',
    overrideAccess: true,
    context: { skipAudit: true },
    data: { ...testUser, name: 'Test REC 242', roles: ['superadmin'], statut: 'actif' },
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.db.deleteMany({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
}
