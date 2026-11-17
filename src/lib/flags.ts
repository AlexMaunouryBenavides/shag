// Signalements ⚑ d'erreurs de contenu (spec exercises) : stockés localement, inclus dans l'export.
import type { Db } from './db/types'

export async function addFlag(db: Db, itemId: string, day: number, context: string, now = new Date()): Promise<void> {
  await db.run('INSERT INTO flags (item_id, day, created_at, context) VALUES (?, ?, ?, ?)', [
    itemId,
    day,
    now.toISOString(),
    context.slice(0, 500),
  ])
}

export async function countFlags(db: Db): Promise<number> {
  const r = await db.get<{ n: number }>('SELECT count(*) AS n FROM flags')
  return Number(r?.n ?? 0)
}
