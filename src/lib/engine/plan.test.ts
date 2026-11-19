import { beforeEach, describe, expect, it } from 'vitest'
import type { Day, Pack, Unit } from '../content/types'
import { nodeDb } from '../db/node-db'
import { migrate } from '../db/schema'
import { asyncDb, type Db } from '../db/types'
import {
  activity,
  completeUnit,
  currentDay,
  loadCursor,
  loadToday,
  pickNext,
  saveCursor,
  startNextDay,
  startUnit,
  waitingUnits,
  type UnitState,
} from './plan'
import { introduce } from './srs'

const u = (type: Unit['type'], audio = false): Unit => ({ type, audio })
const DAY_UNITS: Unit[] = [u('review'), u('new'), u('lesson'), u('review'), u('grammar'), u('listen', true), u('review'), u('speak', true)]
const mkDay = (day: number, extra: Partial<Day> = {}): Day => ({
  day,
  phase: 1,
  theme: `Thème ${day}`,
  kind: 'normal',
  items: [],
  letters: [],
  units: DAY_UNITS,
  dialogue: { messages: [{ from: 'masha', ru: 'Приве́т!', fr: 'Salut !' }] },
  ...extra,
})
const PACK: Pack = {
  version: 'test',
  phases: [],
  plan: [1, 2, 3, 4].map((d) => ({ day: d, theme: `Thème ${d}`, kind: 'normal' as const })),
  characters: {},
  lastDay: 3,
  items: { x: { id: 'x', day: 1, kind: 'word', ru: 'x', fr: 'x' } },
  days: [mkDay(1), mkDay(2), mkDay(3)],
  audio: {},
  audioByPhase: {},
  credits: [],
}

let db: Db
beforeEach(() => {
  const s = nodeDb()
  migrate(s)
  db = asyncDb(s)
})

// Journée du 17 novembre, 8 h locales ; lendemain à 8 h.
const D1 = new Date(2026, 10, 17, 8)
const D2 = new Date(2026, 10, 18, 8)
const D5 = new Date(2026, 10, 21, 8)

async function finishDay(day: number, at: Date) {
  for (let i = 0; i < DAY_UNITS.length; i++) await completeUnit(db, PACK, day, i, at)
}

describe('pickNext', () => {
  const states = (statuses: UnitState['status'][]): UnitState[] =>
    DAY_UNITS.map((unit, index) => ({ unit, index, status: statuses[index] ?? 'todo' }))

  it('lance la première unité non faite', () => {
    expect(pickNext(states(['done', 'done', 'done']), 'audio')).toEqual({ next: 3, audioLeft: 0 })
  })

  it('saute les unités audio en mode silencieux', () => {
    const s = states(['done', 'done', 'done', 'done', 'done'])
    expect(pickNext(s, 'silent')).toEqual({ next: 6, audioLeft: 2 })
  })

  it('ne propose rien quand il ne reste que de l’audio en mode silencieux', () => {
    const s = states(['done', 'done', 'done', 'done', 'done', 'todo', 'done', 'todo'])
    expect(pickNext(s, 'silent')).toEqual({ next: null, audioLeft: 2 })
  })
})

describe('progression', () => {
  it('commence au jour 1', async () => {
    await introduce(db, [{ id: 'x', day: 1, kind: 'word', ru: 'x', fr: 'x' }], 1, D1)
    const t = await loadToday(db, PACK, 'audio', D1)
    expect(t.kind).toBe('day')
    if (t.kind === 'day') expect([t.day.day, t.next, t.done]).toEqual([1, 0, 0])
  })

  it('saute une révision sans carte due : « Continuer » ne mène jamais à un écran vide', async () => {
    const t = await loadToday(db, PACK, 'audio', D1)
    if (t.kind !== 'day') throw new Error(t.kind)
    expect([t.next, t.done, t.units[0].status]).toEqual([1, 1, 'done'])
    expect(await activity(db, 1, D1)).toEqual([{ date: '2026-11-17', units: 0 }])
  })

  it('ne saute pas une révision déjà commencée', async () => {
    await startUnit(db, 1, 0, D1)
    const t = await loadToday(db, PACK, 'audio', D1)
    expect(t.kind === 'day' && t.next).toBe(0)
  })

  it('termine le jour quand il ne reste qu’une révision sans carte due', async () => {
    for (let i = 0; i < DAY_UNITS.length - 2; i++) await completeUnit(db, PACK, 1, i, D1)
    await completeUnit(db, PACK, 1, DAY_UNITS.length - 1, D1)
    const t = await loadToday(db, PACK, 'audio', D1)
    expect(t.kind).toBe('finished')
  })

  it('reprend après interruption à l’unité suivante, curseur conservé', async () => {
    await completeUnit(db, PACK, 1, 0, D1)
    await completeUnit(db, PACK, 1, 1, D1)
    await completeUnit(db, PACK, 1, 2, D1)
    await startUnit(db, 1, 3, D1)
    await saveCursor(db, 1, 3, { position: 7 }, D1)
    const t = await loadToday(db, PACK, 'audio', D1)
    if (t.kind !== 'day') throw new Error(t.kind)
    expect([t.done, t.next, t.units[3].status]).toEqual([3, 3, 'in_progress'])
    expect(await loadCursor(db, 1, 3)).toEqual({ position: 7 })
  })

  it('affiche « journée terminée » le jour même, puis le jour suivant le lendemain', async () => {
    await finishDay(1, D1)
    const same = await loadToday(db, PACK, 'audio', D1)
    expect(same.kind).toBe('finished')
    if (same.kind === 'finished') expect([same.nextTheme, same.secondary]).toEqual(['Thème 2', 'next-day'])
    const next = await loadToday(db, PACK, 'audio', D2)
    expect(next.kind === 'day' && next.day.day).toBe(2)
  })

  it('un jour manqué ne crée aucun retard', async () => {
    await finishDay(1, D1)
    expect(await currentDay(db, D5)).toEqual({ day: 2, finishedToday: false })
  })

  it('propose les révisions supplémentaires avant le jour suivant', async () => {
    await introduce(db, [{ id: 'x', day: 1, kind: 'word', ru: 'x', fr: 'x' }], 1, D1)
    await finishDay(1, D1)
    const t = await loadToday(db, PACK, 'audio', D1)
    expect(t.kind === 'finished' && t.secondary).toBe('extra-review')
  })

  it('« commencer le jour suivant » ouvre le jour 2 le jour même', async () => {
    await finishDay(1, D1)
    expect(await startNextDay(db, PACK, D1)).toBe(true)
    const t = await loadToday(db, PACK, 'audio', D1)
    expect(t.kind === 'day' && t.day.day).toBe(2)
  })

  it('compte une unité terminée une seule fois', async () => {
    await completeUnit(db, PACK, 1, 0, D1)
    await completeUnit(db, PACK, 1, 0, D1)
    const hist = await activity(db, 1, D1)
    expect(hist).toEqual([{ date: '2026-11-17', units: 1 }])
  })

  it('bascule sur « la suite arrive bientôt » après le dernier jour publié', async () => {
    for (const d of [1, 2, 3]) await finishDay(d, new Date(2026, 10, 16 + d, 8))
    const t = await loadToday(db, PACK, 'audio', new Date(2026, 10, 25, 8))
    expect(t).toEqual({ kind: 'waiting', lastDay: 3 })
    expect(waitingUnits(PACK).map((x) => x.type)).toEqual(['review', 'fluency', 'fluency', 'review'])
  })

  it('pas de lien « jour suivant » si le jour suivant n’est pas publié', async () => {
    for (const d of [1, 2]) await finishDay(d, new Date(2026, 10, 16 + d, 8))
    const day3 = new Date(2026, 10, 19, 8)
    await finishDay(3, day3)
    const t = await loadToday(db, PACK, 'audio', day3)
    expect(t.kind === 'finished' && t.secondary).toBe('none')
  })
})
