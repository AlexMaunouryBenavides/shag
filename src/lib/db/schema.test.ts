import { describe, expect, it, vi } from 'vitest'
import { nodeDb } from './node-db'
import { migrate, migrateSafely, MIGRATIONS, SCHEMA_VERSION, schemaVersion } from './schema'
import { asyncDb } from './types'

describe('migrations', () => {
  it('crée le schéma depuis une base vide', () => {
    const db = nodeDb()
    expect(migrate(db)).toEqual({ from: 0, to: SCHEMA_VERSION })
    expect(schemaVersion(db)).toBe(SCHEMA_VERSION)
    const tables = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'")
    expect(tables.map((t) => t.name).sort()).toEqual(
      ['activity', 'cards', 'flags', 'meta', 'program_progress', 'review_log', 'unit_progress'].sort(),
    )
  })

  it('est idempotente', () => {
    const db = nodeDb()
    migrate(db)
    expect(migrate(db)).toEqual({ from: SCHEMA_VERSION, to: SCHEMA_VERSION })
  })

  it('refuse une base plus récente que l’application', () => {
    const db = nodeDb()
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`)
    expect(() => migrate(db)).toThrow(/plus récente/)
  })

  it('batch est atomique', async () => {
    const db = nodeDb()
    migrate(db)
    const a = asyncDb(db)
    await expect(
      a.batch([
        { sql: "INSERT INTO meta VALUES ('a', '1')" },
        { sql: "INSERT INTO meta VALUES ('a', '2')" }, // clé en double → échec
      ]),
    ).rejects.toThrow()
    expect(await a.all('SELECT * FROM meta')).toEqual([])
  })
})

describe('migration protégée', () => {
  it('ne fait pas de copie si la base est à jour', async () => {
    const db = nodeDb()
    migrate(db)
    const snapshot = vi.fn(() => new Uint8Array())
    const { result } = await migrateSafely(db, snapshot, () => db)
    expect(snapshot).not.toHaveBeenCalled()
    expect(result.restored).toBe(false)
  })

  it('restaure la copie quand une migration échoue', async () => {
    const db = nodeDb()
    migrate(db)
    db.run("INSERT INTO meta VALUES ('progress', 'jour 12')")
    // Simule une version future de l'app avec une migration défectueuse.
    MIGRATIONS.push('CREATE TABLE meta (x);')
    try {
      const backup = new Uint8Array([1, 2, 3])
      const snapshot = vi.fn(() => backup)
      const restored = nodeDb()
      const restore = vi.fn(() => restored)
      const { db: after, result } = await migrateSafely(db, snapshot, restore)
      expect(snapshot).toHaveBeenCalledOnce()
      expect(restore).toHaveBeenCalledWith(backup)
      expect(after).toBe(restored)
      expect(result.restored).toBe(true)
      expect(result.error).toMatch(/already exists/)
      // la transaction de la migration fautive a été annulée
      expect(db.all('SELECT value FROM meta')).toEqual([{ value: 'jour 12' }])
    } finally {
      MIGRATIONS.pop()
    }
  })
})
