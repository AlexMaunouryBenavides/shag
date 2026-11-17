// Schéma de la base locale et migrations versionnées (PRAGMA user_version).
// Règle : on n'édite jamais une migration publiée, on en ajoute une nouvelle à la fin.
import type { SyncDb } from './types'

export const MIGRATIONS: string[] = [
  // v1 — schéma initial
  `
  CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  -- Jours de programme commencés ou terminés
  CREATE TABLE program_progress (
    day          INTEGER PRIMARY KEY,
    status       TEXT NOT NULL CHECK (status IN ('in_progress', 'done')),
    started_at   TEXT NOT NULL,
    completed_at TEXT
  );
  -- État de chaque unité d'un jour (curseur JSON pour reprendre au même point)
  CREATE TABLE unit_progress (
    day        INTEGER NOT NULL,
    unit_index INTEGER NOT NULL,
    status     TEXT NOT NULL CHECK (status IN ('in_progress', 'done')),
    cursor     TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (day, unit_index)
  );
  -- Une carte SRS par élément (card_id = identifiant de l'élément dans le paquet)
  CREATE TABLE cards (
    card_id        TEXT PRIMARY KEY,
    kind           TEXT NOT NULL,
    fsrs           TEXT NOT NULL,
    due            TEXT NOT NULL,
    introduced_day INTEGER NOT NULL,
    fragile        INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX cards_due ON cards (due);
  -- Journal de chaque révision
  CREATE TABLE review_log (
    id         INTEGER PRIMARY KEY,
    card_id    TEXT NOT NULL,
    ts         TEXT NOT NULL,
    rating     INTEGER NOT NULL,
    format     TEXT NOT NULL,
    elapsed_ms INTEGER,
    log        TEXT
  );
  CREATE INDEX review_log_card ON review_log (card_id);
  -- Unités faites par jour calendaire (historique d'activité)
  CREATE TABLE activity (
    date       TEXT PRIMARY KEY,
    units_done INTEGER NOT NULL DEFAULT 0
  );
  -- Signalements ⚑ d'erreurs de contenu (inclus dans l'export)
  CREATE TABLE flags (
    id         INTEGER PRIMARY KEY,
    item_id    TEXT NOT NULL,
    day        INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    context    TEXT
  );
  `,
]

export const SCHEMA_VERSION = MIGRATIONS.length
const target = () => MIGRATIONS.length

export function schemaVersion(db: SyncDb): number {
  return Number(db.all<{ user_version: number }>('PRAGMA user_version')[0].user_version)
}

/** Applique les migrations manquantes, chacune dans sa transaction. */
export function migrate(db: SyncDb): { from: number; to: number } {
  const from = schemaVersion(db)
  if (from > target()) {
    throw new Error(`base plus récente (v${from}) que l'application (v${target()})`)
  }
  for (let v = from; v < target(); v++) {
    db.exec('BEGIN')
    try {
      db.exec(MIGRATIONS[v])
      db.exec(`PRAGMA user_version = ${v + 1}`)
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
  return { from, to: target() }
}

export interface SafeMigrationResult {
  from: number
  to: number
  restored: boolean
  error?: string
}

/**
 * Migration protégée (spec local-data, « Sauvegarde automatique avant migration ») :
 * copie de la base avant toute migration, restauration de la copie en cas d'échec.
 */
export async function migrateSafely(
  db: SyncDb,
  snapshot: () => Uint8Array | Promise<Uint8Array>,
  restore: (bytes: Uint8Array) => SyncDb | Promise<SyncDb>,
): Promise<{ db: SyncDb; result: SafeMigrationResult }> {
  const from = schemaVersion(db)
  if (from === target()) return { db, result: { from, to: from, restored: false } }
  const copy = from > 0 ? await snapshot() : null
  try {
    const { to } = migrate(db)
    return { db, result: { from, to, restored: false } }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    if (!copy) throw e
    const restoredDb = await restore(copy)
    return { db: restoredDb, result: { from, to: from, restored: true, error } }
  }
}
