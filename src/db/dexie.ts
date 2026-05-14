import Dexie, { type EntityTable } from 'dexie'
import type { Matrix3x3Puzzle, RuleKind, ShapeKind } from '../types/puzzle'

/**
 * Schema for saved tests in IndexedDB.
 *
 * One row per "test" — a named collection of generated puzzles that the user
 * can later replay, share, or export.
 *
 * `shape` and `rule` are 'mixed' for tests built by the Mixer page from
 * multiple source tests. The actual per-puzzle shape/rule lives inside each
 * puzzle, so the Player doesn't care about these top-level values.
 */
export interface MixerSource {
  testId: number
  testName: string
  drawn: number
}

export interface SavedTest {
  id?: number // auto-increment
  name: string
  description?: string
  shape: ShapeKind | 'mixed'
  rule: RuleKind | 'mixed'
  count: number
  seed: number
  /** The puzzles themselves — denormalized into one row for simplicity. */
  puzzles: Matrix3x3Puzzle[]
  createdAt: number
  /** Provenance for mixed tests: which source tests + how many drawn from each. */
  sources?: MixerSource[]
}

/**
 * Lightweight metadata view (no puzzles), used by the Library page list view.
 * Loading puzzles for 1000-row tests is wasteful when we just want to list them.
 */
export type SavedTestMeta = Omit<SavedTest, 'puzzles'>

class NeoCorvusDB extends Dexie {
  tests!: EntityTable<SavedTest, 'id'>

  constructor() {
    super('neocorvus')
    // Indexed fields: name (search), shape+rule (filter), createdAt (sort).
    this.version(1).stores({
      tests: '++id, name, shape, rule, createdAt',
    })
  }
}

export const db = new NeoCorvusDB()

// ──────────────────────────────────────────────────────────────
// CRUD helpers (Dexie returns Promises; UI awaits these directly).
// ──────────────────────────────────────────────────────────────

export async function saveTest(test: Omit<SavedTest, 'id' | 'createdAt'>): Promise<number> {
  // Dexie returns the auto-generated id; `++id` produces a number, so cast.
  const id = await db.tests.add({
    ...test,
    createdAt: Date.now(),
  } as SavedTest)
  return id as number
}

/** List all tests, newest first. Returns full rows including puzzles. */
export async function listTests(): Promise<SavedTest[]> {
  return db.tests.orderBy('createdAt').reverse().toArray()
}

/** List metadata only (omits puzzles) — cheap for the Library page. */
export async function listTestsMeta(): Promise<SavedTestMeta[]> {
  const rows = await db.tests.orderBy('createdAt').reverse().toArray()
  return rows.map(({ puzzles: _puzzles, ...meta }) => meta)
}

export async function getTest(id: number): Promise<SavedTest | undefined> {
  return db.tests.get(id)
}

export async function deleteTest(id: number): Promise<void> {
  await db.tests.delete(id)
}

export async function renameTest(id: number, name: string): Promise<void> {
  await db.tests.update(id, { name })
}
