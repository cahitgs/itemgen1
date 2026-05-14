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
  CubeProjectionPuzzle,
  Matrix3x3Puzzle,
  PaperFoldingPuzzle,
  PatternCompletionPuzzle,
  PuzzleItem,
  ReflectionPuzzle,
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
  generateRandomOddOneOut,
  generateRandomProgression3x3,
  generateRandomRotation3x3,
  isBlankCell,
  puzzleSignature,
  visualSignature,
} from './generator'
import { calibrateDifficulty } from './difficulty'
import {
  generateRandomPatternCompletion,
  isPatternCompletionValid,
} from './patternCompletion'
import {
  buildCubeProjectionPuzzle,
  isCubeProjectionValid,
} from './cubeProjection'
import {
  buildReflectionPuzzle,
  isReflectionPuzzleValid,
} from './reflection'
import {
  buildPaperFoldingPuzzle,
  isPaperFoldingPuzzleValid,
} from './paperFolding'
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
  'nested-polygon', 'sector-pie', 'block-letter',
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
const BOOL_OP_SHAPES: ShapeKind[] = ['sector-pie', 'checkerboard']

// Reflection is offered through the virtual 'reflection-source' carrier only;
// the generator picks the real asymmetric shape internally from arrow / hammer
// / block-letter. The old 6-shape pool was retired because polygon/star/petals
// carry symmetry folds that made flips visually indistinguishable.

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
  // odd-one-out — works for any shape with a variant generator
  ...ALL_SHAPES.map<[ShapeKind, RuleKind]>((s) => [s, 'odd-one-out']),
  // Pattern-completion: shape parameter is ignored (the generator picks motifs
  // internally), so we register against every shape so the UI accepts any
  // dropdown combo with this rule.
  ...ALL_SHAPES.map<[ShapeKind, RuleKind]>((s) => [s, 'pattern-completion']),
  // Cube-projection: only supported with the virtual 'cube-stack' shape.
  // The generator ignores shape parameters anyway (3D voxel data is independent).
  ['cube-stack', 'cube-projection'],
  // Reflection: virtual 'reflection-source' shape. Generator picks the real
  // asymmetric carrier internally (arrow / hammer / block-letter).
  ['reflection-source', 'reflection'],
  // Paper folding: virtual 'paper-fold-source' shape. Generator builds its
  // own paper-grid + fold-sequence + hole data, shape ignored.
  ['paper-fold-source', 'paper-folding'],
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
      case 'odd-one-out':
        return generateRandomOddOneOut(spec.shape, rng)
      case 'pattern-completion':
        return generateRandomPatternCompletion(rng)
      case 'cube-projection':
        return buildCubeProjectionPuzzle(rng)
      case 'reflection':
        return buildReflectionPuzzle(rng, spec.shape)
      case 'paper-folding':
        return buildPaperFoldingPuzzle(rng)
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

    // B6: Override the static difficulty each generator emitted with a
    // calibrated value based on rule+shape+optionCount. This makes Library
    // and CSV exports show meaningful difficulty stratification.
    p.difficulty = calibrateDifficulty(p)

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

  // Cube projection has its own validator (voxel + silhouette grid structure)
  if (p.type === 'cube-projection') {
    return isCubeProjectionValid(p as CubeProjectionPuzzle)
  }

  // Reflection has its own validator (4 distinct options, correct mirror axis)
  if (p.type === 'reflection') {
    return isReflectionPuzzleValid(p as ReflectionPuzzle)
  }

  // Paper folding has its own validator (4 distinct hole patterns, correct unfold)
  if (p.type === 'paper-folding') {
    return isPaperFoldingPuzzleValid(p as PaperFoldingPuzzle)
  }

  // Odd-one-out: exactly ONE option must differ from the rest visually.
  // The other N-1 must share a visualSignature.
  if (p.type === 'odd-one-out') {
    const sigs = p.options.map(visualSignature)
    const uniqueSigs = new Set(sigs)
    if (uniqueSigs.size !== 2) return false
    // The "majority" signature must appear N-1 times, the odd one once
    const counts = new Map<string, number>()
    for (const s of sigs) counts.set(s, (counts.get(s) ?? 0) + 1)
    const sortedCounts = [...counts.values()].sort((a, b) => b - a)
    if (sortedCounts[0] !== p.options.length - 1 || sortedCounts[1] !== 1) return false
    // And the correctIndex must point to the odd one
    const oddSig = [...counts.entries()].find(([, c]) => c === 1)?.[0]
    if (sigs[p.correctIndex] !== oddSig) return false
    return true
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
