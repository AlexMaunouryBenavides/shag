// Spike 1.5 — SQLite-wasm avec le VFS opfs-sahpool dans un Worker.
// Ne nécessite pas les en-têtes COOP/COEP (compatible GitHub Pages).
import sqlite3InitModule from '@sqlite.org/sqlite-wasm'

type Reply = { ok: true; data: unknown } | { ok: false; error: string }

const DB_NAME = '/spike.sqlite3'

const ready = (async () => {
  const sqlite3 = await sqlite3InitModule()
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'shag-spike' })
  const db = new pool.OpfsSAHPoolDb(DB_NAME)
  db.exec('CREATE TABLE IF NOT EXISTS visits(id INTEGER PRIMARY KEY, ts TEXT NOT NULL)')
  return { sqlite3, pool, db }
})()

self.onmessage = async (e: MessageEvent<{ id: number; cmd: string }>) => {
  const { id, cmd } = e.data
  let reply: Reply
  try {
    const { sqlite3, pool, db } = await ready
    if (cmd === 'visit') {
      db.exec({ sql: 'INSERT INTO visits(ts) VALUES (?)', bind: [new Date().toISOString()] })
      const count = db.selectValue('SELECT count(*) FROM visits')
      const first = db.selectValue('SELECT min(ts) FROM visits')
      reply = { ok: true, data: { version: sqlite3.version.libVersion, count, first } }
    } else if (cmd === 'export') {
      reply = { ok: true, data: pool.exportFile(DB_NAME) }
    } else {
      throw new Error(`commande inconnue : ${cmd}`)
    }
  } catch (err) {
    reply = { ok: false, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) }
  }
  self.postMessage({ id, ...reply })
}
