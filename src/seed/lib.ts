import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

export const ROOT = process.cwd()
export const SEED_DIR = path.join(ROOT, 'seed')

export const readSeed = <T = Record<string, unknown>>(name: string): T =>
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
): Promise<number | undefined> {
  if (!relPath) return undefined
  if (mediaCache.has(relPath)) return mediaCache.get(relPath)
  const abs = path.join(ROOT, relPath)
  if (!fs.existsSync(abs)) {
    payload.logger.warn(`Image absente : ${relPath}`)
    return undefined
  }
  const base = path.basename(relPath).replace(/\.[a-z0-9]+$/i, '')
  const found = await payload.find({
    collection: 'media',
    where: { filename: { like: base } },
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
