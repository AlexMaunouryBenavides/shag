import { expect, it } from 'vitest'
import { nodeDb } from './db/node-db'
import { migrate } from './db/schema'
import { asyncDb } from './db/types'
import { addFlag, countFlags } from './flags'

it('enregistre un signalement', async () => {
  const s = nodeDb()
  migrate(s)
  const db = asyncDb(s)
  await addFlag(db, 'voda', 15, 'correction : вода́', new Date('2026-11-20T08:00:00Z'))
  expect(await countFlags(db)).toBe(1)
  expect(await db.all('SELECT item_id, day, context FROM flags')).toEqual([
    { item_id: 'voda', day: 15, context: 'correction : вода́' },
  ])
})
