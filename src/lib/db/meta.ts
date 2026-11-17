// Petites valeurs clé/valeur (réglages, dates de sauvegarde…).
import type { Db } from './types'

export async function getMeta(db: Db, key: string): Promise<string | undefined> {
  return (await db.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]))?.value
}

export async function setMeta(db: Db, key: string, value: string): Promise<void> {
  await db.run(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [key, value],
  )
}

export const LAST_EXPORT_KEY = 'last_export_at'
const DAY_MS = 24 * 60 * 60 * 1000
export const EXPORT_REMINDER_DAYS = 7

export async function markExported(db: Db, now = new Date()): Promise<void> {
  await setMeta(db, LAST_EXPORT_KEY, now.toISOString())
}

/** Rappel de sauvegarde : aucun export depuis 7 jours (ou jamais, après 7 jours d'utilisation). */
export async function needsBackupReminder(db: Db, now = new Date()): Promise<boolean> {
  const last = await getMeta(db, LAST_EXPORT_KEY)
  const since = last ?? (await getMeta(db, 'first_launch_at'))
  if (!since) return false
  return now.getTime() - new Date(since).getTime() > EXPORT_REMINDER_DAYS * DAY_MS
}

export async function daysSinceExport(db: Db, now = new Date()): Promise<number | null> {
  const last = await getMeta(db, LAST_EXPORT_KEY)
  return last ? Math.floor((now.getTime() - new Date(last).getTime()) / DAY_MS) : null
}

/** Nom du fichier d'export : shag-sauvegarde-AAAA-MM-JJ.sqlite3 */
export function backupFileName(now = new Date()): string {
  return `shag-sauvegarde-${now.toISOString().slice(0, 10)}.sqlite3`
}
