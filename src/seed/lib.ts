import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

export const ROOT = process.cwd()
export const SEED_DIR = path.join(ROOT, 'seed')

/** Mot de passe de démonstration utilisé en développement quand SEED_PASSWORD n'est pas renseigné. */
const MOT_DE_PASSE_DEMO = 'Rec242-demo-2026'

/**
 * Le seed crée des comptes au mot de passe connu : il est refusé en production, sauf demande explicite
 * (SEED_EN_PRODUCTION=oui), et dans ce cas SEED_PASSWORD est obligatoire (12 caractères minimum).
 * `payload run` ne fixe pas NODE_ENV : en développement local, la commande habituelle continue de fonctionner.
 */
export function verifierEnvironnementSeed(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return
  if (env.SEED_EN_PRODUCTION !== 'oui')
    throw new Error('Seed refusé en production : il crée des comptes de démonstration. Pour le lancer quand même : SEED_EN_PRODUCTION=oui et SEED_PASSWORD.')
  if (!env.SEED_PASSWORD || env.SEED_PASSWORD.length < 12)
    throw new Error('Seed en production : SEED_PASSWORD (12 caractères minimum) est obligatoire.')
}

/** Mot de passe des comptes de démonstration (administration et membres). */
export function motDePasseSeed(env: NodeJS.ProcessEnv = process.env): string {
  verifierEnvironnementSeed(env)
  return env.SEED_PASSWORD || MOT_DE_PASSE_DEMO
}

export const readSeed =<T = Record<string, unknown>>(name: string): T =>
  JSON.parse(fs.readFileSync(path.join(SEED_DIR, `${name}.json`), 'utf-8')) as T

/** Trouve un document par un champ, ou le crée. Idempotent. */
export async function upsert<T extends { id: number | string }>(
  payload: Payload,
  collection: string,
  field: string,
  value: unknown,
  data: Record<string, unknown>,
  opts: { filePath?: string; draft?: boolean } = {},
): Promise<T> {
  const found = await payload.find({
    collection: collection as never,
    where: { [field]: { equals: value } } as never,
    limit: 1,
    depth: 0,
    overrideAccess: true,
    draft: true,
  })
  if (found.docs[0]) return found.docs[0] as unknown as T
  return (await payload.create({
    collection: collection as never,
    data: data as never,
    overrideAccess: true,
    context: { skipAudit: true },
    filePath: opts.filePath,
    draft: opts.draft,
  })) as unknown as T
}

const mediaCache = new Map<string, number>()

/** Importe une image de design/images dans la médiathèque (une seule fois). Renvoie son identifiant. */
export async function media(
  payload: Payload,
  relPath: string,
  alt: string,
  illustration = true,
  focal?: [number, number],
): Promise<number | undefined> {
  if (!relPath) return undefined
  const abs = path.join(ROOT, relPath)
  if (!fs.existsSync(abs)) {
    payload.logger.warn(`Image absente : ${relPath}`)
    return undefined
  }
  const base = path.basename(relPath).replace(/\.[a-z0-9]+$/i, '')
  const found = await payload.find({
    collection: 'media',
    where: { filename: { equals: `${base}.webp` } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const id =
    (found.docs[0]?.id as number | undefined) ??
    ((
      await payload.create({
        collection: 'media',
        data: { alt, illustration },
        filePath: abs,
        overrideAccess: true,
      })
    ).id as number)
  mediaCache.set(relPath, id)
  // Image déjà importée : on garde le dernier texte alternatif fourni (les pages décrivent mieux l'image que les titres d'actualités).
  await payload.db.updateOne({
    collection: 'media',
    id,
    data: focal ? { alt, focalX: focal[0], focalY: focal[1] } : { alt },
  })
  return id
}

type LexNode = Record<string, unknown>
const text = (t: string): LexNode => ({
  type: 'text',
  text: t,
  version: 1,
  format: 0,
  mode: 'normal',
  style: '',
  detail: 0,
})

/**
 * Texte riche Lexical à partir de lignes simples : « ## Titre » devient un intertitre,
 * les autres lignes des paragraphes.
 */
export const rich = (lines: string[]) => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    children: lines.map((l) =>
      l.startsWith('## ')
        ? {
            type: 'heading',
            tag: 'h2',
            version: 1,
            direction: 'ltr',
            format: '',
            indent: 0,
            children: [text(l.slice(3))],
          }
        : {
            type: 'paragraph',
            version: 1,
            direction: 'ltr',
            format: '',
            indent: 0,
            textFormat: 0,
            children: [text(l)],
          },
    ),
  },
})

const MOIS: Record<string, number> = {
  janv: 0,
  janvier: 0,
  févr: 1,
  février: 1,
  mars: 2,
  avr: 3,
  avril: 3,
  mai: 4,
  juin: 5,
  juil: 6,
  juillet: 6,
  août: 7,
  sept: 8,
  septembre: 8,
  oct: 9,
  octobre: 9,
  nov: 10,
  novembre: 10,
  déc: 11,
  décembre: 11,
}

/** « 3 oct. 2026 » ou « 20 octobre 2026 » → date ISO (midi, heure de Brazzaville). */
export const dateFr = (s: string): string | undefined => {
  const m = s.trim().match(/^(\d{1,2})\s+([a-zéû]+)\.?\s+(\d{4})/i)
  if (!m) return undefined
  const mois = MOIS[m[2].toLowerCase()]
  if (mois === undefined) return undefined
  return new Date(Date.UTC(Number(m[3]), mois, Number(m[1]), 11, 0, 0)).toISOString()
}
