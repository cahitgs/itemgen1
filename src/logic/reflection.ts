/**
 * Reflection puzzle generator ("which option is the true mirror over axis X?").
 *
 * One asymmetric source shape + a mirror axis (horizontal or vertical). The
 * correct answer is the actual reflection; distractors include common traps:
 *   - The original (no flip) — tests whether the player even noticed the axis
 *   - The wrong-axis reflection — tests axis discrimination
 *   - A 180° rotation — superficially similar to a flip
 *   - A perturbation of a different param — backup distractor
 *
 * Only shapes that LOOK DIFFERENT after flipping are eligible. Symmetric
 * shapes (annulus, even-sided polygon, even-pointed star, dice, etc.)
 * collapse to identical-looking options and are excluded.
 */

import type {
  ReflectionAxis,
  ReflectionPuzzle,
  ShapeConfig,
  ShapeKind,
} from '../types/puzzle'
import { type Rng, pick, randInt } from './rng'
import { randomBaseShape, visualSignature } from './generator'

/** Internal asymmetric carrier pool for reflection puzzles.
 *
 *  Restricted to shapes whose flip is GUARANTEED visually distinct:
 *    - arrow: directional, flip changes pointing direction
 *    - hammer: T-shape + asymmetric marker position
 *    - block-letter: 3×3 asymmetric F/L/T/P/J/S/Z-like presets — strongest
 *      contrast under any flip (mental-rotation classics)
 *
 *  Earlier versions included polygon/star/petals/bars but those carry their
 *  own symmetry folds (pentagon flip = pentagon, etc.) so the 4 options
 *  often looked visually identical despite distinct signatures. */
const REFLECTION_SHAPES: ShapeKind[] = ['arrow', 'hammer', 'block-letter']

/** Shapes the user can pick from the Generate UI for the reflection rule.
 *  The "reflection-source" virtual shape is what the UI shows; internally
 *  the generator picks from REFLECTION_SHAPES. */
export const REFLECTION_COMPATIBLE_SHAPES = REFLECTION_SHAPES

/** Generate a single Reflection puzzle. The external `shape` parameter is
 *  ignored — the generator always picks an asymmetric carrier from its
 *  internal pool (arrow, hammer, block-letter). */
export function buildReflectionPuzzle(rng: Rng, _shape?: ShapeKind): ReflectionPuzzle {
  void _shape // intentionally unused
  // Try up to 30 times to produce a puzzle with all-distinct options
  for (let attempt = 0; attempt < 30; attempt++) {
    const kind = pick(rng, REFLECTION_SHAPES)
    const source = forceAsymmetric(randomBaseShape(kind, rng), kind, rng)
    const axis: ReflectionAxis = pick(rng, ['horizontal', 'vertical'] as const)
    const axisCode = axis === 'horizontal' ? 1 : 2
    const otherCode = axis === 'horizontal' ? 2 : 1

    // Correct option = source with mirror applied
    const correct: ShapeConfig = {
      ...source,
      params: { ...source.params, mirror: axisCode },
    }

    // Distractors
    const distractors: ShapeConfig[] = [
      // Identity — no flip applied (common trap)
      { ...source, params: { ...source.params, mirror: 0 } },
      // Wrong axis flip
      { ...source, params: { ...source.params, mirror: otherCode } },
      // 180° rotation
      {
        ...source,
        rotation: (source.rotation + 180) % 360,
        params: { ...source.params, mirror: 0 },
      },
    ]

    // Validate: all 4 options must have distinct visual signatures
    const all = [correct, ...distractors]
    const sigs = all.map(visualSignature)
    if (new Set(sigs).size !== 4) continue

    // Shuffle position of correct answer
    const shuffled: ShapeConfig[] = []
    const order = [0, 1, 2, 3]
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    for (const idx of order) shuffled.push(all[idx])
    const correctIndex = order.indexOf(0)

    return {
      id: `reflection-${Date.now()}-${Math.floor(rng() * 1e6)}`,
      type: 'reflection',
      rule: 'reflection',
      shape: kind,
      optionCount: 4,
      difficulty: 3,
      source,
      axis,
      options: shuffled,
      correctIndex,
    }
  }

  // Should be unreachable for typical seeds — but throw so caller treats
  // as "invalid" attempt and the bulk loop tries again.
  throw new Error('buildReflectionPuzzle: could not produce 4 distinct options')
}

/**
 * For shapes whose default randomization may land on a symmetric variant
 * (e.g. polygon with even sides, star with even points), force-tweak the
 * parameters into the asymmetric range so the reflection is actually
 * distinguishable from the original.
 */
function forceAsymmetric(s: ShapeConfig, kind: ShapeKind, rng: Rng): ShapeConfig {
  const params = { ...s.params }
  switch (kind) {
    case 'polygon': {
      // Odd sides only: 3, 5, 7
      params.sides = pick(rng, [3, 5, 7])
      // Add a random rotation offset so the asymmetry under reflection is
      // visible (a triangle pointing up reflects to a triangle pointing up).
      return { ...s, rotation: pick(rng, [15, 30, 45, 60, 75]), params }
    }
    case 'star': {
      // Odd points: 5, 7, 9
      params.points = pick(rng, [5, 7, 9])
      return { ...s, rotation: pick(rng, [12, 24, 36, 54, 72]), params }
    }
    case 'petals': {
      // Odd count: 5, 7, 9
      params.petalCount = pick(rng, [5, 7, 9])
      return { ...s, rotation: pick(rng, [10, 25, 40]), params }
    }
    case 'bars': {
      // Diagonal orientation is asymmetric (vs. pure horizontal/vertical
      // which are symmetric under their respective flip).
      params.orientation = 2 // diagonal
      // Even barCount can be symmetric too — keep odd or use rotation offset
      return { ...s, params }
    }
    case 'arrow': {
      // Pick a non-cardinal rotation so flip clearly differs
      return { ...s, rotation: pick(rng, [30, 60, 120, 150, 210, 240, 300, 330]), params }
    }
    case 'hammer': {
      // Ensure a marker is set (markerPos > 0) — otherwise hammer with
      // markerPos=0 plus certain rotations can be near-symmetric
      params.markerPos = randInt(rng, 1, 4)
      // Non-cardinal rotation
      return { ...s, rotation: pick(rng, [30, 60, 120, 150, 210, 240, 300, 330]), params }
    }
    case 'block-letter': {
      // Already asymmetric by construction. Keep cardinal rotations for
      // clearer mirror reading (0/90/180/270).
      return { ...s, rotation: pick(rng, [0, 90, 180, 270]), params }
    }
    default:
      return s
  }
}

/** Validate a freshly-generated reflection puzzle: 4 distinct options, the
 *  correct one has params.mirror matching the axis. */
export function isReflectionPuzzleValid(p: ReflectionPuzzle): boolean {
  if (p.options.length !== 4) return false
  if (p.correctIndex < 0 || p.correctIndex >= 4) return false
  // All distinct visual signatures
  const sigs = p.options.map(visualSignature)
  if (new Set(sigs).size !== 4) return false
  // Correct option's mirror matches the axis
  const expected = p.axis === 'horizontal' ? 1 : 2
  const correctMirror = Math.round(p.options[p.correctIndex].params.mirror ?? 0)
  return correctMirror === expected
}
