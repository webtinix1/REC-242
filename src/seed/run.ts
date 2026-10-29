import { getPayload } from 'payload'
import config from '@payload-config'
import { seed } from './index'
import { verifierEnvironnementSeed } from './lib'

// Avant toute connexion à la base : en production, rien n'est purgé ni créé sans SEED_EN_PRODUCTION=oui et SEED_PASSWORD.
verifierEnvironnementSeed()
const payload = await getPayload({ config })
await seed(payload)
process.exit(0)
