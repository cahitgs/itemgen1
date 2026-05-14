/**
 * Pattern Completion puzzle generator.
 *
 * Unlike the 3×3 matrix puzzles, this format presents a single big repeating
 * pattern (rows × cols grid of small motifs) with a rectangular blank region.
 * The player picks the fragment that correctly continues the pattern.
 *
 * Generation strategy:
 *   1. Pick 2 motif shapes (mini versions of existing Shape components)
 *   2. Pick a pattern strategy (striped / checkerboard / 2×2 tile / solid)
 *   3. Fill a rows×cols grid using that strategy
 *   4. Carve out a rectangular blank in the middle
 *   5. The correct fragment is the actual values in the blank region
 *   6. Distractors are "wrong but plausible" fragment alternatives
 *   7. visualSignature-style dedup on fragments
 */

import type {
  PatternCompletionPuzzle,
  ShapeConfig,
  ShapeKind,
} from '../types/puzzle'
import { randomBaseShape } from './generator'
import {
  type Rng,
  mulberry32,
  pick,
  randInt,
  randomSeed,
  sample,
  shuffle as shuffleRng,
} from './rng'

// ──────────────────────────────────────────────────────────────
// ID generator (independent of generator.ts's nextId)
// ──────────────────────────────────────────────────────────────
let _counter = 0
const nextId = (rng: Rng) =>
  `pcom-${Math.floor(rng() * 1e9).toString(36)}-${_counter++}`

// ──────────────────────────────────────────────────────────────
// Pattern strategies
// ──────────────────────────────────────────────────────────────

type PatternStrategy =
  | 'solid'           // all cells = same motif
  | 'striped-rows'    // each row uses one motif (alternates A/B/A/B...)
  | 'striped-cols'    // each col uses one motif
  | 'checkerboard'    // (r+c) % motifCount
  | '2x2-tile'        // random 2×2 tile that repeats

function buildPattern(
  strategy: PatternStrategy,
  rows: number,
  cols: number,
  motifCount: number,
  rng: Rng,
): number[][] {
  const pat: number[][] = Array.from({ length: rows }, () =>
    Array<number>(cols).fill(0),
  )

  switch (strategy) {
    case 'solid':
      // All same — use motif 0
      return pat

    case 'striped-rows':
      for (let r = 0; r < rows; r++) {
        const m = r % motifCount
        for (let c = 0; c < cols; c++) pat[r][c] = m
      }
      return pat

    case 'striped-cols':
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) pat[r][c] = c % motifCount
      }
      return pat

    case 'checkerboard':
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) pat[r][c] = (r + c) % motifCount
      }
      return pat

    case '2x2-tile': {
      // 4 random motif indices in a 2×2 tile, then repeat
      const tile = [
        [randInt(rng, 0, motifCount - 1), randInt(rng, 0, motifCount - 1)],
        [randInt(rng, 0, motifCount - 1), randInt(rng, 0, motifCount - 1)],
      ]
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) pat[r][c] = tile[r % 2][c % 2]
      }
      return pat
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Fragment helpers
// ──────────────────────────────────────────────────────────────

function extractFragment(
  pattern: number[][],
  blank: { row: number; col: number; rows: number; cols: number },
): number[][] {
  const out: number[][] = []
  for (let r = 0; r < blank.rows; r++) {
    const row: number[] = []
    for (let c = 0; c < blank.cols; c++) {
      row.push(pattern[blank.row + r][blank.col + c])
    }
    out.push(row)
  }
  return out
}

function fragmentSignature(fragment: number[][]): string {
  return fragment.map((row) => row.join(',')).join('|')
}

function cloneFragment(f: number[][]): number[][] {
  return f.map((row) => [...row])
}

/** Generate plausible-but-wrong fragments for the distractor pool. */
function generateFragmentDistractors(
  correct: number[][],
  motifCount: number,
  rng: Rng,
): number[][][] {
  const rows = correct.length
  const cols = correct[0].length
  const pool: number[][][] = []

  // 1. Swap a single cell — for each cell, bump motif index by ±1 (mod motifCount).
  //    This is the "off-by-one" distractor pattern. Most visually subtle.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (motifCount > 1) {
        const swap = cloneFragment(correct)
        swap[r][c] = (correct[r][c] + 1) % motifCount
        pool.push(swap)
      }
    }
  }

  // 2. Horizontal flip
  pool.push(correct.map((row) => [...row].reverse()))

  // 3. Vertical flip
  pool.push([...correct].reverse().map((row) => [...row]))

  // 4. Both flips (180° rotation of fragment)
  pool.push([...correct].reverse().map((row) => [...row].reverse()))

  // 5. All-zero fragment (everything = motif 0)
  pool.push(Array.from({ length: rows }, () => Array<number>(cols).fill(0)))

  // 6. All-one fragment
  if (motifCount > 1) {
    pool.push(Array.from({ length: rows }, () => Array<number>(cols).fill(1)))
  }

  // 7. Random scramble
  pool.push(
    correct.map((row) => row.map(() => randInt(rng, 0, motifCount - 1))),
  )

  return pool
}

/** Pick `count` fragments with unique signatures, distinct from `correct`. */
function pickDistinctFragments(
  rng: Rng,
  correct: number[][],
  pool: number[][][],
  count: number,
): number[][][] {
  const seen = new Set([fragmentSignature(correct)])
  const out: number[][][] = []
  const shuffled = shuffleRng(rng, pool).result
  for (const f of shuffled) {
    const sig = fragmentSignature(f)
    if (seen.has(sig)) continue
    seen.add(sig)
    out.push(f)
    if (out.length >= count) return out
  }
  // Fallback: if pool exhausted, pad with random scrambles
  let attempts = 0
  while (out.length < count && attempts < 30) {
    attempts++
    const rand = correct.map((row) =>
      row.map(() => randInt(rng, 0, Math.max(1, pool.length))),
    )
    const sig = fragmentSignature(rand)
    if (!seen.has(sig)) {
      seen.add(sig)
      out.push(rand)
    }
  }
  return out
}

// ──────────────────────────────────────────────────────────────
// Motif palette — small shapes suitable as repeating pattern marks
// ──────────────────────────────────────────────────────────────

/** Shape kinds that look good at small (~30-40px) size. */
const MOTIF_KINDS: ShapeKind[] = [
  'polygon',
  'star',
  'dice',
  'arrow',
  'petals',
  'spike-ring',
]

// ──────────────────────────────────────────────────────────────
// Main generator
// ──────────────────────────────────────────────────────────────

export function generateRandomPatternCompletion(
  rng: Rng = mulberry32(randomSeed()),
): PatternCompletionPuzzle {
  // 1. Motifs — pick 2 distinct shape kinds
  const motifKinds = sample(rng, MOTIF_KINDS, 2)
  const motifs: ShapeConfig[] = motifKinds.map((kind) => {
    const base = randomBaseShape(kind, rng)
    return { ...base, size: 0.85, strokeWidth: 1.5 }
  })

  // 2. Big grid dimensions
  const rows = pick(rng, [6, 7, 8])
  const cols = pick(rng, [6, 7, 8])

  // 3. Strategy — for SOLID we only need 1 motif, others use 2
  const strategy: PatternStrategy = pick(rng, [
    'solid',
    'striped-rows',
    'striped-cols',
    'checkerboard',
    '2x2-tile',
  ])

  const motifCount = strategy === 'solid' ? 1 : motifs.length
  const effectiveMotifs = motifs.slice(0, motifCount)

  // For solid strategy, randomize WHICH single motif we use
  if (strategy === 'solid') {
    effectiveMotifs[0] = pick(rng, motifs)
  }

  const pattern = buildPattern(strategy, rows, cols, motifCount, rng)

  // 4. Blank region — 2-3 rows × 2-3 cols, placed away from edges
  const blankRowsSize = pick(rng, [2, 3])
  const blankColsSize = pick(rng, [2, 3])
  const blankRow = randInt(rng, 1, rows - blankRowsSize - 1)
  const blankCol = randInt(rng, 1, cols - blankColsSize - 1)
  const blank = {
    row: blankRow,
    col: blankCol,
    rows: blankRowsSize,
    cols: blankColsSize,
  }

  // 5. Correct fragment
  const correctFragment = extractFragment(pattern, blank)

  // 6. Distractor pool + dedup
  const distractorPool = generateFragmentDistractors(
    correctFragment,
    motifCount,
    rng,
  )
  const distractors = pickDistinctFragments(rng, correctFragment, distractorPool, 3)

  // 7. Shuffle options
  const allOptions = [correctFragment, ...distractors]
  const { result: fragmentOptions, permutation } = shuffleRng(rng, allOptions)
  const correctIndex = permutation.indexOf(0)

  return {
    id: nextId(rng),
    type: 'pattern-completion',
    rule: 'pattern-completion',
    shape: motifKinds[0], // representative shape (Library/Mixer use this for display)
    motifs: effectiveMotifs,
    pattern,
    blank,
    fragmentOptions,
    correctIndex,
    optionCount: fragmentOptions.length,
    difficulty: 2,
  }
}

/**
 * Validate that a pattern-completion puzzle is solvable.
 * - All fragment options must be visually distinct (their motif index grids
 *   must not match each other).
 * - Blank must fit inside the pattern.
 */
export function isPatternCompletionValid(p: PatternCompletionPuzzle): boolean {
  const sigs = p.fragmentOptions.map(fragmentSignature)
  if (new Set(sigs).size !== sigs.length) return false
  if (p.blank.row < 0 || p.blank.col < 0) return false
  if (p.blank.row + p.blank.rows > p.pattern.length) return false
  if (p.blank.col + p.blank.cols > p.pattern[0].length) return false
  return true
}
