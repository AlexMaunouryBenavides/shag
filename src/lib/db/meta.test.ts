import { beforeEach, describe, expect, it } from 'vitest'
import {
  backupFileName,
  daysSinceExport,
  getMeta,
  markExported,
  needsBackupReminder,
  setMeta,
} from './meta'
import { nodeDb } from './node-db'
import { migrate } from './schema'
import { asyncDb, type Db } from './types'

let db: Db
beforeEach(() => {
  const s = nodeDb()
  migrate(s)
  db = asyncDb(s)
})

const at = (iso: string) => new Date(iso)

describe('meta', () => {
  it('lit et écrase une valeur', async () => {
    await setMeta(db, 'k', '1')
    await setMeta(db, 'k', '2')
    expect(await getMeta(db, 'k')).toBe('2')
    expect(await getMeta(db, 'absent')).toBeUndefined()
  })

  it('rappelle de sauvegarder après 7 jours sans export', async () => {
    await setMeta(db, 'first_launch_at', '2026-11-01T08:00:00Z')
    expect(await needsBackupReminder(db, at('2026-11-05T08:00:00Z'))).toBe(false)
    expect(await needsBackupReminder(db, at('2026-11-09T08:00:00Z'))).toBe(true)
    await markExported(db, at('2026-11-09T09:00:00Z'))
    expect(await needsBackupReminder(db, at('2026-11-10T08:00:00Z'))).toBe(false)
    expect(await daysSinceExport(db, at('2026-11-12T10:00:00Z'))).toBe(3)
  })

  it('nomme le fichier de sauvegarde avec la date', () => {
    expect(backupFileName(at('2026-11-17T20:00:00Z'))).toBe('shag-sauvegarde-2026-11-17.sqlite3')
  })
})
