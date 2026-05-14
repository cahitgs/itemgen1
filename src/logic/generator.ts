/**
 * Puzzle generators — turn (rule + shape + params) into a fully-formed PuzzleItem.
 *
 * Both fixed-sample helpers (for the Player MVP) and parameterized
 * generators that accept an Rng (for bulk generation) live here.
 *
 * To add a new (rule, shape) combination:
 *   1. Add a randomVariants_<shape>(rng) function (decides the 3 distinct cell variants)
 *   2. Plug it into generateRandomDistOf3 or generateRandomIdentity
 *   3. Register it in bulk.ts
 */

import type {
  Matrix3x3Puzzle,
  ShapeConfig,
  ShapeKind,
} from '../types/puzzle'
import {
  type Rng,
  mulberry32,
  pick,
  randInt,
  randomSeed,
  sample,
  shuffle as shuffleRng,
} from './rng'

let _counter = 0
const nextId = (rng: Rng) => `puz-${Math.floor(rng() * 1e9).toString(36)}-${_counter++}`

// ──────────────────────────────────────────────────────────────
// Style palettes (small but extensible)
// ──────────────────────────────────────────────────────────────

const STROKE_PALETTE = [
  '#e4e4e7', // light gray (default)
  '#a78bfa', // accent purple
  '#34d399', // green
  '#f59e0b', // amber
  '#60a5fa', // blue
]

const SIZE_BUCKETS = [0.55, 0.75, 0.92]
const ROTATION_BUCKETS = [0, 45, 90, 135, 180]

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

export function defaultShape(
  kind: ShapeKind,
  params: Record<string, number> = {},
  overrides: Partial<ShapeConfig> = {},
): ShapeConfig {
  return {
    kind,
    size: 0.85,
    rotation: 0,
    fill: null,
    stroke: '#e4e4e7',
    strokeWidth: 2,
    params,
    ...overrides,
  }
}

export function clone(s: ShapeConfig): ShapeConfig {
  return { ...s, params: { ...s.params } }
}

/**
 * Build a stable structural signature of a puzzle (for dedup).
 * Two puzzles with the same signature look identical to the player.
 */
export function puzzleSignature(p: Matrix3x3Puzzle): string {
  const cellSig = p.cells
    .map((row) => row.map(visualSignature).join('|'))
    .join('/')
  // We don't include options order — only the correct answer's identity
  const correctSig = visualSignature(p.options[p.correctIndex])
  return `${p.shape}:${p.rule}:${cellSig}#${correctSig}`
}

/**
 * "Looks the same to a human" signature. Normalizes rotation according to each
 * shape config's rotational symmetry, so e.g. an annulus (circles, fully
 * symmetric) gets rot=0 regardless of input, a 4-dot dice (90° symmetric)
 * normalizes any rotation to within [0,90), and a 2-dot dice (180° symmetric)
 * normalizes to within [0,180).
 */
export function visualSignature(s: ShapeConfig): string {
  const params = Object.keys(s.params)
    .sort()
    .map((k) => `${k}=${s.params[k]}`)
    .join(',')
  const fold = rotationSymmetryFold(s)
  // fold is the angular period; if shape is fully symmetric, fold=1 → rot collapses to 0
  const period = 360 / fold
  const effRot = period <= 0 || fold >= 360 ? Math.round(s.rotation % 360) : Math.round(s.rotation % period)
  return `${s.kind}(sz=${round2(s.size)},rot=${effRot},sw=${s.strokeWidth},stk=${s.stroke},fill=${s.fill ?? 'none'},${params})`
}

/**
 * Returns N where the shape has N-fold rotational symmetry.
 *   1   = no symmetry (any rotation looks different)  — actually represented as 1 below
 *   2   = 180° symmetric
 *   4   = 90° symmetric
 *   ∞   = looks identical at any rotation (annulus)
 *
 * Implemented as numbers: 1 (no symmetry, fold=1 period=360), 2, 4, 360 (∞).
 * The visualSignature uses period = 360 / fold to normalize rotation.
 */
export function rotationSymmetryFold(s: ShapeConfig): number {
  if (s.kind === 'annulus') return 360 // any rotation indistinguishable
  if (s.kind === 'dice') {
    const n = s.params.dotCount
    if (DICE_90_SYMMETRIC.has(n)) return 4   // 90° rotational symmetry
    if (DICE_180_SYMMETRIC.has(n)) return 2  // 180° symmetry only
    return 1
  }
  if (s.kind === 'polygon') {
    // Regular n-gon has n-fold rotational symmetry
    return Math.max(1, Math.round(s.params.sides ?? 3))
  }
  if (s.kind === 'star') {
    return Math.max(1, Math.round(s.params.points ?? 5))
  }
  if (s.kind === 'petals') {
    return Math.max(1, Math.round(s.params.petalCount ?? 6))
  }
  if (s.kind === 'spike-ring') {
    return Math.max(1, Math.round(s.params.spikeCount ?? 8))
  }
  if (s.kind === 'arrow') {
    return 1 // fully directional — no rotational symmetry
  }
  if (s.kind === 'hammer') {
    return 1 // fully asymmetric — handle + head, marker is in cell coords
  }
  return 1
}

/** Dice dot patterns with full 90° rotational symmetry (look identical every 90°). */
const DICE_90_SYMMETRIC = new Set([1, 4, 5, 8, 9])
/** Dice dot patterns with 180° symmetry only (look identical only at 0° and 180°). */
const DICE_180_SYMMETRIC = new Set([2, 3, 6, 7])

const round2 = (n: number) => Math.round(n * 100) / 100

// ──────────────────────────────────────────────────────────────
// Variant generators per shape kind
// ──────────────────────────────────────────────────────────────

/** 3 distinct annulus variants for a distribution puzzle.
 *
 *  Note: rotation is NOT a valid axis here — annulus is rotation-symmetric, so
 *  varying rotation produces visually identical cells (bulmaca çözülmez).
 *  We use ringCount / size / stroke / strokeWidth as the four primary axes.
 */
function randomAnnulusVariants(rng: Rng): ShapeConfig[] {
  const axis = pick(rng, ['ringCount', 'size', 'stroke', 'strokeWidth'] as const)
  const stroke = pick(rng, STROKE_PALETTE)
  const baseSize = pick(rng, SIZE_BUCKETS)
  const baseSW = randInt(rng, 2, 4)
  const baseRings = randInt(rng, 1, 2)
  const baseGap = pick(rng, [0.12, 0.15, 0.2])

  switch (axis) {
    case 'ringCount': {
      // 3 ring counts, e.g. {1, 2, 3} or {2, 3, 4}
      const ringCounts = sample(rng, [1, 2, 3, 4], 3).sort((a, b) => a - b)
      return ringCounts.map((rc) =>
        defaultShape('annulus', { ringCount: rc, gap: baseGap }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'size': {
      const sizes = sample(rng, [0.5, 0.65, 0.8, 0.95], 3).sort((a, b) => a - b)
      return sizes.map((s) =>
        defaultShape('annulus', { ringCount: baseRings + 1, gap: baseGap }, {
          stroke,
          size: s,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'stroke': {
      const strokes = sample(rng, STROKE_PALETTE, 3)
      return strokes.map((stk) =>
        defaultShape('annulus', { ringCount: baseRings + 1, gap: baseGap }, {
          stroke: stk,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'strokeWidth': {
      const widths = sample(rng, [1, 2, 4, 6], 3).sort((a, b) => a - b)
      return widths.map((sw) =>
        defaultShape('annulus', { ringCount: baseRings + 1, gap: baseGap }, {
          stroke,
          size: baseSize,
          strokeWidth: sw,
        }),
      )
    }
  }
}

/** 3 distinct dice variants for a distribution puzzle.
 *
 *  Rotation is only meaningful when the dot pattern has < 90° symmetry.
 *  90°-symmetric: {1, 4, 5, 8, 9} — all 90° rotations look identical
 *  180°-symmetric: {2, 3, 6, 7} — 0° and 180° identical, but 0/45/90/135 distinguishable
 *  So the rotation axis must use a base from {2, 3, 6, 7}.
 */
function randomDiceVariants(rng: Rng): ShapeConfig[] {
  // 180°-only-symmetric dots: rotation axis is valid here (0/45/90/135 all distinct)
  const rotationCompatibleDots = [2, 3, 6, 7]
  const baseDots = pick(rng, rotationCompatibleDots)

  const axis = pick(rng, ['dotCount', 'rotation', 'size', 'stroke'] as const)
  const stroke = pick(rng, STROKE_PALETTE)
  const baseSize = pick(rng, SIZE_BUCKETS)
  const baseSW = randInt(rng, 2, 3)
  const baseRot = pick(rng, [0, 90])

  switch (axis) {
    case 'dotCount': {
      const dots = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], 3).sort((a, b) => a - b)
      return dots.map((d) =>
        defaultShape('dice', { dotCount: d }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
          rotation: baseRot,
        }),
      )
    }
    case 'rotation': {
      // Use 4 angles, pick 3, on an asymmetric dot pattern
      const rotations = sample(rng, [0, 45, 90, 135], 3).sort((a, b) => a - b)
      return rotations.map((r) =>
        defaultShape('dice', { dotCount: baseDots }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
          rotation: r,
        }),
      )
    }
    case 'size': {
      const sizes = sample(rng, [0.5, 0.65, 0.8, 0.95], 3).sort((a, b) => a - b)
      return sizes.map((s) =>
        defaultShape('dice', { dotCount: baseDots }, {
          stroke,
          size: s,
          strokeWidth: baseSW,
          rotation: baseRot,
        }),
      )
    }
    case 'stroke': {
      const strokes = sample(rng, STROKE_PALETTE, 3)
      return strokes.map((stk) =>
        defaultShape('dice', { dotCount: baseDots }, {
          stroke: stk,
          size: baseSize,
          strokeWidth: baseSW,
          rotation: baseRot,
        }),
      )
    }
  }
}

/** Variants for regular polygons. Primary axis: number of sides. */
function randomPolygonVariants(rng: Rng): ShapeConfig[] {
  const axis = pick(rng, ['sides', 'size', 'stroke', 'strokeWidth'] as const)
  const stroke = pick(rng, STROKE_PALETTE)
  const baseSize = pick(rng, SIZE_BUCKETS)
  const baseSW = randInt(rng, 2, 4)
  const baseSides = randInt(rng, 3, 8)

  switch (axis) {
    case 'sides': {
      // 3 distinct side counts (different polygons → very different visuals)
      const sides = sample(rng, [3, 4, 5, 6, 7, 8], 3).sort((a, b) => a - b)
      return sides.map((s) =>
        defaultShape('polygon', { sides: s }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'size': {
      const sizes = sample(rng, [0.5, 0.65, 0.8, 0.95], 3).sort((a, b) => a - b)
      return sizes.map((sz) =>
        defaultShape('polygon', { sides: baseSides }, {
          stroke,
          size: sz,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'stroke': {
      const strokes = sample(rng, STROKE_PALETTE, 3)
      return strokes.map((stk) =>
        defaultShape('polygon', { sides: baseSides }, {
          stroke: stk,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'strokeWidth': {
      const widths = sample(rng, [1, 2, 4, 6], 3).sort((a, b) => a - b)
      return widths.map((sw) =>
        defaultShape('polygon', { sides: baseSides }, {
          stroke,
          size: baseSize,
          strokeWidth: sw,
        }),
      )
    }
  }
}

/** Variants for n-pointed stars. Primary axis: number of points. */
function randomStarVariants(rng: Rng): ShapeConfig[] {
  const axis = pick(rng, ['points', 'size', 'stroke', 'innerRatio'] as const)
  const stroke = pick(rng, STROKE_PALETTE)
  const baseSize = pick(rng, SIZE_BUCKETS)
  const baseSW = randInt(rng, 2, 3)
  const basePoints = randInt(rng, 5, 8)
  const baseInnerRatio = pick(rng, [0.3, 0.4, 0.5])

  switch (axis) {
    case 'points': {
      const ptCounts = sample(rng, [4, 5, 6, 7, 8, 10], 3).sort((a, b) => a - b)
      return ptCounts.map((p) =>
        defaultShape('star', { points: p, innerRatio: baseInnerRatio }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'innerRatio': {
      const ratios = sample(rng, [0.25, 0.35, 0.5, 0.6], 3).sort((a, b) => a - b)
      return ratios.map((ir) =>
        defaultShape('star', { points: basePoints, innerRatio: ir }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'size': {
      const sizes = sample(rng, [0.5, 0.65, 0.8, 0.95], 3).sort((a, b) => a - b)
      return sizes.map((sz) =>
        defaultShape('star', { points: basePoints, innerRatio: baseInnerRatio }, {
          stroke,
          size: sz,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'stroke': {
      const strokes = sample(rng, STROKE_PALETTE, 3)
      return strokes.map((stk) =>
        defaultShape('star', { points: basePoints, innerRatio: baseInnerRatio }, {
          stroke: stk,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
  }
}

/** Variants for arrows. Primary axis: rotation (direction). */
function randomArrowVariants(rng: Rng): ShapeConfig[] {
  const axis = pick(rng, ['rotation', 'size', 'stroke', 'headRatio'] as const)
  const stroke = pick(rng, STROKE_PALETTE)
  const baseSize = pick(rng, SIZE_BUCKETS)
  const baseSW = randInt(rng, 2, 4)
  const baseHeadRatio = pick(rng, [0.35, 0.45, 0.55])

  switch (axis) {
    case 'rotation': {
      // 8 cardinal/intercardinal directions → pick 3 distinct
      const angles = sample(rng, [0, 45, 90, 135, 180, 225, 270, 315], 3)
      return angles.map((a) =>
        defaultShape('arrow', { headRatio: baseHeadRatio, shaftWidth: 0.35 }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
          rotation: a,
        }),
      )
    }
    case 'headRatio': {
      const ratios = sample(rng, [0.3, 0.4, 0.5, 0.6], 3).sort((a, b) => a - b)
      const fixedRot = pick(rng, [0, 90, 180, 270])
      return ratios.map((hr) =>
        defaultShape('arrow', { headRatio: hr, shaftWidth: 0.35 }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
          rotation: fixedRot,
        }),
      )
    }
    case 'size': {
      const sizes = sample(rng, [0.5, 0.65, 0.8, 0.95], 3).sort((a, b) => a - b)
      const fixedRot = pick(rng, [0, 90, 180, 270])
      return sizes.map((sz) =>
        defaultShape('arrow', { headRatio: baseHeadRatio, shaftWidth: 0.35 }, {
          stroke,
          size: sz,
          strokeWidth: baseSW,
          rotation: fixedRot,
        }),
      )
    }
    case 'stroke': {
      const strokes = sample(rng, STROKE_PALETTE, 3)
      const fixedRot = pick(rng, [0, 90, 180, 270])
      return strokes.map((stk) =>
        defaultShape('arrow', { headRatio: baseHeadRatio, shaftWidth: 0.35 }, {
          stroke: stk,
          size: baseSize,
          strokeWidth: baseSW,
          rotation: fixedRot,
        }),
      )
    }
  }
}

/** Variants for petals (flower). Primary axis: petal count. */
function randomPetalsVariants(rng: Rng): ShapeConfig[] {
  const axis = pick(rng, ['petalCount', 'size', 'stroke', 'petalWidth'] as const)
  const stroke = pick(rng, STROKE_PALETTE)
  const baseSize = pick(rng, SIZE_BUCKETS)
  const baseSW = randInt(rng, 2, 3)
  const baseCount = randInt(rng, 5, 10)
  const baseWidth = pick(rng, [0.08, 0.12, 0.18])

  switch (axis) {
    case 'petalCount': {
      const counts = sample(rng, [3, 4, 5, 6, 7, 8, 10, 12], 3).sort((a, b) => a - b)
      return counts.map((n) =>
        defaultShape('petals', { petalCount: n, petalWidth: baseWidth }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'petalWidth': {
      const widths = sample(rng, [0.06, 0.1, 0.16, 0.22], 3).sort((a, b) => a - b)
      return widths.map((w) =>
        defaultShape('petals', { petalCount: baseCount, petalWidth: w }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'size': {
      const sizes = sample(rng, [0.5, 0.65, 0.8, 0.95], 3).sort((a, b) => a - b)
      return sizes.map((sz) =>
        defaultShape('petals', { petalCount: baseCount, petalWidth: baseWidth }, {
          stroke,
          size: sz,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'stroke': {
      const strokes = sample(rng, STROKE_PALETTE, 3)
      return strokes.map((stk) =>
        defaultShape('petals', { petalCount: baseCount, petalWidth: baseWidth }, {
          stroke: stk,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
  }
}

/** Variants for spike-rings. Primary axis: spike count. */
function randomSpikeRingVariants(rng: Rng): ShapeConfig[] {
  const axis = pick(rng, ['spikeCount', 'size', 'stroke', 'spikeDepth'] as const)
  const stroke = pick(rng, STROKE_PALETTE)
  const baseSize = pick(rng, SIZE_BUCKETS)
  const baseSW = randInt(rng, 2, 3)
  const baseCount = randInt(rng, 6, 12)
  const baseDepth = pick(rng, [0.2, 0.3, 0.45])

  switch (axis) {
    case 'spikeCount': {
      const counts = sample(rng, [4, 5, 6, 8, 10, 12, 14, 16], 3).sort((a, b) => a - b)
      return counts.map((n) =>
        defaultShape('spike-ring', { spikeCount: n, spikeDepth: baseDepth }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'spikeDepth': {
      const depths = sample(rng, [0.15, 0.3, 0.45, 0.6], 3).sort((a, b) => a - b)
      return depths.map((d) =>
        defaultShape('spike-ring', { spikeCount: baseCount, spikeDepth: d }, {
          stroke,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'size': {
      const sizes = sample(rng, [0.5, 0.65, 0.8, 0.95], 3).sort((a, b) => a - b)
      return sizes.map((sz) =>
        defaultShape('spike-ring', { spikeCount: baseCount, spikeDepth: baseDepth }, {
          stroke,
          size: sz,
          strokeWidth: baseSW,
        }),
      )
    }
    case 'stroke': {
      const strokes = sample(rng, STROKE_PALETTE, 3)
      return strokes.map((stk) =>
        defaultShape('spike-ring', { spikeCount: baseCount, spikeDepth: baseDepth }, {
          stroke: stk,
          size: baseSize,
          strokeWidth: baseSW,
        }),
      )
    }
  }
}

/** Variants for hammer. Primary axes: rotation (direction) or markerPos. */
function randomHammerVariants(rng: Rng): ShapeConfig[] {
  const axis = pick(rng, ['rotation', 'markerPos', 'size', 'stroke'] as const)
  const stroke = pick(rng, STROKE_PALETTE)
  const baseSize = pick(rng, SIZE_BUCKETS)
  const baseSW = randInt(rng, 1, 2)
  const baseRot = pick(rng, [0, 45, 90, 135, 180, 225, 270, 315])
  const baseMarker = randInt(rng, 1, 4)
  const baseDims = {
    handleLength: 0.6,
    headWidth: 0.6,
    headThickness: 0.18,
    markerSize: 0.1,
  }

  switch (axis) {
    case 'rotation': {
      // 8 cardinal/intercardinal directions → pick 3 distinct
      const rotations = sample(rng, [0, 45, 90, 135, 180, 225, 270, 315], 3)
      return rotations.map((r) =>
        defaultShape('hammer', { ...baseDims, markerPos: baseMarker }, {
          stroke, size: baseSize, strokeWidth: baseSW, rotation: r,
        }),
      )
    }
    case 'markerPos': {
      // 4 corner positions → pick 3 distinct
      const positions = sample(rng, [1, 2, 3, 4], 3)
      return positions.map((p) =>
        defaultShape('hammer', { ...baseDims, markerPos: p }, {
          stroke, size: baseSize, strokeWidth: baseSW, rotation: baseRot,
        }),
      )
    }
    case 'size': {
      const sizes = sample(rng, [0.5, 0.65, 0.8, 0.95], 3).sort((a, b) => a - b)
      return sizes.map((sz) =>
        defaultShape('hammer', { ...baseDims, markerPos: baseMarker }, {
          stroke, size: sz, strokeWidth: baseSW, rotation: baseRot,
        }),
      )
    }
    case 'stroke': {
      const strokes = sample(rng, STROKE_PALETTE, 3)
      return strokes.map((stk) =>
        defaultShape('hammer', { ...baseDims, markerPos: baseMarker }, {
          stroke: stk, size: baseSize, strokeWidth: baseSW, rotation: baseRot,
        }),
      )
    }
  }
}

const VARIANT_GENERATORS: Record<ShapeKind, ((rng: Rng) => ShapeConfig[]) | null> = {
  annulus: randomAnnulusVariants,
  dice: randomDiceVariants,
  polygon: randomPolygonVariants,
  star: randomStarVariants,
  arrow: randomArrowVariants,
  petals: randomPetalsVariants,
  'spike-ring': randomSpikeRingVariants,
  hammer: randomHammerVariants,
  'box-lines': null,
}

// ──────────────────────────────────────────────────────────────
// Distractor generation — finds visually-distinct wrong answers
// ──────────────────────────────────────────────────────────────

/**
 * Map shape kind → the primary integer param name + its valid range.
 * Used by paramTweaks to perturb the shape's most-visible discrete property.
 */
const PRIMARY_PARAM: Record<
  ShapeKind,
  { name: string; min: number; max: number } | null
> = {
  annulus: { name: 'ringCount', min: 1, max: 4 },
  dice: { name: 'dotCount', min: 1, max: 9 },
  polygon: { name: 'sides', min: 3, max: 8 },
  star: { name: 'points', min: 4, max: 10 },
  petals: { name: 'petalCount', min: 3, max: 12 },
  'spike-ring': { name: 'spikeCount', min: 4, max: 16 },
  arrow: null,         // arrow's primary distinction is rotation, not a count
  hammer: null,        // hammer's primary distinction is rotation + marker position
  'box-lines': null,
}

/**
 * Produce shape-config tweaks where the primary integer param is shifted by ±delta.
 * Skips deltas that fall outside the valid range.
 */
function paramTweaks(correct: ShapeConfig, delta: number): ShapeConfig[] {
  const spec = PRIMARY_PARAM[correct.kind]
  if (!spec) return []
  const cur = correct.params[spec.name] ?? spec.min
  const out: ShapeConfig[] = []
  if (cur + delta <= spec.max) {
    out.push({ ...clone(correct), params: { ...correct.params, [spec.name]: cur + delta } })
  }
  if (cur - delta >= spec.min) {
    out.push({ ...clone(correct), params: { ...correct.params, [spec.name]: cur - delta } })
  }
  return out
}


/**
 * Candidate perturbations for "wrong but plausible" options, ordered by
 * EXPECTED VISUAL IMPACT (most distinctive first). The caller picks the first
 * candidate whose visualSignature is unique among already-chosen options, so
 * ordering controls the visual diversity of the distractor pool.
 *
 * Priority tiers:
 *   1) Param tweaks (ringCount / dotCount ±1) — different pattern, very visible
 *   2) Color swap — different palette color
 *   3) Big size delta — clear scale change
 *   4) Param tweaks ±2 — even more different pattern
 *   5) Fill toggle — adds/removes background fill
 *   6) Rotation (only if the shape isn't 90°-symmetric)
 *   7) Stroke width — subtler
 */
function candidatePerturbations(
  correct: ShapeConfig,
  rng: Rng,
): ShapeConfig[] {
  const out: ShapeConfig[] = []
  const altStrokes = STROKE_PALETTE.filter((c) => c !== correct.stroke)

  // ── Tier 1: shape-defining param ±1 (most visually impactful per shape)
  const tier1 = paramTweaks(correct, 1)
  out.push(...tier1)

  // ── Tier 1.5: hammer marker position — one of the most visible per-cell tweaks
  if (correct.kind === 'hammer') {
    const curPos = Math.round(correct.params.markerPos ?? 0)
    for (const p of [1, 2, 3, 4]) {
      if (p === curPos) continue
      out.push({
        ...clone(correct),
        params: { ...correct.params, markerPos: p },
      })
    }
  }

  // ── Tier 2: color swap (always very visible)
  if (altStrokes.length > 0) {
    out.push({ ...clone(correct), stroke: pick(rng, altStrokes) })
    if (altStrokes.length > 1) {
      const second = altStrokes.find((c) => c !== out[out.length - 1].stroke)
      if (second) out.push({ ...clone(correct), stroke: second })
    }
  }

  // ── Tier 3: big size delta
  out.push({ ...clone(correct), size: round2(Math.max(0.35, correct.size * 0.55)) })
  out.push({ ...clone(correct), size: round2(Math.min(1.0, correct.size * 1.25)) })

  // ── Tier 4: shape-defining param ±2
  out.push(...paramTweaks(correct, 2))

  // ── Tier 5: fill toggle
  if (!correct.fill) {
    out.push({ ...clone(correct), fill: 'rgba(167, 139, 250, 0.22)' })
  } else {
    out.push({ ...clone(correct), fill: null })
  }

  // ── Tier 6: rotation — only useful when the shape isn't 90°-symmetric
  if (rotationSymmetryFold(correct) < 4) {
    const period = 360 / rotationSymmetryFold(correct)
    // Pick rotations that fall in the "visible difference" range
    const rotAdds = period === 180 ? [45, 90, 135] : [45, 90, 135, 180]
    for (const add of rotAdds) {
      out.push({ ...clone(correct), rotation: (correct.rotation + add) % 360 })
    }
  }

  // ── Tier 7: stroke width (subtlest)
  out.push({ ...clone(correct), strokeWidth: correct.strokeWidth + 3 })
  if (correct.strokeWidth > 2) {
    out.push({ ...clone(correct), strokeWidth: Math.max(1, correct.strokeWidth - 1) })
  }

  return out
}

/**
 * Pick `count` distractors that are visually distinct from `correct`,
 * from each other, and from `mustDiffer` (typically the sibling variants).
 *
 * First seeds the distractor pool with the sibling variants (so dist-of-3
 * puzzles include the "other two variants" by design). Then fills the rest
 * from random perturbations of the correct shape.
 */
function makeDistinctDistractors(
  rng: Rng,
  correct: ShapeConfig,
  siblings: ShapeConfig[],
  count: number,
): ShapeConfig[] {
  const seen = new Set<string>([visualSignature(correct)])
  const out: ShapeConfig[] = []

  for (const s of siblings) {
    const sig = visualSignature(s)
    if (!seen.has(sig)) {
      seen.add(sig)
      out.push(clone(s))
      if (out.length >= count) return out
    }
  }

  // Fill with perturbations, preferring the most visually impactful tiers first.
  // We don't shuffle: the candidate ordering is itself meaningful (Tier 1 > Tier 7).
  const candidates = candidatePerturbations(correct, rng)
  for (const c of candidates) {
    const sig = visualSignature(c)
    if (seen.has(sig)) continue
    seen.add(sig)
    out.push(c)
    if (out.length >= count) return out
  }

  // Last-resort fallback: brute-force unique perturbations
  let attempts = 0
  while (out.length < count && attempts < 40) {
    attempts++
    const tweak: ShapeConfig = {
      ...clone(correct),
      strokeWidth: correct.strokeWidth + attempts,
      size: round2(Math.max(0.3, correct.size - 0.05 * attempts)),
    }
    const sig = visualSignature(tweak)
    if (!seen.has(sig)) {
      seen.add(sig)
      out.push(tweak)
    }
  }

  return out
}

// ──────────────────────────────────────────────────────────────
// Single-shape randomizer (used by Identity rule and as a building block)
// ──────────────────────────────────────────────────────────────

/**
 * Produces one randomized shape config for the given kind. The result is
 * suitable as the "uniform" target of an Identity puzzle or as a seed for
 * other rule generators.
 */
export function randomBaseShape(kind: ShapeKind, rng: Rng): ShapeConfig {
  const stroke = pick(rng, STROKE_PALETTE)
  const size = pick(rng, SIZE_BUCKETS)
  const strokeWidth = randInt(rng, 2, 4)

  switch (kind) {
    case 'annulus':
      return defaultShape('annulus', { ringCount: randInt(rng, 1, 3), gap: 0.15 }, {
        stroke, size, strokeWidth,
      })
    case 'dice':
      return defaultShape('dice', { dotCount: randInt(rng, 1, 9) }, {
        stroke, size, strokeWidth,
      })
    case 'polygon':
      return defaultShape('polygon', { sides: randInt(rng, 3, 8) }, {
        stroke, size, strokeWidth, rotation: pick(rng, ROTATION_BUCKETS),
      })
    case 'star':
      return defaultShape('star', {
        points: randInt(rng, 5, 8),
        innerRatio: pick(rng, [0.3, 0.4, 0.5]),
      }, {
        stroke, size, strokeWidth,
      })
    case 'arrow':
      return defaultShape('arrow', {
        headRatio: pick(rng, [0.35, 0.45, 0.55]),
        shaftWidth: 0.35,
      }, {
        stroke, size, strokeWidth, rotation: pick(rng, [0, 45, 90, 135, 180, 225, 270, 315]),
      })
    case 'petals':
      return defaultShape('petals', {
        petalCount: randInt(rng, 5, 10),
        petalWidth: pick(rng, [0.08, 0.12, 0.18]),
      }, {
        stroke, size, strokeWidth,
      })
    case 'spike-ring':
      return defaultShape('spike-ring', {
        spikeCount: randInt(rng, 6, 12),
        spikeDepth: pick(rng, [0.2, 0.3, 0.45]),
      }, {
        stroke, size, strokeWidth,
      })
    case 'hammer':
      return defaultShape('hammer', {
        handleLength: pick(rng, [0.5, 0.6, 0.7]),
        headWidth: pick(rng, [0.5, 0.6, 0.7]),
        headThickness: pick(rng, [0.15, 0.18, 0.22]),
        markerPos: randInt(rng, 1, 4),       // always show a marker (1–4)
        markerSize: 0.1,
      }, {
        stroke, size, strokeWidth,
        rotation: pick(rng, [0, 45, 90, 135, 180, 225, 270, 315]),
      })
    case 'box-lines':
      // Not yet implemented — fall back to a polygon placeholder
      return defaultShape('polygon', { sides: 4 }, { stroke, size, strokeWidth })
  }
}

// ──────────────────────────────────────────────────────────────
// Public rule-level generators (accept Rng)
// ──────────────────────────────────────────────────────────────

/** Distribution-of-3 (Latin square pattern). */
export function generateRandomDistOf3(
  shape: ShapeKind,
  rng: Rng = mulberry32(randomSeed()),
): Matrix3x3Puzzle {
  const variantsFn = VARIANT_GENERATORS[shape]
  if (!variantsFn) throw new Error(`No variant generator for shape "${shape}"`)
  const variants = variantsFn(rng)

  const cells: ShapeConfig[][] = [
    [clone(variants[0]), clone(variants[1]), clone(variants[2])],
    [clone(variants[1]), clone(variants[2]), clone(variants[0])],
    [clone(variants[2]), clone(variants[0]), clone(variants[1])],
  ]
  const correct = clone(cells[2][2]) // = variants[1]

  // Siblings = the other two distribution variants. They're always visually
  // distinct from `correct` by construction, and including them makes the
  // distractor pool feel like a real Raven puzzle.
  const siblings = [clone(variants[0]), clone(variants[2])]
  const distractors = makeDistinctDistractors(rng, correct, siblings, 3)

  const { result: options, permutation } = shuffleRng(rng, [correct, ...distractors])
  const correctIndex = permutation.indexOf(0)

  return {
    id: nextId(rng),
    type: '3x3',
    rule: 'dist-of-3',
    shape,
    cells,
    options,
    correctIndex,
    optionCount: options.length,
    difficulty: 2,
  }
}

/** Identity (all 9 cells the same). */
export function generateRandomIdentity(
  shape: ShapeKind,
  rng: Rng = mulberry32(randomSeed()),
): Matrix3x3Puzzle {
  const target = randomBaseShape(shape, rng)

  const cells: ShapeConfig[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => clone(target)),
  )

  // Identity has no "siblings" — all distractors are perturbations
  const distractors = makeDistinctDistractors(rng, target, [], 3)

  const { result: options, permutation } = shuffleRng(rng, [
    clone(target),
    ...distractors,
  ])
  const correctIndex = permutation.indexOf(0)

  return {
    id: nextId(rng),
    type: '3x3',
    rule: 'identity',
    shape,
    cells,
    options,
    correctIndex,
    optionCount: options.length,
    difficulty: 1,
  }
}

// ──────────────────────────────────────────────────────────────
// Rule: Progression (two-axis)
//   A primary param progresses along columns (left → right).
//   A secondary param progresses along rows (top → bottom).
//   The missing cell (2,2) is determined by extrapolating both axes.
// ──────────────────────────────────────────────────────────────

/**
 * Defines which params each shape can use for progression, plus 3 valid values
 * (the values are arranged in monotonic order for natural left→right / top→bottom feel).
 *
 *   "primary" axis = column-wise progression (shape's defining parameter)
 *   "secondary" axis = row-wise progression (usually size or strokeWidth — universal)
 */
type ProgressionAxis =
  | { kind: 'param'; name: string; values: [number, number, number] }
  | { kind: 'attr'; name: 'size' | 'strokeWidth' | 'rotation'; values: [number, number, number] }

function pickPrimaryProgression(shape: ShapeKind, rng: Rng): ProgressionAxis {
  // Each shape's most-distinctive axis
  switch (shape) {
    case 'annulus': {
      const start = randInt(rng, 1, 2) // 1→2→3 or 2→3→4
      return { kind: 'param', name: 'ringCount', values: [start, start + 1, start + 2] }
    }
    case 'dice': {
      // dotCount progressions: 1→2→3, 2→4→6, 3→5→7, etc. — pick a step
      const step = pick(rng, [1, 2, 3])
      const start = randInt(rng, 1, 9 - 2 * step)
      return {
        kind: 'param',
        name: 'dotCount',
        values: [start, start + step, start + 2 * step],
      }
    }
    case 'polygon': {
      const start = randInt(rng, 3, 6) // 3→4→5 or up to 6→7→8
      return { kind: 'param', name: 'sides', values: [start, start + 1, start + 2] }
    }
    case 'star': {
      const start = randInt(rng, 4, 8) // 4→5→6 ... or 8→9→10
      return { kind: 'param', name: 'points', values: [start, start + 1, start + 2] }
    }
    case 'arrow': {
      // Rotation progression: 0° → 45° → 90° or 0° → 90° → 180°
      const step = pick(rng, [45, 90])
      const start = pick(rng, [0, 45, 90, 135])
      return {
        kind: 'attr',
        name: 'rotation',
        values: [start, (start + step) % 360, (start + 2 * step) % 360],
      }
    }
    case 'hammer': {
      // Same as arrow: rotation progression. Marker stays fixed across the row
      // (it's the secondary axis that varies row-by-row).
      const step = pick(rng, [45, 90])
      const start = pick(rng, [0, 45, 90, 135])
      return {
        kind: 'attr',
        name: 'rotation',
        values: [start, (start + step) % 360, (start + 2 * step) % 360],
      }
    }
    case 'petals': {
      const start = randInt(rng, 3, 10)
      return {
        kind: 'param',
        name: 'petalCount',
        values: [start, start + 1, start + 2],
      }
    }
    case 'spike-ring': {
      const step = pick(rng, [1, 2])
      const start = randInt(rng, 4, 16 - 2 * step)
      return {
        kind: 'param',
        name: 'spikeCount',
        values: [start, start + step, start + 2 * step],
      }
    }
    case 'box-lines':
      return { kind: 'attr', name: 'size', values: [0.5, 0.7, 0.9] }
  }
}

/**
 * Which secondary axes are *visually meaningful* per shape.
 * Some shapes (notably dice) only have strokeWidth on the outer rect, which is
 * too subtle for a row-progression to be readable. We exclude such axes here.
 */
const SECONDARY_AXES_BY_SHAPE: Record<ShapeKind, Array<'size' | 'strokeWidth'>> = {
  annulus:      ['size', 'strokeWidth'], // strokeWidth changes ring thickness — visible
  dice:         ['size'],                // strokeWidth on dice = rect border only, too subtle
  polygon:      ['size', 'strokeWidth'], // outline-driven shape — strokeWidth visible
  star:         ['size', 'strokeWidth'],
  arrow:        ['size'],                // strokeWidth on arrow outline is subtle next to head/shaft mass
  hammer:       ['size'],                // hammer is filled, strokeWidth too subtle
  petals:       ['size', 'strokeWidth'],
  'spike-ring': ['size', 'strokeWidth'],
  'box-lines':  ['size', 'strokeWidth'],
}

function pickSecondaryProgression(shape: ShapeKind, rng: Rng): ProgressionAxis {
  const allowed = SECONDARY_AXES_BY_SHAPE[shape]
  const which = pick(rng, allowed)
  if (which === 'size') {
    return { kind: 'attr', name: 'size', values: [0.5, 0.72, 0.92] }
  }
  // Use a dramatic strokeWidth jump so the row progression is unmistakable
  return { kind: 'attr', name: 'strokeWidth', values: [1.5, 3.5, 6] }
}

/** Apply one axis value to a shape config (mutating-style helper). */
function applyAxis(s: ShapeConfig, axis: ProgressionAxis, value: number): ShapeConfig {
  if (axis.kind === 'param') {
    return { ...s, params: { ...s.params, [axis.name]: value } }
  }
  return { ...s, [axis.name]: value }
}

export function generateRandomProgression3x3(
  shape: ShapeKind,
  rng: Rng = mulberry32(randomSeed()),
): Matrix3x3Puzzle {
  const base = randomBaseShape(shape, rng)
  const primary = pickPrimaryProgression(shape, rng)
  let secondary = pickSecondaryProgression(shape, rng)

  // Avoid axis collision: if primary uses 'size' attr, force secondary to 'strokeWidth'
  if (
    primary.kind === 'attr' &&
    secondary.kind === 'attr' &&
    primary.name === secondary.name
  ) {
    secondary = { kind: 'attr', name: 'strokeWidth', values: [1.5, 3, 5] }
  }

  // Build the 3×3 grid: cells[r][c] = (primary[c], secondary[r])
  const cells: ShapeConfig[][] = []
  for (let r = 0; r < 3; r++) {
    cells[r] = []
    for (let c = 0; c < 3; c++) {
      let cell = clone(base)
      cell = applyAxis(cell, primary, primary.values[c])
      cell = applyAxis(cell, secondary, secondary.values[r])
      cells[r].push(cell)
    }
  }

  const correct = clone(cells[2][2])

  // Distractors: the 3 nearest grid neighbors are perfect "near miss" answers.
  // They appear visually in the grid → strongly plausible wrong answers.
  const siblings = [
    clone(cells[2][1]), // one column off
    clone(cells[1][2]), // one row off
    clone(cells[1][1]), // both off (diagonal neighbor)
  ]
  const distractors = makeDistinctDistractors(rng, correct, siblings, 3)

  const { result: options, permutation } = shuffleRng(rng, [correct, ...distractors])
  const correctIndex = permutation.indexOf(0)

  return {
    id: nextId(rng),
    type: '3x3',
    rule: 'progression',
    shape,
    cells,
    options,
    correctIndex,
    optionCount: options.length,
    difficulty: 3,
  }
}

// ──────────────────────────────────────────────────────────────
// Rule: Rotation (pure rotation, single axis)
//
//   Only rotation varies — every other attribute (size, color, marker, etc.)
//   stays constant across all 9 cells. Sliding-window pattern:
//
//     rotation(r, c) = start + (r + c) × step    (mod 360°)
//
//   Example with start=0, step=45°:
//      [  0°,  45°,  90° ]
//      [ 45°,  90°, 135° ]
//      [ 90°, 135°,   ?  ]   → answer = 180°
//
//   This rule is only meaningful for ROTATION-ASYMMETRIC shapes
//   (rotationSymmetryFold < 4), since 90°/180°-symmetric shapes would
//   produce visually indistinguishable cells.
// ──────────────────────────────────────────────────────────────

export function generateRandomRotation3x3(
  shape: ShapeKind,
  rng: Rng = mulberry32(randomSeed()),
): Matrix3x3Puzzle {
  // Guard: this rule requires an asymmetric shape
  const probe = randomBaseShape(shape, rng)
  if (rotationSymmetryFold(probe) >= 4) {
    throw new Error(
      `Rotation rule requires asymmetric shape (fold<4), got "${shape}"`,
    )
  }

  // Use the probe as base — keep all attributes constant, only rotate
  const base = probe
  // Step large enough that consecutive cells are clearly distinct
  const step = pick(rng, [45, 60, 90])
  // Start angle — adds variety without making any cell rotation invisible
  const start = pick(rng, [0, 15, 30, 45, 60, 90])

  // Build 3×3 grid with sliding-window rotation
  const cells: ShapeConfig[][] = []
  for (let r = 0; r < 3; r++) {
    cells[r] = []
    for (let c = 0; c < 3; c++) {
      const rotation = (start + (r + c) * step + 360) % 360
      cells[r].push({ ...clone(base), rotation })
    }
  }

  const correct = clone(cells[2][2])
  const correctRot = correct.rotation

  // Distractor pool — all are visually distinct rotations of the same hammer
  const distractorPool: ShapeConfig[] = [
    { ...clone(correct), rotation: (correctRot + step) % 360 },              // "next" in sequence
    { ...clone(correct), rotation: (correctRot - step + 360) % 360 },        // "previous"
    { ...clone(correct), rotation: (correctRot + 180) % 360 },                // opposite direction
    { ...clone(correct), rotation: (correctRot + 90) % 360 },                 // perpendicular
    { ...clone(correct), rotation: (correctRot + 2 * step) % 360 },           // overshoot
  ]

  const distractors = makeDistinctDistractors(rng, correct, distractorPool, 3)
  const { result: options, permutation } = shuffleRng(rng, [correct, ...distractors])
  const correctIndex = permutation.indexOf(0)

  return {
    id: nextId(rng),
    type: '3x3',
    rule: 'rotation',
    shape,
    cells,
    options,
    correctIndex,
    optionCount: options.length,
    difficulty: 2,
  }
}

// ──────────────────────────────────────────────────────────────
// Rule: Arithmetic (Addition / Subtraction)
//
//   Per row:  primary(col2) = primary(col0)  ⊕  primary(col1)
//   where ⊕ is + or -. Each row uses a different (a, b) pair to make the
//   rule readable.
//
//   Distractors are crafted Raven-style:
//     • component A (cells[2][0]) — appears in the grid already
//     • component B (cells[2][1])
//     • off-by-one perturbations of the correct value
// ──────────────────────────────────────────────────────────────

type ArithOp = 'addition' | 'subtraction'

function applyOp(op: ArithOp, a: number, b: number): number {
  return op === 'addition' ? a + b : a - b
}

/** Find up to 3 distinct (a, b) rows where (a, b, a⊕b) are 3 distinct values.
 *
 *  Why all-distinct? A row like (1, 1, 2) is ambiguous — the player might
 *  read it as "doubling" instead of addition. Enforcing a≠b≠c makes the
 *  operation visible.
 */
function sampleArithRows(
  rng: Rng,
  op: ArithOp,
  min: number,
  max: number,
): Array<[number, number, number]> {
  const valid: Array<[number, number, number]> = []
  for (let a = min; a <= max; a++) {
    for (let b = min; b <= max; b++) {
      const c = applyOp(op, a, b)
      if (c < min || c > max) continue
      if (a === b || a === c || b === c) continue
      valid.push([a, b, c])
    }
  }
  if (valid.length < 3) return []
  return sample(rng, valid, 3)
}

export function generateRandomArithmetic3x3(
  shape: ShapeKind,
  op: ArithOp,
  rng: Rng = mulberry32(randomSeed()),
): Matrix3x3Puzzle {
  const spec = PRIMARY_PARAM[shape]
  if (!spec) {
    throw new Error(`Arithmetic rule needs a count-parameterized shape, not "${shape}"`)
  }

  // Pick three (a, b, c) rows that satisfy the operation
  const rows = sampleArithRows(rng, op, spec.min, spec.max)
  if (rows.length < 3) {
    // Parameter range too narrow for 3 distinct rows — caller should retry or skip
    throw new Error(`Cannot find 3 distinct ${op} rows for ${shape}`)
  }

  // Pick a base shape; we'll vary only the primary count across cells
  const base = randomBaseShape(shape, rng)

  // Build 3x3 grid
  const cells: ShapeConfig[][] = rows.map((row) =>
    row.map((value) => ({
      ...clone(base),
      params: { ...base.params, [spec.name]: value },
    })),
  )

  const correct = clone(cells[2][2])
  const [a2, b2, c2] = rows[2]

  // ── Distractor pool — Raven-style traps
  const distractorPool: ShapeConfig[] = []

  // Component distractors: the two operands of the last row, both visible in the grid
  if (a2 !== c2) distractorPool.push(clone(cells[2][0]))
  if (b2 !== c2 && b2 !== a2) distractorPool.push(clone(cells[2][1]))

  // Off-by-one perturbations: tempting "almost right" answers
  if (c2 + 1 <= spec.max) {
    distractorPool.push({
      ...clone(base),
      params: { ...base.params, [spec.name]: c2 + 1 },
    })
  }
  if (c2 - 1 >= spec.min) {
    distractorPool.push({
      ...clone(base),
      params: { ...base.params, [spec.name]: c2 - 1 },
    })
  }

  // "Wrong operation" distractor — if op was +, use a-b; if -, use a+b
  const wrongOp: ArithOp = op === 'addition' ? 'subtraction' : 'addition'
  const wrongVal = applyOp(wrongOp, a2, b2)
  if (wrongVal >= spec.min && wrongVal <= spec.max && wrongVal !== c2) {
    distractorPool.push({
      ...clone(base),
      params: { ...base.params, [spec.name]: wrongVal },
    })
  }

  const distractors = makeDistinctDistractors(rng, correct, distractorPool, 3)

  const { result: options, permutation } = shuffleRng(rng, [correct, ...distractors])
  const correctIndex = permutation.indexOf(0)

  return {
    id: nextId(rng),
    type: '3x3',
    rule: op,
    shape,
    cells,
    options,
    correctIndex,
    optionCount: options.length,
    difficulty: 3,
  }
}

// ──────────────────────────────────────────────────────────────
// Fixed samples used by the Player MVP (kept for back-compat)
// ──────────────────────────────────────────────────────────────

export function sampleAnnulusIdentity(): Matrix3x3Puzzle {
  return generateRandomIdentity('annulus', mulberry32(1))
}

export function sampleDiceDistOf3(): Matrix3x3Puzzle {
  return generateRandomDistOf3('dice', mulberry32(42))
}

export function sampleAnnulusDistOf3(): Matrix3x3Puzzle {
  return generateRandomDistOf3('annulus', mulberry32(7))
}
