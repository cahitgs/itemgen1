/**
 * Cube Projection generator.
 *
 * Builds a random connected 3D cube stack (face-adjacent voxels in a small
 * integer grid), then asks the player: "which 2D silhouette do you see when
 * looking from axis X?" The 4 answer choices are silhouettes from different
 * viewing axes — only the one matching `questionAxis` is correct.
 *
 * For highly-symmetric stacks where multiple axes produce identical
 * silhouettes (and we therefore can't fill 3 distinct distractors), we
 * fall back to perturbing the correct silhouette by adding or removing
 * a single filled cell.
 *
 * All randomness comes from a seeded mulberry32 PRNG so bulk batches are
 * reproducible (seed=42 → same set of puzzles).
 */

import type {
  CubeProjectionPuzzle,
  ProjectionAxis,
} from '../types/puzzle'
import { type Rng, randInt, pick } from './rng'

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const ALL_AXES: ProjectionAxis[] = ['top', 'front', 'back', 'left', 'right']
/** Grid dimension for voxel placement. Voxels live in [0..DIM-1]³. */
const DIM = 4
/** 6 face-neighbor offsets in 3D. */
const NEIGHBORS_6: Array<[number, number, number]> = [
  [+1, 0, 0], [-1, 0, 0],
  [0, +1, 0], [0, -1, 0],
  [0, 0, +1], [0, 0, -1],
]

// ──────────────────────────────────────────────────────────────
// Voxel set helpers
// ──────────────────────────────────────────────────────────────

type Cube = [number, number, number]
const cubeKey = (x: number, y: number, z: number) => `${x},${y},${z}`

function inBounds(x: number, y: number, z: number): boolean {
  return x >= 0 && x < DIM && y >= 0 && y < DIM && z >= 0 && z < DIM
}

// ──────────────────────────────────────────────────────────────
// Random stack generator
// ──────────────────────────────────────────────────────────────

/**
 * Grow a connected stack of `cubeCount` cubes starting at the floor.
 * Each new cube is placed at a face-neighbor of an existing cube.
 * Gravity-ish constraint: the seed cube sits at z=0 so the structure
 * always has floor contact.
 */
export function generateRandomCubeStack(
  rng: Rng,
  cubeCount: number,
): Cube[] {
  const seenSet = new Set<string>()
  const cubes: Cube[] = []
  // Seed cube near the center of the floor (z=0)
  const sx = randInt(rng, 0, DIM - 1)
  const sy = randInt(rng, 0, DIM - 1)
  const seed: Cube = [sx, sy, 0]
  cubes.push(seed)
  seenSet.add(cubeKey(...seed))

  while (cubes.length < cubeCount) {
    // Build candidate frontier — face-neighbors of existing cubes that are
    // empty + in bounds.
    const frontier: Cube[] = []
    const frontierSeen = new Set<string>()
    for (const [cx, cy, cz] of cubes) {
      for (const [dx, dy, dz] of NEIGHBORS_6) {
        const nx = cx + dx, ny = cy + dy, nz = cz + dz
        if (!inBounds(nx, ny, nz)) continue
        const k = cubeKey(nx, ny, nz)
        if (seenSet.has(k) || frontierSeen.has(k)) continue
        frontierSeen.add(k)
        frontier.push([nx, ny, nz])
      }
    }
    if (frontier.length === 0) break // structure stuck (shouldn't happen at our sizes)
    const next = pick(rng, frontier)
    cubes.push(next)
    seenSet.add(cubeKey(...next))
  }

  return cubes
}

// ──────────────────────────────────────────────────────────────
// 2D projection (silhouette)
// ──────────────────────────────────────────────────────────────

/**
 * Project the voxel set onto a 2D silhouette as seen from `axis`.
 *
 * Coordinate convention (right-handed):
 *   x → right
 *   y → into the screen (depth, away from viewer for 'front')
 *   z → up
 *
 * The returned grid is row-major [row][col] of 1s (filled) and 0s (empty).
 * Row 0 is the TOP of the silhouette image, col 0 is the LEFT.
 *
 *   top   (camera at +z, looking -z): rows = y descending, cols = x ascending
 *                                     i.e. row=DIM-1-y, col=x
 *   front (camera at -y, looking +y): rows = z descending, cols = x ascending
 *                                     row=DIM-1-z, col=x
 *   back  (camera at +y, looking -y): rows = z descending, cols = x descending
 *                                     row=DIM-1-z, col=DIM-1-x
 *   left  (camera at -x, looking +x): rows = z descending, cols = y ascending
 *                                     row=DIM-1-z, col=y
 *   right (camera at +x, looking -x): rows = z descending, cols = y descending
 *                                     row=DIM-1-z, col=DIM-1-y
 */
export function projectCubes(cubes: Cube[], axis: ProjectionAxis): number[][] {
  const grid: number[][] = Array.from({ length: DIM }, () => new Array(DIM).fill(0))
  for (const [x, y, z] of cubes) {
    let row: number, col: number
    switch (axis) {
      case 'top':
        row = DIM - 1 - y; col = x; break
      case 'front':
        row = DIM - 1 - z; col = x; break
      case 'back':
        row = DIM - 1 - z; col = DIM - 1 - x; break
      case 'left':
        row = DIM - 1 - z; col = y; break
      case 'right':
        row = DIM - 1 - z; col = DIM - 1 - y; break
    }
    grid[row][col] = 1
  }
  return cropEmptyEdges(grid)
}

/**
 * Crop trailing rows/cols that are entirely empty so the silhouette image
 * is tightly framed. Keeps shape information but discards padding so visual
 * comparison among options is fair.
 *
 * If the grid is entirely empty, returns a 1×1 of [[0]].
 */
function cropEmptyEdges(grid: number[][]): number[][] {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  let r0 = 0, r1 = rows - 1, c0 = 0, c1 = cols - 1
  const rowEmpty = (r: number) => grid[r].every((v) => v === 0)
  const colEmpty = (c: number) => grid.every((row) => row[c] === 0)
  while (r0 < rows && rowEmpty(r0)) r0++
  while (r1 >= r0 && rowEmpty(r1)) r1--
  while (c0 < cols && colEmpty(c0)) c0++
  while (c1 >= c0 && colEmpty(c1)) c1--
  if (r1 < r0 || c1 < c0) return [[0]]
  const out: number[][] = []
  for (let r = r0; r <= r1; r++) {
    out.push(grid[r].slice(c0, c1 + 1))
  }
  return out
}

/** Canonical signature of a 2D grid — used to dedup options. */
function gridSignature(grid: number[][]): string {
  return grid.map((row) => row.join('')).join('|')
}

// ──────────────────────────────────────────────────────────────
// Perturbation fallback (for highly symmetric stacks)
// ──────────────────────────────────────────────────────────────

/**
 * Produce up to `count` distinct perturbations of `grid` by flipping one
 * cell (filled ↔ empty). Used as fallback distractors when we can't get
 * enough axis-different silhouettes.
 */
function perturbedGrids(grid: number[][], count: number, rng: Rng): number[][][] {
  const rows = grid.length
  const cols = grid[0].length
  const out: number[][][] = []
  const seen = new Set<string>([gridSignature(grid)])
  let attempts = 0
  while (out.length < count && attempts < 60) {
    attempts++
    const r = randInt(rng, 0, rows - 1)
    const c = randInt(rng, 0, cols - 1)
    const variant = grid.map((row) => row.slice())
    variant[r][c] = variant[r][c] ? 0 : 1
    // Don't allow a fully-empty perturbation
    const filled = variant.some((row) => row.some((v) => v === 1))
    if (!filled) continue
    const cropped = cropEmptyEdges(variant)
    const sig = gridSignature(cropped)
    if (seen.has(sig)) continue
    seen.add(sig)
    out.push(cropped)
  }
  return out
}

// ──────────────────────────────────────────────────────────────
// Main builder
// ──────────────────────────────────────────────────────────────

export interface CubeProjectionOptions {
  /** How many cubes in the stack. */
  cubeCount?: number
}

/**
 * Build a single cube-projection puzzle.
 *
 * Pipeline:
 *   1) Generate a random connected stack of `cubeCount` cubes.
 *   2) Compute silhouettes for all 5 axes.
 *   3) Pick the question axis (random).
 *   4) Pick 3 distractor axes whose silhouettes have unique signatures
 *      (not equal to correct or to each other).
 *   5) If we can't find 3 distinct axis silhouettes (symmetric stack),
 *      fill the remaining slots with single-cell perturbations of the
 *      correct silhouette.
 *   6) Shuffle the 4 options so correct isn't always first.
 */
export function buildCubeProjectionPuzzle(
  rng: Rng,
  opts: CubeProjectionOptions = {},
): CubeProjectionPuzzle {
  const cubeCount = opts.cubeCount ?? randInt(rng, 6, 11)
  const cubes = generateRandomCubeStack(rng, cubeCount)

  // 5 axis projections
  const projections: Record<ProjectionAxis, number[][]> = {
    top: projectCubes(cubes, 'top'),
    front: projectCubes(cubes, 'front'),
    back: projectCubes(cubes, 'back'),
    left: projectCubes(cubes, 'left'),
    right: projectCubes(cubes, 'right'),
  }

  const questionAxis = pick(rng, ALL_AXES)
  const correctGrid = projections[questionAxis]
  const correctSig = gridSignature(correctGrid)

  // Collect candidate distractors from the OTHER axes, deduped against
  // the correct silhouette and against each other.
  type Candidate = { axis: ProjectionAxis; grid: number[][] }
  const candidates: Candidate[] = []
  const candidateSigs = new Set<string>([correctSig])
  // Shuffle axes so distractor selection isn't biased by enum order
  const otherAxes = ALL_AXES.filter((a) => a !== questionAxis)
  shuffleInPlace(otherAxes, rng)
  for (const ax of otherAxes) {
    const g = projections[ax]
    const sig = gridSignature(g)
    if (candidateSigs.has(sig)) continue
    candidateSigs.add(sig)
    candidates.push({ axis: ax, grid: g })
    if (candidates.length >= 3) break
  }

  // Fallback: not enough unique axis silhouettes → fill rest with perturbations
  // of the correct grid. Each perturbation reuses the questionAxis label
  // (player won't see the label, only the silhouette).
  while (candidates.length < 3) {
    const need = 3 - candidates.length
    const perturbed = perturbedGrids(correctGrid, need + 2, rng).filter(
      (g) => !candidateSigs.has(gridSignature(g)),
    )
    if (perturbed.length === 0) break
    for (const g of perturbed) {
      candidateSigs.add(gridSignature(g))
      candidates.push({ axis: questionAxis, grid: g })
      if (candidates.length >= 3) break
    }
  }

  // Assemble options: correct + 3 distractors, then shuffle position
  const correctOption: Candidate = { axis: questionAxis, grid: correctGrid }
  const all: Candidate[] = [correctOption, ...candidates]
  shuffleInPlace(all, rng)
  const correctIndex = all.findIndex((c) => c === correctOption)

  return {
    id: `cube-${Date.now()}-${Math.floor(rng() * 1e6)}`,
    type: 'cube-projection',
    rule: 'cube-projection',
    shape: 'cube-stack',
    optionCount: all.length,
    difficulty: 3,
    cubes,
    questionAxis,
    options: all.map((c) => ({ axis: c.axis, grid: c.grid })),
    correctIndex,
  }
}

/** Validate a cube-projection puzzle: 4 unique silhouettes, correctIndex
 *  points to the questionAxis option.
 */
export function isCubeProjectionValid(p: CubeProjectionPuzzle): boolean {
  if (!Array.isArray(p.options) || p.options.length < 2) return false
  // All silhouette signatures must be unique
  const sigs = p.options.map((o) => gridSignature(o.grid))
  if (new Set(sigs).size !== sigs.length) return false
  // correctIndex bounds
  if (p.correctIndex < 0 || p.correctIndex >= p.options.length) return false
  // Correct option's axis must match the questionAxis
  if (p.options[p.correctIndex].axis !== p.questionAxis) return false
  // At least one filled cell in every silhouette
  for (const o of p.options) {
    if (!o.grid.some((row) => row.some((v) => v === 1))) return false
  }
  return true
}

// ──────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────

function shuffleInPlace<T>(arr: T[], rng: Rng): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}
