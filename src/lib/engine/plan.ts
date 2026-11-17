// Moteur de plan (spec daily-plan) : quel jour de programme, quelles unités, que lance « Continuer ».
// Le programme avance par jours terminés, jamais avec le calendrier.
import type { Day, Pack, Unit } from '../content/types'
import type { Db } from '../db/types'
import { countDue } from './srs'

export type Mode = 'audio' | 'silent'
export type UnitStatus = 'todo' | 'in_progress' | 'done'

export interface UnitState {
  unit: Unit
  index: number
  status: UnitStatus
}

export type Today =
  | {
      kind: 'day'
      day: Day
      units: UnitState[]
      /** index de l'unité lancée par « Continuer », ou null */
      next: number | null
      /** unités audio restantes, sautées en mode silencieux */
      audioLeft: number
      done: number
    }
  | {
      kind: 'finished'
      day: Day
      nextTheme: string | null
      /** lien secondaire : résorber les révisions en retard d'abord, sinon avancer */
      secondary: 'extra-review' | 'next-day' | 'none'
      backupReminder?: boolean
    }
  | { kind: 'waiting'; lastDay: number }

/** Date locale AAAA-MM-JJ (le « jour calendaire » de l'utilisateur). */
export function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Prochaine unité compatible avec le mode, et nombre d'unités audio laissées de côté. */
export function pickNext(units: UnitState[], mode: Mode): { next: number | null; audioLeft: number } {
  const remaining = units.filter((u) => u.status !== 'done')
  const playable = remaining.filter((u) => mode === 'audio' || !u.unit.audio)
  return {
    next: playable.length ? playable[0].index : null,
    audioLeft: mode === 'silent' ? remaining.filter((u) => u.unit.audio).length : 0,
  }
}

interface ProgressRow {
  day: number
  status: 'in_progress' | 'done'
  completed_at: string | null
}

export function dayOf(pack: Pack, n: number): Day | undefined {
  return pack.days.find((d) => d.day === n)
}

/**
 * Jour courant :
 * - un jour commencé et non terminé ;
 * - sinon, si le dernier jour terminé l'a été aujourd'hui → « journée terminée » ;
 * - sinon, le jour suivant le dernier terminé (un jour manqué ne crée aucun retard).
 */
export async function currentDay(
  db: Db,
  now = new Date(),
): Promise<{ day: number; finishedToday: boolean }> {
  const rows = await db.all<ProgressRow>('SELECT day, status, completed_at FROM program_progress')
  const inProgress = rows.filter((r) => r.status === 'in_progress').map((r) => r.day)
  if (inProgress.length) return { day: Math.max(...inProgress), finishedToday: false }
  const done = rows.filter((r) => r.status === 'done')
  if (!done.length) return { day: 1, finishedToday: false }
  const last = done.reduce((a, b) => (a.day > b.day ? a : b))
  if (last.completed_at && localDate(new Date(last.completed_at)) === localDate(now)) {
    return { day: last.day, finishedToday: true }
  }
  return { day: last.day + 1, finishedToday: false }
}

async function unitStates(db: Db, day: Day): Promise<UnitState[]> {
  const rows = await db.all<{ unit_index: number; status: UnitStatus }>(
    'SELECT unit_index, status FROM unit_progress WHERE day = ?',
    [day.day],
  )
  const byIndex = new Map(rows.map((r) => [r.unit_index, r.status]))
  return day.units.map((unit, index) => ({ unit, index, status: byIndex.get(index) ?? 'todo' }))
}

export async function loadToday(db: Db, pack: Pack, mode: Mode, now = new Date()): Promise<Today> {
  const { day: n, finishedToday } = await currentDay(db, now)
  const day = dayOf(pack, n)
  if (!day) return { kind: 'waiting', lastDay: pack.lastDay }
  if (finishedToday) {
    const next = pack.plan.find((p) => p.day === n + 1)
    const overdue = await countDue(db, now)
    const nextPublished = Boolean(dayOf(pack, n + 1))
    return {
      kind: 'finished',
      day,
      nextTheme: next?.theme ?? null,
      secondary: overdue > 0 ? 'extra-review' : nextPublished ? 'next-day' : 'none',
    }
  }
  const units = await unitStates(db, day)
  const { next, audioLeft } = pickNext(units, mode)
  return { kind: 'day', day, units, next, audioLeft, done: units.filter((u) => u.status === 'done').length }
}

export async function startUnit(db: Db, day: number, index: number, now = new Date()): Promise<void> {
  const ts = now.toISOString()
  await db.batch([
    {
      sql: `INSERT INTO program_progress (day, status, started_at) VALUES (?, 'in_progress', ?)
            ON CONFLICT (day) DO NOTHING`,
      params: [day, ts],
    },
    {
      sql: `INSERT INTO unit_progress (day, unit_index, status, updated_at) VALUES (?, ?, 'in_progress', ?)
            ON CONFLICT (day, unit_index) DO NOTHING`,
      params: [day, index, ts],
    },
  ])
}

/** Sauvegarde du curseur après chaque réponse (unités interrompables). */
export async function saveCursor(db: Db, day: number, index: number, cursor: unknown, now = new Date()) {
  await db.run(
    `UPDATE unit_progress SET cursor = ?, updated_at = ? WHERE day = ? AND unit_index = ? AND status != 'done'`,
    [JSON.stringify(cursor), now.toISOString(), day, index],
  )
}

export async function loadCursor<T>(db: Db, day: number, index: number): Promise<T | null> {
  const r = await db.get<{ cursor: string | null }>(
    'SELECT cursor FROM unit_progress WHERE day = ? AND unit_index = ?',
    [day, index],
  )
  return r?.cursor ? (JSON.parse(r.cursor) as T) : null
}

/** Termine une unité ; termine le jour si c'était la dernière. */
export async function completeUnit(
  db: Db,
  pack: Pack,
  day: number,
  index: number,
  now = new Date(),
): Promise<{ dayCompleted: boolean }> {
  const ts = now.toISOString()
  await startUnit(db, day, index, now)
  const already = await db.get<{ status: string }>(
    'SELECT status FROM unit_progress WHERE day = ? AND unit_index = ?',
    [day, index],
  )
  if (already?.status === 'done') return { dayCompleted: false }
  await db.batch([
    {
      sql: `UPDATE unit_progress SET status = 'done', cursor = NULL, updated_at = ? WHERE day = ? AND unit_index = ?`,
      params: [ts, day, index],
    },
    {
      sql: `INSERT INTO activity (date, units_done) VALUES (?, 1)
            ON CONFLICT (date) DO UPDATE SET units_done = units_done + 1`,
      params: [localDate(now)],
    },
  ])
  const d = dayOf(pack, day)
  const doneCount = await db.get<{ n: number }>(
    "SELECT count(*) AS n FROM unit_progress WHERE day = ? AND status = 'done'",
    [day],
  )
  if (d && Number(doneCount?.n) >= d.units.length) {
    await db.run(`UPDATE program_progress SET status = 'done', completed_at = ? WHERE day = ?`, [ts, day])
    return { dayCompleted: true }
  }
  return { dayCompleted: false }
}

/** « Commencer le jour suivant » (seulement proposé quand aucune révision n'est en retard). */
export async function startNextDay(db: Db, pack: Pack, now = new Date()): Promise<boolean> {
  const { day, finishedToday } = await currentDay(db, now)
  if (!finishedToday || !dayOf(pack, day + 1)) return false
  await db.run(
    `INSERT INTO program_progress (day, status, started_at) VALUES (?, 'in_progress', ?) ON CONFLICT (day) DO NOTHING`,
    [day + 1, now.toISOString()],
  )
  return true
}

/** Historique d'activité : unités faites par jour calendaire, sur les `days` derniers jours. */
export async function activity(db: Db, days = 28, now = new Date()): Promise<{ date: string; units: number }[]> {
  const rows = await db.all<{ date: string; units_done: number }>('SELECT date, units_done FROM activity')
  const byDate = new Map(rows.map((r) => [r.date, Number(r.units_done)]))
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = localDate(d)
    out.push({ date: key, units: byDate.get(key) ?? 0 })
  }
  return out
}

/** Progression globale (écran Plan). */
export async function overallProgress(db: Db, pack: Pack): Promise<{ doneDays: number; total: number }> {
  const r = await db.get<{ n: number }>("SELECT count(*) AS n FROM program_progress WHERE status = 'done'")
  return { doneDays: Number(r?.n ?? 0), total: pack.plan.length }
}

/**
 * Unités d'entraînement quand le contenu publié est épuisé (« La suite arrive bientôt ») :
 * révisions et relecture des derniers dialogues.
 */
export function waitingUnits(pack: Pack): Unit[] {
  const withDialogue = pack.days.filter((d) => d.dialogue).map((d) => d.day)
  const last = withDialogue.slice(-2)
  const fluency = last.map((d) => ({ type: 'fluency' as const, audio: false, dialogueDay: d }))
  return [{ type: 'review', audio: false }, ...fluency, { type: 'review', audio: false }]
}
