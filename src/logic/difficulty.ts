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
export function calibrateDifficulty(p: Pick<PuzzleItem, 'rule' | 'shape' | 'optionCount'>): 1 | 2 | 3 | 4 | 5 {
  const ruleLoad = RULE_LOAD[p.rule] ?? 2
  const shapeBonus = SHAPE_BONUS[p.shape as ShapeKind] ?? 0
  const optionAdjust = p.optionCount >= 6 ? 0.5 : 0
  const raw = ruleLoad + shapeBonus + optionAdjust
  const clamped = Math.max(1, Math.min(5, Math.round(raw)))
  return clamped as 1 | 2 | 3 | 4 | 5
}
