// État global de l'application : paquet de contenu, base locale, mode audio, écran courant.
import { prefetchPhases } from './audio'
import { applyPendingUpdate } from './pwa'
import type { Pack } from './content/types'
import { createDbClient, type DbClient } from './db/client'
import { getMeta, needsBackupReminder, setMeta } from './db/meta'
import { loadToday, type Mode, type Today } from './engine/plan'
import { requestPersistentStorage, type PersistStatus } from './storage'

export type Route =
  | { name: 'today' }
  | { name: 'plan' }
  | { name: 'settings' }
  | { name: 'unit'; day: number; index: number }
  /** refaire une unité d'une journée terminée, sans effet sur la progression */
  | { name: 'replay'; day: number; index: number }
  | { name: 'extra' }

class App {
  pack = $state<Pack | null>(null)
  db: DbClient | null = null
  mode = $state<Mode>('audio')
  today = $state<Today | null>(null)
  route = $state<Route>({ name: 'today' })
  error = $state<string | null>(null)
  persist = $state<PersistStatus>('unsupported')
  backupReminder = $state(false)
  migrationError = $state<string | null>(null)

  async start(): Promise<void> {
    try {
      const [pack, db] = await Promise.all([loadPack(), openDb()])
      this.db = db
      this.pack = pack
      if (!(await getMeta(db, 'first_launch_at'))) {
        await setMeta(db, 'first_launch_at', new Date().toISOString())
      }
      this.mode = ((await getMeta(db, 'mode')) as Mode) ?? 'audio'
      this.persist = await requestPersistentStorage()
      window.addEventListener('hashchange', () => this.syncRoute())
      this.syncRoute()
      await this.refresh()
      const phase = this.today && this.today.kind !== 'waiting' ? this.today.day.phase : 0
      void prefetchPhases(pack, phase)
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e)
    }
  }

  async refresh(): Promise<void> {
    if (!this.db || !this.pack) return
    this.today = await loadToday(this.db, this.pack, this.mode)
    this.backupReminder = this.today.kind === 'finished' && (await needsBackupReminder(this.db))
  }

  async setMode(mode: Mode): Promise<void> {
    this.mode = mode
    if (this.db) await setMeta(this.db, 'mode', mode)
    await this.refresh()
  }

  go(route: Route): void {
    location.hash = toHash(route)
  }

  private syncRoute(): void {
    this.route = fromHash(location.hash)
    window.scrollTo(0, 0)
    if (this.route.name === 'today') {
      applyPendingUpdate()
      void this.refresh()
    }
  }
}

function toHash(r: Route): string {
  switch (r.name) {
    case 'today':
      return '#/'
    case 'plan':
      return '#/plan'
    case 'settings':
      return '#/reglages'
    case 'extra':
      return '#/revisions'
    case 'unit':
      return `#/jour/${r.day}/${r.index}`
    case 'replay':
      return `#/revoir/${r.day}/${r.index}`
  }
}

function fromHash(hash: string): Route {
  const m = hash.match(/^#\/jour\/(\d+)\/(\d+)$/)
  if (m) return { name: 'unit', day: Number(m[1]), index: Number(m[2]) }
  const r = hash.match(/^#\/revoir\/(\d+)\/(\d+)$/)
  if (r) return { name: 'replay', day: Number(r[1]), index: Number(r[2]) }
  if (hash === '#/plan') return { name: 'plan' }
  if (hash === '#/reglages') return { name: 'settings' }
  if (hash === '#/revisions') return { name: 'extra' }
  return { name: 'today' }
}

async function loadPack(): Promise<Pack> {
  const res = await fetch(`${import.meta.env.BASE_URL}content/pack.json`)
  if (!res.ok) throw new Error('Le contenu du programme est introuvable.')
  return res.json()
}

let migrationNote: string | null = null

async function openDb(): Promise<DbClient> {
  const db = createDbClient()
  const info = await db.init()
  if (info.migration.restored) migrationNote = info.migration.error ?? 'erreur inconnue'
  return db
}

export const app = new App()
export const lastMigrationError = () => migrationNote
