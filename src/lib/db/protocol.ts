// Messages échangés entre l'application et le Worker SQLite.
import type { Params, Row, Stmt } from './types'
import type { SafeMigrationResult } from './schema'

export interface InitInfo {
  sqliteVersion: string
  migration: SafeMigrationResult
}

export type Request =
  | { op: 'init' }
  | { op: 'run'; sql: string; params?: Params }
  | { op: 'all'; sql: string; params?: Params }
  | { op: 'batch'; stmts: Stmt[] }
  | { op: 'export' }
  | { op: 'import'; bytes: Uint8Array }

export type ResultOf<R extends Request> = R['op'] extends 'init' | 'import'
  ? InitInfo
  : R['op'] extends 'all'
    ? Row[]
    : R['op'] extends 'export'
      ? Uint8Array
      : null

export type Envelope = { id: number } & Request
export type Reply = { id: number; ok: true; data: unknown } | { id: number; ok: false; error: string }
