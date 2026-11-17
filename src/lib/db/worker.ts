// Worker SQLite : base locale persistante (OPFS, VFS opfs-sahpool, sans en-têtes COOP/COEP).
import sqlite3InitModule from '@sqlite.org/sqlite-wasm'
import type { Envelope, InitInfo, Reply } from './protocol'
import { migrateSafely } from './schema'
import { runBatch, type Params, type SyncDb } from './types'

const DB_FILE = '/shag.sqlite3'
const BACKUP_FILE = '/shag-avant-migration.sqlite3'
const CHECK_FILE = '/shag-import-verif.sqlite3'
const SQLITE_HEADER = 'SQLite format 3\u0000'

type Sqlite3 = Awaited<ReturnType<typeof sqlite3InitModule>>
type Pool = Awaited<ReturnType<Sqlite3['installOpfsSAHPoolVfs']>>
type OoDb = InstanceType<Pool['OpfsSAHPoolDb']>

let sqlite3: Sqlite3
let pool: Pool
let oo: OoDb
let db: SyncDb

function wrap(d: OoDb): SyncDb {
  return {
    exec: (sql) => {
      d.exec(sql)
    },
    run: (sql, params?: Params) => {
      d.exec({ sql, bind: params ?? [] })
    },
    all: <T>(sql: string, params?: Params) =>
      d.exec({ sql, bind: params ?? [], rowMode: 'object', returnValue: 'resultRows' }) as T[],
  }
}

function open(): SyncDb {
  oo = new pool.OpfsSAHPoolDb(DB_FILE)
  oo.exec('PRAGMA foreign_keys = ON')
  db = wrap(oo)
  return db
}

async function openAndMigrate(): Promise<InitInfo> {
  open()
  const { db: current, result } = await migrateSafely(
    db,
    async () => {
      // Copie persistée avant migration : survit même à un plantage pendant la migration.
      const bytes = pool.exportFile(DB_FILE)
      await pool.importDb(BACKUP_FILE, bytes)
      return bytes
    },
    async (bytes) => {
      oo.close()
      await pool.importDb(DB_FILE, bytes)
      return open()
    },
  )
  db = current
  return { sqliteVersion: sqlite3.version.libVersion, migration: result }
}

async function init(): Promise<InitInfo> {
  sqlite3 = await sqlite3InitModule()
  pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'shag' })
  return openAndMigrate()
}

/** Vérifie qu'un fichier importé est bien une sauvegarde de Шаг avant d'écraser la base. */
async function checkBackup(bytes: Uint8Array): Promise<void> {
  const header = new TextDecoder().decode(bytes.slice(0, 16))
  if (header !== SQLITE_HEADER) throw new Error("Ce fichier n'est pas une sauvegarde de Шаг.")
  await pool.importDb(CHECK_FILE, bytes)
  const check = new pool.OpfsSAHPoolDb(CHECK_FILE)
  try {
    const tables = check.exec({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('meta','cards','program_progress')",
      returnValue: 'resultRows',
    })
    if (tables.length < 3) throw new Error("Ce fichier n'est pas une sauvegarde de Шаг.")
  } finally {
    check.close()
    pool.unlink(CHECK_FILE)
  }
}

const ready = init()

self.onmessage = async (e: MessageEvent<Envelope>) => {
  const msg = e.data
  let reply: Reply
  try {
    const info = await ready
    let data: unknown = null
    switch (msg.op) {
      case 'init':
        data = info
        break
      case 'run':
        db.run(msg.sql, msg.params)
        break
      case 'all':
        data = db.all(msg.sql, msg.params)
        break
      case 'batch':
        runBatch(db, msg.stmts)
        break
      case 'export':
        data = pool.exportFile(DB_FILE)
        break
      case 'import':
        await checkBackup(msg.bytes)
        oo.close()
        await pool.importDb(DB_FILE, msg.bytes)
        data = await openAndMigrate()
        break
    }
    reply = { id: msg.id, ok: true, data }
  } catch (err) {
    reply = { id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) }
  }
  self.postMessage(reply)
}
