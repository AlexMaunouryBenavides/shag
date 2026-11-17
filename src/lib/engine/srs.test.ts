import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyCard, Rating, type Card } from 'ts-fsrs'
import type { Item } from '../content/types'
import { nodeDb } from '../db/node-db'
import { migrate } from '../db/schema'
import { asyncDb, type Db } from '../db/types'
import {
  CARDS_PER_UNIT,
  chooseFormat,
  countDue,
  gradeFor,
  interleave,
  introduce,
  markFragile,
  pickDue,
  recordReview,
  type CardRow,
} from './srs'

let db: Db
beforeEach(() => {
  const s = nodeDb()
  migrate(s)
  db = asyncDb(s)
})

const item = (id: string, kind: Item['kind'] = 'word', extra: Partial<Item> = {}): Item => ({
  id,
  day: 1,
  kind,
  ru: id,
  fr: id,
  ...extra,
})
const T0 = new Date('2026-11-17T08:00:00Z')
const plus = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000)

describe('format selon la stabilité', () => {
  const card = (stability: number, reps = 3): Card => ({ ...createEmptyCard(T0), stability, reps })

  it('nouvelle carte → reconnaissance', () => {
    expect(chooseFormat(createEmptyCard(T0), item('voda'))).toBe('recognition')
  })
  it('stabilité moyenne → production tapée', () => {
    expect(chooseFormat(card(5), item('voda'))).toBe('production')
  })
  it('stabilité forte → production en contexte si une phrase à trou existe', () => {
    const cloze = { ru: 'Я хочу́ ___.', answer: 'во́ду' }
    expect(chooseFormat(card(20), item('voda', 'word', { cloze }))).toBe('context')
    expect(chooseFormat(card(20), item('voda'))).toBe('production')
  })
  it('les lettres ne passent jamais en contexte', () => {
    expect(chooseFormat(card(30), item('l-a', 'letter'))).toBe('production')
  })
})

describe('notation', () => {
  it('déduit la note de la réponse', () => {
    expect(gradeFor(false)).toBe(Rating.Again)
    expect(gradeFor(true)).toBe(Rating.Good)
    expect(gradeFor(true, 'easy')).toBe(Rating.Easy)
    expect(gradeFor(true, 'hard')).toBe(Rating.Hard)
  })
})

describe('cartes et révisions', () => {
  it('introduit une carte par élément, sans doublon', async () => {
    await introduce(db, [item('a'), item('b')], 1, T0)
    await introduce(db, [item('a')], 2, T0)
    const rows = await db.all<CardRow>('SELECT * FROM cards ORDER BY card_id')
    expect(rows.map((r) => [r.card_id, r.introduced_day])).toEqual([
      ['a', 1],
      ['b', 1],
    ])
    expect(await countDue(db, T0)).toBe(2)
  })

  it('repousse une carte réussie et journalise la révision', async () => {
    await introduce(db, [item('a')], 1, T0)
    let card = await recordReview(db, 'a', Rating.Good, 'recognition', 3000, T0)
    card = await recordReview(db, 'a', Rating.Good, 'recognition', 3000, card.due)
    expect(card.due.getTime()).toBeGreaterThan(plus(T0, 1).getTime())
    const logs = await db.all('SELECT card_id, rating, format FROM review_log')
    expect(logs).toHaveLength(2)
    expect(await countDue(db, plus(T0, 0.5))).toBe(0)
  })

  it('une erreur fait revenir la carte vite', async () => {
    await introduce(db, [item('a')], 1, T0)
    const card = await recordReview(db, 'a', Rating.Again, 'recognition', null, T0)
    expect(card.due.getTime() - T0.getTime()).toBeLessThan(15 * 60_000)
  })
})

describe('sélection des cartes dues', () => {
  it('plafonne une unité et étale le reste', async () => {
    const items = Array.from({ length: 60 }, (_, i) => item(`w${i}`))
    await introduce(db, items, 1, T0)
    const first = await pickDue(db, CARDS_PER_UNIT, T0)
    expect(first).toHaveLength(CARDS_PER_UNIT)
    const second = await pickDue(db, CARDS_PER_UNIT, T0, first.map((r) => r.card_id))
    expect(second.some((r) => first.includes(r))).toBe(false)
  })

  it('met les cartes fragiles en tête', async () => {
    const items = Array.from({ length: 30 }, (_, i) => item(`w${i}`))
    await introduce(db, items, 1, T0)
    await markFragile(db, ['w29'])
    const picked = await pickDue(db, 5, T0)
    expect(picked.map((r) => r.card_id)).toContain('w29')
  })

  it('priorise les cartes les plus en retard', async () => {
    await introduce(db, [item('old'), item('recent')], 1, T0)
    await db.run("UPDATE cards SET due = ? WHERE card_id = 'old'", [plus(T0, -10).toISOString()])
    const picked = await pickDue(db, 1, T0)
    expect(picked[0].card_id).toBe('old')
  })
})

describe('entrelacement', () => {
  it('évite deux cartes du même type à la suite quand c’est possible', () => {
    const rows = [
      ...Array.from({ length: 4 }, (_, i) => ({ card_id: `l${i}`, kind: 'letter' })),
      ...Array.from({ length: 4 }, (_, i) => ({ card_id: `w${i}`, kind: 'word' })),
    ]
    const out = interleave(rows, '2026-11-17')
    expect(out).toHaveLength(8)
    for (let i = 1; i < out.length; i++) expect(out[i].kind).not.toBe(out[i - 1].kind)
  })
})
