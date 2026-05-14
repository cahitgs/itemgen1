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

import type {
  Matrix3x3Puzzle,
  PatternCompletionPuzzle,
  PuzzleItem,
  RuleKind,
  ShapeKind,
} from '../types/puzzle'
import {
  generateRandomArithmetic3x3,
  generateRandomBoolOp3x3,
  generateRandomDistOf2,
  generateRandomDistOf3,
  generateRandomIdentity,
  generateRandomMirror3x3,
  generateRandomProgression3x3,
  generateRandomRotation3x3,
  isBlankCell,
  puzzleSignature,
  visualSignature,
} from './generator'
import {
  generateRandomPatternCompletion,
  isPatternCompletionValid,
} from './patternCompletion'
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
  puzzles: PuzzleItem[]
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
  'annulus', 'dice', 'polygon', 'star', 'petals', 'spike-ring', 'bars', 'grid-dots',
  'nested-polygon', 'sector-pie',
]
// Shapes available for visual-only rules
const ALL_SHAPES: ShapeKind[] = [
  'annulus', 'dice', 'polygon', 'star', 'arrow', 'petals', 'spike-ring', 'hammer', 'bars', 'grid-dots', 'checkerboard', 'box-lines',
  'nested-polygon', 'sector-pie',
]
// Rotation-asymmetric shapes — the only ones where a pure-rotation rule
// produces visually distinct cells in every grid position.
const ROTATION_ONLY_SHAPES: ShapeKind[] = ['arrow', 'hammer']

// Dist-of-2 compatible shapes — exclude grid-dots and checkerboard whose
// internal empty space would conflict with the blank-cell marker.
const DIST_OF_2_SHAPES: ShapeKind[] = [
  'annulus', 'dice', 'polygon', 'star', 'arrow',
  'petals', 'spike-ring', 'hammer', 'bars',
]

// Mirror compatible shapes — only those with visible rotation flip
const MIRROR_SHAPES: ShapeKind[] = [
  'arrow', 'hammer', 'polygon', 'star', 'petals', 'spike-ring',
  'bars', 'box-lines',
]

// Boolean logic compatible shapes — bit-mask carriers
const BOOL_OP_SHAPES: ShapeKind[] = ['sector-pie']

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
  ...ROTATION_ONLY_SHAPES.map<[ShapeKind, RuleKind]>((s) => [s, 'rotation']),
  ...DIST_OF_2_SHAPES.map<[ShapeKind, RuleKind]>((s) => [s, 'dist-of-2']),
  ...MIRROR_SHAPES.map<[ShapeKind, RuleKind]>((s) => [s, 'mirror']),
  // multiplication uses same COUNT_PARAM_SHAPES filter as addition/subtraction
  ...COUNT_PARAM_SHAPES.map<[ShapeKind, RuleKind]>((s) => [s, 'multiplication']),
  // boolean logic — only on bit-mask shapes
  ...BOOL_OP_SHAPES.flatMap<[ShapeKind, RuleKind]>((s) => [
    [s, 'and'], [s, 'or'], [s, 'xor'], [s, 'xnor'],
  ]),
  // Pattern-completion: shape parameter is ignored (the generator picks motifs
  // internally), so we register against every shape so the UI accepts any
  // dropdown combo with this rule.
  ...ALL_SHAPES.map<[ShapeKind, RuleKind]>((s) => [s, 'pattern-completion']),
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

  const generateOne = (): PuzzleItem => {
    switch (spec.rule) {
      case 'identity':
        return generateRandomIdentity(spec.shape, rng)
      case 'dist-of-3':
        return generateRandomDistOf3(spec.shape, rng)
      case 'dist-of-2':
        return generateRandomDistOf2(spec.shape, rng)
      case 'progression':
        return generateRandomProgression3x3(spec.shape, rng)
      case 'rotation':
        return generateRandomRotation3x3(spec.shape, rng)
      case 'addition':
        return generateRandomArithmetic3x3(spec.shape, 'addition', rng)
      case 'subtraction':
        return generateRandomArithmetic3x3(spec.shape, 'subtraction', rng)
      case 'multiplication':
        return generateRandomArithmetic3x3(spec.shape, 'multiplication', rng)
      case 'mirror':
        return generateRandomMirror3x3(spec.shape, rng)
      case 'and':
      case 'or':
      case 'xor':
      case 'xnor':
        return generateRandomBoolOp3x3(spec.shape, spec.rule, rng)
      case 'pattern-completion':
        return generateRandomPatternCompletion(rng)
      default:
        throw new Error(`Unsupported rule for bulk: ${spec.rule}`)
    }
  }

  const seen = new Set<string>()
  const puzzles: PuzzleItem[] = []
  let attempts = 0
  let duplicatesSkipped = 0
  let invalidSkipped = 0
  let consecutiveDuplicates = 0

  while (puzzles.length < spec.count && attempts < maxAttempts) {
    attempts++
    let p: PuzzleItem
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
 * A puzzle is "valid" if a human can actually solve it. Failure modes vary by
 * puzzle type — see the per-type branches below.
 */
function isPuzzleValid(p: PuzzleItem): boolean {
  // Pattern completion has its own validator (different cell structure)
  if (p.type === 'pattern-completion') {
    return isPatternCompletionValid(p as PatternCompletionPuzzle)
  }

  // For 3x3 puzzles (and 2x2/series when added), check option distinctness +
  // rule visibility.
  if (p.type !== '3x3') return true // other types: trust generators for now

  const m3 = p as Matrix3x3Puzzle

  // 1. Pairwise-distinct options
  const optSigs = m3.options.map(visualSignature)
  if (new Set(optSigs).size !== optSigs.length) return false

  // 2. For dist-of-3: first row should have 3 distinct cells (rule visible)
  if (m3.rule === 'dist-of-3') {
    const rowSigs = m3.cells[0].map(visualSignature)
    if (new Set(rowSigs).size !== 3) return false
  }

  // 2b. For dist-of-2: each row should contain exactly 2 distinct visible
  //     shapes + 1 blank cell. Also: the 2 visible variants must be visually
  //     distinguishable from each other.
  if (m3.rule === 'dist-of-2') {
    for (const row of m3.cells) {
      const blanks = row.filter(isBlankCell).length
      if (blanks !== 1) return false
      const visibleSigs = row.filter((c) => !isBlankCell(c)).map(visualSignature)
      if (visibleSigs.length !== 2) return false
      if (new Set(visibleSigs).size !== 2) return false
    }
  }

  // 3. For progression: BOTH axes must be visible
  if (m3.rule === 'progression') {
    const row0Sigs = m3.cells[0].map(visualSignature)
    if (new Set(row0Sigs).size !== 3) return false
    const col0Sigs = [m3.cells[0][0], m3.cells[1][0], m3.cells[2][0]].map(visualSignature)
    if (new Set(col0Sigs).size !== 3) return false
  }

  // 4. For arithmetic: every row must show 3 visually-distinct cells
  if (m3.rule === 'addition' || m3.rule === 'subtraction' || m3.rule === 'multiplication') {
    for (const row of m3.cells) {
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
