// Interfaces d'accès aux données, indépendantes du moteur (SQLite-wasm dans le navigateur,
// node:sqlite dans les tests). Plan B possible (Dexie) en réimplémentant `Db`.

export type Row = Record<string, unknown>
export type Params = (string | number | null)[]

export interface Stmt {
  sql: string
  params?: Params
}

/** Accès synchrone : utilisé dans le Worker (oo1) et dans les tests (node:sqlite). */
export interface SyncDb {
  exec(sql: string): void
  run(sql: string, params?: Params): void
  all<T = Row>(sql: string, params?: Params): T[]
}

/** Accès asynchrone utilisé par l'application. */
export interface Db {
  run(sql: string, params?: Params): Promise<void>
  all<T = Row>(sql: string, params?: Params): Promise<T[]>
  get<T = Row>(sql: string, params?: Params): Promise<T | undefined>
  /** Exécute plusieurs requêtes dans une seule transaction (tout ou rien). */
  batch(stmts: Stmt[]): Promise<void>
}

/** Enveloppe un accès synchrone en `Db` asynchrone (Worker et tests). */
export function asyncDb(db: SyncDb): Db {
  return {
    run: async (sql, params) => db.run(sql, params),
    all: async (sql, params) => db.all(sql, params),
    get: async (sql, params) => db.all(sql, params)[0] as never,
    batch: async (stmts) => runBatch(db, stmts),
  }
}

export function runBatch(db: SyncDb, stmts: Stmt[]): void {
  db.exec('BEGIN')
  try {
    for (const s of stmts) db.run(s.sql, s.params)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}
