/**
 * Paper Folding puzzle generator (classic mental rotation).
 *
 * Concept:
 *   1) Take a rectangular sheet (rows × cols cells).
 *   2) Fold it 1-2 times along axis-aligned creases. Each fold halves
 *      the paper along the chosen axis ('right'/'left' halve the columns,
 *      'up'/'down' halve the rows).
 *   3) Punch a single hole in the folded paper.
 *   4) Question: when the paper is unfolded, where do the holes land?
 *      Each fold mirrors the hole(s) across the fold's axis, doubling
 *      the count. 1 fold → 2 holes; 2 folds → 4 holes.
 *
 * The player picks the correct hole pattern from 4 options. Distractors
 * include common traps: partial unfold (1 fold missing), wrong-axis
 * unfold, and a positional shuffle.
 *
 * All randomness goes through mulberry32 → seedable + reproducible.
 */

import type { FoldDirection, PaperFoldingPuzzle } from '../types/puzzle'
import { type Rng, pick, randInt } from './rng'

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

// Only 'right' and 'down' are generated. reflectHole() implements a single
// "keep the low half (left/top), mirror to the high half" convention, which
// matches how PaperFoldingGrid draws the folded sheet (always at the low half).
// 'left' and 'up' produced a folded sheet whose label/arrow contradicted that
// drawing+math, so the keyed answer was the mirror-wrong pattern. Disabled until
// a direction-aware unfold + renderer reposition lands. See CLAUDE.md / audit.
const FOLD_DIRECTIONS: FoldDirection[] = ['right', 'down']
/** Paper grid size — 4×4 keeps folds clean (2×2 after 2 folds). */
const DEFAULT_ROWS = 4
const DEFAULT_COLS = 4

// ──────────────────────────────────────────────────────────────
// Geometry helpers
// ──────────────────────────────────────────────────────────────

/** Returns the FOLDED paper dimensions after applying the fold sequence
 *  to the original (rows × cols) sheet. Each fold halves one dimension. */
export function foldedDimensions(
  rows: number,
  cols: number,
  folds: FoldDirection[],
): { rows: number; cols: number } {
  let r = rows
  let c = cols
  for (const f of folds) {
    if (f === 'right' || f === 'left') c = Math.floor(c / 2)
    else r = Math.floor(r / 2)
  }
  return { rows: r, cols: c }
}

/** Reflect a hole position across the axis introduced by `fold`, in a paper
 *  whose CURRENT dimensions (before this fold is undone) are passed in. */
function reflectHole(
  hole: { row: number; col: number },
  fold: FoldDirection,
  currentRows: number,
  currentCols: number,
): { row: number; col: number } {
  // 'right' / 'left' folds halve the COL axis. Undoing them mirrors the
  // hole across the VERTICAL center line of the post-unfold paper.
  if (fold === 'right' || fold === 'left') {
    return { row: hole.row, col: currentCols - 1 - hole.col }
  }
  // 'up' / 'down' folds halve the ROW axis. Undoing mirrors across the
  // HORIZONTAL center line.
  return { row: currentRows - 1 - hole.row, col: hole.col }
}

/** Given a single hole on the folded paper, undo each fold from last to first.
 *  Each unfold step doubles the hole count.
 *
 *  Returns the full set of hole positions on the original paper. */
export function unfoldHole(
  hole: { row: number; col: number },
  folds: FoldDirection[],
  originalRows: number,
  originalCols: number,
): Array<{ row: number; col: number }> {
  let holes: Array<{ row: number; col: number }> = [hole]
  // Track the paper dimensions BEFORE each undone fold (we grow as we go).
  // Start from the FOLDED dimensions; after each undo, dimensions double
  // along the relevant axis.
  let curDims = foldedDimensions(originalRows, originalCols, folds)
  for (let i = folds.length - 1; i >= 0; i--) {
    const fold = folds[i]
    // After undoing this fold, the dimension along its axis doubles.
    if (fold === 'right' || fold === 'left') curDims = { ...curDims, cols: curDims.cols * 2 }
    else curDims = { ...curDims, rows: curDims.rows * 2 }

    const newHoles: Array<{ row: number; col: number }> = []
    for (const h of holes) {
      newHoles.push(h) // original position on the (now larger) paper
      newHoles.push(reflectHole(h, fold, curDims.rows, curDims.cols))
    }
    holes = newHoles
  }
  return dedupeHoles(holes)
}

/** Remove duplicate (row, col) entries. Critical because for some hole
 *  positions the reflection lands exactly on top of the original (e.g.
 *  hole on the fold line itself). */
function dedupeHoles(holes: Array<{ row: number; col: number }>): Array<{ row: number; col: number }> {
  const seen = new Set<string>()
  const out: Array<{ row: number; col: number }> = []
  for (const h of holes) {
    const k = `${h.row},${h.col}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(h)
  }
  return out
}

/** Sort holes by row then col so two hole sets with same positions
 *  produce the same signature regardless of insertion order. */
function holeSignature(holes: Array<{ row: number; col: number }>): string {
  return [...holes].sort((a, b) => a.row - b.row || a.col - b.col)
    .map((h) => `${h.row},${h.col}`)
    .join('|')
}

// ──────────────────────────────────────────────────────────────
// Distractor strategies
// ──────────────────────────────────────────────────────────────

/** Return a random valid hole position on a (r, c) grid. */
function randomHolePos(rng: Rng, rows: number, cols: number): { row: number; col: number } {
  return { row: randInt(rng, 0, rows - 1), col: randInt(rng, 0, cols - 1) }
}

/** Partial unfold — apply only the LAST k folds. Produces fewer holes
 *  than the correct answer, but placed on the full-size paper as if the
 *  remaining folds weren't undone. The result is upsampled to the
 *  original paper coords for honest grid comparison. */
function partialUnfold(
  hole: { row: number; col: number },
  folds: FoldDirection[],
  rows: number,
  cols: number,
  applyCount: number,
): Array<{ row: number; col: number }> {
  if (applyCount <= 0) return [hole]
  const subfolds = folds.slice(folds.length - applyCount)
  // Treat the original paper size as if `subfolds` were the only folds:
  // dimensions after these folds would be foldedDimensions(rows, cols, subfolds).
  // But we want positions on the FULL paper, so use full dimensions.
  return unfoldHole(hole, subfolds, rows, cols)
}

/** Wrong-axis unfold — swap each fold's axis (right↔up etc.) before unfolding.
 *  Produces a plausibly-wrong pattern that confuses axis-confused players. */
function wrongAxisUnfold(
  hole: { row: number; col: number },
  folds: FoldDirection[],
  rows: number,
  cols: number,
): Array<{ row: number; col: number }> {
  const swap = (f: FoldDirection): FoldDirection => {
    if (f === 'right') return 'down'
    if (f === 'left') return 'up'
    if (f === 'up') return 'left'
    return 'right' // 'down'
  }
  const swapped = folds.map(swap)
  return unfoldHole(hole, swapped, rows, cols)
}

/** Shuffle the row coordinates while keeping col counts intact. Produces
 *  a same-count but mispositioned pattern. */
function shufflePositions(
  holes: Array<{ row: number; col: number }>,
  rng: Rng,
  rows: number,
  cols: number,
): Array<{ row: number; col: number }> {
  const n = holes.length
  const out: Array<{ row: number; col: number }> = []
  const seen = new Set<string>()
  let attempts = 0
  while (out.length < n && attempts < 50) {
    attempts++
    const r = randInt(rng, 0, rows - 1)
    const c = randInt(rng, 0, cols - 1)
    const k = `${r},${c}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ row: r, col: c })
  }
  return out
}

// ──────────────────────────────────────────────────────────────
// Main builder
// ──────────────────────────────────────────────────────────────

export interface PaperFoldingPuzzleOptions {
  rows?: number
  cols?: number
  /** Number of folds (1 or 2 in MVP). Default: random 1 or 2. */
  foldCount?: number
}

/** Build a single Paper Folding puzzle.
 *
 *  Strategy:
 *   1) Pick fold count (default: random 1-2).
 *   2) Pick fold directions.
 *   3) Pick a hole on the folded paper.
 *   4) Compute correct unfold = set of hole positions on full paper.
 *   5) Build 3 distractors:
 *      - Partial unfold (1 fold short)
 *      - Wrong-axis unfold
 *      - Random shuffle (same count, wrong positions)
 *   6) Validate: all 4 hole signatures are unique. Retry up to 30× otherwise. */
export function buildPaperFoldingPuzzle(
  rng: Rng,
  opts: PaperFoldingPuzzleOptions = {},
): PaperFoldingPuzzle {
  const rows = opts.rows ?? DEFAULT_ROWS
  const cols = opts.cols ?? DEFAULT_COLS

  for (let attempt = 0; attempt < 30; attempt++) {
    const foldCount = opts.foldCount ?? randInt(rng, 1, 2)
    const folds: FoldDirection[] = []
    for (let i = 0; i < foldCount; i++) {
      // Avoid two consecutive identical-axis folds with same direction —
      // those produce a paper that's quartered in one axis, which is fine
      // but visually less interesting. Allow up/right combos freely.
      folds.push(pick(rng, FOLD_DIRECTIONS))
    }
    const folded = foldedDimensions(rows, cols, folds)
    if (folded.rows < 1 || folded.cols < 1) continue

    const hole = randomHolePos(rng, folded.rows, folded.cols)
    const correctHoles = unfoldHole(hole, folds, rows, cols)

    // Distractors
    const partialHoles = partialUnfold(hole, folds, rows, cols, Math.max(0, folds.length - 1))
    const wrongAxisHoles = wrongAxisUnfold(hole, folds, rows, cols)
    const shuffledHoles = shufflePositions(correctHoles, rng, rows, cols)

    const candidates: Array<{ holes: Array<{ row: number; col: number }> }> = [
      { holes: correctHoles },
      { holes: partialHoles },
      { holes: wrongAxisHoles },
      { holes: shuffledHoles },
    ]

    // Validate uniqueness
    const sigs = candidates.map((c) => holeSignature(c.holes))
    if (new Set(sigs).size !== 4) continue

    // Shuffle position of correct answer
    const order = [0, 1, 2, 3]
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    const shuffled = order.map((idx) => candidates[idx])
    const correctIndex = order.indexOf(0)

    return {
      id: `paper-${Date.now()}-${Math.floor(rng() * 1e6)}`,
      type: 'paper-folding',
      rule: 'paper-folding',
      shape: 'paper-fold-source',
      optionCount: 4,
      difficulty: foldCount === 1 ? 3 : 4,
      rows,
      cols,
      folds,
      hole,
      options: shuffled,
      correctIndex,
    }
  }

  throw new Error('buildPaperFoldingPuzzle: could not produce 4 distinct options')
}

/** Validator: 4 unique signatures, correctIndex's holes match the unfold
 *  algorithm output for the puzzle's folds + hole. */
export function isPaperFoldingPuzzleValid(p: PaperFoldingPuzzle): boolean {
  if (p.options.length !== 4) return false
  if (p.correctIndex < 0 || p.correctIndex >= 4) return false
  const sigs = p.options.map((o) => holeSignature(o.holes))
  if (new Set(sigs).size !== 4) return false
  const expected = unfoldHole(p.hole, p.folds, p.rows, p.cols)
  const expectedSig = holeSignature(expected)
  return sigs[p.correctIndex] === expectedSig
}
