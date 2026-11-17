// Client du Worker SQLite : expose l'interface `Db` à l'application.
import type { Envelope, InitInfo, Reply, Request } from './protocol'
import type { Db, Params, Row } from './types'

export interface DbClient extends Db {
  init(): Promise<InitInfo>
  exportFile(): Promise<Uint8Array>
  importFile(bytes: Uint8Array): Promise<InitInfo>
}

export function createDbClient(): DbClient {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  let nextId = 0
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

  worker.onmessage = (e: MessageEvent<Reply>) => {
    const p = pending.get(e.data.id)
    if (!p) return
    pending.delete(e.data.id)
    if (e.data.ok) p.resolve(e.data.data)
    else p.reject(new Error(e.data.error))
  }

  function call<T>(req: Request): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
      const msg: Envelope = { id, ...req }
      worker.postMessage(msg)
    })
  }

  return {
    init: () => call<InitInfo>({ op: 'init' }),
    run: (sql, params) => call<void>({ op: 'run', sql, params }),
    all: <T = Row>(sql: string, params?: Params) =>
      call<T[]>({ op: 'all', sql, params }),
    get: async <T = Row>(sql: string, params?: Params) =>
      (await call<T[]>({ op: 'all', sql, params }))[0],
    batch: (stmts) => call<void>({ op: 'batch', stmts }),
    exportFile: () => call<Uint8Array>({ op: 'export' }),
    importFile: (bytes) => call<InitInfo>({ op: 'import', bytes }),
  }
}
