// Répétition espacée FSRS (spec srs-review).
// Une carte par élément ; le format de présentation évolue avec la stabilité ;
// la note est déduite de la réponse ; charge quotidienne plafonnée et priorisée.
import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs'
import type { Item } from '../content/types'
import type { Db } from '../db/types'

export type Format = 'recognition' | 'production' | 'context'

/** Seuils de stabilité (en jours) : en dessous de `production` → reconnaissance, etc. */
export const FORMAT_THRESHOLDS = { production: 3, context: 15 }
/** Cartes par unité de révision (~3 min à 4–8 s par carte). */
export const CARDS_PER_UNIT = 25

const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: true })

export interface CardRow {
  card_id: string
  kind: string
  fsrs: string
  due: string
  introduced_day: number
  fragile: number
}

export function parseCard(row: CardRow): Card {
  const c = JSON.parse(row.fsrs) as Card & { due: string; last_review?: string }
  return { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined }
}

/** Format de présentation d'une carte selon sa stabilité FSRS. */
export function chooseFormat(card: Card, item: Item): Format {
  if (card.reps === 0 || card.stability < FORMAT_THRESHOLDS.production) return 'recognition'
  if (item.kind === 'letter') return 'production'
  if (card.stability >= FORMAT_THRESHOLDS.context && item.cloze) return 'context'
  return 'production'
}

/** Note déduite de la réponse : faux → Again, juste → Good (geste optionnel : Hard / Easy). */
export function gradeFor(correct: boolean, ease?: 'hard' | 'easy'): Grade {
  if (!correct) return Rating.Again
  if (ease === 'hard') return Rating.Hard
  if (ease === 'easy') return Rating.Easy
  return Rating.Good
}

/** Ajoute des éléments au SRS (fin d'une unité « Nouveaux éléments » ou de lettres). */
export async function introduce(db: Db, items: Item[], day: number, now = new Date()): Promise<void> {
  const card = createEmptyCard(now)
  await db.batch(
    items.map((it) => ({
      sql: `INSERT INTO cards (card_id, kind, fsrs, due, introduced_day) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (card_id) DO NOTHING`,
      params: [it.id, it.kind, JSON.stringify(card), card.due.toISOString(), day],
    })),
  )
}

/** Enregistre une révision : nouvelle planification FSRS + journal. */
export async function recordReview(
  db: Db,
  cardId: string,
  grade: Grade,
  format: Format,
  elapsedMs: number | null,
  now = new Date(),
): Promise<Card> {
  const row = await db.get<CardRow>('SELECT * FROM cards WHERE card_id = ?', [cardId])
  if (!row) throw new Error(`carte inconnue : ${cardId}`)
  const { card, log } = scheduler.next(parseCard(row), now, grade)
  await db.batch([
    {
      sql: 'UPDATE cards SET fsrs = ?, due = ?, fragile = CASE WHEN ? THEN fragile ELSE 0 END WHERE card_id = ?',
      params: [JSON.stringify(card), card.due.toISOString(), grade === Rating.Again ? 1 : 0, cardId],
    },
    {
      sql: 'INSERT INTO review_log (card_id, ts, rating, format, elapsed_ms, log) VALUES (?, ?, ?, ?, ?, ?)',
      params: [cardId, now.toISOString(), grade, format, elapsedMs, JSON.stringify(log)],
    },
  ])
  return card
}

/** Marque des cartes comme fragiles (bilan de l'alphabet) : elles passent en tête des révisions. */
export async function markFragile(db: Db, cardIds: string[]): Promise<void> {
  await db.batch(cardIds.map((id) => ({ sql: 'UPDATE cards SET fragile = 1 WHERE card_id = ?', params: [id] })))
}

export async function countDue(db: Db, now = new Date()): Promise<number> {
  const r = await db.get<{ n: number }>('SELECT count(*) AS n FROM cards WHERE due <= ?', [now.toISOString()])
  return Number(r?.n ?? 0)
}

/**
 * Cartes d'une unité de révision : les fragiles d'abord, puis les plus en retard
 * relativement à leur intervalle ; mélangées ensuite (entrelacement) en évitant
 * deux cartes du même type à la suite quand c'est possible.
 */
export async function pickDue(
  db: Db,
  limit = CARDS_PER_UNIT,
  now = new Date(),
  exclude: string[] = [],
): Promise<CardRow[]> {
  const rows = await db.all<CardRow>('SELECT * FROM cards WHERE due <= ?', [now.toISOString()])
  const excluded = new Set(exclude)
  const t = now.getTime()
  const scored = rows
    .filter((r) => !excluded.has(r.card_id))
    .map((r) => {
      const c = parseCard(r)
      const interval = Math.max(c.scheduled_days, 1) * 86_400_000
      return { r, score: r.fragile * 1e6 + (t - c.due.getTime()) / interval }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.r)
  return interleave(scored, now.toISOString().slice(0, 10))
}

/** Mélange déterministe (graine = date) puis évite les répétitions de type consécutives. */
export function interleave<T extends { card_id: string; kind: string }>(rows: T[], seed: string): T[] {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
  const pool = [...rows]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const out: T[] = []
  while (pool.length) {
    const last = out[out.length - 1]
    const idx = pool.findIndex((r) => !last || r.kind !== last.kind)
    out.push(pool.splice(idx === -1 ? 0 : idx, 1)[0])
  }
  return out
}
