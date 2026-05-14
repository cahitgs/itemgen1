/**
 * Core type definitions for Cogitem puzzles.
 *
 * Design goals (vs. Corvus's opaque [[3,3],[0],[2],...] arrays):
 *   - Self-describing field names
 *   - Discriminated unions for puzzle types
 *   - Easy to serialize/deserialize to JSON
 *   - Easy to extend with new shapes/rules
 */

// ──────────────────────────────────────────────────────────────
// Shape primitives
// ──────────────────────────────────────────────────────────────

/** Visual shape kinds. Maps to a render component. */
export type ShapeKind =
  | 'annulus'      // concentric rings
  | 'dice'         // dot patterns like a die face
  | 'polygon'      // regular n-gon (triangle, square, pentagon, hexagon, ...)
  | 'star'         // n-pointed star
  | 'arrow'        // directional arrow (rotation = direction)
  | 'petals'       // flower with n petals
  | 'spike-ring'   // ring with n outward spikes
  | 'hammer'       // asymmetric T/hammer with optional corner marker
  | 'bars'         // N parallel line segments (1-6), with orientation
  | 'grid-dots'    // rectangular m×n grid of dots
  | 'checkerboard' // m×n grid of filled/empty cells (bit-mask)
  | 'nested-polygon' // polygon inside polygon (outer + inner)
  | 'sector-pie'   // pie chart with N filled/empty sectors
  | 'box-lines'    // box with internal lines (legacy Corvus)
  | 'cube-stack'   // 3D isometric block stack (used by cube-projection puzzle)

/** Per-cell shape parameters. */
export interface ShapeConfig {
  kind: ShapeKind
  /** Overall size, 0–1 (renderer scales to cell box). */
  size: number
  /** Rotation in degrees, 0–360. */
  rotation: number
  /** Fill color (CSS). null = no fill. */
  fill: string | null
  /** Stroke color (CSS). */
  stroke: string
  /** Stroke width in px (at size=1). */
  strokeWidth: number
  /** Kind-specific extras: dotCount for dice, ringCount for annulus, petalCount for petals... */
  params: Record<string, number>
}

// ──────────────────────────────────────────────────────────────
// Logic rules
// ──────────────────────────────────────────────────────────────

/** The rule that determines how cells relate across the matrix. */
export type RuleKind =
  | 'identity'        // all cells identical
  | 'dist-of-3'       // 3 variants, each appears once per row/col
  | 'dist-of-2'       // 2 variants distributed, one blank
  | 'addition'        // col0 + col1 = col2 (per row)
  | 'subtraction'     // col0 − col1 = col2 (per row)
  | 'multiplication'  // col0 × col1 = col2 (per row)
  | 'progression'     // two-axis progression (primary along cols, secondary along rows)
  | 'rotation'        // pure rotation only — sliding window (r+c)×Δ. Asymmetric shapes only.
  | 'mirror'          // row 1 is mirror of row 0 along an axis
  | 'pattern-completion' // big repeating pattern with a blank — "what fills the blank?"
  | 'odd-one-out'    // N items, one breaks the pattern — pick the different one
  | 'and' | 'or' | 'xor' | 'xnor'  // logic gates on binary cells
  | 'cube-projection' // 3D block stack → "which 2D silhouette appears from axis X?"

// ──────────────────────────────────────────────────────────────
// Puzzle items (discriminated by `type`)
// ──────────────────────────────────────────────────────────────

interface PuzzleBase {
  id: string
  rule: RuleKind
  shape: ShapeKind
  /** Distractor count (typically 4–8). The first is always correct. */
  optionCount: number
  /** Difficulty 1 (easy) – 5 (hard). */
  difficulty: 1 | 2 | 3 | 4 | 5
  tags?: string[]
  notes?: string
}

export interface Matrix3x3Puzzle extends PuzzleBase {
  type: '3x3'
  /** 3×3 grid of cell configs. cells[2][2] is the missing one (rendered as ?). */
  cells: ShapeConfig[][]
  /** Answer options. options[correctIndex] should match cells[2][2]. */
  options: ShapeConfig[]
  correctIndex: number
}

export interface Matrix2x2Puzzle extends PuzzleBase {
  type: '2x2'
  cells: ShapeConfig[][]
  options: ShapeConfig[]
  correctIndex: number
}

export interface SeriesPuzzle extends PuzzleBase {
  type: 'series'
  /** 1D row of cells, last is missing. */
  cells: ShapeConfig[]
  options: ShapeConfig[]
  correctIndex: number
}

export interface OddOneOutPuzzle extends PuzzleBase {
  type: 'odd-one-out'
  /** The set; one of them breaks the pattern. */
  options: ShapeConfig[]
  /** Index of the odd one. */
  correctIndex: number
}

/**
 * Pattern Completion puzzle ("which fragment fills the blank?").
 *
 *   - `motifs` is the palette of small shapes the pattern is built from
 *   - `pattern[r][c]` indexes into motifs[]
 *   - `blank` is the rectangular hole the player must fill
 *   - `fragmentOptions[i]` is a rows×cols grid of motif indices
 */
export interface PatternCompletionPuzzle extends PuzzleBase {
  type: 'pattern-completion'
  motifs: ShapeConfig[]
  pattern: number[][]
  blank: { row: number; col: number; rows: number; cols: number }
  fragmentOptions: number[][][]
  correctIndex: number
}

/**
 * Cube Projection puzzle ("which 2D silhouette appears from the marked axis?").
 *
 *   - `cubes` is a set of voxel positions ([x,y,z] integer coords) forming
 *     a connected 3D block stack.
 *   - `questionAxis` is the viewing direction the player must reason about
 *     (drawn on the stack with an arrow + dot indicator).
 *   - Each option is a (axis, silhouette grid) pair; the correct one has
 *     `axis === questionAxis`. The other options are silhouettes from
 *     different axes (or perturbed silhouettes as fallback).
 */
export type ProjectionAxis = 'top' | 'front' | 'back' | 'left' | 'right'

export interface CubeProjectionPuzzle extends PuzzleBase {
  type: 'cube-projection'
  /** Voxel positions in a small integer grid (4×4×4 default). */
  cubes: Array<[number, number, number]>
  /** Axis the question asks about (drawn on the stack with arrow+dot). */
  questionAxis: ProjectionAxis
  /** Each option = (axis, silhouette grid). options[correctIndex].axis === questionAxis. */
  options: Array<{ axis: ProjectionAxis; grid: number[][] }>
  correctIndex: number
}

export type PuzzleItem =
  | Matrix3x3Puzzle
  | Matrix2x2Puzzle
  | SeriesPuzzle
  | OddOneOutPuzzle
  | PatternCompletionPuzzle
  | CubeProjectionPuzzle

// ──────────────────────────────────────────────────────────────
// Test sessions & results
// ──────────────────────────────────────────────────────────────

export interface Test {
  id: string
  name: string
  description?: string
  items: PuzzleItem[]
  allowSkip: boolean
  shuffleOptions: boolean
  createdAt: number
}

export interface AnswerLog {
  itemId: string
  /** -1 if skipped */
  chosenIndex: number
  correct: boolean
  /** Milliseconds spent on this item. */
  durationMs: number
  /** Sequence of option hovers: [optionIndex, timestamp]. */
  hovers: Array<{ index: number; t: number }>
}

export interface TestSession {
  id: string
  testId: string
  startedAt: number
  finishedAt?: number
  answers: AnswerLog[]
}
