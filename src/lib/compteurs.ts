import { sql } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'

/**
 * Numérotation sans trou (dossiers C-0001, reçus PAY-0001…) : une ligne par compteur dans la table `counters`,
 * incrémentée par une seule requête « INSERT … ON CONFLICT … RETURNING » qui verrouille la ligne.
 * Exécutée dans la transaction de la requête quand il y en a une : si l'enregistrement échoue, le numéro n'est pas consommé.
 */
export async function prochainNumero(
  payload: Payload,
  nom: string,
  req?: Partial<PayloadRequest>,
): Promise<number> {
  const adapter = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows: { value: number }[] }> }
    sessions?: Record<
      string,
      { db: { execute: (q: unknown) => Promise<{ rows: { value: number }[] }> } }
    >
  }
  const tid = req?.transactionID ? await req.transactionID : undefined
  const db = (tid && adapter.sessions?.[String(tid)]?.db) || adapter.drizzle
  const r = await db.execute(sql`
    INSERT INTO "counters" ("name", "value", "updated_at", "created_at")
    VALUES (${nom}, 1, now(), now())
    ON CONFLICT ("name") DO UPDATE SET "value" = "counters"."value" + 1, "updated_at" = now()
    RETURNING "value"
  `)
  return Number(r.rows[0].value)
}

export const numeroDossier = (n?: number | null) => (n ? `C-${String(n).padStart(4, '0')}` : '')
/** Numéro communiqué au candidat : REC-C-AAAA-NNNN. */
export const numeroDossierCandidat = (n?: number | null, date?: string | Date | null) =>
  n ? `REC-C-${new Date(date ?? Date.now()).getFullYear()}-${String(n).padStart(4, '0')}` : ''
export const numeroRecu = (n?: number | null) => (n ? `PAY-${String(n).padStart(4, '0')}` : '')

/** Verrouille une ligne (SELECT … FOR UPDATE) dans la transaction de la requête : sérialise les inscriptions d'un même événement. */
export async function verrouiller(payload: Payload, table: string, id: number, req?: Partial<PayloadRequest>): Promise<void> {
  const adapter = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<unknown> }
    sessions?: Record<string, { db: { execute: (q: unknown) => Promise<unknown> } }>
  }
  const tid = req?.transactionID ? await req.transactionID : undefined
  const db = (tid && adapter.sessions?.[String(tid)]?.db) || adapter.drizzle
  await db.execute(sql`SELECT "id" FROM ${sql.identifier(table)} WHERE "id" = ${id} FOR UPDATE`)
}
