/**
 * Dynamic difficulty calibration.
 *
 * Replaces the static `difficulty: 1-5` literals each generator was emitting
 * with a value derived from the puzzle's actual cognitive load:
 *   - Rule complexity (how hard is the underlying pattern?)
 *   - Shape complexity (how visually busy is the carrier?)
 *   - Option count (more options → harder)
 *   - Distractor proximity (perturbations close to correct → harder — not yet
 *     implemented, would require measuring visualSignature distance)
 *
 * Output is clamped to [1, 5] to fit the existing PuzzleBase.difficulty type.
 */

import type { PuzzleItem, RuleKind, ShapeKind } from '../types/puzzle'

// Base load: how hard the RULE itself is on a 1-5 scale, independent of shape.
// Values calibrated against typical Raven SPM/APM difficulty ratings.
const RULE_LOAD: Record<RuleKind, number> = {
  identity: 1,
  'dist-of-3': 2,
  'dist-of-2': 2,
  progression: 3,
  rotation: 2,
  addition: 3,
  subtraction: 3,
  multiplication: 4,
  mirror: 3,
  'pattern-completion': 2,
  'odd-one-out': 2,
  and: 4,
  or: 4,
  xor: 5,
  xnor: 5,
  'cube-projection': 4, // 3D mental rotation is cognitively demanding
  reflection: 3,         // 2D mirror imagery — moderate spatial transformation
  'paper-folding': 4,    // sequential mental folds + reflection — high spatial load
}

// Per-shape visual complexity bonus. Plain shapes add 0; busy or compound
// shapes add a small bump.
const SHAPE_BONUS: Record<ShapeKind, number> = {
  annulus: 0,
  dice: 0,
  polygon: 0,
  star: 0,
  arrow: 0,
  petals: 0,
  'spike-ring': 0,
  hammer: 1,            // composite shape (head + handle + marker)
  bars: 0,
  'grid-dots': 0,
  checkerboard: 1,      // bit-pattern parsing
  'nested-polygon': 1,  // two polygons to compare
  'sector-pie': 1,      // sector counting + fill
  'box-lines': 0,
  'cube-stack': 1,      // 3D voxel structure adds visual parsing load
  'block-letter': 1,    // asymmetric glyph parsing
  'reflection-source': 1, // virtual; reflection rule already adds load
  'paper-fold-source': 0, // virtual; paper-folding rule already adds load
}

/**
 * Compute a calibrated difficulty for a freshly-generated puzzle.
 *
 * Formula:
 *   raw = RULE_LOAD[rule] + SHAPE_BONUS[shape] + optionAdjust
 *   final = clamp(round(raw), 1, 5)
 *
 * where optionAdjust = +0.5 if optionCount >= 6 (more answer choices means
 * harder to scan).
 */
export function calibrateDifficulty(p: PuzzleItem): 1 | 2 | 3 | 4 | 5 {
  const ruleLoad = RULE_LOAD[p.rule] ?? 2
  const shapeBonus = SHAPE_BONUS[p.shape as ShapeKind] ?? 0
  const optionAdjust = p.optionCount >= 6 ? 0.5 : 0
  const raw = ruleLoad + shapeBonus + optionAdjust + instanceAdjust(p)
  const clamped = Math.max(1, Math.min(5, Math.round(raw)))
  return clamped as 1 | 2 | 3 | 4 | 5
}

/** Instance-specific load so two puzzles of the same rule+shape aren't always
 *  scored identically (e.g. a 2-fold paper beats a 1-fold one). */
function instanceAdjust(p: PuzzleItem): number {
  if (p.type === 'paper-folding') return p.folds.length >= 2 ? 0.6 : -0.3
  if (p.type === 'cube-projection') return p.cubes.length >= 9 ? 0.5 : 0
  if (
    p.type === '3x3' &&
    (p.rule === 'and' || p.rule === 'or' || p.rule === 'xor' || p.rule === 'xnor')
  ) {
    const c0 = p.cells[0][0]
    const bits =
      Math.round(c0.params.rows ?? 0) * Math.round(c0.params.cols ?? 0) ||
      Math.round(c0.params.sectorCount ?? 0)
    return bits >= 9 ? 0.5 : 0
  }
  return 0
}
