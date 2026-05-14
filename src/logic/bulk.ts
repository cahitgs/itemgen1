/**
 * Bulk puzzle generation with seed-based reproducibility and dedup.
 *
 * Usage:
 *   const result = bulkGenerate({
 *     shape: 'annulus', rule: 'dist-of-3', count: 1000, seed: 42
 *   })
 *   // result.puzzles is up to 1000 distinct Matrix3x3Puzzles
 *   // result.duplicatesSkipped tells you how many collisions happened
 */

import type { Matrix3x3Puzzle, RuleKind, ShapeKind } from '../types/puzzle'
import {
  generateRandomArithmetic3x3,
  generateRandomDistOf3,
  generateRandomIdentity,
  generateRandomProgression3x3,
  puzzleSignature,
  visualSignature,
} from './generator'
import { mulberry32, randomSeed } from './rng'

export interface BulkSpec {
  shape: ShapeKind
  rule: RuleKind
  /** How many distinct puzzles to produce. */
  count: number
  /** Seed for reproducibility. Omit for a fresh random one. */
  seed?: number
  /**
   * Max attempts before giving up (in case parameter space is exhausted).
   * Defaults to count × 4.
   */
  maxAttempts?: number
}

export interface BulkResult {
  puzzles: Matrix3x3Puzzle[]
  seed: number
  duplicatesSkipped: number
  /** Puzzles rejected because they had identical-looking options or invisible rule. */
  invalidSkipped: number
  attempts: number
  /** Per-spec uniqueness ceiling, if generation gave up before count. */
  reachedCeiling: boolean
}

// Shapes with a count-typed primary parameter (eligible for arithmetic rules)
const COUNT_PARAM_SHAPES: ShapeKind[] = [
  'annulus', 'dice', 'polygon', 'star', 'petals', 'spike-ring',
]
// Shapes available for visual-only rules
const ALL_SHAPES: ShapeKind[] = [
  'annulus', 'dice', 'polygon', 'star', 'arrow', 'petals', 'spike-ring',
]

const SUPPORTED: Array<[ShapeKind, RuleKind]> = [
  ...ALL_SHAPES.flatMap<[ShapeKind, RuleKind]>((s) => [
    [s, 'identity'],
    [s, 'dist-of-3'],
    [s, 'progression'],
  ]),
  ...COUNT_PARAM_SHAPES.flatMap<[ShapeKind, RuleKind]>((s) => [
    [s, 'addition'],
    [s, 'subtraction'],
  ]),
]

export function isSupported(shape: ShapeKind, rule: RuleKind): boolean {
  return SUPPORTED.some(([s, r]) => s === shape && r === rule)
}

export function supportedCombinations(): ReadonlyArray<readonly [ShapeKind, RuleKind]> {
  return SUPPORTED
}

export function bulkGenerate(spec: BulkSpec): BulkResult {
  if (!isSupported(spec.shape, spec.rule)) {
    throw new Error(
      `Bulk generation not supported for ${spec.shape} + ${spec.rule}`,
    )
  }

  const seed = spec.seed ?? randomSeed()
  const rng = mulberry32(seed)
  const maxAttempts = spec.maxAttempts ?? spec.count * 4

  const generateOne = (): Matrix3x3Puzzle => {
    switch (spec.rule) {
      case 'identity':
        return generateRandomIdentity(spec.shape, rng)
      case 'dist-of-3':
        return generateRandomDistOf3(spec.shape, rng)
      case 'progression':
        return generateRandomProgression3x3(spec.shape, rng)
      case 'addition':
        return generateRandomArithmetic3x3(spec.shape, 'addition', rng)
      case 'subtraction':
        return generateRandomArithmetic3x3(spec.shape, 'subtraction', rng)
      default:
        throw new Error(`Unsupported rule for bulk: ${spec.rule}`)
    }
  }

  const seen = new Set<string>()
  const puzzles: Matrix3x3Puzzle[] = []
  let attempts = 0
  let duplicatesSkipped = 0
  let invalidSkipped = 0
  let consecutiveDuplicates = 0

  while (puzzles.length < spec.count && attempts < maxAttempts) {
    attempts++
    let p: Matrix3x3Puzzle
    try {
      p = generateOne()
    } catch {
      // Narrow parameter spaces can throw (e.g. arithmetic with no 3-row sample).
      // Treat as an invalid attempt and keep going.
      invalidSkipped++
      continue
    }

    // Validity: ensure the answer options are pairwise visually distinct
    // and that the rule is actually visible (i.e., for dist-of-3 the row
    // shows 3 different things).
    if (!isPuzzleValid(p)) {
      invalidSkipped++
      continue
    }

    const sig = puzzleSignature(p)
    if (seen.has(sig)) {
      duplicatesSkipped++
      consecutiveDuplicates++
      // If we hit ~500 consecutive duplicates, the parameter space is exhausted
      if (consecutiveDuplicates > 500) break
      continue
    }
    seen.add(sig)
    puzzles.push(p)
    consecutiveDuplicates = 0
  }

  return {
    puzzles,
    seed,
    duplicatesSkipped,
    invalidSkipped,
    attempts,
    reachedCeiling: puzzles.length < spec.count,
  }
}

/**
 * A puzzle is "valid" if a human can actually solve it. Two failure modes:
 *   1. Two answer options look identical (then the puzzle has multiple correct
 *      visual answers, even if the IDs differ).
 *   2. For dist-of-3, the row variants all look the same (rule invisible).
 */
function isPuzzleValid(p: Matrix3x3Puzzle): boolean {
  // 1. Pairwise-distinct options
  const optSigs = p.options.map(visualSignature)
  if (new Set(optSigs).size !== optSigs.length) return false

  // 2. For dist-of-3: first row should have 3 distinct cells (rule visible)
  if (p.rule === 'dist-of-3') {
    const rowSigs = p.cells[0].map(visualSignature)
    if (new Set(rowSigs).size !== 3) return false
  }

  // 3. For progression: BOTH axes must be visible — row 0 shows the column
  //    progression, column 0 shows the row progression. Each must have 3
  //    distinct visual signatures or the rule isn't readable.
  if (p.rule === 'progression') {
    const row0Sigs = p.cells[0].map(visualSignature)
    if (new Set(row0Sigs).size !== 3) return false
    const col0Sigs = [p.cells[0][0], p.cells[1][0], p.cells[2][0]].map(visualSignature)
    if (new Set(col0Sigs).size !== 3) return false
  }

  // 4. For arithmetic: every row must show 3 visually-distinct cells so the
  //    operation is readable. (Construction already filters a≠b≠c, but this
  //    is a defensive net in case color/size collapse signatures.)
  if (p.rule === 'addition' || p.rule === 'subtraction') {
    for (const row of p.cells) {
      const rowSigs = row.map(visualSignature)
      if (new Set(rowSigs).size !== 3) return false
    }
  }

  return true
}

/**
 * Trigger a JSON file download of generated puzzles.
 */
export function downloadPuzzlesJson(
  result: BulkResult,
  spec: BulkSpec,
  filename?: string,
): void {
  const payload = {
    meta: {
      generator: 'cogitem',
      generatedAt: new Date().toISOString(),
      spec,
      seed: result.seed,
      count: result.puzzles.length,
      duplicatesSkipped: result.duplicatesSkipped,
    },
    puzzles: result.puzzles,
  }
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download =
    filename ?? `cogitem-${spec.shape}-${spec.rule}-${result.puzzles.length}-s${result.seed}.json`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
