// Implémentation `SyncDb` sur node:sqlite, pour les tests uniquement.
import { DatabaseSync } from 'node:sqlite'
import type { Params, SyncDb } from './types'

export function nodeDb(path = ':memory:'): SyncDb & { close(): void } {
  const db = new DatabaseSync(path)
  return {
    exec: (sql) => db.exec(sql),
    run: (sql, params: Params = []) => {
      db.prepare(sql).run(...params)
    },
    all: <T>(sql: string, params: Params = []) =>
      db.prepare(sql).all(...params).map((r) => ({ ...r })) as T[],
    close: () => db.close(),
  }
}
